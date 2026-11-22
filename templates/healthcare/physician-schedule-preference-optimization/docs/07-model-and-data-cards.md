# Physician Schedule Preference Optimization: model card and data card

> Generated from the blueprint `healthcare/physician-schedule-preference-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Physician Schedule Preference Optimization · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A scheduler resolves preference conflicts by hand each cycle.
- **Production model:** A multi-objective constraint optimiser with hard coverage, skill, continuity and contract constraints, a weighted preference objective with an alternation term for fairness, and an explainer for unmet requests.
- **Intended use:** Maximise physician preferences while meeting coverage, skill, continuity, workload and fairness constraints, and give the scheduling committee ranked feasible schedules with trade-off explanations.
- **Out of scope:** - Submission time: not priority.<br>- Comment wording: free text.<br>- Physician seniority: not a rule.
- **Primary metrics:** - Hard-constraint violations (must be zero)<br>- Preference satisfaction and its dispersion across physicians<br>- Committee acceptance rate of the top schedule
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that predicted durations and demands feeding the optimiser are calibrated, because a biased input silently shifts the optimum.
- **Known failure modes:** - Many conflicting requests<br>- Late preference change<br>- Contract rule revised<br>- Gaming of preference rankings
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
- **Purpose:** Maximise physician preferences while meeting coverage, skill, continuity, workload and fairness constraints, and give the scheduling committee ranked feasible schedules with trade-off explanations.
- **Label:** For "Physician Schedule Preference Optimization": Maximise physician preferences while meeting coverage, skill, continuity, workload and fairness constraints, and give the scheduling committee ranked feasible schedules with trade-off explanations. The reference kit's label belongs to a neighbouring problem and does not describe yours: The quantity to minimise is realised total cost. Predictions are inputs only; the plan is scored against true costs, and the oracle (the optimal plan under true costs) is the reference. Define your own label exactly as in M1. Design around this trap first: Treating preferences as hard constraints.
- **Sources:** - **Source:** Preference weight and window inputs<br>**Owner:** Physician scheduling office<br>**System Of Record:** Preference submission system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: submission data.<br>- **Source:** Eligibility inputs<br>**Owner:** Medical group leadership<br>**System Of Record:** Scheduling system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: privilege register.<br>- **Source:** Continuity needs inputs<br>**Owner:** Scheduling committee<br>**System Of Record:** Physician roster and privileges<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: schedule data.<br>- **Source:** Past satisfaction inputs<br>**Owner:** Clinical operations<br>**System Of Record:** Contract and rules register<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: closed cycles.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Treating preferences as hard constraints<br>- Optimising total satisfaction only<br>- Publishing without committee approval
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
