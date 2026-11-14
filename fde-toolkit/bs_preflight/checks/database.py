"""Database connectivity without database drivers.

PostgreSQL: a real login (trust, cleartext, MD5 and SCRAM-SHA-256) and `SELECT 1` using the wire protocol, so a jump host with
no pip access can still prove the credentials and the network path. MySQL and SQL Server: protocol greeting (version,
encryption). Oracle: TCP plus a TNS listener ping, best effort. When an installed driver is found it is used for a real login.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import os
import socket
import ssl
import struct
from typing import Any, Dict, List, Optional, Tuple

from ..model import CheckResult, Context, FAIL, PASS, WARN, register_secret
from ..netutil import classify_error, connect, make_ssl_context

DEFAULT_PORTS = {"postgres": 5432, "mysql": 3306, "sqlserver": 1433, "oracle": 1521}


# ------------------------------------------------------------------------------------------- PostgreSQL

def _recv_exact(s: socket.socket, n: int) -> bytes:
    buf = b""
    while len(buf) < n:
        chunk = s.recv(n - len(buf))
        if not chunk:
            raise ConnectionError("connection closed by the server")
        buf += chunk
    return buf


def _pg_read(s: socket.socket) -> Tuple[bytes, bytes]:
    t = _recv_exact(s, 1)
    (ln,) = struct.unpack("!I", _recv_exact(s, 4))
    return t, _recv_exact(s, ln - 4)


def _pg_send(s: socket.socket, t: bytes, payload: bytes) -> None:
    s.sendall(t + struct.pack("!I", len(payload) + 4) + payload)


def scram_client_first(nonce: str, user: str = "") -> Tuple[str, str]:
    bare = f"n={user},r={nonce}"
    return bare, "n,," + bare


def scram_client_final(password: str, client_first_bare: str, server_first: str) -> Tuple[str, bytes]:
    """RFC 5802 / RFC 7677 SCRAM-SHA-256 client step. Returns the client-final message and the server signature to verify."""
    attrs = dict(p.split("=", 1) for p in server_first.split(","))
    salt, iters, nonce = base64.b64decode(attrs["s"]), int(attrs["i"]), attrs["r"]
    salted = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iters)
    client_key = hmac.new(salted, b"Client Key", hashlib.sha256).digest()
    stored = hashlib.sha256(client_key).digest()
    without_proof = f"c=biws,r={nonce}"
    auth_message = f"{client_first_bare},{server_first},{without_proof}".encode()
    sig = hmac.new(stored, auth_message, hashlib.sha256).digest()
    proof = bytes(a ^ b for a, b in zip(client_key, sig))
    server_key = hmac.new(salted, b"Server Key", hashlib.sha256).digest()
    server_sig = hmac.new(server_key, auth_message, hashlib.sha256).digest()
    return f"{without_proof},p={base64.b64encode(proof).decode()}", server_sig


def pg_login(host: str, port: int, user: str, password: str, database: str, timeout: float, proxy: Dict[str, Any],
             want_tls: bool = False, ca_file: Optional[str] = None, query: str = "SELECT 1") -> Dict[str, Any]:
    s = connect(host, port, timeout, proxy)
    s.settimeout(timeout)
    out: Dict[str, Any] = {"tls": False}
    try:
        if want_tls:
            s.sendall(struct.pack("!II", 8, 80877103))
            ans = _recv_exact(s, 1)
            if ans != b"S":
                raise ssl.SSLError("server does not accept TLS (answered 'N') but TLS was required")
            s = make_ssl_context(ca_file).wrap_socket(s, server_hostname=host)
            out["tls"] = True
        params = f"user\0{user}\0database\0{database}\0\0".encode()
        s.sendall(struct.pack("!II", len(params) + 8, 196608) + params)
        server_sig: Optional[bytes] = None
        bare = ""
        server_first = ""
        while True:
            t, p = _pg_read(s)
            if t == b"E":
                raise PermissionError(_pg_error(p))
            if t == b"R":
                (code,) = struct.unpack("!I", p[:4])
                out["auth_method"] = {0: "trust", 3: "cleartext", 5: "md5", 10: "scram-sha-256", 11: "scram-continue", 12: "scram-final"}.get(code, str(code))
                if code == 0:
                    continue
                if code == 3:
                    _pg_send(s, b"p", password.encode() + b"\0")
                elif code == 5:
                    inner = hashlib.md5(password.encode() + user.encode()).hexdigest().encode()
                    _pg_send(s, b"p", b"md5" + hashlib.md5(inner + p[4:8]).hexdigest().encode() + b"\0")
                elif code == 10:
                    mechs = [m for m in p[4:].split(b"\0") if m]
                    if b"SCRAM-SHA-256" not in mechs:
                        raise PermissionError(f"server offers only {mechs!r}; SCRAM-SHA-256 is required by this client")
                    bare, first = scram_client_first(base64.b64encode(os.urandom(18)).decode())
                    body = first.encode()
                    _pg_send(s, b"p", b"SCRAM-SHA-256\0" + struct.pack("!i", len(body)) + body)
                elif code == 11:
                    server_first = p[4:].decode()
                    final, server_sig = scram_client_final(password, bare, server_first)
                    _pg_send(s, b"p", final.encode())
                elif code == 12:
                    v = dict(x.split("=", 1) for x in p[4:].decode().split(","))
                    if server_sig is None or base64.b64decode(v.get("v", "")) != server_sig:
                        raise PermissionError("server signature did not verify: the server does not know the password")
                else:
                    raise PermissionError(f"unsupported authentication method code {code}")
            elif t == b"S":
                k, _, v = p.rstrip(b"\0").partition(b"\0")
                if k == b"server_version":
                    out["server_version"] = v.decode()
            elif t == b"Z":
                break
        _pg_send(s, b"Q", query.encode() + b"\0")
        rows: List[List[str]] = []
        while True:
            t, p = _pg_read(s)
            if t == b"D":
                (n,) = struct.unpack("!H", p[:2])
                off, row = 2, []
                for _ in range(n):
                    (ln,) = struct.unpack("!i", p[off : off + 4])
                    off += 4
                    if ln >= 0:
                        row.append(p[off : off + ln].decode("utf-8", "replace"))
                        off += ln
                    else:
                        row.append("NULL")
                rows.append(row)
            elif t == b"E":
                raise PermissionError(_pg_error(p))
            elif t == b"Z":
                break
        out["rows"] = rows[:5]
        try:
            _pg_send(s, b"X", b"")
        except OSError:
            pass
        return out
    finally:
        try:
            s.close()
        except OSError:
            pass


def _pg_error(p: bytes) -> str:
    fields = {}
    for part in p.split(b"\0"):
        if part:
            fields[chr(part[0])] = part[1:].decode("utf-8", "replace")
    return f"{fields.get('S', 'ERROR')} {fields.get('C', '')}: {fields.get('M', '')}".strip()


# ------------------------------------------------------------------------------------------- MySQL / SQL Server / Oracle

def mysql_greeting(host: str, port: int, timeout: float, proxy: Dict[str, Any]) -> Dict[str, Any]:
    s = connect(host, port, timeout, proxy)
    s.settimeout(timeout)
    try:
        hdr = _recv_exact(s, 4)
        ln = hdr[0] | hdr[1] << 8 | hdr[2] << 16
        body = _recv_exact(s, ln)
    finally:
        s.close()
    if body[0] == 0xFF:
        raise PermissionError("server refused the connection: " + body[3:].decode("utf-8", "replace"))
    if body[0] != 10:
        raise ValueError(f"unexpected MySQL protocol version {body[0]}")
    end = body.index(b"\0", 1)
    version = body[1:end].decode()
    rest = body[end + 1 :]
    caps = struct.unpack("<H", rest[13:15])[0] if len(rest) >= 15 else 0
    return {"server_version": version, "ssl_supported": bool(caps & 0x0800)}


def tds_prelogin(host: str, port: int, timeout: float, proxy: Dict[str, Any]) -> Dict[str, Any]:
    """TDS pre-login exchange: reveals the SQL Server version and whether it requires encryption."""
    # option table: VERSION@21 (6), ENCRYPTION@27 (1), INSTOPT@28 (12), THREADID@40 (4), then the terminator
    table = b"\x00\x00\x15\x00\x06" + b"\x01\x00\x1b\x00\x01" + b"\x02\x00\x1c\x00\x0c" + b"\x03\x00\x28\x00\x04" + b"\xff"
    payload = table + b"\x0f\x00\x07\xd0\x00\x00" + b"\x00" + b"MSSQLServer\x00" + b"\x00\x00\x00\x00"
    pkt = bytes([0x12, 0x01]) + struct.pack("!H", len(payload) + 8) + b"\x00\x00\x01\x00" + payload
    s = connect(host, port, timeout, proxy)
    s.settimeout(timeout)
    try:
        s.sendall(pkt)
        hdr = _recv_exact(s, 8)
        ln = struct.unpack("!H", hdr[2:4])[0]
        body = _recv_exact(s, ln - 8)
    finally:
        s.close()
    if hdr[0] != 0x04:
        raise ValueError(f"unexpected TDS packet type {hdr[0]:#x}")
    o, enc, ver = 0, None, None
    while o < len(body) and body[o] != 0xFF:
        tok, off, ln2 = body[o], struct.unpack("!H", body[o + 1 : o + 3])[0], struct.unpack("!H", body[o + 3 : o + 5])[0]
        if tok == 0x00 and ln2 >= 4:
            ver = f"{body[off]}.{body[off + 1]}.{struct.unpack('!H', body[off + 2 : off + 4])[0]}"
        if tok == 0x01:
            enc = {0: "off", 1: "on", 2: "not_supported", 3: "required"}.get(body[off], str(body[off]))
        o += 5
    return {"server_version": ver, "encryption": enc}


def tns_ping(host: str, port: int, timeout: float, proxy: Dict[str, Any]) -> Dict[str, Any]:
    data = b"(CONNECT_DATA=(COMMAND=ping))"
    body = struct.pack("!HHHHHHHHHHIBB", 314, 300, 0x0C41, 2048, 32767, 0x7F08, 0, 1, len(data), 58, 0, 0x41, 0x41) + b"\0" * 16
    pkt = struct.pack("!HHBBH", 8 + len(body) + len(data), 0, 1, 0, 0) + body + data
    s = connect(host, port, timeout, proxy)
    s.settimeout(timeout)
    try:
        s.sendall(pkt)
        hdr = _recv_exact(s, 8)
        ln = struct.unpack("!H", hdr[:2])[0]
        rest = s.recv(max(0, ln - 8)) if ln > 8 else b""
    finally:
        s.close()
    kind = {2: "accept", 4: "refuse", 5: "redirect", 11: "resend"}.get(hdr[4], f"type {hdr[4]}")
    text = rest.decode("latin1", "replace")
    return {"tns_reply": kind, "listener_alive": hdr[4] in (2, 5, 11) or "(ERR=0)" in text, "detail": text[:160]}


# ------------------------------------------------------------------------------------------- optional drivers

def driver_login(cfg: Dict[str, Any], user: str, password: str) -> Optional[Dict[str, Any]]:
    """Use an installed driver for a real login on engines the standard library cannot speak. None when no driver exists."""
    typ = cfg["type"]
    host, port, db = cfg["host"], int(cfg.get("port", DEFAULT_PORTS[typ])), cfg.get("database", "")
    try:
        if typ == "sqlserver":
            import pyodbc  # type: ignore

            drv = cfg.get("odbc_driver", "ODBC Driver 18 for SQL Server")
            conn = pyodbc.connect(f"DRIVER={{{drv}}};SERVER={host},{port};DATABASE={db};UID={user};PWD={password};Encrypt=yes;TrustServerCertificate={'yes' if cfg.get('trust_server_certificate') else 'no'}", timeout=5)
            conn.cursor().execute(cfg.get("query", "SELECT 1")).fetchall()
            conn.close()
            return {"driver": "pyodbc"}
        if typ == "oracle":
            import oracledb  # type: ignore

            conn = oracledb.connect(user=user, password=password, dsn=f"{host}:{port}/{cfg.get('service_name', db)}")
            conn.cursor().execute(cfg.get("query", "SELECT 1 FROM DUAL"))
            conn.close()
            return {"driver": "oracledb"}
        if typ == "mysql":
            import pymysql  # type: ignore

            conn = pymysql.connect(host=host, port=port, user=user, password=password, database=db, connect_timeout=5)
            conn.cursor().execute(cfg.get("query", "SELECT 1"))
            conn.close()
            return {"driver": "pymysql"}
    except ImportError:
        return None
    return None


# ------------------------------------------------------------------------------------------- the check

def run(item: Dict[str, Any], ctx: Context) -> List[CheckResult]:
    typ, name = item["type"], item["name"]
    host, port = item["host"], int(item.get("port", DEFAULT_PORTS[typ]))
    base = dict(id=f"db.{name}", name=f"Database ({typ}): {name}", category="database", target=f"{host}:{port}", owner_hint=item.get("owner", "Customer DBA / data platform team"))
    severity = item.get("severity", "blocking")
    proxy = ctx.proxy if item.get("via_proxy") else {"no_proxy": "*"}
    user = register_secret(item["user_env"]) if item.get("user_env") else None
    pw = register_secret(item["password_env"]) if item.get("password_env") else None
    timeout = float(item.get("timeout", ctx.timeout))
    try:
        if typ == "postgres":
            if not (user and pw):
                s = connect(host, port, timeout, proxy)
                s.close()
                return [CheckResult(**base, status=WARN, severity="advisory", message="port reachable; no credentials supplied so no login was attempted", details={"hint": "set user_env and password_env"}, remediation="Supply a read-only service account to prove login and permissions.")]
            info = pg_login(host, port, user, pw, item.get("database", user), timeout, proxy, bool(item.get("tls")), item.get("ca_file") or ctx.ca_file, item.get("query", "SELECT 1"))
            return [CheckResult(**base, status=PASS, severity=severity, message=f"logged in via {info.get('auth_method')}, query returned {info.get('rows')}", details=info)]
        if typ == "mysql":
            info = mysql_greeting(host, port, timeout, proxy)
            if user and pw:
                d = driver_login(item, user, pw)
                if d:
                    info.update(d)
                else:
                    return [CheckResult(**base, status=WARN, severity="advisory", message="server reachable (greeting parsed); no MySQL driver installed so login was not attempted", details=info, remediation="Install pymysql from the customer's internal package index, or run the login test from the application image.")]
            return [CheckResult(**base, status=PASS, severity=severity, message=f"MySQL {info['server_version']} reachable", details=info)]
        if typ == "sqlserver":
            info = tds_prelogin(host, port, timeout, proxy)
            if user and pw:
                d = driver_login(item, user, pw)
                if d:
                    info.update(d)
                else:
                    return [CheckResult(**base, status=WARN, severity="advisory", message=f"SQL Server {info.get('server_version')} reachable (encryption {info.get('encryption')}); no ODBC driver installed so login was not attempted", details=info, remediation="Install pyodbc and the Microsoft ODBC driver from the customer's mirror, or test from the application image.")]
            return [CheckResult(**base, status=PASS, severity=severity, message=f"SQL Server {info.get('server_version')} reachable, encryption {info.get('encryption')}", details=info)]
        if typ == "oracle":
            info = tns_ping(host, port, timeout, proxy)
            if user and pw:
                d = driver_login(item, user, pw)
                if d:
                    info.update(d)
            if info["listener_alive"]:
                return [CheckResult(**base, status=PASS, severity=severity, message=f"Oracle listener answered ({info['tns_reply']})", details=info)]
            return [CheckResult(**base, status=WARN, severity="advisory", message=f"port open but the reply was not recognised as a TNS listener ({info['tns_reply']})", details=info, remediation="Confirm the port with the DBA; check for a TLS-only listener (tcps) or a proxy in front of it.")]
        return [CheckResult(**base, status=FAIL, severity=severity, message=f"unsupported database type {typ}")]
    except PermissionError as e:
        return [CheckResult(**base, status=FAIL, severity=severity, message=f"login rejected: {e}", details={"error": str(e)}, remediation="The network path works; the account does not. Check the user, the database name, pg_hba.conf or its equivalent for this source address, and the password rotation date.")]
    except Exception as e:  # noqa: BLE001
        code, hint = classify_error(e)
        return [CheckResult(**base, status=FAIL, severity=severity, message=f"connection failed ({code})", details={"error": str(e), "reason": code}, remediation=hint)]
