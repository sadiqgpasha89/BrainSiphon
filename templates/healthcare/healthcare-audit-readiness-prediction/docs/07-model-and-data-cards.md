# Healthcare Audit Readiness Prediction: model card and data card

> Generated from the blueprint `healthcare/healthcare-audit-readiness-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Audit Readiness Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A readiness checklist reviewed in a monthly meeting.
- **Production model:** A transparent weighted readiness score per scope and criterion, a calibrated model for the likelihood that open gaps close by the audit date, a blocker list with evidence links and a sign-off workflow.
- **Intended use:** Estimate readiness for a defined audit or accreditation scope and identify the unresolved gaps before the audit date, with a transparent score that is never presented as a certification.
- **Out of scope:** - Audit team size: not readiness.<br>- Binder page count: volume.<br>- Owner seniority: not a factor.
- **Primary metrics:** - Rank correlation of readiness with realised audit findings<br>- Calibration of gap-closure probabilities<br>- Blocker recall on mock audits
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Criteria change mid-cycle<br>- Evidence uploaded late<br>- Scope overlaps between audits<br>- Owner absence
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
- **Purpose:** Estimate readiness for a defined audit or accreditation scope and identify the unresolved gaps before the audit date, with a transparent score that is never presented as a certification.
- **Label:** For "Healthcare Audit Readiness Prediction": Estimate readiness for a defined audit or accreditation scope and identify the unresolved gaps before the audit date, with a transparent score that is never presented as a certification. The reference kit's label belongs to a neighbouring problem and does not describe yours: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Define your own label exactly as in M1. Design around this trap first: Presenting readiness as certification.
- **Sources:** - **Source:** Criteria completion share inputs<br>**Owner:** Compliance<br>**System Of Record:** GRC and audit management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: status at scoring.<br>- **Source:** Open findings by severity and age inputs<br>**Owner:** Internal audit<br>**System Of Record:** Evidence repository<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: findings tracker.<br>- **Source:** Remediation on-time rate inputs<br>**Owner:** Quality<br>**System Of Record:** Findings and remediation tracker<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: earlier periods.<br>- **Source:** Days to audit inputs<br>**Owner:** Control owners<br>**System Of Record:** Ownership directory<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: audit calendar.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Presenting readiness as certification<br>- Using opaque weights<br>- Scoring on stale evidence
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
