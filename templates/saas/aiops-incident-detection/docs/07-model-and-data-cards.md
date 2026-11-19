# AIOps Incident Detection: model card and data card

> Generated from the blueprint `saas/aiops-incident-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** AIOps Incident Detection · **Domain:** saas · **Latency tier:** sub-100ms · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Static threshold alerts on CPU and latency.
- **Production model:** Multi-window SLO burn alerts plus seasonal anomaly detectors on key SLIs, correlated with change events.
- **Intended use:** Detect production incidents from metrics, traces and logs within minutes, with low alert noise and clear scope.
- **Out of scope:** - Single-sample spikes: noise.<br>- Host name: none.
- **Primary metrics:** - Detection delay at fixed false alerts<br>- Precision on postmortem-confirmed incidents
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Traffic from a marketing campaign<br>- Metric cardinality explosion
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new and small tenants, rarely used features and non-English users; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Detect production incidents from metrics, traces and logs within minutes, with low alert noise and clear scope.
- **Label:** For "AIOps Incident Detection": Detect production incidents from metrics, traces and logs within minutes, with low alert noise and clear scope. The reference kit's label belongs to a neighbouring problem and does not describe yours: A point is anomalous when it lies inside an anomaly interval. An event is detected when an alert fires inside the interval (or up to 3 hours after); delay is measured from the interval's start. Define your own label exactly as in M1. Design around this trap first: Synthetic anomalies only.
- **Sources:** - **Source:** SLI burn rate inputs<br>**Owner:** Product analytics<br>**System Of Record:** Tenant and entitlement service<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: window choices.<br>- **Source:** Seasonal residual inputs<br>**Owner:** Platform engineering<br>**System Of Record:** Product event warehouse<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: forecast quality.<br>- **Source:** Deploy and change events inputs<br>**Owner:** Customer success operations<br>**System Of Record:** CRM and billing (subscriptions)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: event feed.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Synthetic anomalies only<br>- Labels from alerts that fired
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
