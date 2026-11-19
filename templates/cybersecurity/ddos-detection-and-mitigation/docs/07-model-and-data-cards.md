# DDoS Detection & Mitigation: model card and data card

> Generated from the blueprint `cybersecurity/ddos-detection-and-mitigation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** DDoS Detection & Mitigation · **Domain:** cybersecurity · **Latency tier:** sub-10ms · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Rate thresholds with scrubbing on trigger.
- **Production model:** Streaming sketches for anomaly detection plus automated signature synthesis from sampled packets, with staged mitigation and rollback.
- **Intended use:** Detect volumetric and application-layer DDoS within seconds and drive mitigation without dropping legitimate traffic.
- **Out of scope:** - Source country: spoofed.<br>- Packet size alone: weak.
- **Primary metrics:** - Detection delay at fixed FPR<br>- Collateral drop rate
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Flash crowd after a product launch<br>- Mitigation filter blocks legitimate traffic
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

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
- **Purpose:** Detect volumetric and application-layer DDoS within seconds and drive mitigation without dropping legitimate traffic.
- **Label:** For "DDoS Detection & Mitigation": Detect volumetric and application-layer DDoS within seconds and drive mitigation without dropping legitimate traffic. The reference kit's label belongs to a neighbouring problem and does not describe yours: A point is anomalous when it lies inside an anomaly interval. An event is detected when an alert fires inside the interval (or up to 3 hours after); delay is measured from the interval's start. Define your own label exactly as in M1. Design around this trap first: Lab floods unlike real attacks.
- **Sources:** - **Source:** Packet-rate deviation per destination inputs<br>**Owner:** Detection engineering<br>**System Of Record:** SIEM and security data lake<br>**Ingestion:** CDC or event stream (Kafka) with 5 seconds freshness at p95<br>**Quality:** Point-in-time rule: seasonal model.<br>- **Source:** Source entropy inputs<br>**Owner:** Security data platform<br>**System Of Record:** Asset inventory (CMDB) and identity directory<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: window.<br>- **Source:** Header/payload pattern clustering inputs<br>**Owner:** Identity and access team<br>**System Of Record:** Case and ticketing system (SOAR)<br>**Ingestion:** CDC or event stream (Kafka) with 5 seconds freshness at p95<br>**Quality:** Point-in-time rule: sampling.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Lab floods unlike real attacks<br>- Mitigation tested at low rates
- **Privacy and deletion:** Employee-monitoring law and works-council rules, field-level masking in analyst views, retention by incident class. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
