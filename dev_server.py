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
import json
import os
import re
import signal
import subprocess
import sys
import queue
import threading
import time
import urllib.parse
import webbrowser
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


def _hash_pass(password):
    return hashlib.sha256(("kubition::" + password).encode("utf-8")).hexdigest()


def _save_file(account):
    return os.path.join(SAVE_DIR, account + ".json")


def _load_save_file(account):
    path = _save_file(account)
    if not os.path.isfile(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/__livereload":
            self._handle_sse()
            return
        if path == "/saves" or path.startswith("/saves/"):
            self._send_text("forbidden", 403)
            return
        fs_path = self.translate_path(self.path)
        if fs_path.endswith(".html") and os.path.isfile(fs_path):
            self._serve_html(fs_path)
            return
        super().do_GET()

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        if path == SAVE_API_PATH:
            self._handle_save_api()
            return
        self._send_text("not found", 404)

    def _read_form(self):
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            length = 0
        body = self.rfile.read(length).decode("utf-8", "replace") if length else ""
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
        """兼容原 save.php 协议：action=save / load / end。"""
        fields = self._read_form()
        action = fields.get("action", "")
        account = fields.get("account", "")
        password = fields.get("pass", "")

        if not ACCOUNT_RE.match(account) or not ACCOUNT_RE.match(password):
            self._send_text("invalid")
            return

        record = _load_save_file(account)

        if action == "save":
            if record is not None and record.get("passHash") != _hash_pass(password):
                self._send_text("incorrect pass")
                return
            raw = fields.get("data", "")
            try:
                game_data = json.loads(raw)
            except ValueError:
                self._send_text("invalid")
                return
            os.makedirs(SAVE_DIR, exist_ok=True)
            envelope = {
                "account": account,
                "passHash": _hash_pass(password),
                "day": fields.get("day", ""),
                "generation": fields.get("g", ""),
                "savedAt": int(time.time() * 1000),
                "data": game_data,
            }
            try:
                with open(_save_file(account), "w", encoding="utf-8") as f:
                    json.dump(envelope, f, ensure_ascii=False, indent=2)
            except OSError as e:
                self._send_text("save failed: %s" % e)
                return
            print("  [save] %s -> saves/%s.json" % (account, account), flush=True)
            self._send_text("success")
            return

        if action == "load":
            if record is None:
                self._send_text("no account")
                return
            if record.get("passHash") != _hash_pass(password):
                self._send_text("incorrect pass")
                return
            self._send_text(json.dumps(record.get("data", {}), ensure_ascii=False))
            return

        if action == "end":
            # 通关排行榜：暂返回空榜单占位（前端会 eval 成数组）
            self._send_text("[]")
            return

        self._send_text("invalid")

    def _serve_html(self, fs_path):
        with open(fs_path, "rb") as f:
            content = f.read()
        if b"</body>" in content:
            content = content.replace(b"</body>", RELOAD_SNIPPET + b"</body>", 1)
        else:
            content += RELOAD_SNIPPET
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


def run_worker(port):
    """实际提供服务：静态文件 + 实时重载 + 本地存档后端。"""
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
