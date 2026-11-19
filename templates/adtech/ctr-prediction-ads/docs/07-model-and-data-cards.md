# Ad Click-Through Rate Prediction: model card and data card

> Generated from the blueprint `adtech/ctr-prediction-ads` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Ad Click-Through Rate Prediction · **Domain:** adtech · **Latency tier:** sub-10ms · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Logistic regression with hashed feature crosses.
- **Production model:** DCN-v2 with embedding tables sharded across hosts, FTRL-style online updates for the head and quantised CPU serving.
- **Intended use:** Predict click probability for each ad candidate with calibrated outputs at millions of requests per second.
- **Out of scope:** - Use impression identifiers, advertiser name text or raw user agent strings: the first is random, the second duplicates the advertiser identifier and the third hashes thousands of rare variants into noise when device class already carries the signal.<br>- Retrain only daily: new ads cold-start badly, and the hour matters when campaigns launch.<br>- Learn click rates from logs ranked by the old model without modelling position: the model would learn the old ranking and punish ads that were never shown at the top.<br>- Optimise AUC alone: a well-ranked but miscalibrated score misprices every auction, and AUC cannot see it.
- **Primary metrics:** - AUC, log-loss and normalised cross-entropy<br>- Calibration by placement
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate click and conversion probabilities (isotonic or Platt) per surface and position so the ranker's scores can be compared and combined with business value.
- **Known failure modes:** - Embedding table updates mid-serving cause version skew<br>- New creative format with no history<br>- Accidental taps counted as clicks<br>- Traffic shift after a site redesign
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new campaigns, small publishers and rare device types; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Predict click probability for each ad candidate with calibrated outputs at millions of requests per second.
- **Label:** click = 1 when the user clicked the ad. Clicks with a dwell time under 500 ms are treated as accidental taps and set to 0 in the training label and in the history features (the third sample row is one). The label is observed at impression time plus a few seconds, so there is little label delay, but conversions that follow a click can arrive days later; model them separately.
- **Sources:** - **Source:** Ad-user embedding interaction inputs<br>**Owner:** Ad platform engineering<br>**System Of Record:** Campaign, budget and pacing ledger<br>**Ingestion:** CDC or event stream (Kafka) with 5 seconds freshness at p95<br>**Quality:** Point-in-time rule: embedding versions must match between training and serving.<br>- **Source:** Historical CTR with smoothing inputs<br>**Owner:** Measurement science<br>**System Of Record:** Billing and invoicing<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: count only impressions before the scored one.<br>- **Source:** Context features inputs<br>**Owner:** Privacy engineering<br>**System Of Record:** Identity graph and consent store (CMP)<br>**Ingestion:** CDC or event stream (Kafka) with 5 seconds freshness at p95<br>**Quality:** Point-in-time rule: all known at request time.<br>- **Source:** Position at display inputs<br>**Owner:** Ad platform engineering<br>**System Of Record:** Exchange and partner registry<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: forgetting to neutralise it at serving time double-counts the position.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Position bias unmodelled so the model learns the old ranking<br>- Training on clicks that include accidental taps
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
