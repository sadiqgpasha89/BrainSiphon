# Healthcare Spend Category Optimization: model card and data card

> Generated from the blueprint `healthcare/healthcare-spend-category-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Spend Category Optimization · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Annual top-spend category review with manual price comparison.
- **Production model:** Spend segmentation and clustering with price benchmarking, a constrained optimiser for category allocation that treats clinical equivalence and supply limits as hard constraints and reports savings ranges net of switching cost.
- **Intended use:** Identify category-level savings opportunities while accounting for clinical equivalence, quality, availability, standardisation and switching costs, and present ranges with trade-offs for value analysis and procurement leadership.
- **Out of scope:** - Price list discounts not applied in practice: inflates savings.<br>- Brand preference alone: not clinical.<br>- Supplier relationship tenure: not a savings driver.
- **Primary metrics:** - Savings realised versus predicted savings range<br>- Constraint violations in proposed plans<br>- Hypothesis hit rate
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that predicted durations and demands feeding the optimiser are calibrated, because a biased input silently shifts the optimum.
- **Known failure modes:** - Taxonomy errors<br>- Shortage of the preferred product<br>- Clinical approval revoked<br>- Contract lock-in
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
- **Purpose:** Identify category-level savings opportunities while accounting for clinical equivalence, quality, availability, standardisation and switching costs, and present ranges with trade-offs for value analysis and procurement leadership.
- **Label:** For "Healthcare Spend Category Optimization": Identify category-level savings opportunities while accounting for clinical equivalence, quality, availability, standardisation and switching costs, and present ranges with trade-offs for value analysis and procurement leadership. The reference kit's label belongs to a neighbouring problem and does not describe yours: The quantity to minimise is realised total cost. Predictions are inputs only; the plan is scored against true costs, and the oracle (the optimal plan under true costs) is the reference. Define your own label exactly as in M1. Design around this trap first: Counting gross savings.
- **Sources:** - **Source:** Price dispersion inputs<br>**Owner:** Strategic sourcing<br>**System Of Record:** Procurement and accounts-payable system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: after normalisation.<br>- **Source:** Volume concentration inputs<br>**Owner:** Supply chain finance<br>**System Of Record:** Item and service taxonomy<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: spend as at period end.<br>- **Source:** Standardisation gap inputs<br>**Owner:** Clinical value analysis<br>**System Of Record:** Supplier contract repository<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: clinical approvals.<br>- **Source:** Switching feasibility inputs<br>**Owner:** Materials management<br>**System Of Record:** Clinical value analysis records<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: contract and approval status.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Counting gross savings<br>- Treating description similarity as equivalence<br>- Ignoring supply risk
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
