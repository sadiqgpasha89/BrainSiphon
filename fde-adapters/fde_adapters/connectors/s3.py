"""S3-compatible object storage (AWS S3, MinIO, Ceph RGW, StorageGRID, Cloudflare R2): paged listing, parsed reads, atomic batch publish.

The pattern for batch integrations is files, not endpoints: read the partition the customer dropped under a prefix, and publish
results as objects followed by a manifest (`_SUCCESS`) written last, so a consumer never sees a half-published run."""
from __future__ import annotations

import csv
import hashlib
import io
import json
import os
import re
import urllib.parse
import xml.etree.ElementTree as ET
from typing import Any, Dict, Iterator, List, Optional, Tuple

from ..core import sigv4
from ..core.adapter import Adapter, Health
from ..core.errors import ConfigError, PermanentError
from ..core.http import Auth, HttpClient
from ..core.registry import register


class _SigV4Auth(Auth):
    def __init__(self, region: str, ak_env: str, sk_env: str, token_env: str = ""):
        self.region, self.ak_env, self.sk_env, self.token_env = region, ak_env, sk_env, token_env

    def creds(self) -> Tuple[str, str, Optional[str]]:
        ak, sk = os.environ.get(self.ak_env, ""), os.environ.get(self.sk_env, "")
        if not ak or not sk:
            raise ConfigError(f"environment variables {self.ak_env} and {self.sk_env} must be set")
        return ak, sk, (os.environ.get(self.token_env) if self.token_env else None)


@register
class S3Adapter(Adapter):
    ID = "s3"
    TITLE = "S3-compatible object storage"
    PROTOCOL = "S3 REST API (ListObjectsV2, GET, PUT, DELETE) signed with AWS Signature V4; path-style or virtual-host addressing"
    MOCK_NOTE = "Reproduces ListObjectsV2 paging, GET/PUT/DELETE and If-None-Match: * on a path-style endpoint. No versioning, multipart, KMS, bucket policies or lifecycle."
    CONNECTION = {"endpoint": {"required": True}, "bucket": {"required": True}, "region": {"default": "us-east-1"}, "path_style": {"default": True}, "access_key_env": {"required": True}, "secret_key_env": {"required": True}, "session_token_env": {}, "auth": {}, "headers": {}, "proxy": {}, "ca_file": {}, "verify_tls": {}}
    READ = {"prefix": {"required": True}, "format": {"default": "jsonl", "description": "jsonl, json (array) or csv"}, "key_field": {}, "event_time_field": {}, "suffix": {}, "require_manifest": {"default": False, "description": "only read a prefix that contains _SUCCESS"}}
    WRITE = {"prefix": {"required": True}, "format": {"default": "jsonl"}, "manifest": {"default": True}, "idempotency_fields": {}}

    def _init(self) -> None:
        self.auth = _SigV4Auth(self.conn.get("region", "us-east-1"), self.conn["access_key_env"], self.conn["secret_key_env"], self.conn.get("session_token_env", ""))
        self.http = self.build_http(self.conn["endpoint"])
        self.bucket = self.conn["bucket"]

    def _url(self, key: str = "", query: str = "") -> str:
        ep = self.conn["endpoint"].rstrip("/")
        if self.conn.get("path_style", True):
            u = f"{ep}/{self.bucket}/" + urllib.parse.quote(key, safe="/")
        else:
            sch, _, host = ep.partition("://")
            u = f"{sch}://{self.bucket}.{host}/" + urllib.parse.quote(key, safe="/")
        return u + (f"?{query}" if query else "")

    def _call(self, method: str, key: str = "", query: str = "", body: bytes = b"", extra: Optional[Dict[str, str]] = None):
        url = self._url(key, query)
        ak, sk, tok = self.auth.creds()
        hdrs = sigv4.sign(method, url, self.auth.region, ak, sk, body, session_token=tok, extra_headers=extra)
        return self.http.raw(method, url, data=body or None, headers={**hdrs, **(extra or {})}, auth=False, ok=(412,))

    def _health(self) -> Health:
        self._call("GET", query="list-type=2&max-keys=1")
        return Health(True, {"bucket": self.bucket})

    def list(self, prefix: str) -> Iterator[Dict[str, Any]]:
        tok = None
        while True:
            q = f"list-type=2&prefix={urllib.parse.quote(prefix, safe='')}" + (f"&continuation-token={tok}" if tok else "")
            root = ET.fromstring(self._call("GET", query=q).body)
            ns = re.match(r"\{.*\}", root.tag)
            p = ns.group(0) if ns else ""
            for c in root.findall(f"{p}Contents"):
                yield {"key": c.findtext(f"{p}Key"), "size": int(c.findtext(f"{p}Size") or 0)}
            tok = root.findtext(f"{p}NextContinuationToken")
            if root.findtext(f"{p}IsTruncated") != "true" or not tok:
                return

    def _parse(self, data: bytes, fmt: str) -> List[Dict[str, Any]]:
        text = data.decode("utf-8")
        if fmt == "jsonl":
            return [json.loads(l) for l in text.splitlines() if l.strip()]
        if fmt == "json":
            return json.loads(text)
        if fmt == "csv":
            return list(csv.DictReader(io.StringIO(text)))
        raise ConfigError(f"unknown format {fmt!r}")

    def _read_page(self, query: Dict[str, Any], cursor: Any) -> Tuple[List[Dict[str, Any]], Any]:
        r = self.cfg["read"]
        prefix = query.get("prefix") or r["prefix"]
        keys = [o["key"] for o in self.list(prefix)]
        if r.get("require_manifest") and not any(k.endswith("_SUCCESS") for k in keys):
            return [], None  # a partition without its manifest is not complete: do not read it
        rows: List[Dict[str, Any]] = []
        for k in keys:
            if k.endswith("_SUCCESS") or (r.get("suffix") and not k.endswith(r["suffix"])):
                continue
            for row in self._parse(self._call("GET", k).body, r.get("format", "jsonl")):
                row["_object_key"] = k
                rows.append(row)
        return rows, None

    def _write_one(self, payload: Dict[str, Any], idem_key: str) -> Dict[str, Any]:
        w = self.cfg["write"]
        key = f"{w['prefix'].rstrip('/')}/{idem_key}.json"
        r = self._call("PUT", key, body=json.dumps(payload, default=str).encode(), extra={"If-None-Match": "*"})
        return {"key": key, "created": r.status != 412}

    def publish_partition(self, prefix: str, rows: List[Dict[str, Any]], fmt: str = "jsonl", part_size: int = 1000) -> Dict[str, Any]:
        """Write the parts first and `_SUCCESS` last. Readers that require the manifest never see a partial partition."""
        prefix = prefix.rstrip("/")
        parts: List[Dict[str, Any]] = []
        for i in range(0, max(len(rows), 1), part_size):
            chunk = rows[i : i + part_size]
            body = ("\n".join(json.dumps(x, default=str, sort_keys=True) for x in chunk) + "\n").encode() if fmt == "jsonl" else json.dumps(chunk, default=str).encode()
            key = f"{prefix}/part-{i // part_size:05d}.{'jsonl' if fmt == 'jsonl' else 'json'}"
            self._call("PUT", key, body=body)
            parts.append({"key": key, "rows": len(chunk), "sha256": hashlib.sha256(body).hexdigest()})
        manifest = {"rows": len(rows), "parts": parts}
        self._call("PUT", f"{prefix}/_SUCCESS", body=json.dumps(manifest).encode())
        return manifest
