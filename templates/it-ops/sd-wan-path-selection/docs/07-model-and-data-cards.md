# SD-WAN Path Selection: model card and data card

> Generated from the blueprint `it-ops/sd-wan-path-selection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** SD-WAN Path Selection · **Domain:** it-ops · **Latency tier:** sub-100ms · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Static path preferences with failover, because they are the standard design.
- **Production model:** A path selector using probe data and predicted quality with hold times and cost caps, tested in simulation on replayed measurements.
- **Intended use:** Choose network paths per application class using latency, loss and cost so critical applications keep their targets while lower-cost links carry tolerant traffic.
- **Out of scope:** - Site name: weak link.<br>- Provider name: weak link.<br>- Device id: an identifier.
- **Primary metrics:** - Application target attainment in replay<br>- Cost in replay<br>- Switching rate
- **Measured values (fill in):** ____________
- **Slices reported:** - Service tier, region and technology stack<br>- Ticket category and priority<br>- Site, device type and business unit<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Provider outage<br>- Probe bias<br>- Flapping
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new services, rarely used systems, major incidents and remote or legacy sites; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Choose network paths per application class using latency, loss and cost so critical applications keep their targets while lower-cost links carry tolerant traffic.
- **Label:** For "SD-WAN Path Selection": Choose network paths per application class using latency, loss and cost so critical applications keep their targets while lower-cost links carry tolerant traffic. The reference kit's label belongs to a neighbouring problem and does not describe yours: The reward is 1 if the chosen action succeeded and 0 otherwise. For every logged row the action, its reward and the probability of choosing it are recorded; only the chosen action's reward is observed. Define your own label exactly as in M1. Design around this trap first: Lowest latency everywhere.
- **Sources:** - **Source:** Path latency and loss inputs<br>**Owner:** Infrastructure and operations<br>**System Of Record:** IT service management platform<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: from probes.<br>- **Source:** Application class inputs<br>**Owner:** Service management<br>**System Of Record:** Configuration management database<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from the catalogue.<br>- **Source:** Link cost and capacity inputs<br>**Owner:** Security operations<br>**System Of Record:** Monitoring, logging and cloud billing platforms<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: from contracts.<br>- **Source:** Time pattern inputs<br>**Owner:** Infrastructure and operations<br>**System Of Record:** IT service management platform<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from history.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Lowest latency everywhere<br>- Constant switching<br>- Model-set priorities
- **Privacy and deletion:** Employee device and activity data is aggregated to groups, collected only for service quality and security, never used to rank or discipline individuals, and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
