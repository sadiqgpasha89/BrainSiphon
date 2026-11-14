"""TLS certificate checks: chain verification, hostname match, days to expiry, protocol version and mTLS.

Verification failures are reported, then the certificate is read again without verification so the expiry date and issuer
are still visible. That is what turns "handshake failed" into "the intermediate is missing" or "expired 3 days ago".
"""
from __future__ import annotations

import datetime as dt
import socket
import ssl
from typing import Any, Dict, List, Optional, Tuple

from ..model import CheckResult, Context, FAIL, PASS, WARN
from ..netutil import classify_error, connect, make_ssl_context

# ------------------------------------------------------------------ minimal DER reader (validity and names only)

def _tlv(b: bytes, o: int) -> Tuple[int, int, int, int]:
    tag = b[o]
    ln = b[o + 1]
    o += 2
    if ln & 0x80:
        n = ln & 0x7F
        ln = int.from_bytes(b[o : o + n], "big")
        o += n
    return tag, o, ln, o + ln


def _children(b: bytes, start: int, end: int):
    o = start
    while o < end:
        tag, s, ln, e = _tlv(b, o)
        yield tag, s, e
        o = e


def _time(b: bytes, tag: int, s: int, e: int) -> dt.datetime:
    txt = b[s:e].decode("ascii")
    fmt = "%y%m%d%H%M%SZ" if tag == 0x17 else "%Y%m%d%H%M%SZ"
    return dt.datetime.strptime(txt, fmt).replace(tzinfo=dt.timezone.utc)


_OIDS = {b"\x55\x04\x03": "CN", b"\x55\x04\x0a": "O", b"\x55\x04\x06": "C", b"\x55\x04\x0b": "OU"}


def _name(b: bytes, s: int, e: int) -> str:
    parts = []
    for _t, rs, re_ in _children(b, s, e):  # RDN set
        for _t2, as_, ae in _children(b, rs, re_):  # AttributeTypeAndValue
            kids = list(_children(b, as_, ae))
            if len(kids) == 2:
                oid = b[kids[0][1] : kids[0][2]]
                val = b[kids[1][1] : kids[1][2]].decode("utf-8", "replace")
                parts.append(f"{_OIDS.get(oid, oid.hex())}={val}")
    return ", ".join(parts)


def parse_der(der: bytes) -> Dict[str, Any]:
    """notBefore, notAfter, subject and issuer from a DER X.509 certificate, without any third-party library."""
    _t, s, _ln, e = _tlv(der, 0)
    _t, s, _ln, e = _tlv(der, s)  # tbsCertificate
    tbs = list(_children(der, s, e))
    i = 1 if tbs[0][0] == 0xA0 else 0  # optional [0] version
    issuer = _name(der, tbs[i + 2][1], tbs[i + 2][2])
    validity = list(_children(der, tbs[i + 3][1], tbs[i + 3][2]))
    subject = _name(der, tbs[i + 4][1], tbs[i + 4][2])
    nb = _time(der, validity[0][0], validity[0][1], validity[0][2])
    na = _time(der, validity[1][0], validity[1][1], validity[1][2])
    return {"not_before": nb, "not_after": na, "subject": subject, "issuer": issuer}


# ------------------------------------------------------------------ the check

def fetch(host: str, port: int, ctx: Context, item: Dict[str, Any], verify: bool) -> Tuple[Optional[bytes], Dict[str, Any], Optional[BaseException]]:
    sctx = make_ssl_context(item.get("ca_file") or ctx.ca_file, verify, item.get("client_cert"), item.get("client_key"),
                            item.get("min_version"), item.get("alpn"))
    sni = item.get("server_name", host)
    info: Dict[str, Any] = {}
    try:
        raw = connect(host, port, float(item.get("timeout", ctx.timeout)), ctx.proxy if item.get("via_proxy") else {"no_proxy": "*"})
        with sctx.wrap_socket(raw, server_hostname=sni) as s:
            info = {"tls_version": s.version(), "cipher": (s.cipher() or ("", "", 0))[0], "alpn": s.selected_alpn_protocol()}
            if verify:
                info["san"] = [v for k, v in (s.getpeercert() or {}).get("subjectAltName", [])]
            # TLS 1.3 reports a rejected client certificate on the first read, not in the handshake: peek so mTLS mistakes show up here
            s.settimeout(0.4)
            try:
                s.recv(1)
            except (socket.timeout, ssl.SSLWantReadError):
                pass
            return s.getpeercert(binary_form=True), info, None
    except BaseException as e:  # noqa: BLE001
        return None, info, e


def run(item: Dict[str, Any], ctx: Context) -> List[CheckResult]:
    host, port, name = item["host"], int(item.get("port", 443)), item["name"]
    min_days = int(item.get("min_days_valid", 21))
    base = dict(id=f"tls.{name}", name=f"TLS: {name}", category="tls", target=f"{host}:{port}", owner_hint=item.get("owner", "Customer PKI / platform team"))
    severity = item.get("severity", "blocking")
    der, info, err = fetch(host, port, ctx, item, verify=True)
    verify_error = None
    if err is not None:
        code, hint = classify_error(err)
        if code not in ("tls_verify_failed", "tls_error"):
            return [CheckResult(**base, status=FAIL, severity=severity, message=f"could not open a TLS connection ({code})", details={"error": str(err), "reason": code}, remediation=hint)]
        verify_error = (code, str(err), hint)
        der, info2, err2 = fetch(host, port, ctx, item, verify=False)
        info = info2 or info
        if err2 is not None or der is None:
            c2, h2 = classify_error(err2) if err2 else ("tls_error", hint)
            return [CheckResult(**base, status=FAIL, severity=severity, message=f"TLS handshake failed ({c2})", details={"error": str(err2 or err), "reason": c2}, remediation=h2)]
    cert = parse_der(der or b"")
    now = dt.datetime.now(dt.timezone.utc)
    days = (cert["not_after"] - now).days
    details = {**info, "subject": cert["subject"], "issuer": cert["issuer"], "not_before": cert["not_before"].isoformat(),
               "not_after": cert["not_after"].isoformat(), "days_to_expiry": days, "verified": verify_error is None}
    results: List[CheckResult] = []
    if verify_error:
        results.append(CheckResult(**base, status=FAIL, severity=severity, message=f"certificate chain did not verify: {verify_error[1][:140]}", details=details, remediation=verify_error[2]))
    else:
        results.append(CheckResult(**base, status=PASS, severity=severity, message="chain and hostname verified", details=details))
    exp_base = dict(base, id=f"tls.{name}.expiry", name=f"TLS expiry: {name}")
    if days < 0:
        results.append(CheckResult(**exp_base, status=FAIL, severity=severity, message=f"certificate expired {-days} day(s) ago", details=details, remediation="Renew the certificate. Check the rotation job, and the intermediate as well as the leaf."))
    elif days < min_days:
        results.append(CheckResult(**exp_base, status=WARN, severity="advisory", message=f"certificate expires in {days} day(s) (minimum {min_days})", details=details, remediation="Schedule rotation before the expiry date and confirm who owns it."))
    else:
        results.append(CheckResult(**exp_base, status=PASS, severity=severity, message=f"{days} day(s) until expiry", details=details))
    mv = item.get("min_version")
    if mv and info.get("tls_version") and info["tls_version"] < mv:
        results.append(CheckResult(**dict(base, id=f"tls.{name}.version", name=f"TLS version: {name}"), status=FAIL, severity=severity, message=f"negotiated {info['tls_version']}, policy requires {mv}", details=details, remediation="Raise the server's minimum protocol version."))
    return results
