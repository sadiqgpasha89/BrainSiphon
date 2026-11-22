# Healthcare Purchase Demand Consolidation Optimization: model card and data card

> Generated from the blueprint `healthcare/healthcare-purchase-demand-consolidation-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Purchase Demand Consolidation Optimization · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Each facility orders independently by reorder point.
- **Production model:** A multi-echelon inventory and mixed-integer optimiser that consolidates forecast demand into supplier-level orders under minimum quantities, lead times, shelf life, storage and safety-stock constraints, with an explainer for binding constraints.
- **Intended use:** Aggregate compatible demand across facilities to improve contract leverage, reduce fragmented orders and optimise replenishment while keeping safety stock for critical supplies.
- **Out of scope:** - Buyer preference for a supplier: habit.<br>- Facility size alone: not demand.<br>- Past order timing: reflects past fragmentation.
- **Primary metrics:** - Total cost versus the best plan in hindsight<br>- Stockout rate for critical items<br>- Solver gap and time to feasible
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that predicted durations and demands feeding the optimiser are calibrated, because a biased input silently shifts the optimum.
- **Known failure modes:** - Supplier minimum cannot be met<br>- Demand surge<br>- Item recall<br>- Late delivery
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
- **Purpose:** Aggregate compatible demand across facilities to improve contract leverage, reduce fragmented orders and optimise replenishment while keeping safety stock for critical supplies.
- **Label:** For "Healthcare Purchase Demand Consolidation Optimization": Aggregate compatible demand across facilities to improve contract leverage, reduce fragmented orders and optimise replenishment while keeping safety stock for critical supplies. The reference kit's label belongs to a neighbouring problem and does not describe yours: The quantity to minimise is realised total cost. Predictions are inputs only; the plan is scored against true costs, and the oracle (the optimal plan under true costs) is the reference. Define your own label exactly as in M1. Design around this trap first: Optimising price while ignoring holding cost.
- **Sources:** - **Source:** Forecast demand with uncertainty inputs<br>**Owner:** Materials management<br>**System Of Record:** Inventory and materials management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: forecast snapshot at planning time.<br>- **Source:** Tier proximity inputs<br>**Owner:** Procurement<br>**System Of Record:** Procurement system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: contract terms.<br>- **Source:** Lead-time variability inputs<br>**Owner:** Supply chain logistics<br>**System Of Record:** Contract repository<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: receipts history.<br>- **Source:** Expiry risk inputs<br>**Owner:** Finance<br>**System Of Record:** Demand forecasting service<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: lot data as at planning.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Optimising price while ignoring holding cost<br>- Dropping safety stock to hit a tier<br>- Planning from a point forecast
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
