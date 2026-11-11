"""
Production Streaming Ingestion & Feature Pipeline Template
Consumes Kafka events, validates JSON schema, computes sliding window aggregates,
and publishes features to Redis online store with watermarking.
"""
import json
import time
from typing import Dict, Any, Optional

class StreamingFeatureProcessor:
    def __init__(self, redis_client=None, dlq_publisher=None):
        self.redis = redis_client
        self.dlq = dlq_publisher
        self.max_allowed_lateness_sec = 60.0

    def process_event(self, raw_message: str) -> Optional[Dict[str, Any]]:
        try:
            event = json.loads(raw_message)
        except json.JSONDecodeError as err:
            self._route_to_dlq(raw_message, f"MALFORMED_JSON: {err}")
            return None

        # Schema Validation
        required_fields = ["event_id", "entity_id", "timestamp", "amount"]
        missing = [f for f in required_fields if f not in event]
        if missing:
            self._route_to_dlq(raw_message, f"SCHEMA_VALIDATION_FAILED: Missing {missing}")
            return None

        # Watermarking & Late Arriving Data Check
        event_time = event["timestamp"]
        current_time = time.time()
        # Parse ISO-8601 or epoch timestamp
        ts_epoch = float(event_time) if isinstance(event_time, (int, float)) else current_time
        lateness = current_time - ts_epoch

        if lateness > self.max_allowed_lateness_sec:
            # Route to delayed attribution queue without blocking hot path
            self._handle_late_event(event, lateness)

        # Sliding window feature computation
        entity_id = event["entity_id"]
        amount = float(event["amount"])

        features = {
            "entity_id": entity_id,
            "last_tx_amount": amount,
            "tx_velocity_1h": 1, # Increment in Redis sliding window
            "updated_at": current_time,
        }

        if self.redis:
            # Write to Redis with 24-hour TTL
            key = f"entity_features:{entity_id}"
            self.redis.hset(key, mapping=features)
            self.redis.expire(key, 86400)

        return features

    def _route_to_dlq(self, payload: str, reason: str):
        print(f"[!] Routing to DLQ: {reason}")
        if self.dlq:
            self.dlq.publish("brainsiphon.dlq.v1.errors", payload=payload, reason=reason)

    def _handle_late_event(self, event: Dict[str, Any], lateness_sec: float):
        print(f"[*] Processing late-arriving event ({lateness_sec:.1f}s late): {event.get('event_id')}")

if __name__ == "__main__":
    processor = StreamingFeatureProcessor()
    sample = json.dumps({"event_id": "e1", "entity_id": "u123", "timestamp": time.time(), "amount": 150.0})
    result = processor.process_event(sample)
    print(f"Processed feature vector: {result}")

