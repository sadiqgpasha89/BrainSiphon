# Connected Product Service Scheduling: model card and data card

> Generated from the blueprint `manufacturing/connected-product-service-scheduling` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Connected Product Service Scheduling · **Domain:** manufacturing · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Fixed service intervals by hours or calendar, because it is the contract standard.
- **Production model:** A condition-based service model that predicts time to service need, bundles parts and skills in a visit proposal and schedules with route optimisation within contract windows.
- **Intended use:** Schedule service visits and parts for connected industrial products from usage and condition data so customers have fewer breakdowns and fewer unnecessary visits.
- **Out of scope:** - Customer name: irrelevant and private.<br>- Product serial: an identifier.<br>- Region name alone: weak link.
- **Primary metrics:** - Prediction of service need against actual findings<br>- Visit success without a second visit<br>- Calibration
- **Measured values (fill in):** ____________
- **Slices reported:** - Line, shift and plant<br>- Product variant and material lot<br>- Machine age, tooling and supplier batch<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that each prediction interval covers its nominal share (80% interval covers 75 to 85% of actuals) overall, by horizon and by top segment; recalibrate with conformal adjustment when it does not.
- **Known failure modes:** - Connectivity gaps<br>- Customer declines<br>- Part shortage
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

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
- **Purpose:** Schedule service visits and parts for connected industrial products from usage and condition data so customers have fewer breakdowns and fewer unnecessary visits.
- **Label:** For "Connected Product Service Scheduling": Schedule service visits and parts for connected industrial products from usage and condition data so customers have fewer breakdowns and fewer unnecessary visits. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Fixed intervals only.
- **Sources:** - **Source:** Usage hours and load inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from telemetry.<br>- **Source:** Condition indicators inputs<br>**Owner:** Quality engineering<br>**System Of Record:** ERP and production planning<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: per product.<br>- **Source:** Service history inputs<br>**Owner:** Reliability and maintenance<br>**System Of Record:** CMMS or EAM maintenance system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from service records.<br>- **Source:** Parts availability by region inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from the supply system.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Fixed intervals only<br>- Ignoring parts<br>- No consent record
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
