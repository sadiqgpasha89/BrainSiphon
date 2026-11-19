"""Store-and-forward for warehouse or vehicle edge nodes that lose connectivity: durable, idempotent, bounded."""
from __future__ import annotations

import json
import sqlite3
from typing import Any, Callable, Dict, List


class EdgeBuffer:
    """Events are written locally first and forwarded when the link is up. The event id makes the forward idempotent, so a link that drops
    after the server accepted but before the edge heard is retried safely. The buffer is bounded: when full, the oldest *low-priority* events go first and the loss is counted, never silent."""

    def __init__(self, path: str = ":memory:", max_events: int = 10_000):
        self.db = sqlite3.connect(path)
        self.db.execute("CREATE TABLE IF NOT EXISTS q (id TEXT PRIMARY KEY, prio INTEGER, body TEXT, seq INTEGER)")
        self.db.execute("CREATE TABLE IF NOT EXISTS lost (n INTEGER)")
        self.max, self.seq, self.dropped = max_events, 0, 0

    def put(self, event_id: str, body: Dict[str, Any], priority: int = 5) -> None:
        self.seq += 1
        self.db.execute("INSERT OR IGNORE INTO q VALUES (?,?,?,?)", (event_id, priority, json.dumps(body), self.seq))
        n = self.db.execute("SELECT COUNT(*) FROM q").fetchone()[0]
        while n > self.max:
            self.db.execute("DELETE FROM q WHERE id = (SELECT id FROM q ORDER BY prio DESC, seq ASC LIMIT 1)")
            self.dropped += 1
            n -= 1
        self.db.commit()

    def pending(self) -> int:
        return self.db.execute("SELECT COUNT(*) FROM q").fetchone()[0]

    def flush(self, send: Callable[[str, Dict[str, Any]], bool], batch: int = 100) -> Dict[str, int]:
        """`send(event_id, body)` returns True when the server accepted it (including 'already have it'). Order is by priority then arrival."""
        sent = failed = 0
        for eid, body in self.db.execute("SELECT id, body FROM q ORDER BY prio ASC, seq ASC LIMIT ?", (batch,)).fetchall():
            try:
                ok = send(eid, json.loads(body))
            except Exception:  # noqa: BLE001 - link down: stop, keep everything
                failed += 1
                break
            if ok:
                self.db.execute("DELETE FROM q WHERE id=?", (eid,))
                sent += 1
            else:
                failed += 1
        self.db.commit()
        return {"sent": sent, "failed": failed, "pending": self.pending(), "dropped": self.dropped}
