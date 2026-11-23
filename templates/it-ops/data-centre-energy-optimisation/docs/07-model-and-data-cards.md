# Data Centre Energy Optimisation: model card and data card

> Generated from the blueprint `it-ops/data-centre-energy-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Data Centre Energy Optimisation · **Domain:** it-ops · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Fixed set points and rule-based economiser modes, because they are the standard control.
- **Production model:** A control recommender that learns the hall response in simulation, proposes small set point moves with limits and shows the energy effect for engineers to approve.
- **Intended use:** Recommend cooling and airflow set points and workload placement that lower energy use while keeping temperatures inside equipment limits, tested in simulation and rolled out by facility engineers.
- **Out of scope:** - Rack name: an identifier.<br>- Vendor: weak link.<br>- Operator name: personal data.
- **Primary metrics:** - Temperature limit compliance in simulation<br>- Energy saving in replay<br>- Prediction error
- **Measured values (fill in):** ____________
- **Slices reported:** - Service tier, region and technology stack<br>- Ticket category and priority<br>- Site, device type and business unit<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Sensor failure<br>- Hot spot<br>- Extreme weather
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

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
- **Purpose:** Recommend cooling and airflow set points and workload placement that lower energy use while keeping temperatures inside equipment limits, tested in simulation and rolled out by facility engineers.
- **Label:** For "Data Centre Energy Optimisation": Recommend cooling and airflow set points and workload placement that lower energy use while keeping temperatures inside equipment limits, tested in simulation and rolled out by facility engineers. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Lowest temperature as the goal.
- **Sources:** - **Source:** Inlet temperature by rack inputs<br>**Owner:** Infrastructure and operations<br>**System Of Record:** IT service management platform<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from sensors.<br>- **Source:** IT load inputs<br>**Owner:** Service management<br>**System Of Record:** Configuration management database<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from power meters.<br>- **Source:** Outside weather inputs<br>**Owner:** Security operations<br>**System Of Record:** Monitoring, logging and cloud billing platforms<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from weather feeds.<br>- **Source:** Cooling unit state inputs<br>**Owner:** Infrastructure and operations<br>**System Of Record:** IT service management platform<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from building systems.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Lowest temperature as the goal<br>- Live-only trials<br>- No hard limits
- **Privacy and deletion:** Employee device and activity data is aggregated to groups, collected only for service quality and security, never used to rank or discipline individuals, and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
