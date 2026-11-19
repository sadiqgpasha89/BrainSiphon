# Attachment Sandbox Triage: model card and data card

> Generated from the blueprint `cybersecurity/email-attachment-sandbox-triage` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Attachment Sandbox Triage · **Domain:** cybersecurity · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** AV scan plus detonate all executable attachments.
- **Production model:** Static plus visual features with cost-aware sandbox scheduling and fast verdict caching by content hash.
- **Intended use:** Decide which attachments need expensive sandbox detonation, and classify them quickly using static and visual document features.
- **Out of scope:** - File name: trivial to change.<br>- File size: weak.
- **Primary metrics:** - Detonation-worthy recall at fixed capacity<br>- Verdict latency
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate detection scores per class and per condition so that a fixed threshold means the same precision across lines.
- **Known failure modes:** - Sandbox-evasive malware waits for user interaction<br>- Queue backlog during attack waves
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new tenants, rare log sources and low-volume languages; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Decide which attachments need expensive sandbox detonation, and classify them quickly using static and visual document features.
- **Label:** For "Attachment Sandbox Triage": Decide which attachments need expensive sandbox detonation, and classify them quickly using static and visual document features. The reference kit's label: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Design around this trap first: Training on labelled detonation outcomes only (selection bias).
- **Sources:** - **Source:** Macro and embedded-object flags inputs<br>**Owner:** Detection engineering<br>**System Of Record:** SIEM and security data lake<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: parsing.<br>- **Source:** Rendered-page lure score inputs<br>**Owner:** Security data platform<br>**System Of Record:** Asset inventory (CMDB) and identity directory<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: rendering fidelity.<br>- **Source:** Sender reputation and file prevalence inputs<br>**Owner:** Identity and access team<br>**System Of Record:** Case and ticketing system (SOAR)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: data.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Training on labelled detonation outcomes only (selection bias)<br>- Static datasets without evasion
- **Privacy and deletion:** Employee-monitoring law and works-council rules, field-level masking in analyst views, retention by incident class. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
