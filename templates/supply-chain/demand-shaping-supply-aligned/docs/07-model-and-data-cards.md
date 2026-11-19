# Supply-Aligned Demand Shaping: model card and data card

> Generated from the blueprint `supply-chain/demand-shaping-supply-aligned` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Supply-Aligned Demand Shaping · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Promotion calendar set by category managers.
- **Production model:** Causal uplift and substitution models feeding a joint promotion–supply optimiser with scenario robustness.
- **Intended use:** Shape promotions and pricing to steer demand toward items and weeks where supply is plentiful, reducing stock-outs and waste.
- **Out of scope:** - Promo ID: none.<br>- Store manager: none.
- **Primary metrics:** - Simulated margin and service level<br>- Uplift calibration
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Supply plan slips after promotion is locked<br>- Competitor reacts with price cuts
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

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
- **Purpose:** Shape promotions and pricing to steer demand toward items and weeks where supply is plentiful, reducing stock-outs and waste.
- **Label:** For "Supply-Aligned Demand Shaping": Shape promotions and pricing to steer demand toward items and weeks where supply is plentiful, reducing stock-outs and waste. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Promo uplift from non-randomised data.
- **Sources:** - **Source:** Supply availability forecast inputs<br>**Owner:** Supply-chain planning<br>**System Of Record:** ERP (orders, inventory, finance)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: supplier commitments.<br>- **Source:** Promo uplift estimate inputs<br>**Owner:** Logistics IT<br>**System Of Record:** Warehouse and transport management systems (WMS, TMS)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: randomised tests.<br>- **Source:** Cross-item substitution inputs<br>**Owner:** Master data team<br>**System Of Record:** Supplier and EDI network<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: estimated.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Promo uplift from non-randomised data<br>- Static supply assumptions
- **Privacy and deletion:** Driver and worker data minimised and pseudonymised; supplier data shared under contract with purpose limits. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
