"""Kafka: consumer-group read with commit-after-processing, keyed idempotent produce, a dead-letter topic for poison messages, and lag.

Uses confluent-kafka when it is installed. With `mock: true` it uses the in-memory broker in `fde_adapters.mocks.broker`, which
reproduces partitions, offsets, group commits and lag, but not rebalancing, transactions, SASL or broker failure."""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional, Tuple

from ..core.adapter import Adapter, Health
from ..core.errors import ConfigError, PermanentError, TransientError
from ..core.registry import register
from ..mocks.broker import InMemoryKafka

#: process-local brokers by name, so a producer adapter and a consumer adapter in a test share one
BROKERS: Dict[str, InMemoryKafka] = {}


@register
class KafkaAdapter(Adapter):
    ID = "kafka"
    TITLE = "Apache Kafka (Confluent, MSK, Event Hubs Kafka API, Redpanda)"
    PROTOCOL = "Kafka protocol through confluent-kafka: consumer groups, idempotent producer, SSL or SASL_SSL"
    MOCK_NOTE = "mock: true uses an in-memory broker with partitions, offsets, group commits and lag. No rebalance, transactions, ACLs or SASL."
    CONNECTION = {"bootstrap_servers": {"required": True}, "security_protocol": {"default": "SSL"}, "sasl": {}, "ca_file": {}, "mock": {"default": False}, "broker_name": {"default": "default"}, "client_id": {"default": "brainsiphon-fde"}, "auth": {}, "proxy": {}, "headers": {}, "verify_tls": {}}
    READ = {"topic": {"required": True}, "group_id": {"required": True}, "max_records": {"default": 100}, "dead_letter_topic": {}, "key_field": {}, "event_time_field": {}}
    WRITE = {"topic": {"required": True}, "key_field": {"description": "payload field used as the message key (keeps one entity on one partition)"}, "idempotency_fields": {}}

    def _init(self) -> None:
        self.mock = bool(self.conn.get("mock"))
        self.broker = BROKERS.setdefault(self.conn.get("broker_name", "default"), InMemoryKafka()) if self.mock else None
        self._pending: Dict[int, int] = {}
        self._positions: Dict[int, int] = {}
        self._consumer: Any = None
        self._producer: Any = None

    # -- real client (lazy) -------------------------------------------------------------------------------------------------------
    def _conf(self) -> Dict[str, Any]:
        c = {"bootstrap.servers": self.conn["bootstrap_servers"], "security.protocol": self.conn.get("security_protocol", "SSL"), "client.id": self.conn.get("client_id")}
        if self.conn.get("ca_file"):
            c["ssl.ca.location"] = self.conn["ca_file"]
        c.update(self.conn.get("sasl") or {})
        return c

    def _real(self) -> Any:
        try:
            import confluent_kafka  # type: ignore
        except ImportError as e:
            raise ConfigError("confluent-kafka is not installed: install it from the customer's package mirror, or set connection.mock to true") from e
        return confluent_kafka

    # -- hooks ---------------------------------------------------------------------------------------------------------------------
    def _health(self) -> Health:
        if self.mock:
            return Health(True, {"broker": "in-memory", "topics": sorted(self.broker.topics)})
        ck = self._real()
        md = ck.admin.AdminClient(self._conf()).list_topics(timeout=5)
        topic = self.cfg.get("read", {}).get("topic") or self.cfg.get("write", {}).get("topic")
        return Health(topic in md.topics if topic else True, {"brokers": len(md.brokers), "topic_found": topic in md.topics if topic else None})

    def _commit_pending(self) -> None:
        if not self._pending:
            return
        r = self.cfg["read"]
        if self.mock:
            self.broker.commit(r["group_id"], r["topic"], {p: o + 1 for p, o in self._pending.items()})
        elif self._consumer is not None:
            self._consumer.commit(asynchronous=False)
        self._pending = {}

    def _read_page(self, query: Dict[str, Any], cursor: Any) -> Tuple[List[Dict[str, Any]], Any]:
        r = self.cfg["read"]
        self._commit_pending()  # the previous page was fully processed by the caller before this one is requested
        if self.mock:
            msgs = self.broker.fetch(r["group_id"], r["topic"], int(r.get("max_records", 100)), {})
        else:
            ck = self._real()
            if self._consumer is None:
                self._consumer = ck.Consumer({**self._conf(), "group.id": r["group_id"], "enable.auto.commit": False, "auto.offset.reset": "earliest"})
                self._consumer.subscribe([r["topic"]])
            raw = self._consumer.consume(int(r.get("max_records", 100)), timeout=2.0)
            msgs = []
            for m in raw:
                if m.error():
                    raise TransientError(f"kafka error: {m.error()}")
                msgs.append({"topic": m.topic(), "partition": m.partition(), "offset": m.offset(), "key": m.key().decode() if m.key() else None, "value": m.value(), "headers": dict(m.headers() or []), "timestamp": m.timestamp()[1]})
        rows: List[Dict[str, Any]] = []
        for m in msgs:
            try:
                value = json.loads(m["value"])
            except (ValueError, TypeError) as e:
                self._dead_letter(m, f"undecodable JSON: {e}")
                self._pending[m["partition"]] = max(self._pending.get(m["partition"], -1), m["offset"])
                continue
            rows.append({"topic": m["topic"], "partition": m["partition"], "offset": m["offset"], "key": m["key"], "timestamp": m["timestamp"], "headers": m["headers"], "value": value})
            self._pending[m["partition"]] = max(self._pending.get(m["partition"], -1), m["offset"])
        return rows, (True if msgs else None)

    def _key_of(self, raw: Dict[str, Any]) -> str:
        return f"{raw['topic']}:{raw['partition']}:{raw['offset']}"

    def _event_time_of(self, raw: Dict[str, Any]) -> Optional[str]:
        ts = raw.get("timestamp")
        if ts is None:
            return None
        import datetime as dt
        return dt.datetime.fromtimestamp(ts / 1000, dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    def _dead_letter(self, m: Dict[str, Any], reason: str) -> None:
        dlq = self.cfg["read"].get("dead_letter_topic") or self.cfg["read"]["topic"] + ".dlq"
        hdr = {"x-error": reason, "x-source": f"{m['topic']}:{m['partition']}:{m['offset']}"}
        self._produce(dlq, m.get("key"), m["value"] if isinstance(m["value"], (bytes, bytearray)) else str(m["value"]).encode(), hdr)

    def _produce(self, topic: str, key: Optional[str], value: bytes, headers: Dict[str, str]) -> Tuple[int, int]:
        if self.mock:
            return self.broker.produce(topic, key, value, headers)
        if self._producer is None:
            self._producer = self._real().Producer({**self._conf(), "enable.idempotence": True, "acks": "all"})
        done: Dict[str, Any] = {}
        self._producer.produce(topic, value=value, key=key, headers=list(headers.items()), on_delivery=lambda err, msg: done.update(err=err, msg=msg))
        self._producer.flush(10)
        if done.get("err"):
            raise TransientError(f"produce failed: {done['err']}")
        return done["msg"].partition(), done["msg"].offset()

    def _write_one(self, payload: Dict[str, Any], idem_key: str) -> Dict[str, Any]:
        w = self.cfg["write"]
        key = str(payload.get(w["key_field"])) if w.get("key_field") and payload.get(w["key_field"]) is not None else None
        p, o = self._produce(w["topic"], key, json.dumps(payload, default=str).encode(), {"idempotency-key": idem_key})
        return {"partition": p, "offset": o}

    def lag(self) -> Dict[int, int]:
        r = self.cfg["read"]
        if self.mock:
            return self.broker.lag(r["group_id"], r["topic"])
        raise ConfigError("lag is read from the broker's consumer-group offsets: use `kafka-consumer-groups --describe` against a real cluster")

    def close(self) -> None:
        self._commit_pending()
        if self._consumer is not None:
            self._consumer.close()
