"""Controlled rollout and the way back.

`Canary` sends a stable share of cards to the model (the same card always lands on the same side, so velocity features and customer
experience do not flip), and **rolls itself back to the legacy rules** when the guardrails break: the stand-in rate (model
unavailable or too slow), or the observed latency. Rolling back is a state change (`pct` becomes 0), not a deployment."""
from __future__ import annotations

import hashlib
import threading
from collections import deque
from typing import Deque, Optional


class Canary:
    def __init__(self, pct: float = 1.0, salt: str = "canary-v1", window: int = 200, max_standin_rate: float = 0.02, min_samples: int = 50):
        self.pct, self.salt, self.window, self.max_standin_rate, self.min_samples = pct, salt, window, max_standin_rate, min_samples
        self.recent: Deque[bool] = deque(maxlen=window)
        self.rolled_back: Optional[str] = None
        self.lock = threading.Lock()

    def use_model(self, card_token: str) -> bool:
        if self.rolled_back or self.pct <= 0:
            return False
        h = int(hashlib.sha256((self.salt + card_token).encode()).hexdigest()[:8], 16) / 0xFFFFFFFF * 100
        return h < self.pct

    def observe(self, model_answered: bool) -> None:
        with self.lock:
            self.recent.append(model_answered)
            if len(self.recent) >= self.min_samples:
                rate = 1 - sum(self.recent) / len(self.recent)
                if rate > self.max_standin_rate and not self.rolled_back:
                    self.rolled_back = f"stand-in rate {rate:.1%} exceeded {self.max_standin_rate:.1%} over the last {len(self.recent)} decisions"
                    self.pct = 0.0

    def ramp(self, pct: float) -> None:
        if self.rolled_back:
            raise RuntimeError(f"cannot ramp after a rollback ({self.rolled_back}); clear it deliberately with reset()")
        self.pct = pct

    def reset(self) -> None:
        with self.lock:
            self.rolled_back, self.recent = None, deque(maxlen=self.window)
