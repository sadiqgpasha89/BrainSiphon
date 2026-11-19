# Supply-Chain Digital Twin & Scenario Simulation: model card and data card

> Generated from the blueprint `supply-chain/supply-chain-digital-twin-simulation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Supply-Chain Digital Twin & Scenario Simulation · **Domain:** supply-chain · **Latency tier:** batch · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Spreadsheet scenario models.
- **Production model:** Agent-based and discrete-event simulation calibrated with Bayesian inference, with surrogate models for fast policy search.
- **Intended use:** Maintain a calibrated simulation of the end-to-end network to test policies and disruption responses before applying them.
- **Out of scope:** - Single-day anomalies: outliers.<br>- Planner opinion: subjective.
- **Primary metrics:** - KPI reproduction error<br>- Back-test of disruption responses
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that predicted durations and demands feeding the optimiser are calibrated, because a biased input silently shifts the optimum.
- **Known failure modes:** - Structural change in network (new DC)<br>- Optimistic assumptions in scenarios
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

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
- **Purpose:** Maintain a calibrated simulation of the end-to-end network to test policies and disruption responses before applying them.
- **Label:** For "Supply-Chain Digital Twin & Scenario Simulation": Maintain a calibrated simulation of the end-to-end network to test policies and disruption responses before applying them. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Calibration and validation on same period.
- **Sources:** - **Source:** Calibrated lead-time distributions inputs<br>**Owner:** Supply-chain planning<br>**System Of Record:** ERP (orders, inventory, finance)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: data quality.<br>- **Source:** Policy parameters inputs<br>**Owner:** Logistics IT<br>**System Of Record:** Warehouse and transport management systems (WMS, TMS)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: config.<br>- **Source:** Disruption scenario library inputs<br>**Owner:** Master data team<br>**System Of Record:** Supplier and EDI network<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: curated.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Calibration and validation on same period<br>- Ignoring behavioural responses
- **Privacy and deletion:** Driver and worker data minimised and pseudonymised; supplier data shared under contract with purpose limits. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
