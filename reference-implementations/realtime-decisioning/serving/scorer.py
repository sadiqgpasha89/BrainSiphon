"""Online inference: load the production model, compute features from the online store, apply the decision policy.

Properties the blueprint asks for, implemented here:
  hot swap      the registry index is re-read every few seconds; a promotion or rollback takes effect without a restart
  signature     a model whose feature list differs from features/definitions.yaml is refused (the old one stays loaded)
  deadline      if the feature fetch alone has used the latency budget, the model is skipped and the rules fallback answers
  fallback      no production model, a refused model or any scoring error -> conservative rules, flagged `fallback=true`
                so that monitoring can alert on the fallback rate. The rules can STEP_UP but never BLOCK on their own.
"""

from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass
from typing import Any

import numpy as np
from sqlalchemy.engine import Connection

from bsref import featurestore
from bsref.config import load_yaml, settings
from bsref.registry import Registry, RegistryError
from data.ingest import online_features

log = logging.getLogger("serving")
RELOAD_SECONDS = 3.0


@dataclass
class Decision:
    action: str
    score: float
    reason: str
    model_version: str
    fallback: bool
    features: dict[str, float]
    latency_ms: float


def rules_fallback(f: dict[str, float]) -> tuple[str, float, str]:
    """Deliberately simple and conservative: add friction for the riskiest shapes, never decline."""
    if f["card_txn_count_1h"] >= 4 or (f["is_new_device_for_card"] and f["amount_to_card_avg_ratio"] >= 4):
        return "STEP_UP", 0.5, "rules: velocity or new device with unusual amount"
    return "ALLOW", 0.0, "rules: no risk rule matched"


def explain(f: dict[str, float]) -> str:
    """A short, human-readable reason built from the features an analyst would check first."""
    bits = []
    if f["device_distinct_cards_7d"] >= 2:
        bits.append(f"device used by {int(f['device_distinct_cards_7d'])} other cards")
    if f["is_new_device_for_card"]:
        bits.append("new device")
    if f["card_txn_count_1h"] >= 3:
        bits.append(f"{int(f['card_txn_count_1h'])} transactions in the last hour")
    if f["amount_to_card_avg_ratio"] >= 3:
        bits.append(f"amount {f['amount_to_card_avg_ratio']:.1f}x the card average")
    if f["merchant_chargeback_rate"] >= 0.02:
        bits.append("merchant with elevated chargebacks")
    if f["country_mismatch"]:
        bits.append("unusual country")
    return "; ".join(bits) or "no notable risk signal"


class Scorer:
    def __init__(self) -> None:
        self.cfg = load_yaml("configs/pipeline.yaml")
        self.names = featurestore.feature_names(self.cfg["feature_view"])
        self.registry = Registry(settings().registry_dir)
        self.model: Any = None
        self.version = "none"
        self._checked = 0.0
        self._lock = threading.Lock()

    def refresh(self, force: bool = False) -> None:
        if not force and time.monotonic() - self._checked < RELOAD_SECONDS:
            return
        with self._lock:
            self._checked = time.monotonic()
            try:
                wanted = self.registry.production_version(self.cfg["model_name"])
                if wanted is None or wanted == self.version:
                    if wanted is None:
                        self.model, self.version = None, "none"
                    return
                model, manifest = self.registry.load(self.cfg["model_name"], wanted)
                if list(model.features) != self.names:
                    log.error("model refused: feature signature mismatch", extra={"version": wanted})
                    return
                self.model, self.version = model, manifest["version"]
                log.info("model loaded", extra={"version": self.version})
            except RegistryError as exc:
                log.error("model load failed", extra={"error": str(exc)})

    def ready(self) -> bool:
        self.refresh()
        return self.model is not None

    def decide(self, conn: Connection, txn: dict[str, Any]) -> Decision:
        t0 = time.perf_counter()
        self.refresh()
        feats = online_features(conn, txn)
        budget = self.cfg["serving"]["deadline_ms"]
        elapsed = (time.perf_counter() - t0) * 1000
        model, version = self.model, self.version
        fallback, why = True, ""
        if model is None:
            why = "no production model"
        elif elapsed > budget:
            why = "feature fetch exceeded the deadline"
        else:
            try:
                score = float(model.score(np.array([[feats[n] for n in self.names]], dtype=float))[0])
                action, reason, fallback = model.action(score), explain(feats), False
            except Exception as exc:
                why = f"scoring error: {type(exc).__name__}"
                log.exception("scoring failed")
        if fallback:
            action, score, reason = rules_fallback(feats)
            reason = f"{reason} (fallback: {why})"
        return Decision(action, score, reason, version, fallback, feats, round((time.perf_counter() - t0) * 1000, 3))
