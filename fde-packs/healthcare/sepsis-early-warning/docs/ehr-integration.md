# Sepsis early warning: EHR and clinical integration

## 1. Connectors: which are core, which are optional

The blueprint's interface list mixes four unrelated interfaces. They are separate connectors with separate owners, certification and risk.

| Connector | Needed for the core sepsis workflow? | Purpose | Implementation here | Owner (customer) |
|-----------|--------------------------------------|---------|---------------------|------------------|
| **HL7 v2 ADT** (A01, A02, A03, A04, A08, A11, A40) over MLLP | **Core** | Who is in which bed, transfers, discharges, merges | `fde_adapters.connectors.hl7_mllp` + `protocols/fhir_map.py` | Integration team |
| **HL7 v2 ORU^R01** over MLLP | **Core** | Laboratory and vital-sign results | same | Integration team + laboratory |
| **FHIR R4 REST** (Patient, Encounter, Observation) | **Core where the EHR exposes it** (read history, write the score back) | Backfill, replay, score write-back | `fde_adapters.connectors.fhir_r4` | EHR vendor / clinical informatics |
| **CDS Hooks or vendor alert API** | **Core** (the alert has to appear in the clinician's workflow) | Deliver the alert into the in-basket or worklist | per vendor, section 5 | Clinical informatics |
| DICOMweb (QIDO-RS, WADO-RS) | Optional extension | Imaging study references (pneumonia source) | not implemented; config stub in `config/optional-connectors.json` | Radiology IT |
| ABDM health-information exchange (India) | Optional extension, jurisdictional | Cross-facility records through the national gateway | not implemented; config stub | Hospital data office |

Do not start the optional connectors until the core workflow has run in shadow on one ward.

## 2. HL7 v2 messages: parsing, acknowledgements, error recovery

- **ACK semantics.** `AA` accepted. `AE` application error: the sender may retry with the same control id. `AR` rejected: the sender must fix the message; never retry. The listener returns `AR` for a missing MSH-10, an unsupported version, an ADT without PID, an ORU without OBX, a missing PV1-19, or an unhandled message type, and `AE` when its own downstream fails.
- **Duplicates.** The same MSH-10 is acknowledged `AA` again and not processed twice (`MllpServer.duplicates`). Observation-level de-duplication uses the filler order, OBX set id and code (`Observation.identifier`).
- **Framing errors.** A sender that does not use MLLP gets `AR` and the listener keeps serving.
- **Recovery after an outage.** The sender replays from its own queue; ask the integration engine team how it queues (Mirth, Rhapsody, Cloverleaf, Ensemble, Epic Bridges) and for how long. Run a replay (`fixtures/events.jsonl`) to prove idempotent catch-up.

## 3. FHIR R4 mappings

| HL7 v2 | FHIR R4 | Rule |
|--------|---------|------|
| PID-3 (MR identifier, assigning authority PID-3.4) | `Patient.identifier` | Authority is part of the identity. A bare MRN is not an identifier |
| PID-5, PID-7, PID-8 | `Patient.name`, `birthDate`, `gender` | M/F/O/U to male/female/other/unknown |
| MRG-1 (ADT A40) | identity alias | The merged-away MRN resolves to the survivor; encounters re-pointed |
| PV1-2 | `Encounter.class` | I -> IMP, E -> EMER, O -> AMB |
| PV1-3 | `Encounter.location` | unit^room^bed; a transfer (A02) appends a history entry |
| PV1-19 | `Encounter.identifier` | Visit number. Without it the message is rejected (`AR`), not guessed |
| PV1-44, PV1-45 | `Encounter.period` | |
| OBX-3 | `Observation.code` | Local code through the crosswalk to LOINC; unmapped codes are kept, flagged and counted |
| OBX-5, OBX-6 | `valueQuantity` (UCUM) | Normalised to the unit the model was trained on |
| OBX-7, OBX-8 | `referenceRange`, `interpretation` | The ward's reference range overrides the message range |
| OBX-11 | `Observation.status` | F final, C corrected, P preliminary, X cancelled, D/W entered-in-error |
| OBX-14, else OBR-7 | `effectiveDateTime` | **When it was measured**, never when it arrived |
| OBR-22, else MSH-7 | `issued` | Arrival; the difference is recorded as the delay |

## 4. Terminology and units

Keep the crosswalk in `config/crosswalk.example.json` under change control with the laboratory. Starter entries: lactate 2524-7, WBC
6690-2, creatinine 2160-0, heart rate 8867-4, respiratory rate 9279-1, SpO2 59408-5, systolic BP 8480-6, temperature 8310-5.

| Situation | Behaviour (all tested) |
|-----------|------------------------|
| Lactate arrives in mg/dL from a new analyser | Converted to mmol/L (`/9.008`), original value kept; a unit that cannot be converted is flagged, not guessed |
| Local code not in the crosswalk | Kept with `urn:local:<system>` and an issue; counted on the mapping dashboard |
| Result reported hours after the draw | `effectiveDateTime` = draw time; `_late` set when the delay exceeds the threshold; the model uses event time |
| Same result re-sent | Ignored (`supersedes` returns `ignore`) |
| Corrected result (OBX-11 `C`) | Replaces the earlier value under the same identifier; a later *preliminary* never overwrites a corrected value |
| Deleted/cancelled result | `entered-in-error`; excluded from features |
| Missing result | No carry-forward beyond the staleness cap in the model config; NEWS2 reports `missing` explicitly |
| Hospital-specific reference ranges | Per-ward `reference_ranges` in `wards.example.json` |

## 5. Vendor-specific instructions

| EHR / engine | HL7 v2 path | FHIR path | Alert delivery | Sandbox |
|--------------|-------------|-----------|----------------|---------|
| Epic | Bridges outbound interfaces (ADT, ORU) to your MLLP listener; an Epic interface analyst builds and tests it | Epic on FHIR (R4) with a registered non-patient-facing backend app (JWT-signed client assertion); request `Observation.Read (Labs)`, `Patient.Read`, `Encounter.Read` | In Basket or BestPractice Advisory through the customer's build, or CDS Hooks (`patient-view`) | open.epic.com sandbox (FHIR only); HL7 v2 needs the customer's non-production environment |
| Oracle Health (Cerner Millennium) | Open Engine / Cerner Interface Services outbound ADT and ORU | Millennium FHIR R4 (`fhir-ehr`), SMART backend services | Discern or CDS Hooks through the customer's configuration | Oracle Health code Console sandbox (FHIR) |
| MEDITECH Expanse | Interface services outbound | Greenfield / Expanse FHIR APIs | per customer build | Greenfield sandbox |
| Integration engine only (Mirth Connect, Rhapsody, InterSystems, Cloverleaf) | Route a copy of ADT/ORU to the listener; the engine owns retries and queueing | n/a | n/a | the engine's test channel |
| Open standards test | HAPI v2 test panel | HAPI FHIR public server | n/a | https://hapi.fhir.org/baseR4 (synthetic data only) |

Whatever the vendor: (a) get the *interface specification* with the exact segments and Z-segments in use, (b) test with the customer's
non-production feed carrying de-identified or synthetic patients, (c) record the vendor build number and interface version in the connector registry.

## 6. Identity: staff, clinical identity, care teams and break-glass

| Plane | Mechanism | Rule |
|-------|-----------|------|
| Workforce authentication | SMART on FHIR launch or SSO (OIDC/SAML) with MFA | Authenticates the person. It does not by itself authorise patient access |
| Clinical identity | The EHR's user and role (provider id, license) | Who a clinician *is* for accountability: carried on every override and acknowledgement |
| Care-team permission | Relationship-based: the user is on this patient's care team or unit | The alert and patient detail are shown only to people with a relationship |
| Break-glass | Time-boxed access outside the care team with a mandatory reason, patient-privacy officer notified, full audit | Never silently available; reviewed weekly |
| Machine identity | Backend-services OAuth (signed JWT) for the FHIR client; mTLS or VPN for MLLP | Separate credentials per environment; rotated |

## 7. Alert lifecycle and workflow (`alert_lifecycle.py`)

generated -> displayed -> acknowledged -> (snoozed | overridden | escalated) -> closed.

- **Ownership:** every alert has an owner (charge nurse, then physician on call, then rapid response team) and a due time.
- **Escalation:** not acknowledged in 15 minutes goes up one level; each level has its own timer; the ladder ends at the rapid response team.
- **Snooze:** at most two, 30 minutes each, with a reason; an expired snooze returns to the worklist.
- **Override:** needs a reason; a nurse override needs a physician co-signature. Overrides are labelled outcomes for retraining.
- **Duplicate suppression:** one open alert per encounter; a refractory window after dismissal (6 h) that a rise of 0.25 or more still breaks, re-alerting **already escalated**.
- **Burden:** the cap per ward and shift flags the shift for safety review and never drops an alert.
- **Nurse and physician workflow, not just a score:** the alert text says what changed, since when, the suggested next step (repeat lactate, blood cultures, clinical review per the sepsis pathway), and who owns it. Content is agreed with the ward and approved by the clinical lead.

## 8. Fallback and downtime (`fallback.py`, `news2.py`)

| State | Trigger | What the ward sees |
|-------|---------|--------------------|
| OK | All heartbeats fresh (HL7 feed, inference, EHR alert API) | Model alerts |
| DEGRADED | Only inference is down | A banner: "Sepsis model unavailable: NEWS2 is the active rule". NEWS2 computed from the same feed |
| DOWNTIME | HL7 feed or EHR alert API down | A banner and the paper NEWS2 chart and downtime procedure; clinical informatics on-call paged |

Rehearse each state with the ward before go-live (acceptance criterion A5) and record the drill.

## 9. Clinical safety: hazard analysis, approval and validation

1. Maintain the hazard log (`docs/hazard-log.csv`) with the clinical safety officer: each hazard, cause, effect, existing control, residual risk, owner. Review it at each change.
2. Clinical validation before real alerts: retrospective replay per ward (`replay.run`) against adjudicated cases, then **silent mode** (the model scores and logs; no alert is shown) for the agreed period, then a staged go-live per ward.
3. `ward_config.enable_clinical_alerts` refuses to enable alerts for a ward without clinical validation sign-off, hazard-log review and a completed downtime drill.
4. Threshold changes: named clinical approver, reason, replay inside the burden budget, steps of at most 0.10 (`validate_threshold_change`).
5. Regulatory position (software as a medical device, local clinical-safety standards) is the customer's regulatory affairs decision; record it and the change-control procedure in the acceptance pack.

## 10. De-identified replay

`fixtures/events.jsonl` is a synthetic 24-hour stream (59 messages, 5 patients, 3 units) with a deteriorating ICU patient, a stable patient, a
mg/dL lactate, a result reported five hours late, a re-sent and then corrected lab, an ED-to-ward transfer, a merge, and a malformed message.
For the customer, build the equivalent from de-identified historical events (the customer's privacy officer approves the
de-identification method), keep the same shape, and run `replay.run` per ward.
