"""Carrier integration registry and the onboarding and certification checklists generated from it."""
from __future__ import annotations

import json
from typing import Any, Dict, List

REQUIRED = ("id", "name", "integration", "formats", "endpoints", "auth", "credential_ref", "rate_limit", "status")
INTEGRATIONS = {"as2", "sftp", "webhook", "rest_api", "mqtt", "edi_van"}
CHECKLISTS: Dict[str, List[str]] = {
    "as2": ["Exchange AS2 identifiers, URLs and signing/encryption certificates (public keys only)", "Agree MDN mode (sync/async) and the receipt window", "Send a test 214 and confirm the signed MDN and a 997", "Agree retransmission and duplicate handling (same ISA control number)", "Schedule certificate renewal 45 days before expiry"],
    "sftp": ["Exchange host key fingerprint out of band and pin it", "Key-based auth only; share the public key, never the private key", "Agree directory layout, file naming, encoding and the processed/failed convention", "Agree the polling interval and file retention", "Test a partial-file case: files appear atomically (rename on completion) or with a manifest"],
    "webhook": ["Share the callback URL and the signing secret through the secret manager, two secrets for rotation", "Verify the signature scheme, timestamp tolerance and replay protection (security.WebhookVerifier)", "Agree retry policy on non-2xx from our side and the dead-letter route", "Allow-list the carrier's source IPs if they publish them", "Return 2xx only after the event is durably stored"],
    "rest_api": ["Obtain sandbox credentials and the rate-limit table", "Implement token refresh and Retry-After handling (the framework client does both)", "Agree pagination, cursor and incremental sync semantics", "Record the API version and deprecation date in the connector registry"],
    "mqtt": ["Agree topic structure, QoS, retained-message policy and the client id rules", "Per-device credentials with revocation; no shared device secret", "Agree the payload schema, timestamp field and units (and the clock source of the device)", "Test reconnect with a clean session and message replay"],
    "edi_van": ["Agree the mailbox ids and the VAN's retention window", "Test envelopes, then a full day of volume", "Agree who resends after a VAN outage"],
}
CERTIFICATION = ["Parse and map every status code the carrier can send; unknown codes are reported, not dropped", "Prove idempotency: send the same message twice and observe one milestone", "Prove ordering: send an older milestone after a newer one", "Prove error handling: malformed message, wrong signature, expired certificate", "Agree an operational contact, an escalation path and a maintenance-window calendar", "Record the tested date, the carrier's contact and the version in the registry"]


def load(path: str) -> List[Dict[str, Any]]:
    with open(path, encoding="utf-8") as f:
        return json.load(f)["carriers"]


def validate(carriers: List[Dict[str, Any]]) -> List[str]:
    errs, seen = [], set()
    for c in carriers:
        for k in REQUIRED:
            if k not in c:
                errs.append(f"{c.get('id', '?')}: missing {k}")
        if c.get("integration") not in INTEGRATIONS:
            errs.append(f"{c.get('id')}: integration must be one of {sorted(INTEGRATIONS)}")
        if c.get("id") in seen:
            errs.append(f"duplicate carrier id {c.get('id')}")
        seen.add(c.get("id"))
        ref = c.get("credential_ref", "")
        if ref and not ref.startswith(("vault:", "aws-sm:", "azure-kv:", "gcp-sm:", "env:")):
            errs.append(f"{c.get('id')}: credential_ref must point at a secret manager (vault:, aws-sm:, azure-kv:, gcp-sm:) or env:, never hold the secret")
    return errs


def onboarding_checklist(c: Dict[str, Any]) -> List[str]:
    steps = list(CHECKLISTS[c["integration"]])
    if c.get("auth") == "mtls":
        steps.append("mTLS: generate the key pair on our side, exchange CSR and certificates, load the partner's CA, test with an expired and a wrong-CA certificate, then add both to the rotation plan")
    return [*steps, *CERTIFICATION]
