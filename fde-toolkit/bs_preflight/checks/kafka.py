"""Kafka / event-stream access without a Kafka client library.

Speaks two requests of the Kafka wire protocol directly: ApiVersions (is this a Kafka broker, and which versions) and
Metadata (do the topics exist, who leads them, are they reachable at the *advertised* address). The advertised-listener
check catches the commonest private-network failure: the bootstrap address works and the address the broker hands back does not.
"""
from __future__ import annotations

import socket
import struct
from typing import Any, Dict, List, Tuple

from ..model import CheckResult, Context, FAIL, PASS, WARN
from ..netutil import classify_error, connect, make_ssl_context


def _s(v: str) -> bytes:
    b = v.encode()
    return struct.pack("!h", len(b)) + b


def request(api_key: int, version: int, corr: int, client_id: str, body: bytes) -> bytes:
    head = struct.pack("!hhi", api_key, version, corr) + _s(client_id)
    msg = head + body
    return struct.pack("!i", len(msg)) + msg


def _recv(sock: socket.socket) -> bytes:
    hdr = b""
    while len(hdr) < 4:
        c = sock.recv(4 - len(hdr))
        if not c:
            raise ConnectionError("broker closed the connection")
        hdr += c
    (n,) = struct.unpack("!i", hdr)
    buf = b""
    while len(buf) < n:
        c = sock.recv(n - len(buf))
        if not c:
            raise ConnectionError("broker closed the connection mid-response")
        buf += c
    return buf


def parse_api_versions(buf: bytes) -> Tuple[int, Dict[int, Tuple[int, int]]]:
    corr, err, count = struct.unpack("!ihi", buf[:10])
    apis: Dict[int, Tuple[int, int]] = {}
    o = 10
    for _ in range(count):
        k, lo, hi = struct.unpack("!hhh", buf[o : o + 6])
        apis[k] = (lo, hi)
        o += 6
    return err, apis


def parse_metadata_v0(buf: bytes) -> Dict[str, Any]:
    o = 4  # correlation id
    (nb,) = struct.unpack("!i", buf[o : o + 4]); o += 4
    brokers = []
    for _ in range(nb):
        (nid,) = struct.unpack("!i", buf[o : o + 4]); o += 4
        (hl,) = struct.unpack("!h", buf[o : o + 2]); o += 2
        host = buf[o : o + hl].decode(); o += hl
        (port,) = struct.unpack("!i", buf[o : o + 4]); o += 4
        brokers.append({"id": nid, "host": host, "port": port})
    (nt,) = struct.unpack("!i", buf[o : o + 4]); o += 4
    topics = []
    for _ in range(nt):
        (err,) = struct.unpack("!h", buf[o : o + 2]); o += 2
        (tl,) = struct.unpack("!h", buf[o : o + 2]); o += 2
        name = buf[o : o + tl].decode(); o += tl
        (np_,) = struct.unpack("!i", buf[o : o + 4]); o += 4
        parts = []
        for _ in range(np_):
            perr, pid, leader = struct.unpack("!hii", buf[o : o + 10]); o += 10
            (nr,) = struct.unpack("!i", buf[o : o + 4]); o += 4 + 4 * nr
            (ni,) = struct.unpack("!i", buf[o : o + 4]); o += 4 + 4 * ni
            parts.append({"partition": pid, "leader": leader, "error": perr})
        topics.append({"name": name, "error": err, "partitions": parts})
    return {"brokers": brokers, "topics": topics}


def open_broker(host: str, port: int, ctx: Context, item: Dict[str, Any]) -> socket.socket:
    s = connect(host, port, float(item.get("timeout", ctx.timeout)), ctx.proxy if item.get("via_proxy") else {"no_proxy": "*"})
    s.settimeout(float(item.get("timeout", ctx.timeout)))
    if item.get("security_protocol", "PLAINTEXT").upper() in ("SSL", "SASL_SSL"):
        s = make_ssl_context(item.get("ca_file") or ctx.ca_file, True, item.get("client_cert"), item.get("client_key")).wrap_socket(s, server_hostname=item.get("server_name", host))
    return s


