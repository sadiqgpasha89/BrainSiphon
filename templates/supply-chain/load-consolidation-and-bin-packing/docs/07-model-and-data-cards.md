# Load Consolidation & 3D Bin Packing: model card and data card

> Generated from the blueprint `supply-chain/load-consolidation-and-bin-packing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Load Consolidation & 3D Bin Packing · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** First-fit decreasing by volume.
- **Production model:** Learned placement policy (attention) with beam search and local improvement, constraint checker for stability and legal axle loads.
- **Intended use:** Pack orders into containers and trailers to minimise empty space while respecting weight, stacking and delivery order.
- **Out of scope:** - Item name: none.<br>- Customer: none.
- **Primary metrics:** - Container count vs baseline<br>- Constraint violation rate
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that predicted durations and demands feeding the optimiser are calibrated, because a biased input silently shifts the optimum.
- **Known failure modes:** - Wrong item dimensions<br>- Late additions to the load
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new lanes, slow-moving SKUs and small carriers; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Pack orders into containers and trailers to minimise empty space while respecting weight, stacking and delivery order.
- **Label:** For "Load Consolidation & 3D Bin Packing": Pack orders into containers and trailers to minimise empty space while respecting weight, stacking and delivery order. The reference kit's label belongs to a neighbouring problem and does not describe yours: The quantity to minimise is realised total cost. Predictions are inputs only; the plan is scored against true costs, and the oracle (the optimal plan under true costs) is the reference. Define your own label exactly as in M1. Design around this trap first: Benchmarks with random boxes.
- **Sources:** - **Source:** Item dimensions and fragility class inputs<br>**Owner:** Supply-chain planning<br>**System Of Record:** ERP (orders, inventory, finance)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: accuracy.<br>- **Source:** Delivery sequence rank inputs<br>**Owner:** Logistics IT<br>**System Of Record:** Warehouse and transport management systems (WMS, TMS)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: route plan.<br>- **Source:** Axle load distribution inputs<br>**Owner:** Master data team<br>**System Of Record:** Supplier and EDI network<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: calc.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Benchmarks with random boxes<br>- Ignoring unloading sequence
- **Privacy and deletion:** Driver and worker data minimised and pseudonymised; supplier data shared under contract with purpose limits. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
