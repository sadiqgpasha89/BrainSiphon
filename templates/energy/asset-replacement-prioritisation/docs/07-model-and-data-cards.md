# Asset Replacement Prioritisation: model card and data card

> Generated from the blueprint `energy/asset-replacement-prioritisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Asset Replacement Prioritisation · **Domain:** energy · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** The annual capital plan from engineering judgement with age thresholds, because it is the planning norm.
- **Production model:** A multi-period optimisation on calibrated risk and cost with scenario budgets, lock and exclude rules, and an explanation of each choice for the investment board.
- **Intended use:** Rank assets for replacement or refurbishment under a capital budget by balancing failure risk, consequence and cost across the network.
- **Out of scope:** - Asset tag: an identifier.<br>- Project author: irrelevant.<br>- Spreadsheet version: an artefact.
- **Primary metrics:** - Risk reduced per unit cost in backtests<br>- Plan feasibility<br>- Sensitivity to input error
- **Measured values (fill in):** ____________
- **Slices reported:** - Feeder, region and voltage level<br>- Weather regime and season<br>- Asset age, vendor and customer segment<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Budget cut<br>- Bad risk input<br>- Supply delay
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including rare fault types, new feeder configurations, extreme weather events and newly connected distributed generation; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Rank assets for replacement or refurbishment under a capital budget by balancing failure risk, consequence and cost across the network.
- **Label:** For "Asset Replacement Prioritisation": Rank assets for replacement or refurbishment under a capital budget by balancing failure risk, consequence and cost across the network. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Highest risk first only.
- **Sources:** - **Source:** Failure probability inputs<br>**Owner:** Network operations<br>**System Of Record:** SCADA and ADMS (advanced distribution management)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from health models.<br>- **Source:** Consequence of failure inputs<br>**Owner:** Asset management<br>**System Of Record:** Meter data management and billing (CIS)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from GIS and finance.<br>- **Source:** Intervention cost and risk reduction inputs<br>**Owner:** Retail and customer operations<br>**System Of Record:** Asset management and GIS<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from engineering.<br>- **Source:** Outage and crew availability inputs<br>**Owner:** Network operations<br>**System Of Record:** SCADA and ADMS (advanced distribution management)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from planning.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Highest risk first only<br>- Unconstrained rankings<br>- Opaque risk inputs
- **Privacy and deletion:** Half-hourly consumption can reveal household behaviour, so models use aggregated or minimised data, consent is recorded and individual-level inferences about occupancy are not produced. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
