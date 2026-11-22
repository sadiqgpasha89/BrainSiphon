# Vendor Credential Compliance Risk Scoring: model card and data card

> Generated from the blueprint `healthcare/vendor-credential-compliance-risk-scoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Vendor Credential Compliance Risk Scoring · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Spreadsheet of credential expiry dates with a monthly review.
- **Production model:** Deterministic requirement validation against a versioned catalogue, document extraction for evidence, and a gradient-boosted risk prioritiser that ranks representatives by likelihood of lapse and exposure, each with its supporting evidence attached.
- **Intended use:** Identify vendor representatives whose required credentials, training, insurance or attestations are missing, expired or inconsistent, and give access staff an evidence-linked risk score and eligibility recommendation.
- **Out of scope:** - Vendor company size: not a compliance cause.<br>- Representative name: personal and not predictive.<br>- Visit purpose free text: noisy.
- **Primary metrics:** - PR-AUC and precision at the review capacity<br>- Rule-evaluation accuracy on audited records<br>- Calibration by vendor category
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate field confidence so the "needs review" threshold gives the target accuracy among auto-accepted fields.
- **Known failure modes:** - Vendor submits late<br>- Requirement catalogue changes<br>- Same person works for two vendors<br>- Forged or altered certificate
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including paediatric and elderly patients, renal failure, rare units and patients with missing devices; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Identify vendor representatives whose required credentials, training, insurance or attestations are missing, expired or inconsistent, and give access staff an evidence-linked risk score and eligibility recommendation.
- **Label:** For "Vendor Credential Compliance Risk Scoring": Identify vendor representatives whose required credentials, training, insurance or attestations are missing, expired or inconsistent, and give access staff an evidence-linked risk score and eligibility recommendation. The reference kit's label: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Design around this trap first: Scoring on records already remediated.
- **Sources:** - **Source:** Days to nearest expiry inputs<br>**Owner:** Vendor management<br>**System Of Record:** Vendor credentialing and access management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use document dates.<br>- **Source:** Missing requirement count inputs<br>**Owner:** Facility security<br>**System Of Record:** Vendor master data<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: catalogue version.<br>- **Source:** Visit frequency and areas inputs<br>**Owner:** Infection prevention<br>**System Of Record:** Facility access and visitor management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: past visits only.<br>- **Source:** Historical lapse rate inputs<br>**Owner:** Compliance<br>**System Of Record:** Vendor credentialing and access management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: strictly earlier cycles.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Scoring on records already remediated<br>- Mixing requirement catalogue versions<br>- Treating missing evidence as violation
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
