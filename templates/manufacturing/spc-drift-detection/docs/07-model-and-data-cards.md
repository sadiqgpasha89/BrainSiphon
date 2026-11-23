# Statistical Process Control Drift Detection: model card and data card

> Generated from the blueprint `manufacturing/spc-drift-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Statistical Process Control Drift Detection · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Shewhart X-bar and R charts with standard run rules, because they are the quality standard.
- **Production model:** Per-stream EWMA and CUSUM detectors with change-point detection on tool-segmented data, a response-plan link for each alarm type and a dashboard for engineers.
- **Intended use:** Detect slow drifts and shifts in process measurements earlier than classic control charts while keeping the false alarm rate low enough for operators to act.
- **Out of scope:** - Operator name: not a cause.<br>- Measurement timestamp precision: an artefact.<br>- Product colour: no link.
- **Primary metrics:** - Average run length to detect a seeded shift<br>- False alarms per stream per month<br>- Alarm precision
- **Measured values (fill in):** ____________
- **Slices reported:** - Line, shift and plant<br>- Product variant and material lot<br>- Machine age, tooling and supplier batch<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Planned recipe change<br>- Gauge error<br>- Seasonal effect
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new product variants, rare machines, first runs after a changeover and low-volume lots; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Return top reason codes (SHAP-based or monotone-constrained) with every decision | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Detect slow drifts and shifts in process measurements earlier than classic control charts while keeping the false alarm rate low enough for operators to act.
- **Label:** For "Statistical Process Control Drift Detection": Detect slow drifts and shifts in process measurements earlier than classic control charts while keeping the false alarm rate low enough for operators to act. No reference kit models this label, so define it exactly as in M1. Design around this trap first: One limit for mixed populations.
- **Sources:** - **Source:** CUSUM statistic inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: reset after corrective action.<br>- **Source:** EWMA residual inputs<br>**Owner:** Quality engineering<br>**System Of Record:** ERP and production planning<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: tune the weight per process.<br>- **Source:** Run-rule violations inputs<br>**Owner:** Reliability and maintenance<br>**System Of Record:** CMMS or EAM maintenance system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: combine with the model score.<br>- **Source:** Tool and chamber identifier inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: segment before charting.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - One limit for mixed populations<br>- Alarms with no response plan<br>- Ignoring gauge error
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
