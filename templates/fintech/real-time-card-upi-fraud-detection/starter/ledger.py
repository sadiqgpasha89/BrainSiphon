"""Decisions WAL (Write-Ahead Log) with cryptographic SHA-256 hash chaining.

Guarantees immutable audit trail for every automated payment decision.
"""

from __future__ import annotations

import hashlib
import json
import time
from typing import Any, Dict, List, Optional

class DecisionLedger:
    """Tamper-evident append-only ledger for financial compliance."""

    def __init__(self, initial_hash: str = "0" * 64):
        self.entries: List[Dict[str, Any]] = []
        self.last_hash: str = initial_hash

    def append(self, txn_id: str, rail: str, amount: float, p_fraud: float, decision: str, model_version: str) -> Dict[str, Any]:
        timestamp = time.time()
        payload = {
            "index": len(self.entries),
            "txn_id": txn_id,
            "rail": rail,
            "amount": amount,
            "p_fraud": p_fraud,
            "decision": decision,
            "model_version": model_version,
            "timestamp": timestamp,
            "prev_hash": self.last_hash,
        }
        serialized = json.dumps(payload, sort_keys=True)
        entry_hash = hashlib.sha256(serialized.encode("utf-8")).hexdigest()
        
        record = {**payload, "hash": entry_hash}
        self.entries.append(record)
        self.last_hash = entry_hash
        return record

    def verify_chain(self) -> bool:
        """Verify the integrity of the entire decision chain."""
        expected_prev = "0" * 64
        for entry in self.entries:
            if entry["prev_hash"] != expected_prev:
                return False
            payload = {k: v for k, v in entry.items() if k != "hash"}
            recomputed = hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()
            if recomputed != entry["hash"]:
                return False
            expected_prev = entry["hash"]
        return True

    def count(self) -> int:
        return len(self.entries)

