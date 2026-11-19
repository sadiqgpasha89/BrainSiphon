# Shipment ETA: integration guide

## 1. Six separate integrations

| Integration | Style | Protocol | Implementation here | Owner |
|-------------|-------|----------|---------------------|-------|
| Carrier status by **EDI** (file exchange) | Asynchronous, batch-shaped | X12 214/990/997, EDIFACT IFTSTA over AS2, SFTP or VAN | `edi.py`, `registry.py` | Logistics IT + carrier |
| Carrier **APIs and webhooks** | Asynchronous push or polled | REST, signed webhooks | `security.WebhookVerifier`, framework REST adapters | Logistics IT |
| **MQTT telemetry** from vehicles and devices | Streaming, intermittent | MQTT 3.1.1/5 over TLS | `events.ShipmentLog.add_ping`, `edge.EdgeBuffer` | Fleet / device owner |
| **TMS** (shipments, loads, plans) | Request/response plus events | vendor REST/SOAP, flat files | `sap-odata` or the TMS vendor's API via the framework | Transport planning |
| **WMS** (dock appointments, labour, inventory) | Request/response | vendor API, flat files | framework adapters | Warehouse IT |
| **ERP** (orders, POs) | Batch + events | SAP OData/IDoc, Oracle | `sap-odata`, `oracle` | ERP team |

Keep EDI file exchange apart from the synchronous service calls: EDI has acknowledgements (997), batch windows and retransmission rules of its own; the ETA service is a REST/gRPC call with a deadline. The four layers apply to each: external format -> connector -> canonical milestone event -> acknowledgement (997, HTTP 2xx, MQTT PUBACK).

## 2. Canonical event

```json
{"shipment_ref":"SHIP-789","carrier":"ACMEFRT","milestone":"IN_TRANSIT","status_code":"X6","event_time":"2026-03-14T09:15:00Z",
 "time_basis":"local-treated-as-utc","location":{"city":"DALLAS","state":"TX","country":"US"},"source_format":"X12-214","message_id":"<sha256 prefix>","issues":[]}
```

`message_id` is derived from (carrier, shipment, status code, event time), never from arrival time, so a resend is a duplicate. An unmapped status code becomes `UNMAPPED_<code>` with an issue: it is reported to the carrier-integration owner, not dropped.

## 3. X12 214 to canonical (status codes in `AT7`)

| AT7-01 | Meaning | Canonical milestone |
|--------|---------|---------------------|
| AF | Departed pick-up location | DEPARTED_PICKUP |
| X3 | Arrived at pick-up location | ARRIVED_PICKUP |
| X6 / I1 | En route / in transit | IN_TRANSIT |
| X2 / P1 | Arrived / departed terminal | ARRIVED_TERMINAL / DEPARTED_TERMINAL |
| X1 | Arrived at delivery location | ARRIVED_DELIVERY |
| D1 | Completed unloading | DELIVERED |
| AG / AB | Estimated delivery / appointment | ESTIMATED_DELIVERY / DELIVERY_APPOINTMENT |

AT7-02 carries the reason (weather `A9`, carrier delay `AF`, customs hold `B4`). AT7-07 is the time code: `LT` (local time) is applied as UTC **and flagged**
(`time_basis`), because converting it needs the facility's time zone. Provide a facility table (`facility -> IANA zone`) before go-live.
EDIFACT IFTSTA: `BGM` is the shipment reference, `DTM+334` the status time (format 203), `LOC+7` the UN/LOCODE, `STS` the status. The service string advice (`UNA`) and release character (`?`) are honoured.

## 4. Partner onboarding (AS2, SFTP, webhooks, carrier APIs)

`registry.onboarding_checklist(carrier)` generates the steps for each carrier from `config/carriers.json` (formats, endpoints, auth, **credential reference into the secret manager, never the secret**,
rate limits, status): AS2 identifiers and MDN, SFTP host-key pinning and atomic-file convention, webhook secrets with rotation and replay protection, REST credentials and rate limits, MQTT per-device credentials,
and the common certification: map every status code, prove idempotency (send twice), prove ordering (older after newer), prove error handling (malformed, wrong signature, expired certificate), agree an operational contact.

**mTLS certificates**: generate the key pair on our side; exchange CSR and certificates; load the partner CA; test with an expired and a wrong-CA certificate; add to `security.rotation_plan` (start at 45 days, urgent at 14).

## 5. Identity: partners, carriers and devices are not employees

| Identity | Mechanism | Lifecycle |
|----------|-----------|-----------|
| Carrier system (EDI, API) | Own credential per carrier: AS2 certificate, client certificate, OAuth client, HMAC secret pair | Created at onboarding, rotated per the plan, revoked at offboarding; **independent of every other carrier** |
| Carrier user (portal) | The carrier's own IdP federated, or no access | |
| Device (truck, tracker, scanner) | Per-device certificate or token | Provisioned at install, revoked when the device is lost; a stolen device must not expose the fleet |
| Our workforce (planners, control tower) | The enterprise IdP (OIDC) with roles | |
| Machine-to-machine inside the platform | Workload identity | |

## 6. Event time and processing time

- The model and every metric use **event time**. Processing time is kept as `received_at` and `lag_s`.
- **Out-of-order**: a milestone that arrives after a later one is applied and counted (`out_of_order`); the latest milestone is chosen by event time.
- **Duplicates**: same message id, or the same milestone at the same event time from another feed, is ignored.
- **Corrections**: the same milestone at a different time replaces the earlier one and is counted (`corrections`).
- **Late updates**: lag above one hour is flagged `late`; the ETA is recalculated from event time, and a late *delivered* event closes the shipment retrospectively.
- **Missing pings**: `ping_gaps` reports silence and gaps; dead-reckon only for short gaps; after `stale_after_hours` withhold the ETA and open an exception.

## 7. Location: normalise, fence, grade, detect

`geo.normalise` (decimal degrees, WGS84, latitude first; detects swapped and out-of-range values, parses degrees-minutes-seconds, rejects 0,0), `in_geofence` (hub, port, warehouse arrival and dwell),
`quality` (good, degraded, poor from accuracy, HDOP, satellites), `anomalies` (impossible speed, non-monotonic time).

## 8. ETA publication rules (`policy.py`)

| Rule | Default |
|------|---------|
| Withhold when the interval (P90 - P10) is wider than | 12 h |
| Withhold when no shipment signal for | 6 h (and open an exception) |
| Withhold when location quality is poor and there is no new milestone | yes |
| Recalculate on a new milestone, or when the P50 moves by | 30 minutes |
| Notify the customer when the ETA moves | 2 h |
| Reschedule the dock appointment when the ETA moves later by | 4 h |
| Re-plan warehouse labour | when arrival crosses a shift boundary or the next day |
| Re-plan dispatch | when the ETA moves later by 4 h |

Disruption examples to put in the replay set: port congestion (dwell at `ARRIVED_TERMINAL` growing day over day), customs hold (reason `B4`), warehouse dwell, weather (reason `A9`), carrier delay (`AF`).

## 9. Manual override and exception resolution

`OverrideBook`: reason from a fixed list, visible to anyone who sees the ETA, expires at the next real milestone; an override more than 24 h from the model needs a second approver. Exceptions have an owner, a state and a resolution.

## 10. Offline and intermittent connectivity

`EdgeBuffer`: write locally, forward in priority order, idempotent by event id, bounded with counted loss of the oldest low-priority events. Test the link-drop and replay cases at each warehouse before go-live.
