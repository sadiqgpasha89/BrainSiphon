# Provider Directory Accuracy & Drift Detection: model card and data card

> Generated from the blueprint `healthcare/provider-directory-accuracy-drift-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Directory Accuracy & Drift Detection · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** An annual call campaign verifies a sample of directory records.
- **Production model:** Field-level comparison of directory values with authoritative, attested and inferred sources, a temporal model of change likelihood by field and a ranked correction queue with provenance and confidence.
- **Intended use:** Detect directory records that have become stale or conflict with provider attestations and authoritative sources, and give data stewards a field-level drift list with confidence, source provenance and a correction queue.
- **Out of scope:** - Directory sort order: artefact.<br>- Practice marketing text: not data.<br>- Record creation date alone: not drift.
- **Primary metrics:** - Drift precision and recall on verified samples<br>- Field-level confirmation rate of flagged items<br>- Lead time between real change and detection
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Provider with several locations<br>- Source outage<br>- Deliberate temporary change<br>- Name change
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
- **Purpose:** Detect directory records that have become stale or conflict with provider attestations and authoritative sources, and give data stewards a field-level drift list with confidence, source provenance and a correction queue.
- **Label:** For "Provider Directory Accuracy & Drift Detection": Detect directory records that have become stale or conflict with provider attestations and authoritative sources, and give data stewards a field-level drift list with confidence, source provenance and a correction queue. The reference kit's label belongs to a neighbouring problem and does not describe yours: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Define your own label exactly as in M1. Design around this trap first: Letting inferred signals override authoritative sources.
- **Sources:** - **Source:** Source disagreement inputs<br>**Owner:** Provider data management<br>**System Of Record:** Provider directory<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: source snapshots.<br>- **Source:** Record age since last verification inputs<br>**Owner:** Network management<br>**System Of Record:** Provider attestation system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: verification log.<br>- **Source:** Change-event volume inputs<br>**Owner:** Compliance<br>**System Of Record:** Credentialing system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: event feeds.<br>- **Source:** Source reliability tier inputs<br>**Owner:** Provider relations<br>**System Of Record:** Authoritative source feeds<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: source register.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Letting inferred signals override authoritative sources<br>- Auto-publishing corrections<br>- Scoring providers
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
