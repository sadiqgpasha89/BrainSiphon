"""In-memory brokers with the semantics that matter for connector logic: partitions and offsets with consumer-group commits (Kafka),
and queues with acknowledgements, requeue and dead-lettering (AMQP). Process-local: share an instance between producer and consumer."""
from __future__ import annotations

import threading
import time
from collections import defaultdict, deque
from typing import Any, Deque, Dict, List, Optional, Tuple


class InMemoryKafka:
    def __init__(self, partitions: int = 3):
        self.default_partitions = partitions
        self.topics: Dict[str, List[List[Dict[str, Any]]]] = {}
        self.committed: Dict[Tuple[str, str, int], int] = defaultdict(int)
        self.lock = threading.Lock()

    def create_topic(self, name: str, partitions: Optional[int] = None) -> None:
        with self.lock:
            self.topics.setdefault(name, [[] for _ in range(partitions or self.default_partitions)])

    def produce(self, topic: str, key: Optional[str], value: bytes, headers: Optional[Dict[str, str]] = None) -> Tuple[int, int]:
        self.create_topic(topic)
        with self.lock:
            parts = self.topics[topic]
            p = (sum(key.encode()) % len(parts)) if key else sum(len(x) for x in parts) % len(parts)
            off = len(parts[p])
            parts[p].append({"offset": off, "partition": p, "key": key, "value": value, "headers": headers or {}, "timestamp": int(time.time() * 1000)})
            return p, off

    def fetch(self, group: str, topic: str, max_records: int, positions: Dict[int, int]) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        with self.lock:
            for p, log in enumerate(self.topics.get(topic, [])):
                start = positions.get(p, self.committed[(group, topic, p)])
                out += [dict(m, topic=topic) for m in log[start : start + max_records]]
        return sorted(out, key=lambda m: (m["timestamp"], m["partition"], m["offset"]))[:max_records]

    def commit(self, group: str, topic: str, offsets: Dict[int, int]) -> None:
        with self.lock:
            for p, o in offsets.items():
                self.committed[(group, topic, p)] = max(self.committed[(group, topic, p)], o)

    def lag(self, group: str, topic: str) -> Dict[int, int]:
        with self.lock:
            return {p: len(log) - self.committed[(group, topic, p)] for p, log in enumerate(self.topics.get(topic, []))}


class InMemoryAmqp:
    """A broker with direct exchanges, queues, prefetch, ack/nack(requeue) and a dead-letter exchange per queue."""

    def __init__(self) -> None:
        self.queues: Dict[str, Deque[Dict[str, Any]]] = defaultdict(deque)
        self.unacked: Dict[int, Tuple[str, Dict[str, Any]]] = {}
        self.dlx: Dict[str, str] = {}
        self.bindings: Dict[str, str] = {}
        self.tag = 0
        self.lock = threading.Lock()
        self.seen_ids: Dict[str, int] = defaultdict(int)

    def declare(self, queue: str, dead_letter_queue: Optional[str] = None) -> None:
        with self.lock:
            self.queues[queue]
            if dead_letter_queue:
                self.dlx[queue] = dead_letter_queue
                self.queues[dead_letter_queue]

    def publish(self, queue: str, body: bytes, message_id: Optional[str] = None, headers: Optional[Dict[str, Any]] = None) -> None:
        with self.lock:
            if message_id:
                self.seen_ids[message_id] += 1
            self.queues[queue].append({"body": body, "message_id": message_id, "headers": headers or {}, "redelivered": False})

    def get(self, queue: str) -> Optional[Tuple[int, Dict[str, Any]]]:
        with self.lock:
            if not self.queues[queue]:
                return None
            m = self.queues[queue].popleft()
            self.tag += 1
            self.unacked[self.tag] = (queue, m)
            return self.tag, m

    def ack(self, tag: int) -> None:
        with self.lock:
            self.unacked.pop(tag, None)

    def nack(self, tag: int, requeue: bool) -> None:
        with self.lock:
            q, m = self.unacked.pop(tag)
            if requeue:
                m["redelivered"] = True
                self.queues[q].appendleft(m)
            elif q in self.dlx:
                self.queues[self.dlx[q]].append({**m, "headers": {**m["headers"], "x-death-queue": q}})

    def depth(self, queue: str) -> int:
        return len(self.queues[queue])
