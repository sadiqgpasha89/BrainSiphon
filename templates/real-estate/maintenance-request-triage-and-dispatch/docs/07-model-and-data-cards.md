# Maintenance Request Triage & Dispatch: model card and data card

> Generated from the blueprint `real-estate/maintenance-request-triage-and-dispatch` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Maintenance Request Triage & Dispatch · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Staff triage by phone, because it is the current process.
- **Production model:** Multimodal classifier for urgency and trade with parts prediction and a dispatch optimiser.
- **Intended use:** Classify tenant maintenance requests by urgency and trade and dispatch the right technician with the right parts.
- **Out of scope:** - Tenant name: Irrelevant to urgency or trade.<br>- Request length: A style that depends on the tenant and not on the severity.<br>- Time sent: Weakly related to urgency, and urgent problems occur at all hours.
- **Primary metrics:** - Urgency recall<br>- Trade accuracy
- **Measured values (fill in):** ____________
- **Slices reported:** - Neighbourhood and price band<br>- Property type and listing age<br>- Fair-housing protected-class proxies such as area-level demographics<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate field confidence so the "needs review" threshold gives the target accuracy among auto-accepted fields.
- **Known failure modes:** - Emergency after hours<br>- Vague request<br>- Repeat issue
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including thin-comp micro-markets, unusual property types and new developments; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Classify tenant maintenance requests by urgency and trade and dispatch the right technician with the right parts.
- **Label:** For "Maintenance Request Triage & Dispatch": Classify tenant maintenance requests by urgency and trade and dispatch the right technician with the right parts. The reference kit's label belongs to a neighbouring problem and does not describe yours: The label is the class of the document, assigned by the person who handled it; documents in the same thread share a label. Define your own label exactly as in M1. Design around this trap first: Labels come from staff habits and may reflect past dispatch practice and not need.
- **Sources:** - **Source:** Safety phrases inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: terms vary by language and dialect, so test on local phrasing.<br>- **Source:** Image classifier inputs<br>**Owner:** Property operations<br>**System Of Record:** Listing (MLS) feed and CRM<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: photo quality varies, so require a confidence margin.<br>- **Source:** Asset history inputs<br>**Owner:** Geospatial team<br>**System Of Record:** Building management system (BMS) and IoT hub<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: records are incomplete for older buildings.<br>- **Source:** Weather inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: forecasts are uncertain, so use it as context and not as a rule.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Labels come from staff habits and may reflect past dispatch practice and not need<br>- Missing photos for some requests make the evaluation optimistic about the multimodal model
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
