# Float Pool & Cross-Department Staff Allocation: model card and data card

> Generated from the blueprint `healthcare/float-pool-cross-department-staff-allocation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Float Pool & Cross-Department Staff Allocation · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Manual allocation by the float coordinator from a spreadsheet.
- **Production model:** Mixed-integer program solved with a constraint solver with hard licensure, competency and rest constraints, weighted soft objectives for continuity, fairness and cost, a feasibility explainer and a greedy fallback.
- **Intended use:** Allocate eligible float-pool and cross-trained staff to units with shortages, improving coverage while preserving continuity, fairness, rest periods and cost limits.
- **Out of scope:** - Seniority alone: does not equal unit competency and entrenches the same people floating.<br>- Past acceptance of incentives: confounds willingness with need.<br>- Unit manager preference ranking: informal and unfair when used as a score.
- **Primary metrics:** - Unmet required hours vs the best plan in hindsight<br>- Float burden Gini across the pool<br>- Solver gap and time to feasible
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that predicted durations and demands feeding the optimiser are calibrated, because a biased input silently shifts the optimum.
- **Known failure modes:** - No feasible plan<br>- Credential expires overnight<br>- Two units compete for one person<br>- Last-minute call-out
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
- **Purpose:** Allocate eligible float-pool and cross-trained staff to units with shortages, improving coverage while preserving continuity, fairness, rest periods and cost limits.
- **Label:** For "Float Pool & Cross-Department Staff Allocation": Allocate eligible float-pool and cross-trained staff to units with shortages, improving coverage while preserving continuity, fairness, rest periods and cost limits. The reference kit's label belongs to a neighbouring problem and does not describe yours: The quantity to minimise is realised total cost. Predictions are inputs only; the plan is scored against true costs, and the oracle (the optimal plan under true costs) is the reference. Define your own label exactly as in M1. Design around this trap first: Scoring plans on forecast shortage only.
- **Sources:** - **Source:** Coverage gain inputs<br>**Owner:** Float pool office<br>**System Of Record:** Workforce management and scheduling system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use the shortage list at solve time.<br>- **Source:** Continuity score inputs<br>**Owner:** Nursing education and competency<br>**System Of Record:** Credentialing and competency records<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: count only completed past shifts.<br>- **Source:** Float burden inputs<br>**Owner:** Labour relations<br>**System Of Record:** Labour-rules and collective-agreement register<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: window must end before the solve.<br>- **Source:** Travel and rest margin inputs<br>**Owner:** Float pool office<br>**System Of Record:** Workforce management and scheduling system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use the published roster at solve time.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Scoring plans on forecast shortage only<br>- Ignoring float burden fairness<br>- Treating a greedy fallback as the optimum
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
