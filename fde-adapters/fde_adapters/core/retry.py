"""Retry, deadline and circuit-breaker behaviour shared by every adapter."""
from __future__ import annotations

import random
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Optional, TypeVar

from .errors import AdapterError, CircuitOpen, RateLimited, TimeoutExceeded

T = TypeVar("T")


@dataclass
class RetryPolicy:
    """Exponential backoff with full jitter. Honours Retry-After. Stops at `max_attempts` or when the deadline would be missed."""

    max_attempts: int = 4
    base_delay: float = 0.2
    max_delay: float = 10.0
    jitter: bool = True
    sleep: Callable[[float], None] = time.sleep
    rng: random.Random = field(default_factory=random.Random)

    def delay(self, attempt: int, err: Optional[AdapterError] = None) -> float:
        if isinstance(err, RateLimited) and err.retry_after is not None:
            return min(max(err.retry_after, 0.0), self.max_delay * 6)
        cap = min(self.max_delay, self.base_delay * (2 ** (attempt - 1)))
        return self.rng.uniform(0, cap) if self.jitter else cap

    def call(self, fn: Callable[[], T], *, deadline: Optional["Deadline"] = None, on_retry: Optional[Callable[[int, AdapterError, float], None]] = None) -> T:
        attempt = 0
        while True:
            attempt += 1
            if deadline:
                deadline.check()
            try:
                return fn()
            except AdapterError as e:
                if not e.retryable or attempt >= self.max_attempts:
                    raise
                d = self.delay(attempt, e)
                if deadline and deadline.remaining() < d:
                    raise TimeoutExceeded(f"retry budget would pass the deadline after attempt {attempt}: {e}") from e
                if on_retry:
                    on_retry(attempt, e, d)
                self.sleep(d)


@dataclass
class Deadline:
    """An overall time budget for one logical operation, so retries cannot add up past what the caller can wait."""

    seconds: float
    clock: Callable[[], float] = time.monotonic

    def __post_init__(self) -> None:
        self.started = self.clock()

    def remaining(self) -> float:
        return self.seconds - (self.clock() - self.started)

    def check(self) -> None:
        if self.remaining() <= 0:
            raise TimeoutExceeded(f"deadline of {self.seconds}s exceeded")


@dataclass
class CircuitBreaker:
    """Opens after `threshold` consecutive failures; lets one trial call through after `reset_after` seconds (half-open)."""

    threshold: int = 5
    reset_after: float = 30.0
    clock: Callable[[], float] = time.monotonic
    failures: int = 0
    opened_at: Optional[float] = None

    def before(self) -> None:
        if self.opened_at is not None:
            if self.clock() - self.opened_at >= self.reset_after:
                return  # half-open: allow a trial
            raise CircuitOpen(f"circuit open after {self.failures} consecutive failures")

    def success(self) -> None:
        self.failures, self.opened_at = 0, None

    def failure(self) -> None:
        self.failures += 1
        if self.failures >= self.threshold:
            self.opened_at = self.clock()

    def call(self, fn: Callable[[], T]) -> T:
        self.before()
        try:
            out = fn()
        except AdapterError as e:
            if e.retryable:
                self.failure()
            raise
        self.success()
        return out
