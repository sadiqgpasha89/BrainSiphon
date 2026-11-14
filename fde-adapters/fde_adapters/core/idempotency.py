"""Idempotency: the same logical operation is applied at most once, however many times it is delivered."""
from __future__ import annotations

import hashlib
import json
import sqlite3
import threading
import time
from typing import Any, Dict, Iterable, Optional


def derive_key(*parts: Any, namespace: str = "") -> str:
    """A stable key from the fields that define the operation (not from the time or a random id).

    Example: derive_key(rrn, stan, mti_family, terminal_id, namespace="switch-decision") for a card authorisation.
    """
    canon = json.dumps([namespace, *parts], sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(canon.encode()).hexdigest()[:40]


class IdempotencyStore:
    """Remembers the outcome of each key. SQLite so it survives a restart; `:memory:` for tests.

    `begin` returns None for a new key (the caller proceeds, then calls `complete`), or the stored outcome for a key already done.
    A key that began but never completed (a crash) is retried after `lease_seconds`: at-least-once on the wire, exactly-once in effect
    when the downstream write is itself keyed.
    """

    def __init__(self, path: str = ":memory:", lease_seconds: float = 60.0, clock=time.time):
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.execute("CREATE TABLE IF NOT EXISTS idem (k TEXT PRIMARY KEY, state TEXT, started REAL, outcome TEXT)")
        self.lock, self.lease, self.clock = threading.Lock(), lease_seconds, clock

    def begin(self, key: str) -> Optional[Dict[str, Any]]:
        with self.lock:
            row = self.db.execute("SELECT state, started, outcome FROM idem WHERE k=?", (key,)).fetchone()
            now = self.clock()
            if row is None or (row[0] == "started" and now - row[1] > self.lease):
                self.db.execute("INSERT OR REPLACE INTO idem VALUES (?,?,?,NULL)", (key, "started", now))
                self.db.commit()
                return None
            if row[0] == "done":
                return json.loads(row[2])
            return {"_in_flight": True}

    def complete(self, key: str, outcome: Dict[str, Any]) -> None:
        with self.lock:
            self.db.execute("UPDATE idem SET state='done', outcome=? WHERE k=?", (json.dumps(outcome, default=str), key))
            self.db.commit()

    def abandon(self, key: str) -> None:
        with self.lock:
            self.db.execute("DELETE FROM idem WHERE k=? AND state='started'", (key,))
            self.db.commit()
