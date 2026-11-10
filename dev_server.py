#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
超苦逼冒险者 —— 本地开发服务器（带实时重载）

功能：
  1. 以项目根目录为站点根，提供静态文件访问；
  2. 监听 src/、build/、res/、index.html、index.css 等本地文件的修改；
  3. 自动向已打开的页面注入一段脚本，文件变动时浏览器自动刷新；
  4. 关闭缓存，确保每次刷新都拿到最新代码；
  5. 提供本地存档后端接口（兼容原 save.php 协议），存档文件写入项目下的 saves/ 目录；
  6. 服务器自身热重载：修改本项目中的 .py 代码后自动平滑重启 worker，无需手动 Ctrl+C，
     运行命令（父进程）始终在线，浏览器 SSE 会自动重连。

用法：
  python3 dev_server.py            # 默认 8000 端口并自动打开浏览器（父进程守候 + 热重载）
  python3 dev_server.py 8080       # 指定端口
  python3 dev_server.py 8080 --no-open
  python3 dev_server.py 8080 --no-reload   # 关闭服务器热重载（单进程直接运行）
  python3 dev_server.py --worker [端口]    # 内部使用：仅运行服务进程

依赖：仅 Python 3 标准库。
"""

import hashlib
import hmac
import json
import os
import re
import secrets
import signal
import shutil
import subprocess
import sys
import queue
import tempfile
import threading
import time
import urllib.parse
import webbrowser
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
POLL_INTERVAL = 0.5
IGNORE_DIRS = {".git", "__pycache__", "node_modules", ".idea", ".vscode", "saves"}
IGNORE_FILES = {".DS_Store"}
IGNORE_SUFFIX = (".pyc", ".swp", ".tmp")

# 本地存档后端
SAVE_DIR = os.path.join(ROOT, "saves")
SAVE_API_PATH = "/api/save.php"
ACCOUNT_RE = re.compile(r"^[A-Za-z0-9]{3,12}$")
# 密码新格式允许 3-64 位字母数字；旧存档的 3-12 位密码继续可用
PASSWORD_RE = re.compile(r"^[A-Za-z0-9]{3,64}$")
# PBKDF2 参数（per-account 随机盐；旧版无盐 sha256 在登录成功后自动升级）
PBKDF2_ITERATIONS = 200000
PBKDF2_SALT_BYTES = 16
# 单个请求体上限（正常存档约 30KB，留足余量，防止内存/磁盘被灌爆）
MAX_BODY_BYTES = 4 * 1024 * 1024
# 只允许本机来源，配合 Host 校验阻断 DNS rebinding
ALLOWED_HOST_NAMES = {"127.0.0.1", "localhost", "::1"}
# 静态服务拒绝的目录/文件：存档、git 数据、Python 缓存与源码
DENY_DIR_NAMES = {"saves", ".git", "__pycache__", ".idea", ".vscode", "node_modules"}
DENY_FILE_SUFFIXES = (".py",)
_save_lock = threading.Lock()

# 开发模式标记：index.html 据此走"源码顺序加载 + 浏览器内 Babel"，
# 而不加载预编译产物 build/game.bundle.js（改源码即刷新，无需手动构建）。
DEV_FLAG_SNIPPET = b"""<script>window.__DEV_SERVER__ = { useSource: true };</script>"""

# 注入到 HTML 的自动刷新客户端
RELOAD_SNIPPET = b"""<script>
(function () {
  if (!window.EventSource) return;
  try {
    var es = new EventSource('/__livereload');
    es.onmessage = function (e) {
      if (e.data === 'reload') { location.reload(); }
    };
  } catch (err) { /* ignore */ }
})();
</script>
"""

_clients = set()
_clients_lock = threading.Lock()


def _skip(name):
    return name in IGNORE_FILES or name.startswith(".") or name.endswith(IGNORE_SUFFIX)


def snapshot():
    """抓取所有被监听文件的修改时间，用于对比。"""
    state = {}
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
        for fn in filenames:
            if _skip(fn):
                continue
            p = os.path.join(dirpath, fn)
            try:
                state[p] = os.path.getmtime(p)
            except OSError:
                pass
    return state


def py_snapshot():
    """抓取本项目所有 .py 文件的修改时间，用于服务器自身热重载。"""
    state = {}
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
        for fn in filenames:
            if fn.endswith(".py"):
                p = os.path.join(dirpath, fn)
                try:
                    state[p] = os.path.getmtime(p)
                except OSError:
                    pass
    return state


def broadcast():
    with _clients_lock:
        clients = list(_clients)
    dead = []
    for q in clients:
        try:
            q.put_nowait("reload")
        except Exception:
            dead.append(q)
    if dead:
        with _clients_lock:
            for q in dead:
                _clients.discard(q)


def watch_loop():
    last = snapshot()
    while True:
        time.sleep(POLL_INTERVAL)
        now = snapshot()
        if now != last:
            changed = [
                p for p in set(now) | set(last)
                if now.get(p) != last.get(p)
            ]
            last = now
            for p in changed:
                print("  [changed] " + os.path.relpath(p, ROOT), flush=True)
            broadcast()


def _pbkdf2_hash(password, salt, iterations=PBKDF2_ITERATIONS):
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations).hex()


def _legacy_hash(password):
    """旧版无盐哈希：sha256("kubition::" + 密码)。仅用于校验旧存档。"""
    return hashlib.sha256(("kubition::" + password).encode("utf-8")).hexdigest()


def _new_password_record(password):
    salt = secrets.token_bytes(PBKDF2_SALT_BYTES)
    return {
        "passAlgo": "pbkdf2_sha256",
        "passIter": PBKDF2_ITERATIONS,
        "passSalt": salt.hex(),
        "passHash": _pbkdf2_hash(password, salt, PBKDF2_ITERATIONS),
    }


def _is_legacy_record(record):
    return record.get("passAlgo") != "pbkdf2_sha256"


def _verify_password(record, password):
    stored = record.get("passHash") or ""
    if record.get("passAlgo") == "pbkdf2_sha256":
        try:
            iterations = int(record.get("passIter") or PBKDF2_ITERATIONS)
            salt = bytes.fromhex(record.get("passSalt") or "")
            if not salt or iterations < 1 or iterations > 2000000:
                return False
            return hmac.compare_digest(_pbkdf2_hash(password, salt, iterations), stored)
        except (TypeError, ValueError):
            return False
    # 兼容旧存档：无盐 sha256（只有旧档没有 passAlgo 时才会走到这里）
    return hmac.compare_digest(_legacy_hash(password), stored)


def _save_file(account):
    return os.path.join(SAVE_DIR, account + ".json")


def _load_save_file(account):
    """读取存档。返回 (record, status)，status 为 ok/missing/corrupt。

    区分"文件不存在"和"文件损坏"很重要：损坏的存档绝不能被当成新账号覆盖。
    """
    path = _save_file(account)
    if not os.path.isfile(path):
        return None, "missing"
    try:
        with open(path, "r", encoding="utf-8") as f:
            record = json.load(f)
    except (OSError, ValueError):
        return None, "corrupt"
    if not isinstance(record, dict) or not record.get("passHash"):
        return None, "corrupt"
    return record, "ok"


def _write_save(account, record):
    """原子写入：临时文件 + fsync + os.replace，避免写一半留下损坏 JSON。"""
    os.makedirs(SAVE_DIR, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(dir=SAVE_DIR, prefix="." + account + ".", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(record, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, _save_file(account))
    except BaseException:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise


def _upgrade_record(account, record, password):
    """旧无盐哈希校验通过后，自动升级为带随机盐的 PBKDF2 并落盘。"""
    try:
        record.update(_new_password_record(password))
        _write_save(account, record)
        print("  [upgrade] %s 的密码哈希已升级为 PBKDF2" % account, flush=True)
        return True
    except OSError as e:
        print("  [upgrade] %s 密码哈希升级失败: %s" % (account, e), flush=True)
        return False


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def _host_allowed(self):
        """只接受本机 Host：阻断 DNS rebinding（恶意域名解析到 127.0.0.1）。"""
        host = (self.headers.get("Host") or "").strip()
        if not host:
            return False
        hostname = host
        if host.startswith("["):
            hostname = host.split("]")[0].lstrip("[")
        elif ":" in host:
            hostname = host.rsplit(":", 1)[0]
        return hostname.lower() in ALLOWED_HOST_NAMES

    def _origin_allowed(self):
        """跨站 form POST 没有 Origin 时靠 Host 校验兜底；带 Origin 时必须本机来源。"""
        origin = self.headers.get("Origin")
        if not origin:
            return True
        try:
            parsed = urllib.parse.urlsplit(origin)
        except ValueError:
            return False
        if parsed.scheme not in ("http", "https"):
            return False
        return (parsed.hostname or "").lower() in ALLOWED_HOST_NAMES

    def _safe_rel_path(self):
        """把请求路径归一化并做真实路径包含校验。

        返回相对 ROOT 的安全路径（"" 表示站点根）；不安全/被禁止时返回 None。
        兼容 /SAVES/、/%73aves/、多重编码、符号链接等绕过方式。
        """
        raw_path = urllib.parse.urlsplit(self.path).path
        decoded = raw_path
        # 多重 percent-encoding 归一（最多 3 层，100% 足够覆盖浏览器/代理行为）
        for _ in range(3):
            new_path = urllib.parse.unquote(decoded)
            if new_path == decoded:
                break
            decoded = new_path
        if "\x00" in decoded:
            return None
        rel = os.path.normpath(decoded).lstrip("/")
        if rel in ("", "."):
            return ""
        parts = [p for p in rel.split(os.sep) if p not in ("", ".")]
        for part in parts:
            lower = part.lower()
            if lower in DENY_DIR_NAMES:
                return None
            if lower.startswith("."):
                return None
        if rel.lower().endswith(DENY_FILE_SUFFIXES):
            return None
        full = os.path.realpath(os.path.join(ROOT, rel))
        root_real = os.path.realpath(ROOT)
        save_real = os.path.realpath(SAVE_DIR)
        try:
            full_path = Path(full)
            if not full_path.is_relative_to(Path(root_real)):
                return None
            if full_path.is_relative_to(Path(save_real)):
                return None
        except (ValueError, OSError):
            return None
        return rel

    def do_GET(self):
        if not self._host_allowed():
            self._send_text("forbidden host", 403)
            return
        path = self.path.split("?", 1)[0]
        if path == "/__livereload":
            self._handle_sse()
            return
        rel = self._safe_rel_path()
        if rel is None:
            self._send_text("forbidden", 403)
            return
        # 站点根与 index.html 都要注入 livereload（否则开在 / 时热重载不生效）
        if rel == "" or rel.lower() == "index.html":
            self._serve_html(os.path.join(ROOT, "index.html"))
            return
        fs_path = os.path.realpath(os.path.join(ROOT, rel))
        if fs_path.lower().endswith(".html") and os.path.isfile(fs_path):
            self._serve_html(fs_path)
            return
        self.path = "/" + rel
        super().do_GET()

    def do_POST(self):
        if not self._host_allowed():
            self._send_text("forbidden host", 403)
            return
        if not self._origin_allowed():
            self._send_text("forbidden origin", 403)
            return
        path = self.path.split("?", 1)[0]
        if path == SAVE_API_PATH:
            self._handle_save_api()
            return
        self._send_text("not found", 404)

    def list_directory(self, path):
        # 不提供目录浏览，避免列出存档/源码目录内容
        self._send_text("forbidden", 403)
        return None

    def _read_form(self):
        """读取 urlencoded 表单；超长/非法长度返回 None（由调用方回 413/400）。"""
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            return None
        if length <= 0 or length > MAX_BODY_BYTES:
            return None
        body = self.rfile.read(length).decode("utf-8", "replace")
        parsed = urllib.parse.parse_qs(body, keep_blank_values=True)
        return {k: v[0] for k, v in parsed.items()}

    def _send_text(self, text, status=200):
        data = text.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _handle_save_api(self):
        """兼容原 save.php 协议：action=save / load / end。

        错误响应约定（前端按原文判断）：
          invalid           参数/格式不合法
          no account        账号不存在
          incorrect pass    密码错误
          save corrupted    存档文件损坏（拒绝覆盖/读取）
          save failed: ...  写入失败
        """
        fields = self._read_form()
        if fields is None:
            self._send_text("invalid", 413)
            return
        action = fields.get("action", "")
        account = fields.get("account", "")
        password = fields.get("pass", "")

        if not ACCOUNT_RE.match(account) or not PASSWORD_RE.match(password):
            self._send_text("invalid")
            return

        with _save_lock:
            record, status = _load_save_file(account)
            if status == "corrupt":
                # 绝不能在损坏存档上继续写：否则会丢掉玩家数据
                self._send_text("save corrupted")
                return

            if action == "save":
                if status == "ok" and not _verify_password(record, password):
                    self._send_text("incorrect pass")
                    return
                raw = fields.get("data", "")
                try:
                    game_data = json.loads(raw)
                except ValueError:
                    self._send_text("invalid")
                    return
                if not isinstance(game_data, dict):
                    self._send_text("invalid")
                    return
                envelope = record if record is not None else {}
                envelope.update({
                    "account": account,
                    "day": fields.get("day", ""),
                    "generation": fields.get("g", ""),
                    "savedAt": int(time.time() * 1000),
                    "schemaVersion": game_data.get("schemaVersion", 1),
                    "data": game_data,
                })
                envelope.update(_new_password_record(password))
                try:
                    _write_save(account, envelope)
                except OSError as e:
                    self._send_text("save failed: %s" % e)
                    return
                print("  [save] %s -> saves/%s.json" % (account, account), flush=True)
                self._send_text("success")
                return

            if action == "load":
                if status == "missing":
                    self._send_text("no account")
                    return
                if not _verify_password(record, password):
                    self._send_text("incorrect pass")
                    return
                if _is_legacy_record(record):
                    _upgrade_record(account, record, password)
                self._send_text(json.dumps(record.get("data", {}), ensure_ascii=False))
                return

            if action == "end":
                # 通关排行榜：暂返回空榜单占位
                self._send_text("[]")
                return

            self._send_text("invalid")

    def _serve_html(self, fs_path):
        with open(fs_path, "rb") as f:
            content = f.read()
        injected = DEV_FLAG_SNIPPET + RELOAD_SNIPPET
        if b"</body>" in content:
            content = content.replace(b"</body>", injected + b"</body>", 1)
        else:
            content += injected
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def _handle_sse(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Connection", "keep-alive")
        self.end_headers()
        q = queue.Queue()
        with _clients_lock:
            _clients.add(q)
        try:
            self.wfile.write(b": connected\n\n")
            self.wfile.flush()
            while True:
                try:
                    msg = q.get(timeout=15)
                    self.wfile.write(("data: %s\n\n" % msg).encode("utf-8"))
                    self.wfile.flush()
                except queue.Empty:
                    self.wfile.write(b": ping\n\n")
                    self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, OSError):
            pass
        finally:
            with _clients_lock:
                _clients.discard(q)

    def log_message(self, fmt, *args):
        if "GET /__livereload" in (fmt % args):
            return
        super().log_message(fmt, *args)


def _parse_args(argv):
    port = 8000
    no_open = False
    no_reload = False
    for arg in argv:
        if arg == "--no-open":
            no_open = True
        elif arg == "--no-reload":
            no_reload = True
        elif arg.isdigit():
            port = int(arg)
    return port, no_open, no_reload


def build_bundle_once():
    """开发服务器启动时顺手构建一次 build/game.bundle.js（供静态部署/提交使用）。

    失败只告警，不影响开发模式（开发模式用源码热加载，不依赖产物）。
    """
    script = os.path.join(ROOT, "build_game.js")
    if not os.path.isfile(script):
        return
    node = shutil.which("node")
    if not node:
        print("  [build] 未找到 node，跳过预编译产物构建（仅影响静态部署）", flush=True)
        return
    try:
        result = subprocess.run([node, script], cwd=ROOT, capture_output=True, text=True, timeout=120)
        if result.returncode == 0:
            line = (result.stdout or "").strip().splitlines()
            print("  [build] " + (line[-1] if line else "预编译产物已更新"), flush=True)
        else:
            print("  [build] 预编译失败（不影响开发模式）: " + (result.stderr or "").strip()[:300], flush=True)
    except (OSError, subprocess.SubprocessError) as e:
        print("  [build] 预编译异常（不影响开发模式）: %s" % e, flush=True)


def run_worker(port):
    """实际提供服务：静态文件 + 实时重载 + 本地存档后端。"""
    build_bundle_once()
    watcher = threading.Thread(target=watch_loop, daemon=True)
    watcher.start()

    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print("=" * 52)
    print(" 超苦逼冒险者 本地开发服务器（实时重载）")
    print(" 地址: http://127.0.0.1:%d/" % port)
    print(" 监听文件变更，保存后浏览器自动刷新。")
    print(" 存档目录: " + os.path.relpath(SAVE_DIR, ROOT) + "/")
    print(" 存档接口: POST " + SAVE_API_PATH)
    print(" 按 Ctrl+C 停止。")
    print("=" * 52, flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


def _spawn_worker(worker_cmd):
    return subprocess.Popen(worker_cmd)


def _stop_worker(child):
    if child is None or child.poll() is not None:
        return
    child.terminate()
    try:
        child.wait(timeout=5)
    except subprocess.TimeoutExpired:
        child.kill()
        try:
            child.wait(timeout=5)
        except subprocess.TimeoutExpired:
            pass


def run_supervisor(port, no_open):
    """守候进程：监控 .py 变更并平滑重启 worker，自身不退出。"""
    worker_cmd = [sys.executable, os.path.abspath(__file__), "--worker", str(port)]
    child = _spawn_worker(worker_cmd)
    print("=" * 52)
    print(" 超苦逼冒险者 本地开发服务器（实时重载 + 服务器热重载）")
    print(" 地址: http://127.0.0.1:%d/" % port)
    print(" 已开启 Python 代码热重载，修改 .py 后自动平滑重启 worker。")
    print(" 按 Ctrl+C 停止。")
    print("=" * 52, flush=True)
    if not no_open:
        threading.Timer(0.8, lambda: webbrowser.open("http://127.0.0.1:%d/" % port)).start()

    def _on_signal(signum, frame):
        raise KeyboardInterrupt
    signal.signal(signal.SIGTERM, _on_signal)

    last = py_snapshot()
    try:
        while True:
            time.sleep(POLL_INTERVAL)
            now = py_snapshot()
            if now != last:
                changed = [p for p in set(now) | set(last) if now.get(p) != last.get(p)]
                last = now
                for p in changed:
                    print("  [reload] " + os.path.relpath(p, ROOT), flush=True)
                _stop_worker(child)
                child = _spawn_worker(worker_cmd)
            elif child.poll() is not None:
                print("  [reload] worker 已退出，正在重启...", flush=True)
                child = _spawn_worker(worker_cmd)
    except KeyboardInterrupt:
        print("\n正在停止...", flush=True)
    finally:
        _stop_worker(child)
        print("已停止。", flush=True)


def main():
    if "--worker" in sys.argv:
        port, _, _ = _parse_args(sys.argv[1:])
        run_worker(port)
        return
    port, no_open, no_reload = _parse_args(sys.argv[1:])
    if no_reload:
        run_worker(port)
    else:
        run_supervisor(port, no_open)


if __name__ == "__main__":
    main()
