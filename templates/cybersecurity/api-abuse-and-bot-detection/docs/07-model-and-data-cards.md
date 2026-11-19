# API Abuse & Bot Detection: model card and data card

> Generated from the blueprint `cybersecurity/api-abuse-and-bot-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** API Abuse & Bot Detection · **Domain:** cybersecurity · **Latency tier:** sub-100ms · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Rate limits per IP and API key.
- **Production model:** Streaming behavioural features with GBDT scoring, device fingerprint signals and adaptive challenges tied to risk.
- **Intended use:** Detect scraping, enumeration and business-logic abuse on APIs while preserving legitimate integrations.
- **Out of scope:** - IP address alone: rotates.<br>- User-agent: spoofed.
- **Primary metrics:** - Detection rate at fixed false-block rate<br>- Challenge success for humans
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Large legitimate partner bursts<br>- Residential proxies disguise bots
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new tenants, rare log sources and low-volume languages; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Return top reason codes (SHAP-based or monotone-constrained) with every decision | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Detect scraping, enumeration and business-logic abuse on APIs while preserving legitimate integrations.
- **Label:** For "API Abuse & Bot Detection": Detect scraping, enumeration and business-logic abuse on APIs while preserving legitimate integrations. The reference kit's label: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Design around this trap first: Labels only from detected bots.
- **Sources:** - **Source:** Endpoint sequence entropy inputs<br>**Owner:** Detection engineering<br>**System Of Record:** SIEM and security data lake<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: session windows.<br>- **Source:** Request timing regularity inputs<br>**Owner:** Security data platform<br>**System Of Record:** Asset inventory (CMDB) and identity directory<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: window.<br>- **Source:** Enumeration pattern inputs<br>**Owner:** Identity and access team<br>**System Of Record:** Case and ticketing system (SOAR)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: pattern.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Labels only from detected bots<br>- Bot behaviours simulated naively
- **Privacy and deletion:** Employee-monitoring law and works-council rules, field-level masking in analyst views, retention by incident class. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
