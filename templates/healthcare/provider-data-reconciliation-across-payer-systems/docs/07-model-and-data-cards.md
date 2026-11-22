# Provider Data Reconciliation Across Payer Systems: model card and data card

> Generated from the blueprint `healthcare/provider-data-reconciliation-across-payer-systems` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Data Reconciliation Across Payer Systems · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Stewards compare provider records between two systems in a spreadsheet.
- **Production model:** Identifier-first matching with a pairwise classifier for candidates, graph-based cluster reconciliation, survivorship rules by field and source authority, effective-dated history and a steward workbench with reversible merges.
- **Intended use:** Reconcile provider identity, demographics, specialties, affiliations, contract status and effective dates across payer, credentialing, claims and directory systems, and give data stewards matched records, conflicts, source-of-truth recommendations and a temporal history.
- **Out of scope:** - Record creation order: artefact.<br>- System identifier format: label.<br>- Practice marketing text: not identity.
- **Primary metrics:** - Pair precision and recall on steward-labelled pairs<br>- Cluster purity and completeness<br>- Wrong-merge rate (must be near zero)
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Shared practice address<br>- Provider changes name<br>- Transitive chain of weak matches<br>- Source system outage
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
- **Purpose:** Reconcile provider identity, demographics, specialties, affiliations, contract status and effective dates across payer, credentialing, claims and directory systems, and give data stewards matched records, conflicts, source-of-truth recommendations and a temporal history.
- **Label:** For "Provider Data Reconciliation Across Payer Systems": Reconcile provider identity, demographics, specialties, affiliations, contract status and effective dates across payer, credentialing, claims and directory systems, and give data stewards matched records, conflicts, source-of-truth recommendations and a temporal history. The reference kit's label: A pair of records is positive when both belong to the same hidden true cluster. Clusters are formed by connected components over the pairs the model links. Design around this trap first: Auto-merging fuzzy matches.
- **Sources:** - **Source:** Identifier agreement inputs<br>**Owner:** Provider data management<br>**System Of Record:** Payer provider master<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: source records.<br>- **Source:** Attribute similarity inputs<br>**Owner:** Network management<br>**System Of Record:** Credentialing system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: normalised fields.<br>- **Source:** Graph consistency inputs<br>**Owner:** Credentialing<br>**System Of Record:** Claims system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: cluster at scoring.<br>- **Source:** Source authority and freshness inputs<br>**Owner:** Compliance<br>**System Of Record:** Provider directory<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: source register.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Auto-merging fuzzy matches<br>- Using latest-wins survivorship<br>- Overwriting history
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
