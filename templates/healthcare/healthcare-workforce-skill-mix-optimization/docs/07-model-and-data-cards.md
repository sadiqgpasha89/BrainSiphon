# Healthcare Workforce Skill-Mix Optimization: model card and data card

> Generated from the blueprint `healthcare/healthcare-workforce-skill-mix-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Workforce Skill-Mix Optimization · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Spreadsheet roster with a manual skill-mix check by the unit leader.
- **Production model:** Constraint programming and mixed-integer optimisation with hard competency, supervision and rest constraints, weighted soft objectives and a constraint-proof generator that also reports infeasibility reasons.
- **Intended use:** Build shift rosters with the right competency, specialty, experience and supervision mix for forecast workload, with an auditable proof of each hard constraint.
- **Out of scope:** - Years of service alone: does not equal competence in the unit.<br>- Informal reputation: unfair and unverifiable.<br>- Preference ranking by managers: not a safe objective.
- **Primary metrics:** - Skill-gap hours vs the best plan in hindsight<br>- Constraint violations per roster<br>- Solver gap and time to feasible
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that predicted durations and demands feeding the optimiser are calibrated, because a biased input silently shifts the optimum.
- **Known failure modes:** - Competency record missing<br>- Preceptor unavailable<br>- Acuity forecast wrong<br>- Conflicting policies across units
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
- **Purpose:** Build shift rosters with the right competency, specialty, experience and supervision mix for forecast workload, with an auditable proof of each hard constraint.
- **Label:** For "Healthcare Workforce Skill-Mix Optimization": Build shift rosters with the right competency, specialty, experience and supervision mix for forecast workload, with an auditable proof of each hard constraint. The reference kit's label belongs to a neighbouring problem and does not describe yours: The quantity to minimise is realised total cost. Predictions are inputs only; the plan is scored against true costs, and the oracle (the optimal plan under true costs) is the reference. Define your own label exactly as in M1. Design around this trap first: Scoring against forecast acuity only.
- **Sources:** - **Source:** Skill coverage per shift inputs<br>**Owner:** Nursing operations<br>**System Of Record:** Workforce management and scheduling system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: competencies valid on the shift date.<br>- **Source:** Experience balance inputs<br>**Owner:** Clinical education<br>**System Of Record:** Credentialing and competency records<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: banding from HR records as of the date.<br>- **Source:** Supervision capacity inputs<br>**Owner:** Credentialing office<br>**System Of Record:** Staffing policy and supervision rules<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use rules as published.<br>- **Source:** Acuity-driven mix target inputs<br>**Owner:** Nursing operations<br>**System Of Record:** Workforce management and scheduling system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use the forecast snapshot at solve time.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Scoring against forecast acuity only<br>- Relaxing hard constraints silently<br>- Treating title as competency
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
