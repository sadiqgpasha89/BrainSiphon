# Mastery-Based Curriculum Sequencing: model card and data card

> Generated from the blueprint `edtech/mastery-curriculum-sequencing-rl` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Mastery-Based Curriculum Sequencing · **Domain:** edtech · **Latency tier:** batch · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Fixed curriculum order.
- **Production model:** Conservative offline RL (CQL) with KT-based state, prerequisite masks and teacher-in-the-loop constraints.
- **Intended use:** Learn long-horizon curriculum sequences that maximise mastery across a skill graph, accounting for prerequisites and forgetting.
- **Out of scope:** - Activity popularity: feedback loop.<br>- Learner ID: none.
- **Primary metrics:** - Doubly robust value estimate<br>- Prerequisite violation rate
- **Measured values (fill in):** ____________
- **Slices reported:** - Age band, with minors analysed separately<br>- First-generation, language and accessibility groups<br>- Course, cohort and device<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Distribution shift when the policy changes behaviour<br>- Simulator optimism
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new learners, low-connectivity users and minority-language cohorts; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Learn long-horizon curriculum sequences that maximise mastery across a skill graph, accounting for prerequisites and forgetting.
- **Label:** For "Mastery-Based Curriculum Sequencing": Learn long-horizon curriculum sequences that maximise mastery across a skill graph, accounting for prerequisites and forgetting. The reference kit's label: The reward is 1 if the chosen action succeeded and 0 otherwise. For every logged row the action, its reward and the probability of choosing it are recorded; only the chosen action's reward is observed. Design around this trap first: Simulator trained on the same logs as the policy.
- **Sources:** - **Source:** Prerequisite readiness inputs<br>**Owner:** Learning engineering<br>**System Of Record:** Learning management system (LMS)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: DAG.<br>- **Source:** Forgetting-adjusted mastery inputs<br>**Owner:** Registrar and data office<br>**System Of Record:** Student information system (SIS)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: memory model.<br>- **Source:** Expected gain of an activity inputs<br>**Owner:** Content team<br>**System Of Record:** Content and item bank<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: KT.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Simulator trained on the same logs as the policy<br>- Ignoring confounding by teacher assignment
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
