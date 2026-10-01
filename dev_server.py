#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
超苦逼冒险者 —— 本地开发服务器（带实时重载）

功能：
  1. 以项目根目录为站点根，提供静态文件访问；
  2. 监听 src/、build/、res/、index.html、index.css 等本地文件的修改；
  3. 自动向已打开的页面注入一段脚本，文件变动时浏览器自动刷新；
  4. 关闭缓存，确保每次刷新都拿到最新代码。

用法：
  python3 dev_server.py            # 默认 8000 端口并自动打开浏览器
  python3 dev_server.py 8080       # 指定端口
  python3 dev_server.py 8080 --no-open

依赖：仅 Python 3 标准库。
"""

import os
import sys
import queue
import threading
import time
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
POLL_INTERVAL = 0.5
IGNORE_DIRS = {".git", "__pycache__", "node_modules", ".idea", ".vscode"}
IGNORE_FILES = {".DS_Store"}
IGNORE_SUFFIX = (".pyc", ".swp", ".tmp")

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
        fs_path = self.translate_path(self.path)
        if fs_path.endswith(".html") and os.path.isfile(fs_path):
            self._serve_html(fs_path)
            return
        super().do_GET()

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


def main():
    port = 8000
    no_open = "--no-open" in sys.argv
    for arg in sys.argv[1:]:
        if arg.isdigit():
            port = int(arg)
            break

    watcher = threading.Thread(target=watch_loop, daemon=True)
    watcher.start()

    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    url = "http://127.0.0.1:%d/" % port
    print("=" * 52)
    print(" 超苦逼冒险者 本地开发服务器（实时重载）")
    print(" 地址: " + url)
    print(" 监听文件变更，保存后浏览器自动刷新。")
    print(" 按 Ctrl+C 停止。")
    print("=" * 52)
    if not no_open:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止。")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
