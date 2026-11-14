"""HL7 v2.x: parser, ACK builder, MLLP framing, and a threaded MLLP server and client with duplicate handling and error recovery."""
from __future__ import annotations

import datetime as dt
import socket
import socketserver
import threading
import uuid
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Tuple

VT, FS, CR = b"\x0b", b"\x1c", b"\x0d"
ESC_TABLE = {"F": "|", "S": "^", "T": "&", "R": "~", "E": "\\"}


class Hl7Error(ValueError):
    """The message cannot be accepted as sent: the sender must fix it (it is answered with AR, never retried)."""


@dataclass
class Segment:
    name: str
    fields: List[str]  # fields[0] is the segment name; for MSH, fields[1] is MSH-2 (encoding characters), so MSH-n is fields[n-1]

    def f(self, n: int) -> str:
        i = n - 1 if self.name == "MSH" else n
        return self.fields[i] if 0 <= i < len(self.fields) else ""


@dataclass
class Message:
    segments: List[Segment]
    raw: str = ""
    enc: str = "^~\\&"

    def seg(self, name: str) -> Optional[Segment]:
        return next((s for s in self.segments if s.name == name), None)

    def segs(self, name: str) -> List[Segment]:
        return [s for s in self.segments if s.name == name]

    @property
    def msh(self) -> Segment:
        return self.segments[0]

    @property
    def type(self) -> str:
        return self.msh.f(9)  # e.g. ADT^A01^ADT_A01

    @property
    def trigger(self) -> str:
        parts = self.type.split(self.enc[0])
        return "^".join(parts[:2]) if len(parts) > 1 else self.type

    @property
    def control_id(self) -> str:
        return self.msh.f(10)

    def comp(self, value: str, i: int, sub: int = 0) -> str:
        """The i-th component (1-based) of a field value; a repetition is cut at ~ first."""
        first = value.split(self.enc[1])[0]
        parts = first.split(self.enc[0])
        c = parts[i - 1] if 0 < i <= len(parts) else ""
        if sub:
            sp = c.split(self.enc[3])
            return sp[sub - 1] if sub <= len(sp) else ""
        return c


def unescape(s: str, enc: str = "^~\\&") -> str:
    out, i = [], 0
    esc = enc[2]
    while i < len(s):
        if s[i] == esc and (j := s.find(esc, i + 1)) > i:
            code = s[i + 1 : j]
            out.append({"F": enc[0] if False else "|", "S": enc[0], "T": enc[3], "R": enc[1], "E": esc}.get(code, "\n" if code == ".br" else s[i : j + 1]))
            i = j + 1
        else:
            out.append(s[i])
            i += 1
    return "".join(out)


def parse(text: str) -> Message:
    text = text.strip("\x0b\x1c\r\n ").replace("\r\n", "\r").replace("\n", "\r")
    if not text.startswith("MSH") or len(text) < 8:
        raise Hl7Error("message does not start with an MSH segment")
    enc = text[4:8]
    if len(set(enc)) != 4:
        raise Hl7Error(f"invalid encoding characters {enc!r}")
    fs = text[3]
    segs: List[Segment] = []
    for line in [l for l in text.split("\r") if l]:
        name = line[:3]
        if not name.isalnum() or not name.isupper() and not name[0].isalpha():
            raise Hl7Error(f"invalid segment name {name!r}")
        if name == "MSH":
            segs.append(Segment("MSH", ["MSH", enc, *line[9:].split(fs)] if len(line) > 8 else ["MSH", enc]))
            # fields[0]="MSH", fields[1]=MSH-2; MSH-3 onward follow after the separator that ends the encoding characters
        else:
            segs.append(Segment(name, line.split(fs)))
    m = Message(segs, text, enc)
    return m


def validate(m: Message, *, allowed_versions: Tuple[str, ...] = ("2.3", "2.3.1", "2.4", "2.5", "2.5.1", "2.6", "2.7")) -> None:
    if not m.control_id:
        raise Hl7Error("MSH-10 (message control id) is missing")
    if not m.type:
        raise Hl7Error("MSH-9 (message type) is missing")
    v = m.msh.f(12).split("^")[0]
    if v and v not in allowed_versions:
        raise Hl7Error(f"HL7 version {v} is not supported (supported: {', '.join(allowed_versions)})")
    if m.type.startswith("ADT") and not m.seg("PID"):
        raise Hl7Error("ADT message without a PID segment")
    if m.type.startswith("ORU") and not m.segs("OBX"):
        raise Hl7Error("ORU message without OBX segments")


