# Digital Twin Calibration for Line Simulation: model card and data card

> Generated from the blueprint `manufacturing/digital-twin-line-calibration` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Digital Twin Calibration for Line Simulation · **Domain:** manufacturing · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A spreadsheet model of line capacity from nominal cycle times, because it is the planning approach and the benchmark.
- **Production model:** A discrete-event simulation with fitted distributions and automatic calibration against event logs, validation on held-out periods and a library of tested scenarios.
- **Intended use:** Calibrate a discrete-event simulation of a production line from real event data so what-if tests on layout, buffers and staffing give trustworthy answers.
- **Out of scope:** - Station name: an identifier.<br>- Operator name: not a driver.<br>- Report time: an artefact.
- **Primary metrics:** - Throughput error on held-out weeks<br>- Distribution fit quality<br>- Prediction of known past interventions
- **Measured values (fill in):** ____________
- **Slices reported:** - Line, shift and plant<br>- Product variant and material lot<br>- Machine age, tooling and supplier batch<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that each prediction interval covers its nominal share (80% interval covers 75 to 85% of actuals) overall, by horizon and by top segment; recalibrate with conformal adjustment when it does not.
- **Known failure modes:** - Recipe change<br>- Rare breakdowns<br>- Out-of-range question
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
- **Purpose:** Calibrate a discrete-event simulation of a production line from real event data so what-if tests on layout, buffers and staffing give trustworthy answers.
- **Label:** For "Digital Twin Calibration for Line Simulation": Calibrate a discrete-event simulation of a production line from real event data so what-if tests on layout, buffers and staffing give trustworthy answers. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Fitting to the training period only.
- **Sources:** - **Source:** Process time distribution inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: per product.<br>- **Source:** Failure and repair distributions inputs<br>**Owner:** Quality engineering<br>**System Of Record:** ERP and production planning<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from downtime data.<br>- **Source:** Buffer and routing rules inputs<br>**Owner:** Reliability and maintenance<br>**System Of Record:** CMMS or EAM maintenance system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from engineering.<br>- **Source:** Arrival pattern inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from planning.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Fitting to the training period only<br>- Using averages<br>- Undocumented validity
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
