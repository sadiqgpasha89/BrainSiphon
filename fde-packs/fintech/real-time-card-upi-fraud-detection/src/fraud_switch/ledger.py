"""The decision ledger: one decision per transaction, however many times the switch retransmits it.

Duplicate decisions and duplicate financial actions are prevented by one rule: the **transaction key** (acquirer, RRN, STAN,
terminal, transmission time, message class and function) maps to exactly one stored decision. A retransmission returns the stored
decision without re-scoring, so the answer cannot change between attempts. The same key with a different payload is a conflict,
not a duplicate, and is refused. Rows are hash-chained so tampering is detectable."""
from __future__ import annotations

import hashlib
import json
import sqlite3
import threading
import time
from typing import Any, Callable, Dict, Optional, Tuple

from .iso8583 import IsoMessage


class Conflict(Exception):
    """The same transaction key arrived with a different payload."""


class Ledger:
    def __init__(self, path: str = ":memory:"):
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.execute("CREATE TABLE IF NOT EXISTS decisions (seq INTEGER PRIMARY KEY AUTOINCREMENT, k TEXT UNIQUE, payload_hash TEXT, state TEXT, decision TEXT, source TEXT, created_ms INTEGER, reversed INTEGER DEFAULT 0, chain TEXT)")
        self.db.execute("CREATE TABLE IF NOT EXISTS events (seq INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT, k TEXT, detail TEXT, created_ms INTEGER)")
        self.lock = threading.Lock()
        self.cv = threading.Condition(self.lock)

    @staticmethod
    def key_of(m: IsoMessage) -> str:
        return hashlib.sha256("|".join(map(str, m.key())).encode()).hexdigest()

    @staticmethod
    def payload_hash(m: IsoMessage) -> str:
        # DE7 and DE12/13 may legitimately differ on a retransmission; the amount, PAN, merchant and terminal may not
        core = {n: m.get(n) for n in (2, 3, 4, 18, 41, 42, 49)}
        return hashlib.sha256(json.dumps(core, sort_keys=True).encode()).hexdigest()

    def decide(self, m: IsoMessage, compute: Callable[[], Dict[str, Any]], *, wait_s: float = 2.0) -> Tuple[Dict[str, Any], bool]:
        """Returns (decision, replayed). `compute` runs at most once per key, outside the lock."""
        k, h = self.key_of(m), self.payload_hash(m)
        with self.cv:
            row = self.db.execute("SELECT payload_hash, state, decision FROM decisions WHERE k=?", (k,)).fetchone()
            if row is None:
                self.db.execute("INSERT INTO decisions (k, payload_hash, state, created_ms) VALUES (?,?,?,?)", (k, h, "pending", int(time.time() * 1000)))
                self.db.commit()
                mine = True
            else:
                mine = False
                if row[0] != h:
                    self._event("conflict", k, f"payload hash {h[:8]} differs from {row[0][:8]}")
                    raise Conflict("same transaction key with a different payload")
        if mine:
            try:
                d = compute()
            except BaseException:
                with self.cv:
                    self.db.execute("DELETE FROM decisions WHERE k=? AND state='pending'", (k,))
                    self.db.commit()
                    self.cv.notify_all()
                raise
            with self.cv:
                prev = self.db.execute("SELECT chain FROM decisions WHERE chain IS NOT NULL ORDER BY seq DESC LIMIT 1").fetchone()
                chain = hashlib.sha256(((prev[0] if prev else "genesis") + k + json.dumps(d, sort_keys=True)).encode()).hexdigest()
                self.db.execute("UPDATE decisions SET state='done', decision=?, source=?, chain=? WHERE k=?", (json.dumps(d), d.get("source", "model"), chain, k))
                self.db.commit()
                self.cv.notify_all()
            return d, False
        deadline = time.time() + wait_s
        with self.cv:
            while True:
                row = self.db.execute("SELECT state, decision FROM decisions WHERE k=?", (k,)).fetchone()
                if row and row[0] == "done":
                    self._event("duplicate", k, "returned stored decision")
                    return json.loads(row[1]), True
                if time.time() > deadline:
                    raise TimeoutError("the first attempt is still being scored")
                self.cv.wait(0.05)

    def _event(self, kind: str, k: str, detail: str) -> None:
        self.db.execute("INSERT INTO events (kind, k, detail, created_ms) VALUES (?,?,?,?)", (kind, k, detail, int(time.time() * 1000)))
        self.db.commit()

    def record(self, kind: str, k: str, detail: str = "") -> None:
        with self.lock:
            self._event(kind, k, detail)

    def reverse(self, original_key: str) -> bool:
        """Mark the original decision reversed. A reversal of an unknown transaction is accepted and recorded as an orphan for reconciliation."""
        with self.lock:
            n = self.db.execute("UPDATE decisions SET reversed=1 WHERE k=? AND state='done'", (original_key,)).rowcount
            self._event("reversal" if n else "orphan_reversal", original_key, "")
            self.db.commit()
            return bool(n)

    def get(self, k: str) -> Optional[Dict[str, Any]]:
        r = self.db.execute("SELECT decision, reversed FROM decisions WHERE k=? AND state='done'", (k,)).fetchone()
        return {**json.loads(r[0]), "reversed": bool(r[1])} if r else None

    def verify_chain(self) -> bool:
        prev = "genesis"
        for k, d, chain in self.db.execute("SELECT k, decision, chain FROM decisions WHERE state='done' ORDER BY seq"):
            if hashlib.sha256((prev + k + json.dumps(json.loads(d), sort_keys=True)).encode()).hexdigest() != chain:
                return False
            prev = chain
        return True

    def counts(self) -> Dict[str, int]:
        return {k: n for k, n in self.db.execute("SELECT kind, COUNT(*) FROM events GROUP BY kind")}
