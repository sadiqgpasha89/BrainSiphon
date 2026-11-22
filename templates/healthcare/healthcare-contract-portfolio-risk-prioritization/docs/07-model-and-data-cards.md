# Healthcare Contract Portfolio Risk Prioritization: model card and data card

> Generated from the blueprint `healthcare/healthcare-contract-portfolio-risk-prioritization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Contract Portfolio Risk Prioritization · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Ranking by contract value and expiry date.
- **Production model:** A transparent weighted risk model over verified dimension inputs combined with graph relationships for shared-supplier and dependency exposure, a scenario engine for what-if exposure and an owner-set weight table, with an evidence panel per dimension.
- **Intended use:** Rank agreements by combined legal, financial, compliance, supplier, operational-continuity and renewal exposure, so risk owners direct review and remediation to the contracts that matter most.
- **Out of scope:** - Contract title: not risk.<br>- Counterparty size alone: not exposure.<br>- Owner seniority: not risk.
- **Primary metrics:** - Precision at the review capacity for high-exposure agreements<br>- Rank stability under weight changes<br>- Calibration of risk tiers against realised incidents
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Missing data for a dimension<br>- Supplier failure<br>- Weights contested<br>- Contract split into many orders
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
- **Purpose:** Rank agreements by combined legal, financial, compliance, supplier, operational-continuity and renewal exposure, so risk owners direct review and remediation to the contracts that matter most.
- **Label:** For "Healthcare Contract Portfolio Risk Prioritization": Rank agreements by combined legal, financial, compliance, supplier, operational-continuity and renewal exposure, so risk owners direct review and remediation to the contracts that matter most. The reference kit's label belongs to a neighbouring problem and does not describe yours: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Define your own label exactly as in M1. Design around this trap first: Hiding weights from owners.
- **Sources:** - **Source:** Dimension exposure scores inputs<br>**Owner:** Enterprise risk<br>**System Of Record:** Contract management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: input snapshots.<br>- **Source:** Dependency concentration inputs<br>**Owner:** Legal<br>**System Of Record:** Supplier risk and performance records<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: graph at scoring time.<br>- **Source:** Open obligations and incidents inputs<br>**Owner:** Procurement<br>**System Of Record:** Obligation register<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: earlier periods.<br>- **Source:** Renewal proximity and value inputs<br>**Owner:** Compliance<br>**System Of Record:** Audit and incident records<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: contract data.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Hiding weights from owners<br>- Ignoring shared-supplier concentration<br>- Scoring contracts as independent
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
