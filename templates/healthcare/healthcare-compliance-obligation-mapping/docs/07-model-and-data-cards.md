# Healthcare Compliance Obligation Mapping: model card and data card

> Generated from the blueprint `healthcare/healthcare-compliance-obligation-mapping` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Compliance Obligation Mapping · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A compliance analyst keeps a crosswalk spreadsheet by hand.
- **Production model:** Citation-grounded extraction of obligations, candidate-edge retrieval and cross-encoder ranking, a graph store with versioned edges, rule checks for conflicts and coverage, and a reviewer workbench.
- **Intended use:** Map regulatory obligations to the policies, controls, procedures, systems, owners, facilities and evidence that address them, and show uncovered obligations, conflicting policies and evidence gaps in a traceable obligation graph.
- **Out of scope:** - Policy title: not content.<br>- Requirement numbering style: layout.<br>- Document author: not coverage.
- **Primary metrics:** - Recall at ten of confirmed mappings<br>- Edge precision after expert review<br>- Uncovered-obligation detection recall
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Requirement split across several clauses<br>- Policy retired<br>- Same word different meaning<br>- Rare obligation type
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
- **Purpose:** Map regulatory obligations to the policies, controls, procedures, systems, owners, facilities and evidence that address them, and show uncovered obligations, conflicting policies and evidence gaps in a traceable obligation graph.
- **Label:** For "Healthcare Compliance Obligation Mapping": Map regulatory obligations to the policies, controls, procedures, systems, owners, facilities and evidence that address them, and show uncovered obligations, conflicting policies and evidence gaps in a traceable obligation graph. The reference kit's label belongs to a neighbouring problem and does not describe yours: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Define your own label exactly as in M1. Design around this trap first: Treating similarity as coverage.
- **Sources:** - **Source:** Semantic match score inputs<br>**Owner:** Compliance<br>**System Of Record:** Approved regulatory source store<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: embedding and cross-encoder.<br>- **Source:** Terminology and scope overlap inputs<br>**Owner:** Legal<br>**System Of Record:** Policy management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: extracted metadata.<br>- **Source:** Existing confirmed edges inputs<br>**Owner:** Policy owners<br>**System Of Record:** Control framework<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: earlier mapping rounds.<br>- **Source:** Owner and system linkage inputs<br>**Owner:** Internal audit<br>**System Of Record:** Process and system catalogue<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: directory as at mapping.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Treating similarity as coverage<br>- Mapping to retired policies<br>- Skipping expert confirmation
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
