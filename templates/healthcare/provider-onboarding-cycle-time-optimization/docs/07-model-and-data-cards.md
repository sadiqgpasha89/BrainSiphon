# Provider Onboarding Cycle-Time Optimization: model card and data card

> Generated from the blueprint `healthcare/provider-onboarding-cycle-time-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Onboarding Cycle-Time Optimization · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Gantt chart with static durations maintained by the coordinator.
- **Production model:** Process mining on the event log with duration models per task, critical-path computation on the dependency graph, a scheduler that proposes resequencing and reassignment under capacity limits, and an explanation of each recommendation.
- **Intended use:** Find the bottlenecks across HR, credentialing, IT, facilities, payer enrollment and department readiness and recommend the task sequencing that shortens time to start-readiness.
- **Out of scope:** - Task owner seniority: not a cause of delay.<br>- Calendar month alone: mixes many causes.<br>- Provider specialty prestige: irrelevant.
- **Primary metrics:** - Remaining-time error by case<br>- Critical-path hit rate<br>- Simulated lateness against the best plan in hindsight
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that predicted durations and demands feeding the optimiser are calibrated, because a biased input silently shifts the optimum.
- **Known failure modes:** - Missing events from one system<br>- Task reopened<br>- Owner team on leave<br>- Start date fixed by contract
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including paediatric and elderly patients, renal failure, rare units and patients with missing devices; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Find the bottlenecks across HR, credentialing, IT, facilities, payer enrollment and department readiness and recommend the task sequencing that shortens time to start-readiness.
- **Label:** For "Provider Onboarding Cycle-Time Optimization": Find the bottlenecks across HR, credentialing, IT, facilities, payer enrollment and department readiness and recommend the task sequencing that shortens time to start-readiness. The reference kit's label belongs to a neighbouring problem and does not describe yours: The quantity to minimise is realised total cost. Predictions are inputs only; the plan is scored against true costs, and the oracle (the optimal plan under true costs) is the reference. Define your own label exactly as in M1. Design around this trap first: Learning order from history rather than rules.
- **Sources:** - **Source:** Critical-path slack inputs<br>**Owner:** Provider onboarding office<br>**System Of Record:** Onboarding workflow system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use the dependency graph at scoring time.<br>- **Source:** Queue wait time inputs<br>**Owner:** HR operations<br>**System Of Record:** HR information system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: event timestamps.<br>- **Source:** Rework rate inputs<br>**Owner:** IT service management<br>**System Of Record:** Credentialing system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: past cycles only.<br>- **Source:** Predicted start-readiness inputs<br>**Owner:** Facilities<br>**System Of Record:** IT access management and facilities request systems<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: computed from open tasks and queue state.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Learning order from history rather than rules<br>- Ignoring queue wait<br>- Measuring task duration but not handoff delay
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
