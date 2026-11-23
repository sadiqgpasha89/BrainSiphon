# Restoration Switching Recommendation: model card and data card

> Generated from the blueprint `energy/restoration-switching-recommendation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Restoration Switching Recommendation · **Domain:** energy · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** The standard restoration plan for each feeder prepared by planners, because it is the validated fallback.
- **Production model:** A search and learned-heuristic planner on the network graph that checks each plan with power flow and protection rules and presents ranked sequences with the customers restored and timings.
- **Intended use:** Propose switching sequences that restore as many customers as quickly as possible after a fault within loading and protection limits, for the operator to review and execute.
- **Out of scope:** - Operator name: irrelevant.<br>- Event number: an identifier.<br>- Substation name alone: an identifier.
- **Primary metrics:** - Customers restored in simulated faults<br>- Constraint violation rate<br>- Plan time
- **Measured values (fill in):** ____________
- **Slices reported:** - Feeder, region and voltage level<br>- Weather regime and season<br>- Asset age, vendor and customer segment<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Stale switch state<br>- Cascading overload<br>- Manual switch delay
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
- **Purpose:** Propose switching sequences that restore as many customers as quickly as possible after a fault within loading and protection limits, for the operator to review and execute.
- **Label:** For "Restoration Switching Recommendation": Propose switching sequences that restore as many customers as quickly as possible after a fault within loading and protection limits, for the operator to review and execute. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Learned safety checks.
- **Sources:** - **Source:** Faulted section and isolation points inputs<br>**Owner:** Network operations<br>**System Of Record:** SCADA and ADMS (advanced distribution management)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from fault location.<br>- **Source:** Alternate supply capacity inputs<br>**Owner:** Asset management<br>**System Of Record:** Meter data management and billing (CIS)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from the power flow.<br>- **Source:** Customer priority inputs<br>**Owner:** Retail and customer operations<br>**System Of Record:** Asset management and GIS<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from the register.<br>- **Source:** Switch availability inputs<br>**Owner:** Network operations<br>**System Of Record:** SCADA and ADMS (advanced distribution management)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from ADMS.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Learned safety checks<br>- Automatic execution<br>- Stale network state
- **Privacy and deletion:** Half-hourly consumption can reveal household behaviour, so models use aggregated or minimised data, consent is recorded and individual-level inferences about occupancy are not produced. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
