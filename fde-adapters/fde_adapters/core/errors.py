"""One error taxonomy for every adapter, so retry and escalation behave the same whatever the vendor."""
from __future__ import annotations

from typing import Optional


class AdapterError(Exception):
    """Base class. `retryable` drives the retry policy; `code` is stable and safe to alert on."""

    retryable = False
    code = "adapter_error"

    def __init__(self, message: str, *, status: Optional[int] = None, request_id: Optional[str] = None, detail: Optional[str] = None):
        super().__init__(message)
        self.status, self.request_id, self.detail = status, request_id, detail

    def __str__(self) -> str:
        extra = f" [status={self.status}]" if self.status else ""
        extra += f" [request_id={self.request_id}]" if self.request_id else ""
        return super().__str__() + extra


class ConfigError(AdapterError):
    code = "config_error"


class AuthError(AdapterError):
    """401: the identity was not accepted. Goes to the identity team."""
    code = "auth_error"


class PermissionDenied(AdapterError):
    """403: authenticated but not allowed. Goes to the system owner, not the identity team."""
    code = "permission_denied"


class RateLimited(AdapterError):
    retryable = True
    code = "rate_limited"

    def __init__(self, message: str, retry_after: Optional[float] = None, **kw):
        super().__init__(message, **kw)
        self.retry_after = retry_after


class TransientError(AdapterError):
    """5xx, connection reset, DNS blip: safe to retry, and counted against the retry budget."""
    retryable = True
    code = "transient_error"


class TimeoutExceeded(TransientError):
    code = "timeout"


class PermanentError(AdapterError):
    """4xx other than 401/403/429, or a rejected payload: retrying cannot help. The record goes to the dead-letter path."""
    code = "permanent_error"


class ContractError(PermanentError):
    """The payload does not satisfy the contract (schema, mapping, required field)."""
    code = "contract_error"

    def __init__(self, message: str, errors: Optional[list] = None, **kw):
        super().__init__(message, **kw)
        self.errors = errors or []


class CircuitOpen(TransientError):
    code = "circuit_open"
