# Crew and Equipment Scheduling: model card and data card

> Generated from the blueprint `engineering/crew-equipment-scheduling` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Crew and Equipment Scheduling · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Weekly planning meetings with spreadsheets, because it is the usual practice.
- **Production model:** An optimiser with constraint rules that proposes weekly crew and equipment plans, shows conflicts and trade-offs and replans when conditions change.
- **Intended use:** Plan crews, cranes and equipment across work fronts to meet the schedule with fewer conflicts and idle time, subject to labour rules and safety limits, for planners to approve.
- **Out of scope:** - Worker name: personal data.<br>- Equipment brand: weak link.<br>- Crew nickname: irrelevant.
- **Primary metrics:** - Plan feasibility<br>- Utilisation and delay in simulation<br>- Planner acceptance
- **Measured values (fill in):** ____________
- **Slices reported:** - Project type, client and region<br>- Discipline and contract type<br>- Site, season and supplier<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that predicted durations and demands feeding the optimiser are calibrated, because a biased input silently shifts the optimum.
- **Known failure modes:** - Equipment failure<br>- Weather loss<br>- Subcontractor delay
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including first-of-a-kind designs, new clients, remote sites and unusual ground conditions; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Plan crews, cranes and equipment across work fronts to meet the schedule with fewer conflicts and idle time, subject to labour rules and safety limits, for planners to approve.
- **Label:** For "Crew and Equipment Scheduling": Plan crews, cranes and equipment across work fronts to meet the schedule with fewer conflicts and idle time, subject to labour rules and safety limits, for planners to approve. The reference kit's label belongs to a neighbouring problem and does not describe yours: The quantity to minimise is realised total cost. Predictions are inputs only; the plan is scored against true costs, and the oracle (the optimal plan under true costs) is the reference. Define your own label exactly as in M1. Design around this trap first: Utilisation alone.
- **Sources:** - **Source:** Activity demand inputs<br>**Owner:** Engineering management<br>**System Of Record:** CAD, BIM and document management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from the schedule.<br>- **Source:** Resource availability inputs<br>**Owner:** Project delivery<br>**System Of Record:** Project scheduling and cost control platform<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from the resource plan.<br>- **Source:** Site constraints inputs<br>**Owner:** Health, safety and quality<br>**System Of Record:** Quality, safety and inspection records<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from the site plan.<br>- **Source:** Weather outlook inputs<br>**Owner:** Engineering management<br>**System Of Record:** CAD, BIM and document management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from forecasts.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Utilisation alone<br>- Soft safety limits<br>- Individual tracking
- **Privacy and deletion:** Site imagery and sensor data are used to assess work and hazards, not to identify, rank or discipline individual workers, and works-council and union agreements govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
