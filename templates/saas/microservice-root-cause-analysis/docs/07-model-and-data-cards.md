# Microservice Root-Cause Analysis: model card and data card

> Generated from the blueprint `saas/microservice-root-cause-analysis` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Microservice Root-Cause Analysis · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** On-call engineers following dashboards.
- **Production model:** Topology-aware causal ranking with trace-based error origin analysis and change correlation, summarised by an LLM with evidence links.
- **Intended use:** Localise the root cause service or change in a microservice incident using traces, metrics and topology, cutting time to diagnosis.
- **Out of scope:** - Service name: none.<br>- Alert count: volume.
- **Primary metrics:** - Top-3 root cause accuracy on past incidents<br>- Time to localise
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Sampling drops the failing traces<br>- Cascading failure with retries
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

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
- **Purpose:** Localise the root cause service or change in a microservice incident using traces, metrics and topology, cutting time to diagnosis.
- **Label:** For "Microservice Root-Cause Analysis": Localise the root cause service or change in a microservice incident using traces, metrics and topology, cutting time to diagnosis. The reference kit's label belongs to a neighbouring problem and does not describe yours: A pair of records is positive when both belong to the same hidden true cluster. Clusters are formed by connected components over the pairs the model links. Define your own label exactly as in M1. Design around this trap first: Evaluation on injected faults only.
- **Sources:** - **Source:** Anomaly onset ordering inputs<br>**Owner:** Product analytics<br>**System Of Record:** Tenant and entitlement service<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: clock sync.<br>- **Source:** Trace error propagation inputs<br>**Owner:** Platform engineering<br>**System Of Record:** Product event warehouse<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: trace sampling.<br>- **Source:** Recent change proximity inputs<br>**Owner:** Customer success operations<br>**System Of Record:** CRM and billing (subscriptions)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: change feed.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Evaluation on injected faults only<br>- Postmortem labels subjective
- **Privacy and deletion:** Tenant isolation of data, embeddings and adapters; no training on customer data without contract; subprocessor transparency; deletion on tenant offboarding. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
