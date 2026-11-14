"""RabbitMQ (AMQP 0-9-1): consume with manual acknowledgement, nack without requeue to a dead-letter queue, persistent publish with message ids.

Uses pika when installed. With `mock: true` it uses the in-memory broker; that reproduces ack, requeue and dead-lettering, not
confirms, cluster failover, TLS or flow control."""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional, Tuple

from ..core.adapter import Adapter, Health
from ..core.errors import ConfigError, TransientError
from ..core.registry import register
from ..mocks.broker import InMemoryAmqp

BROKERS: Dict[str, InMemoryAmqp] = {}


@register
class RabbitMqAdapter(Adapter):
    ID = "rabbitmq"
    TITLE = "RabbitMQ"
    PROTOCOL = "AMQP 0-9-1 through pika: basic.get/consume with manual ack, publisher confirms, dead-letter exchange"
    MOCK_NOTE = "mock: true uses an in-memory broker (queues, ack, nack/requeue, dead-letter queue). No confirms, quorum queues, TLS or flow control."
    CONNECTION = {"host": {"required": True}, "port": {"default": 5671}, "vhost": {"default": "/"}, "tls": {"default": True}, "user_env": {}, "password_env": {}, "mock": {"default": False}, "broker_name": {"default": "default"}, "auth": {}, "proxy": {}, "headers": {}, "ca_file": {}, "verify_tls": {}}
    READ = {"queue": {"required": True}, "dead_letter_queue": {}, "prefetch": {"default": 50}, "batch": {"default": 50}, "key_field": {}, "event_time_field": {}}
    WRITE = {"queue": {"required": True}, "idempotency_fields": {}}

    def _init(self) -> None:
        self.mock = bool(self.conn.get("mock"))
        self.broker = BROKERS.setdefault(self.conn.get("broker_name", "default"), InMemoryAmqp()) if self.mock else None
        self._unacked: List[int] = []
        self._ch: Any = None
        if self.mock and self.cfg.get("read"):
            self.broker.declare(self.cfg["read"]["queue"], self.cfg["read"].get("dead_letter_queue"))

    def _channel(self) -> Any:
        if self._ch is None:
            try:
                import pika  # type: ignore
            except ImportError as e:
                raise ConfigError("pika is not installed: install it from the customer's package mirror, or set connection.mock to true") from e
            import os
            creds = pika.PlainCredentials(os.environ.get(self.conn.get("user_env", ""), ""), os.environ.get(self.conn.get("password_env", ""), ""))
            params = pika.ConnectionParameters(self.conn["host"], int(self.conn.get("port", 5671)), self.conn.get("vhost", "/"), creds, ssl_options=pika.SSLOptions(__import__("ssl").create_default_context(cafile=self.conn.get("ca_file"))) if self.conn.get("tls", True) else None)
            try:
                self._ch = pika.BlockingConnection(params).channel()
                self._ch.confirm_delivery()
            except Exception as e:  # noqa: BLE001
                raise TransientError(f"cannot connect to RabbitMQ: {e}") from e
        return self._ch

    def _health(self) -> Health:
        if self.mock:
            return Health(True, {"broker": "in-memory"})
        self._channel()
        return Health(True, {})

    def _ack_previous(self) -> None:
        for tag in self._unacked:
            self.broker.ack(tag) if self.mock else self._channel().basic_ack(tag)
        self._unacked = []

    def _read_page(self, query: Dict[str, Any], cursor: Any) -> Tuple[List[Dict[str, Any]], Any]:
        r = self.cfg["read"]
        self._ack_previous()  # everything from the previous page was processed by the caller
        rows: List[Dict[str, Any]] = []
        for _ in range(int(r.get("batch", 50))):
            if self.mock:
                got = self.broker.get(r["queue"])
                if got is None:
                    break
                tag, m = got
                body, mid, hdr, redelivered = m["body"], m["message_id"], m["headers"], m["redelivered"]
            else:
                method, props, body = self._channel().basic_get(r["queue"], auto_ack=False)
                if method is None:
                    break
                tag, mid, hdr, redelivered = method.delivery_tag, props.message_id, props.headers or {}, method.redelivered
            try:
                value = json.loads(body)
            except (ValueError, TypeError):
                self.broker.nack(tag, requeue=False) if self.mock else self._channel().basic_nack(tag, requeue=False)  # poison: to the DLX
                continue
            self._unacked.append(tag)
            rows.append({"message_id": mid, "redelivered": redelivered, "headers": hdr, "value": value})
        return rows, (True if rows else None)

    def _key_of(self, raw: Dict[str, Any]) -> str:
        return str(raw.get("message_id") or "")

    def _write_one(self, payload: Dict[str, Any], idem_key: str) -> Dict[str, Any]:
        w = self.cfg["write"]
        body = json.dumps(payload, default=str).encode()
        if self.mock:
            self.broker.declare(w["queue"])
            self.broker.publish(w["queue"], body, idem_key)
        else:
            import pika  # type: ignore
            self._channel().basic_publish("", w["queue"], body, pika.BasicProperties(delivery_mode=2, message_id=idem_key, content_type="application/json"), mandatory=True)
        return {"message_id": idem_key}

    def close(self) -> None:
        self._ack_previous()
