# Learned Trace & Telemetry Sampling: model card and data card

> Generated from the blueprint `saas/learned-trace-sampling` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Learned Trace & Telemetry Sampling · **Domain:** saas · **Latency tier:** sub-10ms · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Head-based 1% uniform sampling.
- **Production model:** Tail-sampling collectors with learned keep-probabilities from rarity, error and latency features, budget-constrained by controller.
- **Intended use:** Decide in real time which traces and logs to keep so that rare errors and slow requests are retained while costs drop by 80%.
- **Out of scope:** - Trace ID: random.<br>- Span count: weak.
- **Primary metrics:** - Retention rate of anomalous traces at budget<br>- Storage savings
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Buffer memory exhausted during spikes<br>- Incident produces a flood of identical errors
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new and small tenants, rarely used features and non-English users; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Return top reason codes (SHAP-based or monotone-constrained) with every decision | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Decide in real time which traces and logs to keep so that rare errors and slow requests are retained while costs drop by 80%.
- **Label:** For "Learned Trace & Telemetry Sampling": Decide in real time which traces and logs to keep so that rare errors and slow requests are retained while costs drop by 80%. The reference kit's label belongs to a neighbouring problem and does not describe yours: A point is anomalous when it lies inside an anomaly interval. An event is detected when an alert fires inside the interval (or up to 3 hours after); delay is measured from the interval's start. Define your own label exactly as in M1. Design around this trap first: Evaluating on already-sampled data.
- **Sources:** - **Source:** Error and latency outlier flags inputs<br>**Owner:** Product analytics<br>**System Of Record:** Tenant and entitlement service<br>**Ingestion:** CDC or event stream (Kafka) with 5 seconds freshness at p95<br>**Quality:** Point-in-time rule: thresholds.<br>- **Source:** Path rarity inputs<br>**Owner:** Platform engineering<br>**System Of Record:** Product event warehouse<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: sketches.<br>- **Source:** Customer or SLO importance inputs<br>**Owner:** Customer success operations<br>**System Of Record:** CRM and billing (subscriptions)<br>**Ingestion:** CDC or event stream (Kafka) with 5 seconds freshness at p95<br>**Quality:** Point-in-time rule: config.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Evaluating on already-sampled data<br>- Ignoring rare path coverage
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
