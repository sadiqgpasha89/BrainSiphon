# Peer Grouping for Collaborative Learning: model card and data card

> Generated from the blueprint `edtech/peer-grouping-collaborative-learning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Peer Grouping for Collaborative Learning · **Domain:** edtech · **Latency tier:** batch · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Random or alphabetical grouping.
- **Production model:** Constrained group optimisation (ILP) over complementarity and schedule fit with fairness constraints and teacher adjustments.
- **Intended use:** Form study groups and pair students to maximise learning and inclusion using skills, schedules and interaction history.
- **Out of scope:** - Student name: none.<br>- Seat position: weak.
- **Primary metrics:** - Simulated group value and balance<br>- Teacher acceptance rate
- **Measured values (fill in):** ____________
- **Slices reported:** - Age band, with minors analysed separately<br>- First-generation, language and accessibility groups<br>- Course, cohort and device<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Absent students break groups<br>- Group conflict
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new learners, low-connectivity users and minority-language cohorts; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Return top reason codes (SHAP-based or monotone-constrained) with every decision | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Form study groups and pair students to maximise learning and inclusion using skills, schedules and interaction history.
- **Label:** For "Peer Grouping for Collaborative Learning": Form study groups and pair students to maximise learning and inclusion using skills, schedules and interaction history. The reference kit's label belongs to a neighbouring problem and does not describe yours: A pair of records is positive when both belong to the same hidden true cluster. Clusters are formed by connected components over the pairs the model links. Define your own label exactly as in M1. Design around this trap first: Optimising averages.
- **Sources:** - **Source:** Skill complementarity inputs<br>**Owner:** Learning engineering<br>**System Of Record:** Learning management system (LMS)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: KT.<br>- **Source:** Schedule overlap inputs<br>**Owner:** Registrar and data office<br>**System Of Record:** Student information system (SIS)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: calendar.<br>- **Source:** Prior collaboration outcomes inputs<br>**Owner:** Content team<br>**System Of Record:** Content and item bank<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: data.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Optimising averages<br>- No collaboration outcome data
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
