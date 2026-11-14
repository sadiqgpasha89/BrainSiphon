"""HL7 v2 over MLLP as an adapter: an inbound listener (ADT, ORU) that maps to FHIR R4 resources, and an outbound sender with ACK handling."""
from __future__ import annotations

import queue
from typing import Any, Dict, List, Optional, Tuple

from ..core.adapter import Adapter, Health
from ..core.errors import ConfigError, PermanentError, TransientError
from ..core.registry import register
from ..protocols import fhir_map, hl7v2


@register
class Hl7MllpAdapter(Adapter):
    ID = "hl7v2-mllp"
    TITLE = "HL7 v2 over MLLP (ADT, ORU) through an integration engine"
    PROTOCOL = "MLLP framing over TCP; ADT A01/A02/A03/A04/A08/A11/A40 and ORU R01; AA/AE/AR acknowledgements"
    CAPABILITIES = ("health", "read", "write", "listen")
    MOCK_NOTE = "Runs against the real MLLP implementation on localhost (the hl7v2.MllpServer and send()). It is not Epic, Cerner or Mirth: no vendor Z-segments, no interface-engine routing, no TLS."
    CONNECTION = {"listen_host": {"default": "127.0.0.1"}, "listen_port": {"default": 0}, "send_host": {}, "send_port": {}, "timeout": {"default": 5}, "auth": {}, "headers": {}, "proxy": {}, "ca_file": {}, "verify_tls": {}}
    READ = {"crosswalk": {"description": "local code -> [loinc, display, unit]"}, "reference_ranges": {"description": "per-site LOINC -> {low, high}"}, "late_after_seconds": {"default": 3600}, "key_field": {}, "event_time_field": {}}
    WRITE = {"idempotency_fields": {}}

    def _init(self) -> None:
        self.inbox: "queue.Queue[Dict[str, Any]]" = queue.Queue()
        self.server: Optional[hl7v2.MllpServer] = None
        r = self.cfg.get("read", {})
        self.crosswalk = {k: tuple(v) for k, v in (r.get("crosswalk") or {}).items()} or fhir_map.DEFAULT_CROSSWALK
        self.ranges = r.get("reference_ranges")
        self.late = int(r.get("late_after_seconds", 3600))
        self.patients: Dict[Tuple[str, str], str] = {}  # (system, value) -> canonical key after merges

    def listen(self) -> int:
        """Start accepting messages. Each accepted message is mapped and queued for `read`. Returns the port."""
        if self.server is None:
            self.server = hl7v2.MllpServer(self._on_message, self.conn.get("listen_host", "127.0.0.1"), int(self.conn.get("listen_port", 0)))
        return self.server.port

    def _canonical(self, key: Dict[str, str]) -> Dict[str, str]:
        k = (key["system"], key["value"])
        while k in self.patients:
            v = self.patients[k]
            k = (k[0], v)
        return {"system": k[0], "value": k[1]}

    def _on_message(self, m: hl7v2.Message) -> None:
        trig = m.trigger.split("^")[1] if "^" in m.trigger else ""
        try:
            if m.type.startswith("ADT"):
                p = fhir_map.patient(m)
                if trig == "A40" and m.seg("MRG"):
                    old = m.seg("MRG").f(1).split("^")[0]
                    self.patients[(p["_key"]["system"], old)] = p["_key"]["value"]  # the merged-away MRN now resolves to the surviving one
                e = fhir_map.encounter(m, self._canonical(p["_key"]))
                self.inbox.put({"kind": "adt", "trigger": trig, "control_id": m.control_id, "patient": p, "encounter": e})
            elif m.type.startswith("ORU"):
                p = fhir_map.patient(m)
                pk = self._canonical(p["_key"])
                pv1 = m.seg("PV1")
                ek = {"system": fhir_map.authority_system(m.msh.f(4)) + ":visit", "value": pv1.f(19).split("^")[0]} if pv1 and pv1.f(19) else None
                obs = fhir_map.observations(m, pk, ek, crosswalk=self.crosswalk, reference_ranges=self.ranges, late_after_seconds=self.late)
                self.inbox.put({"kind": "oru", "control_id": m.control_id, "patient": p, "observations": obs})
            else:
                raise hl7v2.Hl7Error(f"message type {m.type} is not handled by this interface")
        except hl7v2.Hl7Error:
            raise  # AR: the sender must fix the message
        # anything else propagates and becomes AE (the sender retries)

    def _health(self) -> Health:
        if self.conn.get("send_host"):
            import socket
            socket.create_connection((self.conn["send_host"], int(self.conn["send_port"])), timeout=float(self.conn.get("timeout", 5))).close()
        return Health(True, {"listening": self.server.port if self.server else None})

    def _read_page(self, query: Dict[str, Any], cursor: Any) -> Tuple[List[Dict[str, Any]], Any]:
        rows = []
        while True:
            try:
                rows.append(self.inbox.get_nowait())
            except queue.Empty:
                break
        return rows, None

    def _key_of(self, raw: Dict[str, Any]) -> str:
        return raw["control_id"]

    def _write_one(self, payload: Dict[str, Any], idem_key: str) -> Dict[str, Any]:
        if not self.conn.get("send_host"):
            raise ConfigError("connection.send_host and send_port are required to send")
        code, text = hl7v2.send(self.conn["send_host"], int(self.conn["send_port"]), payload["message"], timeout=float(self.conn.get("timeout", 5)), retries=1)
        if code == "AA":
            return {"ack": code}
        if code == "AR":
            raise PermanentError(f"receiver rejected the message: {text}")
        raise TransientError(f"no positive acknowledgement ({code}): {text}")

    def close(self) -> None:
        if self.server:
            self.server.close()
            self.server = None
