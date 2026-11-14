"""Networking helpers that honour an HTTP proxy, a private CA and a per-call timeout, using only the standard library."""
from __future__ import annotations

import base64
import ipaddress
import os
import socket
import ssl
from typing import Any, Dict, Optional, Tuple
from urllib.parse import urlparse


def no_proxy_matches(host: str, patterns: Any) -> bool:
    """True when `host` is covered by a NO_PROXY style list (exact host, .suffix, *.suffix, CIDR or IP)."""
    if not patterns:
        return False
    items = patterns if isinstance(patterns, (list, tuple)) else [p.strip() for p in str(patterns).split(",")]
    host = host.lower().strip("[]")
    for raw in items:
        p = str(raw).strip().lower()
        if not p:
            continue
        if p == "*":
            return True
        try:
            net = ipaddress.ip_network(p, strict=False)
            try:
                if ipaddress.ip_address(host) in net:
                    return True
            except ValueError:
                pass
            continue
        except ValueError:
            pass
        p = p.lstrip("*")
        if host == p.lstrip(".") or (p.startswith(".") and host.endswith(p)) or host.endswith("." + p.lstrip(".")):
            return True
    return False


def effective_proxy(proxy_cfg: Dict[str, Any], host: str, scheme: str = "https") -> Optional[str]:
    """The proxy URL to use for `host`, or None for a direct connection. Config wins over the environment."""
    no_proxy = proxy_cfg.get("no_proxy") or os.environ.get("NO_PROXY") or os.environ.get("no_proxy")
    if no_proxy_matches(host, no_proxy):
        return None
    key = "https_proxy" if scheme == "https" else "http_proxy"
    return proxy_cfg.get(key) or os.environ.get(key.upper()) or os.environ.get(key) or proxy_cfg.get("http_proxy") or None


def parse_proxy(url: str) -> Tuple[str, int, Optional[str]]:
    u = urlparse(url if "://" in url else "http://" + url)
    auth = None
    if u.username:
        auth = base64.b64encode(f"{u.username}:{u.password or ''}".encode()).decode()
    return u.hostname or "", u.port or (443 if u.scheme == "https" else 3128), auth


class ProxyError(OSError):
    def __init__(self, status: int, line: str):
        super().__init__(f"proxy refused CONNECT: {line}")
        self.status = status
        self.line = line


def connect(host: str, port: int, timeout: float, proxy_cfg: Optional[Dict[str, Any]] = None) -> socket.socket:
    """Open a TCP connection, tunnelling through the configured HTTP proxy with CONNECT when one applies."""
    proxy = effective_proxy(proxy_cfg or {}, host)
    if not proxy:
        return socket.create_connection((host, port), timeout=timeout)
    phost, pport, auth = parse_proxy(proxy)
    s = socket.create_connection((phost, pport), timeout=timeout)
    req = f"CONNECT {host}:{port} HTTP/1.1\r\nHost: {host}:{port}\r\n"
    if auth:
        req += f"Proxy-Authorization: Basic {auth}\r\n"
    s.sendall((req + "\r\n").encode())
    buf = b""
    while b"\r\n\r\n" not in buf:
        chunk = s.recv(4096)
        if not chunk:
            break
        buf += chunk
        if len(buf) > 65536:
            break
    line = buf.split(b"\r\n", 1)[0].decode("latin1", "replace")
    parts = line.split()
    status = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 0
    if status != 200:
        s.close()
        raise ProxyError(status, line)
    return s


def make_ssl_context(ca_file: Optional[str] = None, verify: bool = True, client_cert: Optional[str] = None,
                     client_key: Optional[str] = None, min_version: Optional[str] = None,
                     alpn: Optional[list] = None) -> ssl.SSLContext:
    ctx = ssl.create_default_context(cafile=ca_file) if verify else ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    if not verify:
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
    if client_cert:
        ctx.load_cert_chain(client_cert, client_key)
    versions = {"TLSv1.2": ssl.TLSVersion.TLSv1_2, "TLSv1.3": ssl.TLSVersion.TLSv1_3}
    if min_version in versions:
        ctx.minimum_version = versions[min_version]
    if alpn:
        ctx.set_alpn_protocols(alpn)
    return ctx


def classify_error(exc: BaseException) -> Tuple[str, str]:
    """Turn a low-level exception into a stable reason code and a plain-English next step."""
    if isinstance(exc, ProxyError):
        if exc.status == 407:
            return "proxy_auth_required", "The proxy wants credentials. Provide proxy credentials in the proxy URL or ask the network team for an allow-listed source address."
        if exc.status == 403:
            return "proxy_policy_denied", "The proxy refused the destination. Ask the network team to add the host and port to the proxy allow-list."
        return "proxy_error", "The proxy answered with an error. Check the proxy address and that CONNECT is allowed for this port."
    if isinstance(exc, socket.gaierror):
        return "dns_failure", "The name did not resolve. Check the resolver, the split-horizon or private DNS zone and that the host name is spelled as the customer publishes it."
    if isinstance(exc, (socket.timeout, TimeoutError)):
        return "timeout", "No answer before the timeout: a firewall or security group is most likely dropping the packets. Request the rule from the network team."
    if isinstance(exc, ConnectionRefusedError):
        return "connection_refused", "The host answered and refused the port: nothing is listening there, or the wrong port was given."
    if isinstance(exc, ssl.SSLCertVerificationError):
        return "tls_verify_failed", "The certificate chain did not verify. Install the customer's CA bundle (ca_file) or ask for the full chain to be served."
    if isinstance(exc, ssl.SSLError):
        return "tls_error", "The TLS handshake failed. Check the minimum TLS version, the cipher policy and, for mTLS, the client certificate."
    if isinstance(exc, OSError) and getattr(exc, "errno", None) in (101, 113):
        return "no_route", "There is no route to the host from here. Check the VPC or VNet routing, peering and the source subnet."
    return "error", str(exc)
