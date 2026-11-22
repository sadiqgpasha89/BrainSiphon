# Provider Data Quality & Entity Resolution: model card and data card

> Generated from the blueprint `healthcare/provider-data-quality-entity-resolution` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Data Quality & Entity Resolution · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Deterministic match on national provider ID with a manual duplicate report.
- **Production model:** Probabilistic record linkage with blocking and calibrated pairwise models, graph-based clustering with transitivity checks, rule-based survivorship per field and a steward workbench with merge, split and audit.
- **Intended use:** Resolve duplicate and conflicting provider identities across credentialing, HR, EHR, scheduling, payer and directory systems and give data stewards ranked candidate merges with provenance.
- **Out of scope:** - Provider photo or biography text: irrelevant to identity.<br>- Record creation order: an artefact of systems.<br>- Source system name alone: not an identity attribute.
- **Primary metrics:** - Pairwise precision and recall at the steward threshold<br>- Cluster purity and completeness<br>- False-merge rate on a stewarded audit sample
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Two providers with the same name and specialty<br>- Provider changes name<br>- Source system migration<br>- Stale registry data
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
- **Purpose:** Resolve duplicate and conflicting provider identities across credentialing, HR, EHR, scheduling, payer and directory systems and give data stewards ranked candidate merges with provenance.
- **Label:** For "Provider Data Quality & Entity Resolution": Resolve duplicate and conflicting provider identities across credentialing, HR, EHR, scheduling, payer and directory systems and give data stewards ranked candidate merges with provenance. The reference kit's label belongs to a neighbouring problem and does not describe yours: A pair of records is positive when both belong to the same hidden true cluster. Clusters are formed by connected components over the pairs the model links. Define your own label exactly as in M1. Design around this trap first: Evaluating on random pairs instead of hard near-duplicates.
- **Sources:** - **Source:** Identifier agreement inputs<br>**Owner:** Provider data governance<br>**System Of Record:** Provider master data<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: validate against the authoritative registry.<br>- **Source:** Name and alias similarity inputs<br>**Owner:** Medical staff office<br>**System Of Record:** Credentialing system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: never used alone.<br>- **Source:** Affiliation and address overlap inputs<br>**Owner:** Health information management<br>**System Of Record:** HR information system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: dated and weighted by recency.<br>- **Source:** Cluster consistency inputs<br>**Owner:** Provider data governance<br>**System Of Record:** EHR provider directory<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: computed after clustering.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Evaluating on random pairs instead of hard near-duplicates<br>- Counting transitive merges as correct<br>- Ignoring unmerge cost
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
