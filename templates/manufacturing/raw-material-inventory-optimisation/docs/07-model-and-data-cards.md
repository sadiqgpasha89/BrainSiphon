# Raw Material Inventory Optimisation: model card and data card

> Generated from the blueprint `manufacturing/raw-material-inventory-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Raw Material Inventory Optimisation · **Domain:** manufacturing · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Reorder-point rules from average usage and a safety factor, because it is the standard practice.
- **Production model:** A stochastic inventory policy with simulated demand and lead times, optimised against shortage and holding costs with constraints, and a proposal list for buyers.
- **Intended use:** Set reorder points and order quantities for raw materials under demand and lead-time uncertainty so stock-outs fall without excess inventory.
- **Out of scope:** - Buyer name: irrelevant.<br>- Warehouse code: an identifier.<br>- Order number: an identifier.
- **Primary metrics:** - Simulated service level against target<br>- Stock-out rate<br>- Inventory value at fixed service
- **Measured values (fill in):** ____________
- **Slices reported:** - Line, shift and plant<br>- Product variant and material lot<br>- Machine age, tooling and supplier batch<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Supplier disruption<br>- Demand change<br>- Shelf-life loss
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new product variants, rare machines, first runs after a changeover and low-volume lots; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Set reorder points and order quantities for raw materials under demand and lead-time uncertainty so stock-outs fall without excess inventory.
- **Label:** For "Raw Material Inventory Optimisation": Set reorder points and order quantities for raw materials under demand and lead-time uncertainty so stock-outs fall without excess inventory. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Average-based safety stock.
- **Sources:** - **Source:** Demand forecast with intervals inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from planning.<br>- **Source:** Lead time distribution inputs<br>**Owner:** Quality engineering<br>**System Of Record:** ERP and production planning<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from receipts.<br>- **Source:** Shelf life and storage limits inputs<br>**Owner:** Reliability and maintenance<br>**System Of Record:** CMMS or EAM maintenance system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from the material master.<br>- **Source:** Shortage cost inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from finance.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Average-based safety stock<br>- One service level for all<br>- Ignoring shelf life
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
