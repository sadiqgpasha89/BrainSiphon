"""Fake servers for the pre-flight tests: everything runs on 127.0.0.1 so the suite needs no network and no containers."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import shutil
import socket
import socketserver
import ssl
import struct
import subprocess
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any, Callable, Dict, List, Optional, Tuple


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class Tcp:
    """A TCP server whose handler is a function of the accepted socket."""

    def __init__(self, handler: Callable[[socket.socket], None]):
        outer = handler

        class H(socketserver.BaseRequestHandler):
            def handle(self) -> None:  # noqa: D401
                try:
                    outer(self.request)
                except (ConnectionError, OSError, struct.error):
                    pass

        class S(socketserver.ThreadingTCPServer):
            allow_reuse_address = True
            daemon_threads = True

        self.srv = S(("127.0.0.1", 0), H)
        self.port = self.srv.server_address[1]
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()

    def close(self) -> None:
        self.srv.shutdown()
        self.srv.server_close()


def recv_exact(s: socket.socket, n: int) -> bytes:
    b = b""
    while len(b) < n:
        c = s.recv(n - len(b))
        if not c:
            raise ConnectionError("closed")
        b += c
    return b


# --------------------------------------------------------------------------------------------- TLS material

def make_cert(dir_: str, cn: str = "localhost", days: int = 30, san: Optional[List[str]] = None) -> Tuple[str, str]:
    """Self-signed certificate valid `days` days from now (negative = already expired). Needs the openssl CLI."""
    key, crt = os.path.join(dir_, f"{cn}-{days}.key"), os.path.join(dir_, f"{cn}-{days}.crt")
    sans = ",".join(san or [f"DNS:{cn}", "IP:127.0.0.1"])
    if days >= 0:
        subprocess.run(["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", key, "-out", crt, "-days", str(max(days, 1)), "-subj", f"/CN={cn}/O=BrainSiphon Test", "-addext", f"subjectAltName={sans}"], check=True, capture_output=True)
    else:
        # an expired certificate: sign with `openssl ca`-less trick using faketime-free approach (-not_before/-not_after, OpenSSL 3.4+),
        # falling back to a short-lived cert that the test then treats as "expires soon" when the option is unavailable
        r = subprocess.run(["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", key, "-out", crt, "-subj", f"/CN={cn}", "-addext", f"subjectAltName={sans}", "-not_before", "20200101000000Z", "-not_after", "20200102000000Z"], capture_output=True)
        if r.returncode != 0:
            raise RuntimeError("openssl cannot create an expired certificate here")
    return crt, key


def openssl_available() -> bool:
    return shutil.which("openssl") is not None


class TlsServer:
    def __init__(self, crt: str, key: str, client_ca: Optional[str] = None, min_version: Optional[ssl.TLSVersion] = None):
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ctx.load_cert_chain(crt, key)
        if client_ca:
            ctx.verify_mode = ssl.CERT_REQUIRED
            ctx.load_verify_locations(client_ca)
        if min_version:
            ctx.minimum_version = min_version
        self.ctx = ctx
        self.sock = socket.socket()
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.sock.bind(("127.0.0.1", 0))
        self.sock.listen(8)
        self.port = self.sock.getsockname()[1]
        self.alive = True
        threading.Thread(target=self._loop, daemon=True).start()

    def _loop(self) -> None:
        while self.alive:
            try:
                c, _ = self.sock.accept()
            except OSError:
                return
            try:
                with self.ctx.wrap_socket(c, server_side=True) as t:
                    t.recv(1)
            except (ssl.SSLError, OSError):
                pass

    def close(self) -> None:
        self.alive = False
        self.sock.close()


# --------------------------------------------------------------------------------------------- HTTP

class Http:
    """HTTP server with a table of routes: (method, path) -> handler(request_handler, body) -> (status, headers, body)."""

    def __init__(self, routes: Dict[Tuple[str, str], Callable[[BaseHTTPRequestHandler, bytes], Tuple[int, Dict[str, str], bytes]]]):
        table = routes

        class H(BaseHTTPRequestHandler):
            def log_message(self, *a: Any) -> None:  # silence
                pass

            def _do(self) -> None:
                n = int(self.headers.get("Content-Length") or 0)
                body = self.rfile.read(n) if n else b""
                path = self.path.split("?")[0]
                fn = table.get((self.command, path)) or table.get((self.command, "*"))
                if not fn:
                    st, hd, bd = 404, {}, b"not found"
                else:
                    st, hd, bd = fn(self, body)
                self.send_response_only(st)
                if "Date" not in hd:
                    self.send_header("Date", self.date_time_string())
                for k, v in hd.items():
                    self.send_header(k, v)
                self.send_header("Content-Length", str(len(bd)))
                self.end_headers()
                self.wfile.write(bd)

            do_GET = do_POST = do_PUT = do_DELETE = do_HEAD = _do

        self.srv = HTTPServer(("127.0.0.1", 0), H)
        self.port = self.srv.server_address[1]
        self.base = f"http://127.0.0.1:{self.port}"
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()

    def close(self) -> None:
        self.srv.shutdown()
        self.srv.server_close()


def jwt(claims: Dict[str, Any]) -> str:
    b = lambda d: base64.urlsafe_b64encode(json.dumps(d).encode()).rstrip(b"=").decode()  # noqa: E731
    return f"{b({'alg': 'none'})}.{b(claims)}."


def json_resp(obj: Any, status: int = 200, headers: Optional[Dict[str, str]] = None) -> Tuple[int, Dict[str, str], bytes]:
    return status, {"Content-Type": "application/json", **(headers or {})}, json.dumps(obj).encode()


# --------------------------------------------------------------------------------------------- PostgreSQL

class FakePostgres:
    """Implements trust, cleartext, md5 and scram-sha-256 and answers one simple query. `mode` picks the authentication."""

    def __init__(self, mode: str = "scram", user: str = "svc", password: str = "s3cret-pw"):
        self.mode, self.user, self.password = mode, user, password
        self.srv = Tcp(self._handle)
        self.port = self.srv.port

    def close(self) -> None:
        self.srv.close()

    @staticmethod
    def _msg(t: bytes, payload: bytes) -> bytes:
        return t + struct.pack("!I", len(payload) + 4) + payload

    def _read_msg(self, s: socket.socket) -> Tuple[bytes, bytes]:
        t = recv_exact(s, 1)
        (n,) = struct.unpack("!I", recv_exact(s, 4))
        return t, recv_exact(s, n - 4)

    def _handle(self, s: socket.socket) -> None:
        (n,) = struct.unpack("!I", recv_exact(s, 4))
        body = recv_exact(s, n - 4)
        if struct.unpack("!I", body[:4])[0] == 80877103:
            s.sendall(b"N")
            (n,) = struct.unpack("!I", recv_exact(s, 4))
            body = recv_exact(s, n - 4)
        params = body[4:].split(b"\0")
        user = params[params.index(b"user") + 1].decode()
        ok = False
        if self.mode == "trust":
            ok = True
        elif self.mode == "cleartext":
            s.sendall(self._msg(b"R", struct.pack("!I", 3)))
            t, p = self._read_msg(s)
            ok = p.rstrip(b"\0").decode() == self.password and user == self.user
        elif self.mode == "md5":
            salt = os.urandom(4)
            s.sendall(self._msg(b"R", struct.pack("!I", 5) + salt))
            t, p = self._read_msg(s)
            inner = hashlib.md5(self.password.encode() + self.user.encode()).hexdigest().encode()
            ok = p.rstrip(b"\0") == b"md5" + hashlib.md5(inner + salt).hexdigest().encode() and user == self.user
        elif self.mode == "scram":
            s.sendall(self._msg(b"R", struct.pack("!I", 10) + b"SCRAM-SHA-256\0\0"))
            t, p = self._read_msg(s)
            mech_end = p.index(b"\0")
            (dl,) = struct.unpack("!i", p[mech_end + 1 : mech_end + 5])
            first = p[mech_end + 5 : mech_end + 5 + dl].decode()
            bare = first[3:]
            cnonce = dict(x.split("=", 1) for x in bare.split(","))["r"]
            salt, iters = os.urandom(16), 4096
            snonce = cnonce + base64.b64encode(os.urandom(12)).decode()
            server_first = f"r={snonce},s={base64.b64encode(salt).decode()},i={iters}"
            s.sendall(self._msg(b"R", struct.pack("!I", 11) + server_first.encode()))
            t, p = self._read_msg(s)
            final = p.decode()
            attrs = dict(x.split("=", 1) for x in final.split(","))
            without_proof = final[: final.rindex(",p=")]
            salted = hashlib.pbkdf2_hmac("sha256", self.password.encode(), salt, iters)
            ck = hmac.new(salted, b"Client Key", hashlib.sha256).digest()
            auth_msg = f"{bare},{server_first},{without_proof}".encode()
            sig = hmac.new(hashlib.sha256(ck).digest(), auth_msg, hashlib.sha256).digest()
            proof = base64.b64decode(attrs["p"])
            ok = bytes(a ^ b for a, b in zip(proof, sig)) == ck and user == self.user
            if ok:
                sk = hmac.new(salted, b"Server Key", hashlib.sha256).digest()
                v = base64.b64encode(hmac.new(sk, auth_msg, hashlib.sha256).digest()).decode()
                s.sendall(self._msg(b"R", struct.pack("!I", 12) + f"v={v}".encode()))
        if not ok:
            s.sendall(self._msg(b"E", b"SFATAL\0C28P01\0Mpassword authentication failed for user \"" + user.encode() + b"\"\0\0"))
            return
        s.sendall(self._msg(b"R", struct.pack("!I", 0)) + self._msg(b"S", b"server_version\0" + b"16.3\0") + self._msg(b"Z", b"I"))
        t, p = self._read_msg(s)
        if t == b"Q":
            row = b"\0\1" + b"x\0" + struct.pack("!IhIhih", 0, 0, 23, 4, -1, 0)
            s.sendall(self._msg(b"T", row) + self._msg(b"D", struct.pack("!Hi", 1, 1) + b"1") + self._msg(b"C", b"SELECT 1\0") + self._msg(b"Z", b"I"))


# --------------------------------------------------------------------------------------------- Kafka

class FakeKafka:
    def __init__(self, topics: Optional[Dict[str, int]] = None, advertised_host: str = "127.0.0.1", advertised_port: int = 0):
        self.topics = topics if topics is not None else {"tx.events": 3}
        self.adv_host, self.adv_port = advertised_host, advertised_port
        self.srv = Tcp(self._handle)
        self.port = self.srv.port
        if not self.adv_port:
            self.adv_port = self.port

    def close(self) -> None:
        self.srv.close()

    def _handle(self, s: socket.socket) -> None:
        while True:
            (n,) = struct.unpack("!i", recv_exact(s, 4))
            req = recv_exact(s, n)
            api, ver, corr = struct.unpack("!hhi", req[:8])
            cl = struct.unpack("!h", req[8:10])[0]
            body = req[10 + max(cl, 0) :]
            if api == 18:
                apis = [(0, 0, 9), (1, 0, 12), (3, 0, 12), (18, 0, 3)]
                out = struct.pack("!ihi", corr, 0, len(apis)) + b"".join(struct.pack("!hhh", *a) for a in apis)
            elif api == 3:
                (nt,) = struct.unpack("!i", body[:4])
                o, names = 4, []
                for _ in range(nt):
                    (ln,) = struct.unpack("!h", body[o : o + 2]); o += 2
                    names.append(body[o : o + ln].decode()); o += ln
                h = self.adv_host.encode()
                out = struct.pack("!ii", corr, 1) + struct.pack("!ih", 0, len(h)) + h + struct.pack("!i", self.adv_port)
                out += struct.pack("!i", len(names))
                for nm in names:
                    nb = nm.encode()
                    if nm in self.topics:
                        parts = b"".join(struct.pack("!hii", 0, i, 0) + struct.pack("!i", 1) + struct.pack("!i", 0) + struct.pack("!i", 1) + struct.pack("!i", 0) for i in range(self.topics[nm]))
                        out += struct.pack("!hh", 0, len(nb)) + nb + struct.pack("!i", self.topics[nm]) + parts
                    else:
                        out += struct.pack("!hh", 3, len(nb)) + nb + struct.pack("!i", 0)
            else:
                return
            s.sendall(struct.pack("!i", len(out)) + out)


# --------------------------------------------------------------------------------------------- DNS (UDP)

class FakeDns:
    def __init__(self, records: Dict[str, List[Tuple[str, Any]]], rcode_for_unknown: int = 3):
        self.records, self.unknown = records, rcode_for_unknown
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.sock.bind(("127.0.0.1", 0))
        self.port = self.sock.getsockname()[1]
        self.alive = True
        threading.Thread(target=self._loop, daemon=True).start()

    def _loop(self) -> None:
        while self.alive:
            try:
                data, addr = self.sock.recvfrom(512)
            except OSError:
                return
            txid = data[:2]
            o, labels = 12, []
            while data[o]:
                labels.append(data[o + 1 : o + 1 + data[o]].decode()); o += 1 + data[o]
            qname = ".".join(labels)
            qsec = data[12 : o + 5]
            recs = self.records.get(qname)
            if recs is None:
                self.sock.sendto(txid + struct.pack("!HHHHH", 0x8180 | self.unknown, 1, 0, 0, 0) + qsec, addr)
                continue
            ans = b""
            for kind, val in recs:
                name = b"\xc0\x0c"
                if kind == "A":
                    rd = socket.inet_aton(val); t = 1
                else:
                    rd = b"".join(bytes([len(p)]) + p.encode() for p in val.split(".")) + b"\0"; t = 5
                ans += name + struct.pack("!HHIH", t, 1, 300 if kind == "A" else 60, len(rd)) + rd
            self.sock.sendto(txid + struct.pack("!HHHHH", 0x8180, 1, len(recs), 0, 0) + qsec + ans, addr)

    def close(self) -> None:
        self.alive = False
        self.sock.close()


# --------------------------------------------------------------------------------------------- HTTP CONNECT proxy

class FakeProxy:
    """Allows CONNECT only to hosts in `allow`; answers 403 for others and 407 when `require_auth` is set."""

    def __init__(self, allow: List[str], require_auth: bool = False):
        self.allow, self.require_auth = allow, require_auth
        self.seen: List[str] = []
        self.srv = Tcp(self._handle)
        self.port = self.srv.port

    def close(self) -> None:
        self.srv.close()

    def _handle(self, s: socket.socket) -> None:
        buf = b""
        while b"\r\n\r\n" not in buf:
            buf += s.recv(4096)
        head = buf.decode("latin1")
        first = head.split("\r\n")[0].split()
        target = first[1]
        self.seen.append(target)
        if self.require_auth and "Proxy-Authorization" not in head:
            s.sendall(b"HTTP/1.1 407 Proxy Authentication Required\r\nProxy-Authenticate: Basic\r\n\r\n")
            return
        host, _, port = target.rpartition(":")
        if host not in self.allow:
            s.sendall(b"HTTP/1.1 403 Forbidden\r\n\r\n")
            return
        up = socket.create_connection((host, int(port)), timeout=3)
        s.sendall(b"HTTP/1.1 200 Connection established\r\n\r\n")
        s.settimeout(1.0)
        up.settimeout(1.0)

        def pump(a: socket.socket, b: socket.socket) -> None:
            try:
                while True:
                    d = a.recv(4096)
                    if not d:
                        break
                    b.sendall(d)
            except OSError:
                pass

        t = threading.Thread(target=pump, args=(up, s), daemon=True)
        t.start()
        pump(s, up)
        up.close()
