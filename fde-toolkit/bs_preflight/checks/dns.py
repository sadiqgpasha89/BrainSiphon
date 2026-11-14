"""DNS and private-endpoint checks.

Two paths: the system resolver (what applications will really use) and, when `resolver` is given, a hand-built UDP query to
that resolver so the CNAME chain and TTL are visible. The second path is how a private-endpoint (privatelink, private zone)
mistake is told apart from a plain outage.
"""
from __future__ import annotations

import ipaddress
import random
import socket
import struct
from typing import Any, Dict, List, Optional, Tuple

from ..model import CheckResult, Context, FAIL, PASS, WARN, ADVISORY, Timer
from ..netutil import classify_error

QTYPES = {"A": 1, "NS": 2, "CNAME": 5, "TXT": 16, "AAAA": 28}


def build_query(name: str, qtype: str = "A", txid: Optional[int] = None) -> Tuple[int, bytes]:
    txid = random.randint(0, 0xFFFF) if txid is None else txid
    header = struct.pack("!HHHHHH", txid, 0x0100, 1, 0, 0, 0)
    q = b"".join(bytes([len(p)]) + p.encode("ascii") for p in name.rstrip(".").split(".")) + b"\x00"
    return txid, header + q + struct.pack("!HH", QTYPES[qtype], 1)


def _read_name(data: bytes, off: int) -> Tuple[str, int]:
    labels, jumped, end = [], False, off
    for _ in range(128):
        ln = data[off]
        if ln == 0:
            off += 1
            break
        if ln & 0xC0 == 0xC0:
            ptr = ((ln & 0x3F) << 8) | data[off + 1]
            if not jumped:
                end = off + 2
            jumped, off = True, ptr
            continue
        labels.append(data[off + 1 : off + 1 + ln].decode("ascii", "replace"))
        off += 1 + ln
    else:
        raise ValueError("DNS name too long or looping")
    return ".".join(labels), (end if jumped else off)


def parse_response(data: bytes, txid: int) -> Dict[str, Any]:
    rid, flags, qd, an, _ns, _ar = struct.unpack("!HHHHHH", data[:12])
    if rid != txid:
        raise ValueError("transaction id mismatch")
    off = 12
    for _ in range(qd):
        _, off = _read_name(data, off)
        off += 4
    answers: List[Dict[str, Any]] = []
    for _ in range(an):
        name, off = _read_name(data, off)
        rtype, _cls, ttl, rdlen = struct.unpack("!HHIH", data[off : off + 10])
        off += 10
        rdata = data[off : off + rdlen]
        value: Any
        if rtype == 1 and rdlen == 4:
            value = socket.inet_ntoa(rdata)
        elif rtype == 28 and rdlen == 16:
            value = socket.inet_ntop(socket.AF_INET6, rdata)
        elif rtype in (2, 5):
            value, _ = _read_name(data, off)
        elif rtype == 16:
            value = rdata[1 : 1 + rdata[0]].decode("utf-8", "replace") if rdata else ""
        else:
            value = rdata.hex()
        answers.append({"name": name, "type": {v: k for k, v in QTYPES.items()}.get(rtype, str(rtype)), "ttl": ttl, "value": value})
        off += rdlen
    return {"rcode": flags & 0xF, "authoritative": bool(flags & 0x0400), "truncated": bool(flags & 0x0200), "answers": answers}


def query(name: str, resolver: str, qtype: str = "A", timeout: float = 3.0, port: int = 53) -> Dict[str, Any]:
    txid, packet = build_query(name, qtype)
    fam = socket.AF_INET6 if ":" in resolver else socket.AF_INET
    with socket.socket(fam, socket.SOCK_DGRAM) as s:
        s.settimeout(timeout)
        s.sendto(packet, (resolver, port))
        data, _ = s.recvfrom(4096)
    return parse_response(data, txid)


def _in_any(ip: str, nets: List[str]) -> bool:
    return any(ipaddress.ip_address(ip) in ipaddress.ip_network(n, strict=False) for n in nets)


def run(item: Dict[str, Any], ctx: Context) -> List[CheckResult]:
    name = item["name"]
    host = item["host"]
    cid = f"dns.{name}"
    base = dict(id=cid, name=f"DNS: {name}", category="dns", target=host, owner_hint="Customer network / DNS team")
    expect = item.get("expect_cidrs") or []
    private = bool(item.get("private_endpoint"))
    severity = item.get("severity", "blocking")
    with Timer() as t:
        try:
            infos = socket.getaddrinfo(host, None, proto=socket.IPPROTO_TCP)
            addrs = sorted({i[4][0] for i in infos})
        except Exception as e:  # noqa: BLE001 - classified below
            code, hint = classify_error(e)
            return [CheckResult(**base, status=FAIL, severity=severity, message=f"{host} did not resolve ({code})", details={"error": str(e), "reason": code}, remediation=hint, duration_ms=0)]
    results: List[CheckResult] = []
    details: Dict[str, Any] = {"addresses": addrs, "resolver": "system"}
    status, msg, fix = PASS, f"{host} resolves to {', '.join(addrs)}", ""
    if expect:
        bad = [a for a in addrs if not _in_any(a, expect)]
        if bad:
            status, msg = FAIL, f"{host} resolves to {', '.join(bad)}, outside the expected {', '.join(expect)}"
            fix = ("The name resolves to a public address but a private endpoint was expected: link the private DNS zone to this network and check conditional forwarders." if private else "The answer is not in the expected range: check split-horizon DNS and which resolver this host uses.")
    if private and not expect:
        pub = [a for a in addrs if ipaddress.ip_address(a).is_global]
        if pub:
            status, msg, fix = FAIL, f"{host} resolves to public address(es) {', '.join(pub)} but is marked as a private endpoint", "Link the private DNS zone (privatelink / private hosted zone) to the VPC or VNet this host runs in."
    results.append(CheckResult(**base, status=status, severity=severity, message=msg, details=details, remediation=fix, duration_ms=getattr(t, "ms", 0)))
    resolver = item.get("resolver")
    if resolver:
        rbase = dict(base, id=f"{cid}.resolver", name=f"DNS via {resolver}: {name}")
        try:
            r = query(host, resolver, item.get("qtype", "A"), ctx.timeout)
            chain = [a for a in r["answers"] if a["type"] == "CNAME"]
            want = item.get("expect_cname_contains")
            st, m, fx = PASS, f"{resolver} answered with {len(r['answers'])} record(s)", ""
            if r["rcode"] != 0:
                st, m, fx = FAIL, f"{resolver} returned rcode {r['rcode']} (NXDOMAIN is 3)", "The resolver does not know the name: check the zone, the forwarder and the record."
            elif want and not any(want in str(c["value"]) for c in chain):
                st, m, fx = WARN, f"no CNAME containing '{want}' in the answer", "A private endpoint normally appears as a CNAME into a privatelink zone. Confirm the zone link."
            min_ttl = min((a["ttl"] for a in r["answers"]), default=None)
            if st == PASS and min_ttl is not None and min_ttl < 5:
                st, m, fx = WARN, f"TTL of {min_ttl}s is very low", "A very low TTL multiplies resolver load; confirm it is intentional."
            results.append(CheckResult(**rbase, status=st, severity="advisory" if st == WARN else severity, message=m, details=r, remediation=fx))
        except Exception as e:  # noqa: BLE001
            code, hint = classify_error(e)
            results.append(CheckResult(**rbase, status=FAIL, severity=severity, message=f"query to {resolver} failed ({code})", details={"error": str(e)}, remediation=hint))
    return results
