# Pack: Sepsis Early-Warning System (Healthcare)

The hospital integration for the sepsis blueprint, built on the framework's `hl7v2-mllp` and `fhir-r4` adapters: what happens between the
EHR's HL7 feed and the clinician acting on an alert, and what happens when something is down.

```bash
cd fde-packs/healthcare/sepsis-early-warning
python3 -m pytest tests -q          # 11 tests, including a 59-message de-identified replay through the real MLLP listener
```

| File | What it is |
|------|------------|
| `src/sepsis_integration/alert_lifecycle.py` | generated, displayed, acknowledged, snoozed, overridden, escalated, closed; ownership, escalation, suppression, burden cap, audit trail |
| `src/sepsis_integration/identity.py` | Authority-qualified identity, merges, look-alike review queue, encounter matching by visit number or an explicit time window |
| `src/sepsis_integration/news2.py` | The deterministic fallback score |
| `src/sepsis_integration/fallback.py` | Heartbeats and the OK / DEGRADED / DOWNTIME ward states |
| `src/sepsis_integration/ward_config.py` | Per-ward thresholds, acceptance criteria, change control, the gate on enabling real alerts |
| `src/sepsis_integration/replay.py` | De-identified HL7 replay through listener, mapping, identity, feature state, a stand-in risk model and the alert engine |
| `fixtures/events.jsonl` | Synthetic 24-hour stream covering late, duplicate, corrected, unit-changed, transferred, merged and malformed cases |
| `docs/ehr-integration.md` | Core versus optional connectors, FHIR mappings, terminology, vendor instructions, identity, workflow, downtime, clinical safety |
| `docs/hazard-log.csv` | Starter hazard log for the clinical safety officer |
| `config/` | Wards, crosswalk, optional connector stubs |

The risk score in `replay.StubRiskModel` is **not a model**: it lets the integration be exercised before the model service is connected.
Real clinical alerts must stay off until clinical validation, hazard review and a downtime drill are signed (`enable_clinical_alerts` enforces it).
No part of this has been run against an EHR vendor's sandbox or a hospital system.
