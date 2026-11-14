"""A payment-switch simulator and fraud gateway in one process: the integration boundary you will build against the customer's switch.

The gateway speaks ISO 8583 over TCP (two-byte length header), maps each request to the internal contract, decides through the ledger
(once per transaction), and answers inside the switch's deadline. When the model cannot answer in time it falls back to the legacy
rules (stand-in processing) and records that it did, so reconciliation can see it.
"""
from __future__ import annotations

import socket
import socketserver
import struct
import threading
import time
from typing import Any, Dict, List, Optional

from .hsm import Tokeniser
from .iso8583 import IsoError, IsoMessage, frame, pack, respond, unpack
from .ledger import Conflict, Ledger
from .mapping import Decision, to_score_request, to_switch_response
from .scorer import ScoreTimeout, legacy_rules


class Gateway:
    def __init__(self, scorer: Any, tok: Tokeniser, ledger: Optional[Ledger] = None, *, deadline_ms: float = 15.0, partial_supported: bool = False,
                 canary: Optional[Any] = None, bitmap: str = "hex", host: str = "127.0.0.1", port: int = 0):
        self.scorer, self.tok, self.ledger = scorer, tok, ledger or Ledger()
        self.deadline_ms, self.partial_supported, self.canary, self.bitmap = deadline_ms, partial_supported, canary, bitmap
        self.latencies_ms: List[float] = []
        self.stats = {"scored": 0, "fallback": 0, "duplicates": 0, "reversals": 0, "advices": 0, "conflicts": 0, "format_errors": 0}
        outer = self

        class H(socketserver.BaseRequestHandler):
            def handle(self) -> None:
                s: socket.socket = self.request
                s.settimeout(10)
                try:
                    while True:
                        hdr = _recv(s, 2)
                        if not hdr:
                            return
                        (n,) = struct.unpack("!H", hdr)
                        s.sendall(outer.handle_bytes(_recv(s, n)))
                except (OSError, ConnectionError):
                    return

        class S(socketserver.ThreadingTCPServer):
            allow_reuse_address = True
            daemon_threads = True

        self.srv = S((host, port), H)
        self.port = self.srv.server_address[1]
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()

    def close(self) -> None:
        self.srv.shutdown()
        self.srv.server_close()

    # ------------------------------------------------------------------------------------------------------------------------
    def handle_bytes(self, data: bytes) -> bytes:
        t0 = time.perf_counter()
        try:
            m = unpack(data, bitmap=self.bitmap)
        except IsoError:
            self.stats["format_errors"] += 1
            return frame(pack(IsoMessage("0110", {39: "30"}), bitmap=self.bitmap))  # format error: the switch must fix the message
        resp = self.handle(m)
        self.latencies_ms.append((time.perf_counter() - t0) * 1000)
        return frame(pack(resp, bitmap=self.bitmap))

    def handle(self, m: IsoMessage) -> IsoMessage:
        if m.mti in ("0100", "0101", "0200", "0201"):
            return self._authorise(m)
        if m.mti in ("0400", "0401", "0420", "0421"):
            self.stats["reversals"] += 1
            orig = m.get(90)  # original MTI(4) STAN(6) transmission datetime(10) acquirer(11) forwarding(11)
            key = self._original_key(m, orig)
            self.ledger.reverse(key)
            return respond(IsoMessage("0400" if m.mti[2] in "01" else "0420", m.f), "00")  # a reversal is always accepted
        if m.mti in ("0120", "0121", "0220", "0221"):
            self.stats["advices"] += 1
            self.ledger.record("advice", Ledger.key_of(m), f"de39={m.get(39)}")  # an advice reports what already happened: record, never decline
            return respond(IsoMessage("0120" if m.mti[1] == "1" else "0220", m.f), "00")
        if m.mti in ("0800", "0801"):
            return respond(IsoMessage("0800", m.f), "00")
        return respond(IsoMessage("0100", m.f), "30")

    def _original_key(self, rev: IsoMessage, de90: str) -> str:
        if len(de90) < 42:
            return "unknown"
        omti, ostan, otime, oacq = de90[:4], de90[4:10], de90[10:20], de90[20:31].lstrip("0")
        orig = IsoMessage(omti, {32: rev.get(32), 37: rev.get(37), 11: ostan, 41: rev.get(41), 7: otime})
        return Ledger.key_of(orig)

    def _authorise(self, m: IsoMessage) -> IsoMessage:
        try:
            req = to_score_request(m, self.tok)
        except ValueError:
            return respond(IsoMessage("0100" if m.mti[1] == "1" else "0200", m.f), "30")

        def compute() -> Dict[str, Any]:
            use_model = self.canary.use_model(req["card_token"]) if self.canary else True
            if not use_model:
                d = legacy_rules(req)
                d.source = "legacy"
            else:
                try:
                    d = self.scorer.score(req, self.deadline_ms)
                    self.stats["scored"] += 1
                except (ScoreTimeout, ConnectionError, OSError) as e:
                    d = legacy_rules(req)
                    d.source = "stand-in"
                    d.reason_codes = [*d.reason_codes, f"STAND_IN:{type(e).__name__}"]
                    self.stats["fallback"] += 1
                if self.canary:
                    self.canary.observe(d.source == "model")
            return {"action": d.action, "score": d.score, "reason_codes": d.reason_codes, "model_version": d.model_version, "source": d.source, "approved_amount_minor": d.approved_amount_minor, "transaction_id": req["transaction_id"]}

        try:
            dec, replayed = self.ledger.decide(m, compute)
        except Conflict:
            self.stats["conflicts"] += 1
            return respond(IsoMessage("0100" if m.mti[1] == "1" else "0200", m.f), "94")
        except TimeoutError:
            return respond(IsoMessage("0100" if m.mti[1] == "1" else "0200", m.f), "91")
        if replayed:
            self.stats["duplicates"] += 1
        d = Decision(dec["action"], dec["score"], dec["reason_codes"], dec["model_version"], dec["source"], dec.get("approved_amount_minor"))
        return to_switch_response(IsoMessage("0100" if m.mti[1] == "1" else "0200", m.f), d, partial_supported=self.partial_supported)


def _recv(s: socket.socket, n: int) -> bytes:
    b = b""
    while len(b) < n:
        c = s.recv(n - len(b))
        if not c:
            return b"" if not b else b
        b += c
    return b


class SwitchClient:
    """What the customer's switch does: sends a framed request and waits for the response within its own timeout."""

    def __init__(self, host: str, port: int, timeout_ms: float = 200.0, bitmap: str = "hex"):
        self.host, self.port, self.timeout, self.bitmap = host, port, timeout_ms / 1000, bitmap

    def send(self, m: IsoMessage) -> IsoMessage:
        with socket.create_connection((self.host, self.port), timeout=self.timeout) as s:
            s.settimeout(self.timeout)
            s.sendall(frame(pack(m, bitmap=self.bitmap)))
            (n,) = struct.unpack("!H", _recv(s, 2))
            return unpack(_recv(s, n), bitmap=self.bitmap)
