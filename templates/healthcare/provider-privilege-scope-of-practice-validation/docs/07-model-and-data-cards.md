# Provider Privilege & Scope-of-Practice Validation: model card and data card

> Generated from the blueprint `healthcare/provider-privilege-scope-of-practice-validation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Privilege & Scope-of-Practice Validation · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Manual cross-check by medical staff office against the privilege catalogue.
- **Production model:** Versioned rules engine over a temporal knowledge graph of providers, credentials, privileges and procedures, with a learned ranker that only orders exceptions by review priority and an explanation generator that cites rule and source.
- **Intended use:** Detect mismatches between provider qualifications, granted privileges, specialty, facility rules and proposed assignments or procedures, and give the medical staff office an auditable explanation of each exception.
- **Out of scope:** - Provider case volume as a quality proxy: not an authorisation criterion.<br>- Seniority: not a privilege.<br>- Manager request urgency: pressure not evidence.
- **Primary metrics:** - Exception ranking precision at the review budget<br>- Rule-evaluation agreement with committee decisions<br>- False-clear rate on adjudicated cases
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Bylaws amended mid-year<br>- Interim privileges<br>- Missing procedure code<br>- Provider with multi-facility privileges
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
- **Purpose:** Detect mismatches between provider qualifications, granted privileges, specialty, facility rules and proposed assignments or procedures, and give the medical staff office an auditable explanation of each exception.
- **Label:** For "Provider Privilege & Scope-of-Practice Validation": Detect mismatches between provider qualifications, granted privileges, specialty, facility rules and proposed assignments or procedures, and give the medical staff office an auditable explanation of each exception. The reference kit's label belongs to a neighbouring problem and does not describe yours: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Define your own label exactly as in M1. Design around this trap first: Letting the ranker decide eligibility.
- **Sources:** - **Source:** Privilege coverage inputs<br>**Owner:** Medical staff office<br>**System Of Record:** Credentialing and privileging system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: catalogue version at the assignment date.<br>- **Source:** Credential validity at date inputs<br>**Owner:** Privileging committee<br>**System Of Record:** Medical staff bylaws and privilege catalogue<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use effective dates.<br>- **Source:** Supervision requirement inputs<br>**Owner:** Perioperative services<br>**System Of Record:** Scheduling and operating-room system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: rules as published.<br>- **Source:** Exception novelty inputs<br>**Owner:** Compliance<br>**System Of Record:** Provider master data<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: past adjudicated exceptions only.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Letting the ranker decide eligibility<br>- Evaluating without effective-date replay<br>- Treating missing evidence as a violation
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
