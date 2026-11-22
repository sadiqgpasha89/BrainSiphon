# Staffing Coverage Gap Prediction: model card and data card

> Generated from the blueprint `healthcare/staffing-coverage-gap-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Staffing Coverage Gap Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Rule-only report of shifts currently below minimum plus a trailing fill-rate heuristic.
- **Production model:** Gradient-boosted discrete-time hazard and classification model for the probability that a shift ends below minimum, with severity bands and time-to-gap, wrapped by a deterministic coverage and escalation rule engine.
- **Intended use:** Predict which upcoming shifts are likely to fall below minimum safe coverage or the required skill mix early enough to act, keeping a forecast risk distinct from a confirmed uncovered shift.
- **Out of scope:** - Individual employee reliability scores: punitive in effect and a privacy risk with little signal beyond aggregate absence.<br>- Manager identity: proxies for unit culture and is not a stable cause.<br>- Posting channel: reflects process not coverage risk.
- **Primary metrics:** - PR-AUC and precision at the alert budget<br>- Calibration error by lead-time band<br>- Median lead time to first correct gap alert
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Credential lapses between scoring and shift<br>- Mass absence on one day<br>- Roster republished mid-day<br>- Small units with few shifts
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
- **Purpose:** Predict which upcoming shifts are likely to fall below minimum safe coverage or the required skill mix early enough to act, keeping a forecast risk distinct from a confirmed uncovered shift.
- **Label:** For "Staffing Coverage Gap Prediction": Predict which upcoming shifts are likely to fall below minimum safe coverage or the required skill mix early enough to act, keeping a forecast risk distinct from a confirmed uncovered shift. The reference kit's label: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Design around this trap first: Counting filled shifts as false positives.
- **Sources:** - **Source:** Open-shift age and fill hazard inputs<br>**Owner:** Staffing office<br>**System Of Record:** Workforce management and scheduling system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use posting time and fill time as logged.<br>- **Source:** Absence pressure inputs<br>**Owner:** Nursing operations<br>**System Of Record:** Credentialing and privileging system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: count only absences notified before scoring time.<br>- **Source:** Eligible float depth inputs<br>**Owner:** Credentialing office<br>**System Of Record:** Timekeeping system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: eligibility must come from verified credentials at that date.<br>- **Source:** Demand-to-roster margin inputs<br>**Owner:** Staffing office<br>**System Of Record:** Staffing threshold and escalation policy register<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use the roster and forecast snapshots from scoring time.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Counting filled shifts as false positives<br>- Scoring only shifts close to start<br>- Using a model score where a rule decides coverage
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