def run(item: Dict[str, Any], ctx: Context) -> List[CheckResult]:
    name = item["name"]
    base = dict(id=f"kafka.{name}", name=f"Kafka: {name}", category="event_stream", target=",".join(item["bootstrap"]), owner_hint=item.get("owner", "Customer streaming platform team"))
    severity = item.get("severity", "blocking")
    results: List[CheckResult] = []
    host, _, port = item["bootstrap"][0].rpartition(":")
    try:
        s = open_broker(host, int(port), ctx, item)
        try:
            s.sendall(request(18, 0, 1, "bs-preflight", b""))
            err, apis = parse_api_versions(_recv(s))
            if err != 0:
                raise ValueError(f"broker returned error code {err} to ApiVersions")
            results.append(CheckResult(**base, status=PASS, severity=severity, message=f"Kafka broker answered ApiVersions ({len(apis)} APIs)", details={"max_metadata_version": apis.get(3, (None, None))[1], "max_produce_version": apis.get(0, (None, None))[1], "max_fetch_version": apis.get(1, (None, None))[1]}))
            topics = item.get("topics", [])
            s.sendall(request(3, 0, 2, "bs-preflight", struct.pack("!i", len(topics)) + b"".join(_s(t) for t in topics)))
            meta = parse_metadata_v0(_recv(s))
        finally:
            s.close()
    except Exception as e:  # noqa: BLE001
        code, hint = classify_error(e)
        if isinstance(e, (ValueError, ConnectionError, struct.error)):
            hint = "The port is open but it did not behave like a Kafka broker (or the security protocol is wrong): confirm PLAINTEXT, SSL or SASL with the platform team."
        return [CheckResult(**base, status=FAIL, severity=severity, message=f"broker check failed ({code if code != 'error' else type(e).__name__})", details={"error": str(e)}, remediation=hint)]
    adv_bad = []
    for b in meta["brokers"]:
        try:
            x = connect(b["host"], b["port"], float(item.get("timeout", ctx.timeout)), ctx.proxy if item.get("via_proxy") else {"no_proxy": "*"})
            x.close()
        except Exception as e:  # noqa: BLE001
            adv_bad.append({"broker": f"{b['host']}:{b['port']}", "reason": classify_error(e)[0]})
    adv_base = dict(base, id=f"kafka.{name}.advertised", name=f"Kafka advertised listeners: {name}")
    if adv_bad:
        results.append(CheckResult(**adv_base, status=FAIL, severity=severity, message=f"{len(adv_bad)} broker(s) unreachable at the address they advertise", details={"unreachable": adv_bad, "brokers": meta["brokers"]}, remediation="The bootstrap address works but the broker tells clients to use another one. Add DNS and firewall rules for every advertised listener, or fix advertised.listeners on the broker."))
    else:
        results.append(CheckResult(**adv_base, status=PASS, severity=severity, message=f"all {len(meta['brokers'])} advertised broker address(es) reachable", details={"brokers": meta["brokers"]}))
    for t in meta["topics"]:
        tb = dict(base, id=f"kafka.{name}.topic.{t['name']}", name=f"Kafka topic: {t['name']}")
        if t["error"] == 3:
            results.append(CheckResult(**tb, status=FAIL, severity=severity, message="topic does not exist", remediation="Ask the streaming team to create the topic, or to grant the principal permission to auto-create it."))
        elif t["error"] not in (0,):
            results.append(CheckResult(**tb, status=FAIL, severity=severity, message=f"metadata error {t['error']} (29 = not authorised to describe)", details=t, remediation="Grant DESCRIBE (and READ or WRITE) on the topic to the service principal."))
        elif any(p["leader"] < 0 for p in t["partitions"]):
            results.append(CheckResult(**tb, status=WARN, severity="advisory", message="one or more partitions have no leader", details=t, remediation="Wait for leader election or involve the platform team: consumers will stall."))
        else:
            results.append(CheckResult(**tb, status=PASS, severity=severity, message=f"{len(t['partitions'])} partition(s), all with a leader", details={"partitions": len(t["partitions"])}))
    return results
