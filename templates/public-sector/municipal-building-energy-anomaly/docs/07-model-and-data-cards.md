# Municipal Building Energy Anomaly Detection: model card and data card

> Generated from the blueprint `public-sector/municipal-building-energy-anomaly` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Municipal Building Energy Anomaly Detection · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Monthly energy reports by building and a review of the highest users, because it is the common approach.
- **Production model:** A weather- and schedule-normalised anomaly model with cause hints and a work order flow plus a check that comfort targets are kept.
- **Intended use:** Find buildings with abnormal energy use among schools, libraries and offices so faults and wasted heating or cooling are fixed.
- **Out of scope:** - Building name: an identifier.<br>- Caretaker name: irrelevant.<br>- Photo name: an artefact.
- **Primary metrics:** - Detection of seeded faults<br>- Savings estimate error<br>- False alerts per building
- **Measured values (fill in):** ____________
- **Slices reported:** - Region and service channel<br>- Language and accessibility needs<br>- Case type and programme rule version<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Occupancy change<br>- Meter fault<br>- Cold snap
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
- **Purpose:** Find buildings with abnormal energy use among schools, libraries and offices so faults and wasted heating or cooling are fixed.
- **Label:** For "Municipal Building Energy Anomaly Detection": Find buildings with abnormal energy use among schools, libraries and offices so faults and wasted heating or cooling are fixed. The reference kit's label belongs to a neighbouring problem and does not describe yours: A point is anomalous when it lies inside an anomaly interval. An event is detected when an alert fires inside the interval (or up to 3 hours after); delay is measured from the interval's start. Define your own label exactly as in M1. Design around this trap first: Absolute use comparisons.
- **Sources:** - **Source:** Weather-adjusted consumption inputs<br>**Owner:** Digital service delivery<br>**System Of Record:** Case management and CRM<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from meters.<br>- **Source:** Schedule deviation inputs<br>**Owner:** Programme and policy owners<br>**System Of Record:** Tax, benefits and licensing systems<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from schedules.<br>- **Source:** Equipment alarms inputs<br>**Owner:** City operations<br>**System Of Record:** GIS and asset management<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from building systems.<br>- **Source:** Occupancy proxy inputs<br>**Owner:** Digital service delivery<br>**System Of Record:** Case management and CRM<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from sensors.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Absolute use comparisons<br>- Blind reductions<br>- Heat maps with no actions
- **Privacy and deletion:** Purpose limitation applies to every dataset, cross-agency sharing needs a legal basis and consent where required, and no model uses protected characteristics or proxies to decide on individuals. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
