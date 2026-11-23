# Forensic Lab Backlog Prioritisation: model card and data card

> Generated from the blueprint `public-safety/forensic-lab-backlog-prioritisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Forensic Lab Backlog Prioritisation · **Domain:** public-safety · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** First-come first-served queues with manual escalation, because it is the typical process.
- **Production model:** A scheduler with deadline and seriousness rules, effort estimates and capacity limits that proposes a queue for the lab manager and tracks equal treatment.
- **Intended use:** Plan the order of forensic analysis requests by statutory deadlines, case seriousness and lab capacity to cut turnaround for urgent cases, with analysts and prosecutors able to override.
- **Out of scope:** - Suspect name: personal data.<br>- Neighbourhood: a proxy.<br>- Submitting officer: irrelevant.
- **Primary metrics:** - Deadline attainment<br>- Effort estimate error<br>- Turnaround by case class
- **Measured values (fill in):** ____________
- **Slices reported:** - Area and call type<br>- Language and accessibility need<br>- Incident severity and time of day<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that predicted durations and demands feeding the optimiser are calibrated, because a biased input silently shifts the optimum.
- **Known failure modes:** - Late urgent request<br>- Equipment outage<br>- Estimate error
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including rare incident types, small language communities, rural areas and major events; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Plan the order of forensic analysis requests by statutory deadlines, case seriousness and lab capacity to cut turnaround for urgent cases, with analysts and prosecutors able to override.
- **Label:** For "Forensic Lab Backlog Prioritisation": Plan the order of forensic analysis requests by statutory deadlines, case seriousness and lab capacity to cut turnaround for urgent cases, with analysts and prosecutors able to override. The reference kit's label belongs to a neighbouring problem and does not describe yours: The quantity to minimise is realised total cost. Predictions are inputs only; the plan is scored against true costs, and the oracle (the optimal plan under true costs) is the reference. Define your own label exactly as in M1. Design around this trap first: Fastest-throughput objectives.
- **Sources:** - **Source:** Days to court or statutory deadline inputs<br>**Owner:** Emergency communications<br>**System Of Record:** Computer-aided dispatch (CAD)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from case systems.<br>- **Source:** Case seriousness class inputs<br>**Owner:** Operations and investigations leadership<br>**System Of Record:** Records management and evidence systems<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from case systems.<br>- **Source:** Analysis effort estimate inputs<br>**Owner:** Chief data and ethics officer<br>**System Of Record:** Court case management<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from history.<br>- **Source:** Capacity by discipline inputs<br>**Owner:** Emergency communications<br>**System Of Record:** Computer-aided dispatch (CAD)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from the lab system.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Fastest-throughput objectives<br>- Ranking by neighbourhood<br>- Model-set legal deadlines
- **Privacy and deletion:** No model produces a risk score for a named individual, no biometric identification is performed, retention is limited and every access to case data is logged for oversight. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
