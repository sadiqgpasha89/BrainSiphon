# Clinical Communication Delay & Escalation Risk Prediction: model card and data card

> Generated from the blueprint `healthcare/clinical-communication-delay-escalation-risk-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Clinical Communication Delay & Escalation Risk Prediction · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A fixed escalation timer applies to every message of the same urgency.
- **Production model:** A discrete-time survival model and queue analytics over streaming message events that estimate time to response, with deterministic urgent timers as overrides and a rate-limited escalation trigger for the operational owner.
- **Intended use:** Predict which messages are likely to miss acknowledgement or response service levels or stay unresolved, and give the escalation owner a time-to-response estimate and a trigger, while urgent deterministic escalation always overrides the model.
- **Out of scope:** - Message length: not delay.<br>- Sender identity: not a delay driver.<br>- Message wording alone: covered by urgency.
- **Primary metrics:** - Concordance index and time-dependent AUC at 15 and 60 minutes<br>- Calibration of delay probabilities<br>- Alerts per owner per shift and the share acted on
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Shift change<br>- Platform outage<br>- Mass-casualty event<br>- New message category
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including paediatric and elderly patients, renal failure, rare units and patients with missing devices; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Return top reason codes (SHAP-based or monotone-constrained) with every decision | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Predict which messages are likely to miss acknowledgement or response service levels or stay unresolved, and give the escalation owner a time-to-response estimate and a trigger, while urgent deterministic escalation always overrides the model.
- **Label:** For "Clinical Communication Delay & Escalation Risk Prediction": Predict which messages are likely to miss acknowledgement or response service levels or stay unresolved, and give the escalation owner a time-to-response estimate and a trigger, while urgent deterministic escalation always overrides the model. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Letting the score replace urgent timers.
- **Sources:** - **Source:** Queue depth and arrival rate inputs<br>**Owner:** Clinical operations<br>**System Of Record:** Secure messaging platform<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: event stream.<br>- **Source:** Role availability inputs<br>**Owner:** Nursing leadership<br>**System Of Record:** Queue and workload data<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: roster snapshot.<br>- **Source:** Urgency and channel inputs<br>**Owner:** Clinical informatics<br>**System Of Record:** Role availability and roster<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: message metadata.<br>- **Source:** Recent response times inputs<br>**Owner:** Patient safety<br>**System Of Record:** Service-level definitions<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: earlier periods.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Letting the score replace urgent timers<br>- Scoring individual staff<br>- Alerting on every high score
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
