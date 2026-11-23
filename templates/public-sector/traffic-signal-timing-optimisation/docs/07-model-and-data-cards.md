# Traffic Signal Timing Optimisation: model card and data card

> Generated from the blueprint `public-sector/traffic-signal-timing-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Traffic Signal Timing Optimisation · **Domain:** public-sector · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Fixed-time plans by time of day, because they are the standard configuration.
- **Production model:** A model-based or reinforcement learning controller recommending timing plans from detector data with hard safety clips and a simulated test before field trials.
- **Intended use:** Adapt traffic signal timings to current flow so delays and emissions fall, within safety rules and with priority for buses, cyclists and pedestrians where policy requires it.
- **Out of scope:** - Controller name: an identifier.<br>- Operator name: irrelevant.<br>- Log timestamp format: an artefact.
- **Primary metrics:** - Delay in simulation<br>- Safety clip rate<br>- Matched-period gains
- **Measured values (fill in):** ____________
- **Slices reported:** - Region and service channel<br>- Language and accessibility needs<br>- Case type and programme rule version<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Detector failure<br>- Incident<br>- Special event
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including people with complex or unusual circumstances, small language communities, rural areas and new programme rules; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Adapt traffic signal timings to current flow so delays and emissions fall, within safety rules and with priority for buses, cyclists and pedestrians where policy requires it.
- **Label:** For "Traffic Signal Timing Optimisation": Adapt traffic signal timings to current flow so delays and emissions fall, within safety rules and with priority for buses, cyclists and pedestrians where policy requires it. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Learned safety limits.
- **Sources:** - **Source:** Detector counts and occupancy inputs<br>**Owner:** Digital service delivery<br>**System Of Record:** Case management and CRM<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from detectors.<br>- **Source:** Queue length estimate inputs<br>**Owner:** Programme and policy owners<br>**System Of Record:** Tax, benefits and licensing systems<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from detector models.<br>- **Source:** Transit and pedestrian demand inputs<br>**Owner:** City operations<br>**System Of Record:** GIS and asset management<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from AVL and buttons.<br>- **Source:** Time of day and events inputs<br>**Owner:** Digital service delivery<br>**System Of Record:** Case management and CRM<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from calendars.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Learned safety limits<br>- Vehicle throughput as the only objective<br>- Raw before-and-after comparisons
- **Privacy and deletion:** Purpose limitation applies to every dataset, cross-agency sharing needs a legal basis and consent where required, and no model uses protected characteristics or proxies to decide on individuals. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
