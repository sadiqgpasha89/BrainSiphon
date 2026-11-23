# Part Master Deduplication: model card and data card

> Generated from the blueprint `manufacturing/part-master-deduplication` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Part Master Deduplication · **Domain:** manufacturing · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Exact and fuzzy matching on description and manufacturer part number, because it is the common cleansing step.
- **Production model:** A blocking and pairwise match model with attribute and text features, graph clustering with transitivity checks and a steward review queue with savings estimates.
- **Intended use:** Find duplicate and near-duplicate parts across plants and systems so purchasing and engineering consolidate part numbers and reduce cost and inventory.
- **Out of scope:** - Part creator: irrelevant.<br>- Creation date: weak link.<br>- Plant code: an identifier.
- **Primary metrics:** - Pair precision and recall on labelled sets<br>- Cluster purity<br>- Steward acceptance rate
- **Measured values (fill in):** ____________
- **Slices reported:** - Line, shift and plant<br>- Product variant and material lot<br>- Machine age, tooling and supplier batch<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Look-alike parts<br>- Multilingual descriptions<br>- Approved alternates
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new product variants, rare machines, first runs after a changeover and low-volume lots; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Return top reason codes (SHAP-based or monotone-constrained) with every decision | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Find duplicate and near-duplicate parts across plants and systems so purchasing and engineering consolidate part numbers and reduce cost and inventory.
- **Label:** For "Part Master Deduplication": Find duplicate and near-duplicate parts across plants and systems so purchasing and engineering consolidate part numbers and reduce cost and inventory. The reference kit's label: A pair of records is positive when both belong to the same hidden true cluster. Clusters are formed by connected components over the pairs the model links. Design around this trap first: Description-only matching.
- **Sources:** - **Source:** Attribute match inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: normalised units.<br>- **Source:** Text embedding similarity inputs<br>**Owner:** Quality engineering<br>**System Of Record:** ERP and production planning<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: multilingual.<br>- **Source:** Supplier part cross-reference inputs<br>**Owner:** Reliability and maintenance<br>**System Of Record:** CMMS or EAM maintenance system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from purchasing.<br>- **Source:** Drawing or geometry similarity inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from PLM.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Description-only matching<br>- No transitivity check<br>- Automatic merges
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