def hl7_time(ts: str) -> Optional[str]:
    """HL7 timestamp (YYYY[MM[DD[HH[MM[SS[.S+]]]]]][+/-ZZZZ]) -> UTC ISO 8601, assuming UTC when no offset is given."""
    if not ts:
        return None
    s, tz = ts, dt.timezone.utc
    for sign in "+-":
        if sign in s[8:]:
            i = s.index(sign, 8)
            off = s[i:]
            s = s[:i]
            h, mi = int(off[1:3]), int(off[3:5] or 0)
            tz = dt.timezone(dt.timedelta(hours=h, minutes=mi) * (1 if sign == "+" else -1))
            break
    s = s.split(".")[0]
    fmt = {4: "%Y", 6: "%Y%m", 8: "%Y%m%d", 10: "%Y%m%d%H", 12: "%Y%m%d%H%M", 14: "%Y%m%d%H%M%S"}.get(len(s))
    if not fmt:
        raise Hl7Error(f"bad HL7 timestamp {ts!r}")
    return dt.datetime.strptime(s, fmt).replace(tzinfo=tz).astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def build_ack(m: Optional[Message], code: str = "AA", text: str = "", *, sending_app: str = "BRAINSIPHON", sending_fac: str = "FDE", now: Optional[dt.datetime] = None) -> str:
    """ACK for a received message. AA accepted, AE application error (sender may retry), AR rejected (sender must fix). Echoes MSH-10 in MSA-2."""
    now = now or dt.datetime.now(dt.timezone.utc)
    ts = now.strftime("%Y%m%d%H%M%S")
    recv_app, recv_fac = (m.msh.f(3), m.msh.f(4)) if m else ("", "")
    ctl = m.control_id if m else ""
    ver = (m.msh.f(12) if m else "") or "2.5.1"
    segs = [f"MSH|^~\\&|{sending_app}|{sending_fac}|{recv_app}|{recv_fac}|{ts}||ACK^{m.trigger.split('^')[1] if m and '^' in m.trigger else 'A01'}|ACK{uuid.uuid4().hex[:12]}|P|{ver}",
            f"MSA|{code}|{ctl}" + (f"|{text}" if text else "")]
    if code != "AA":
        segs.append(f"ERR|||{'207' if code == 'AE' else '203'}^{'Application internal error' if code == 'AE' else 'Unsupported version or invalid message'}^HL70357|E||||{text}")
    return "\r".join(segs) + "\r"


def frame(msg: str) -> bytes:
    return VT + msg.replace("\n", "\r").encode("utf-8") + FS + CR


def read_frame(sock: socket.socket, limit: int = 4_000_000) -> Optional[str]:
    buf = b""
    while True:
        c = sock.recv(4096)
        if not c:
            return None if not buf else buf.decode("utf-8", "replace")
        buf += c
        if FS + CR in buf or len(buf) > limit:
            break
    if VT not in buf:
        raise Hl7Error("no MLLP start block (0x0B): the sender is not using MLLP framing")
    return buf[buf.index(VT) + 1 : buf.index(FS)].decode("utf-8", "replace")


class MllpServer:
    """Receives HL7 over MLLP. `on_message(msg)` returns normally for AA, raises RuntimeError for AE (sender retries), Hl7Error for AR.

    A message whose control id was already accepted is acknowledged AA again and not passed to the handler a second time."""

    def __init__(self, on_message: Callable[[Message], None], host: str = "127.0.0.1", port: int = 0, seen: Optional[Any] = None):
        self.on_message, self.seen = on_message, seen
        self.accepted: List[str] = []
        self.duplicates = 0
        self.rejected: List[Tuple[str, str]] = []
        self.errors: List[str] = []
        self._lock = threading.Lock()
        outer = self

        class H(socketserver.BaseRequestHandler):
            def handle(self) -> None:
                s: socket.socket = self.request
                s.settimeout(10)
                while True:
                    try:
                        text = read_frame(s)
                    except Hl7Error as e:
                        s.sendall(frame(build_ack(None, "AR", str(e))))
                        return
                    except (socket.timeout, ConnectionError):
                        return
                    if text is None:
                        return
                    s.sendall(frame(outer._process(text)))

        class S(socketserver.ThreadingTCPServer):
            allow_reuse_address = True
            daemon_threads = True

        self.srv = S((host, port), H)
        self.port = self.srv.server_address[1]
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()

    def _process(self, text: str) -> str:
        try:
            m = parse(text)
            validate(m)
        except Hl7Error as e:
            with self._lock:
                self.rejected.append(("", str(e)))
            return build_ack(None, "AR", str(e))
        with self._lock:
            if m.control_id in self.accepted:
                self.duplicates += 1
                return build_ack(m, "AA", "duplicate acknowledged")
        try:
            self.on_message(m)
        except Hl7Error as e:
            with self._lock:
                self.rejected.append((m.control_id, str(e)))
            return build_ack(m, "AR", str(e))
        except Exception as e:  # noqa: BLE001 - the application failed: tell the sender to retry later
            with self._lock:
                self.errors.append(f"{m.control_id}: {e}")
            return build_ack(m, "AE", "temporary failure, please retry")
        with self._lock:
            self.accepted.append(m.control_id)
        return build_ack(m, "AA")

    def close(self) -> None:
        self.srv.shutdown()
        self.srv.server_close()


def send(host: str, port: int, message: str, *, timeout: float = 5.0, retries: int = 3, backoff: float = 0.1) -> Tuple[str, str]:
    """Send one message and return (ack code, ack text). Retries on AE, a timeout or a reset, with the same control id; never on AR."""
    import time
    last = ""
    for attempt in range(1, retries + 1):
        try:
            with socket.create_connection((host, port), timeout=timeout) as s:
                s.settimeout(timeout)
                s.sendall(frame(message))
                ack = read_frame(s)
            if ack is None:
                raise ConnectionError("connection closed before an acknowledgement")
            a = parse(ack)
            msa = a.seg("MSA")
            code, text = (msa.f(1), msa.f(3)) if msa else ("", "")
            if code == "AA":
                return code, text
            if code == "AR":
                return code, text
            last = f"{code} {text}"
        except (OSError, Hl7Error) as e:
            last = str(e)
        time.sleep(backoff * (2 ** (attempt - 1)))
    return "NO_ACK", last
