"""A small configurable HTTP mock with failure injection. Vendor mocks are route tables on top of this."""
from __future__ import annotations

import json
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Callable, Dict, List, Optional, Tuple

Handler = Callable[["MockRequest"], Tuple[int, Dict[str, str], Any]]


class MockRequest:
    def __init__(self, h: BaseHTTPRequestHandler, body: bytes, path: str, query: Dict[str, List[str]]):
        self.method, self.headers, self.body, self.path, self.query = h.command, h.headers, body, path, query

    def json(self) -> Any:
        return json.loads(self.body or b"null")

    def q(self, name: str, default: Optional[str] = None) -> Optional[str]:
        v = self.query.get(name)
        return v[0] if v else default

    def form(self) -> Dict[str, str]:
        from urllib.parse import parse_qsl
        return dict(parse_qsl(self.body.decode()))


class MockServer:
    """Routes are (method, regex) -> handler. `fail_next(n, status)` and `slow_next` inject faults for the next requests."""

    def __init__(self, name: str = "mock"):
        import re
        self.name = name
        self.routes: List[Tuple[str, "re.Pattern[str]", Handler]] = []
        self.requests: List[Dict[str, Any]] = []
        self._faults: List[Tuple[int, Dict[str, str], Any]] = []
        self._delay = 0.0
        self.lock = threading.Lock()
        self.state: Dict[str, Any] = {}
        self._re = re
        outer = self

        class H(BaseHTTPRequestHandler):
            protocol_version = "HTTP/1.1"

            def log_message(self, *a: Any) -> None:
                pass

            def _do(self) -> None:
                from urllib.parse import parse_qs, urlparse
                n = int(self.headers.get("Content-Length") or 0)
                body = self.rfile.read(n) if n else b""
                u = urlparse(self.path)
                req = MockRequest(self, body, u.path, parse_qs(u.query, keep_blank_values=True))
                with outer.lock:
                    outer.requests.append({"method": req.method, "path": u.path, "query": u.query, "headers": {k.lower(): v for k, v in self.headers.items()}, "body": body})
                    fault = outer._faults.pop(0) if outer._faults else None
                    delay = outer._delay
                if delay:
                    time.sleep(delay)
                if fault:
                    st, hd, bd = fault
                else:
                    st, hd, bd = 404, {}, {"error": "no route"}
                    for m, rx, fn in outer.routes:
                        if m == req.method and rx.fullmatch(u.path):
                            st, hd, bd = fn(req)
                            break
                data = bd if isinstance(bd, (bytes, bytearray)) else json.dumps(bd).encode()
                self.send_response(st)
                self.send_header("Content-Type", hd.get("Content-Type", "application/json"))
                for k, v in hd.items():
                    if k != "Content-Type":
                        self.send_header(k, v)
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                if req.method != "HEAD":
                    self.wfile.write(data)

            do_GET = do_POST = do_PUT = do_PATCH = do_DELETE = do_HEAD = _do

        self.srv = ThreadingHTTPServer(("127.0.0.1", 0), H)
        self.srv.daemon_threads = True
        self.port = self.srv.server_address[1]
        self.base = f"http://127.0.0.1:{self.port}"
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()

    def route(self, method: str, pattern: str, fn: Handler) -> None:
        self.routes.append((method, self._re.compile(pattern), fn))

    def fail_next(self, n: int = 1, status: int = 503, headers: Optional[Dict[str, str]] = None, body: Any = None) -> None:
        with self.lock:
            self._faults += [(status, headers or {}, body if body is not None else {"error": f"injected {status}"})] * n

    def slow(self, seconds: float) -> None:
        self._delay = seconds

    def calls(self, method: Optional[str] = None, path_prefix: str = "") -> List[Dict[str, Any]]:
        return [r for r in self.requests if (not method or r["method"] == method) and r["path"].startswith(path_prefix)]

    def close(self) -> None:
        self.srv.shutdown()
        self.srv.server_close()
