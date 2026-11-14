"""The adapter base class and the standard lifecycle every connector follows."""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any, Callable, ClassVar, Dict, Iterable, Iterator, List, Optional

from .config import check_spec, load as load_config
from .contract import validate
from .errors import AdapterError, ConfigError, ContractError, PermanentError
from .http import HttpClient, build_auth
from .idempotency import IdempotencyStore, derive_key
from .mapping import Mapper
from .retry import CircuitBreaker, RetryPolicy


@dataclass
class Record:
    """What `read` yields: the mapped payload plus where it came from and when, so lineage and ordering are never guessed later."""

    payload: Dict[str, Any]
    key: str
    source: str
    event_time: Optional[str] = None
    raw: Optional[Dict[str, Any]] = None
    issues: List[Dict[str, str]] = field(default_factory=list)


@dataclass
class WriteResult:
    accepted: int = 0
    duplicates: int = 0
    failed: List[Dict[str, Any]] = field(default_factory=list)  # {"key", "code", "message"}: these go to the dead-letter path
    request_ids: List[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.failed


@dataclass
class Health:
    ok: bool
    checks: Dict[str, Any] = field(default_factory=dict)
    message: str = ""


COMMON_SPEC: Dict[str, Dict[str, Any]] = {}


class Adapter:
    """Subclass, set the class attributes, implement `_health`, `_read_page` and `_write_one` (or override `read` / `write`).

    ID           stable identifier used in configs and the registry
    PROTOCOL     one line: what is spoken to the system
    CONNECTION   CONFIG_SPEC for the `connection` section; READ / WRITE for the others
    """

    ID: ClassVar[str] = ""
    TITLE: ClassVar[str] = ""
    PROTOCOL: ClassVar[str] = ""
    CAPABILITIES: ClassVar[tuple] = ("health", "read", "write")
    CONNECTION: ClassVar[Dict[str, Dict[str, Any]]] = {}
    READ: ClassVar[Dict[str, Dict[str, Any]]] = {}
    WRITE: ClassVar[Dict[str, Dict[str, Any]]] = {}
    #: the system the mock stands in for, and what it does and does not reproduce
    MOCK_NOTE: ClassVar[str] = ""

    def __init__(self, config: Any, *, store: Optional[IdempotencyStore] = None, sleep: Callable[[float], None] = time.sleep):
        self.cfg = load_config(config)
        if self.cfg["adapter"] != self.ID:
            raise ConfigError(f"configuration is for adapter '{self.cfg['adapter']}', not '{self.ID}'")
        self.name = self.cfg["name"]
        self.conn = self.cfg.get("connection", {})
        problems = check_spec(self.CONNECTION, self.conn, "connection") + check_spec(self.READ, self.cfg.get("read", {}), "read") + check_spec(self.WRITE, self.cfg.get("write", {}), "write")
        if problems:
            raise ConfigError("; ".join(problems))
        r = self.cfg.get("retry", {})
        self.retry = RetryPolicy(max_attempts=r.get("max_attempts", 4), base_delay=r.get("base_delay", 0.2), max_delay=r.get("max_delay", 10.0), sleep=sleep)
        self.mapper = Mapper(self.cfg["mapping"]) if "mapping" in self.cfg else None
        self.out_mapper = Mapper(self.cfg["write_mapping"]) if "write_mapping" in self.cfg else None
        self.contract: Optional[Dict[str, Any]] = self.cfg.get("contract")
        self.store = store or IdempotencyStore()
        self.metrics: Dict[str, int] = {"read": 0, "mapped": 0, "mapping_issues": 0, "written": 0, "duplicates": 0, "failed": 0}
        self.logs: List[Dict[str, Any]] = []
        self.http: Optional[HttpClient] = None
        self._init()

    # -- subclass hooks -------------------------------------------------------------------------------------------------------
    def _init(self) -> None:
        """Build clients from self.conn. Called once."""

    def _health(self) -> Health:
        raise NotImplementedError

    def _read_page(self, query: Dict[str, Any], cursor: Any) -> "tuple[List[Dict[str, Any]], Any]":
        raise NotImplementedError

    def _write_one(self, payload: Dict[str, Any], idem_key: str) -> Dict[str, Any]:
        raise NotImplementedError

    def _setting(self, name: str) -> Any:
        """A `read` setting: the configured value, else the adapter's declared default."""
        return self.cfg.get("read", {}).get(name) or self.READ.get(name, {}).get("default")

    def _key_of(self, raw: Dict[str, Any]) -> str:
        return str(raw.get(self._setting("key_field") or "id", ""))

    def _event_time_of(self, raw: Dict[str, Any]) -> Optional[str]:
        f = self._setting("event_time_field")
        return str(raw.get(f)) if f and raw.get(f) is not None else None

    def close(self) -> None:
        """Release connections. Adapters with sockets override this."""

    # -- the standard lifecycle -----------------------------------------------------------------------------------------------
    def healthcheck(self) -> Health:
        try:
            return self._health()
        except AdapterError as e:
            return Health(False, {"error": e.code, "status": e.status, "request_id": e.request_id}, str(e))

    def read(self, query: Optional[Dict[str, Any]] = None, *, limit: Optional[int] = None, dead_letter: Optional[List[Dict[str, Any]]] = None) -> Iterator[Record]:
        """Yield mapped records, page by page. A record that fails mapping goes to `dead_letter` (or raises when none is given)."""
        query, cursor, n = query or {}, None, 0
        while True:
            rows, cursor = self._read_page(query, cursor)
            for raw in rows:
                self.metrics["read"] += 1
                payload, issues = (raw, [])
                if self.mapper:
                    payload, issues = self.mapper.apply(raw)
                    if issues:
                        self.metrics["mapping_issues"] += 1
                        if dead_letter is not None:
                            dead_letter.append({"key": self._key_of(raw), "issues": issues, "raw": raw})
                            continue
                        raise ContractError(f"record {self._key_of(raw)!r} failed mapping: {issues}", errors=issues)
                if self.contract:
                    errs = validate(payload, self.contract)
                    if errs:
                        if dead_letter is not None:
                            dead_letter.append({"key": self._key_of(raw), "issues": [{"field": "contract", "problem": e} for e in errs], "raw": raw})
                            continue
                        raise ContractError(f"record {self._key_of(raw)!r} violates the output contract: {errs}", errors=errs)
                self.metrics["mapped"] += 1
                yield Record(payload, self._key_of(raw), self.name, self._event_time_of(raw), raw if self.cfg.get("keep_raw") else None, issues)
                n += 1
                if limit and n >= limit:
                    return
            if cursor is None:
                return

    def write(self, records: Iterable[Dict[str, Any]], *, key_fields: Optional[List[str]] = None) -> WriteResult:
        """Write records idempotently. The key is derived from `key_fields` (default: write.idempotency_fields), never from the clock."""
        res = WriteResult()
        fields = key_fields or self.cfg.get("write", {}).get("idempotency_fields") or ["id"]
        for rec in records:
            payload = self.out_mapper.map(rec) if self.out_mapper else rec
            key = derive_key(*[rec.get(f) for f in fields], namespace=self.name)
            prior = self.store.begin(key)
            if prior is not None:
                res.duplicates += 1
                self.metrics["duplicates"] += 1
                continue
            try:
                out = self.retry.call(lambda: self._write_one(payload, key))
                self.store.complete(key, out or {"ok": True})
                res.accepted += 1
                self.metrics["written"] += 1
                if out and out.get("request_id"):
                    res.request_ids.append(out["request_id"])
            except AdapterError as e:
                self.store.abandon(key)
                res.failed.append({"key": key, "code": e.code, "message": str(e), "retryable": e.retryable})
                self.metrics["failed"] += 1
        return res

    # -- helpers --------------------------------------------------------------------------------------------------------------
    def build_http(self, base_url: str, headers: Optional[Dict[str, str]] = None) -> HttpClient:
        """An HttpClient wired from the standard sections: auth, retry, timeouts, proxy, CA, breaker. `headers` are added to connection.headers."""
        t = self.cfg.get("timeouts", {})
        return HttpClient(base_url, build_auth(self.conn.get("auth")), self.retry, t.get("connect", 5.0), t.get("read", 30.0), t.get("deadline"),
                          {**(self.conn.get("headers") or {}), **(headers or {})}, self.conn.get("proxy"), self.conn.get("ca_file"), self.conn.get("verify_tls", True),
                          CircuitBreaker(**self.cfg.get("breaker", {})), self.logs.append)
