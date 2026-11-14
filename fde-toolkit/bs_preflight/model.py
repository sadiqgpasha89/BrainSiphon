"""Result model shared by every check, and the readiness verdict derived from it."""
from __future__ import annotations

import os
import re
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

PASS, FAIL, WARN, SKIP = "pass", "fail", "warn", "skip"
STATUSES = (PASS, FAIL, WARN, SKIP)

#: how a failure is treated in the verdict: a blocking failure makes the environment NOT_READY, a warning never does
BLOCKING, ADVISORY = "blocking", "advisory"

_SECRET_KEYS = re.compile(r"(secret|password|passwd|token|api[_-]?key|authorization|private[_-]?key)", re.I)


@dataclass
class CheckResult:
    id: str
    name: str
    category: str
    status: str
    severity: str = BLOCKING
    target: str = ""
    message: str = ""
    details: Dict[str, Any] = field(default_factory=dict)
    remediation: str = ""
    owner_hint: str = ""
    duration_ms: int = 0

    def to_dict(self) -> Dict[str, Any]:
        d = {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "status": self.status,
            "severity": self.severity,
            "target": self.target,
            "message": self.message,
            "details": redact(self.details),
            "remediation": self.remediation,
            "owner_hint": self.owner_hint,
            "duration_ms": self.duration_ms,
        }
        return d


def redact(value: Any) -> Any:
    """Remove anything that looks like a credential from a structure before it is written anywhere."""
    if isinstance(value, dict):
        return {k: ("***" if _SECRET_KEYS.search(str(k)) and not str(k).endswith("_env") else redact(v)) for k, v in value.items()}
    if isinstance(value, list):
        return [redact(v) for v in value]
    if isinstance(value, str):
        out = value
        for name, secret in secret_values().items():
            if secret and len(secret) >= 6:
                out = out.replace(secret, f"***{name}***")
        return out
    return value


def secret_values() -> Dict[str, str]:
    """Values of environment variables that the configuration names as credentials. Registered by the config loader."""
    return _REGISTERED_SECRETS


_REGISTERED_SECRETS: Dict[str, str] = {}


def register_secret(env_name: str) -> Optional[str]:
    val = os.environ.get(env_name)
    if val:
        _REGISTERED_SECRETS[env_name] = val
    return val


def register_value(label: str, value: str) -> None:
    """Register a runtime secret (an access token) so redaction removes it from anything that is written out."""
    if value:
        _REGISTERED_SECRETS[label] = value


class Timer:
    def __enter__(self) -> "Timer":
        self.t0 = time.monotonic()
        return self

    def __exit__(self, *exc: Any) -> None:
        self.ms = int((time.monotonic() - self.t0) * 1000)


def verdict(results: List[CheckResult]) -> Dict[str, Any]:
    """READY: nothing blocking failed. READY_WITH_WARNINGS: only advisory findings. NOT_READY: a blocking check failed."""
    counts = {s: 0 for s in STATUSES}
    for r in results:
        counts[r.status] += 1
    blocking = [r for r in results if r.status == FAIL and r.severity == BLOCKING]
    advisory = [r for r in results if (r.status == FAIL and r.severity == ADVISORY) or r.status == WARN]
    if blocking:
        state = "NOT_READY"
    elif advisory:
        state = "READY_WITH_WARNINGS"
    else:
        state = "READY"
    return {
        "readiness": state,
        "total": len(results),
        "passed": counts[PASS],
        "failed": counts[FAIL],
        "warnings": counts[WARN],
        "skipped": counts[SKIP],
        "blocking_failures": [r.id for r in blocking],
        "advisories": [r.id for r in advisory],
    }


Check = Callable[[Dict[str, Any], "Context"], List[CheckResult]]


@dataclass
class Context:
    """Run-wide settings every check can read: timeouts, proxy and CA settings, and whether the run is offline."""

    timeout: float = 5.0
    offline: bool = False
    proxy: Dict[str, Any] = field(default_factory=dict)
    ca_file: Optional[str] = None
    verbose: bool = False
    tokens: Dict[str, str] = field(default_factory=dict)  # access tokens obtained by earlier api_auth checks, by name
