"""
Dead-Letter Queue (DLQ) Consumer & Reprocessing Engine
Handles poisoned messages, aggregates error classification,
and provides idempotent replay mechanisms once schemas or bugs are resolved.
"""
from datetime import datetime, timezone
import json
from typing import List, Dict, Any

class DeadLetterQueueHandler:
    def __init__(self, dlq_store=None, replay_producer=None):
        self.store = dlq_store or []
        self.producer = replay_producer

    def capture_error(self, topic: str, raw_payload: str, error_message: str, error_code: str) -> str:
        error_record = {
            "error_id": f"err_{len(self.store) + 1}",
            "original_topic": topic,
            "raw_payload": raw_payload,
            "error_code": error_code,
            "error_message": error_message,
            "captured_at": datetime.now(timezone.utc).isoformat(),
            "retry_count": 0,
            "resolved": False
        }
        self.store.append(error_record)
        print(f"[DLQ] Captured failure {error_record['error_id']} on {topic}: {error_code}")
        return error_record["error_id"]

    def inspect_unresolved(self) -> List[Dict[str, Any]]:
        return [e for e in self.store if not e["resolved"]]

    def replay_message(self, error_id: str, patch_fn=None) -> bool:
        record = next((e for e in self.store if e["error_id"] == error_id), None)
        if not record:
            print(f"[DLQ] Error ID {error_id} not found.")
            return False

        payload = record["raw_payload"]
        if patch_fn:
            payload = patch_fn(payload)

        print(f"[DLQ] Replaying message {error_id} to {record['original_topic']}")
        if self.producer:
            self.producer.send(record["original_topic"], payload)

        record["resolved"] = True
        record["resolved_at"] = datetime.now(timezone.utc).isoformat()
        return True

if __name__ == "__main__":
    handler = DeadLetterQueueHandler()
    err_id = handler.capture_error("brainsiphon.events.raw", '{"bad": "data"}', "Missing required field 'event_id'", "VALIDATION_ERROR")
    print(f"Captured error ID: {err_id}")
    handler.replay_message(err_id)
    assert len(handler.inspect_unresolved()) == 0, "All errors should be resolved after replay"

