# Provider Credential Expiration & Renewal Prediction: model card and data card

> Generated from the blueprint `healthcare/provider-credential-expiration-renewal-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Credential Expiration & Renewal Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A report of credentials expiring in the next 90 days sorted by date.
- **Production model:** Discrete-time survival and gradient-boosted classification of the probability that a renewal closes before expiry, combined with a deterministic deadline calendar, evidence-gap lookup and a prioritised outreach queue.
- **Intended use:** Predict which credential renewals are at risk of missing their deadline and prioritise outreach before a licence, certification or coverage lapses.
- **Out of scope:** - Provider specialty prestige: not a driver of lateness.<br>- Provider age: protected and irrelevant.<br>- Employment status alone: confounds process with outcome.
- **Primary metrics:** - Concordance index and time-dependent AUC at 30 and 60 days<br>- Calibration by credential type<br>- Precision at the outreach capacity
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Verification source outage<br>- Policy change in lead time<br>- Provider on leave<br>- Bulk renewals at one date
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
- **Purpose:** Predict which credential renewals are at risk of missing their deadline and prioritise outreach before a licence, certification or coverage lapses.
- **Label:** For "Provider Credential Expiration & Renewal Prediction": Predict which credential renewals are at risk of missing their deadline and prioritise outreach before a licence, certification or coverage lapses. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Treating open renewals as failures.
- **Sources:** - **Source:** Days to expiry minus expected completion time inputs<br>**Owner:** Medical staff office<br>**System Of Record:** Credentialing and privileging system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use the verification turnaround known at scoring time.<br>- **Source:** Missing evidence count inputs<br>**Owner:** Credentialing operations<br>**System Of Record:** Provider master data<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: snapshot as of scoring.<br>- **Source:** Prior reminder response inputs<br>**Owner:** Provider data governance<br>**System Of Record:** Primary-source verification services<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: strictly earlier cycles.<br>- **Source:** Verification source latency inputs<br>**Owner:** Medical staff office<br>**System Of Record:** Credentialing and privileging system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: trailing window.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Treating open renewals as failures<br>- Using final completion dates as features<br>- Mass reminders with no prioritisation
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
