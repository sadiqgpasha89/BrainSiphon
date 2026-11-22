# Physician On-Call & Call-Rotation Optimization: model card and data card

> Generated from the blueprint `healthcare/physician-on-call-rotation-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Physician On-Call & Call-Rotation Optimization · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A scheduler builds the rotation in a spreadsheet each quarter.
- **Production model:** A constraint-programming and mixed-integer optimiser that treats coverage, privilege, rest and contract rules as hard constraints, minimises burden dispersion within comparable groups and emits a constraint proof and override log.
- **Intended use:** Build equitable, compliant on-call rotations that meet specialty coverage, availability, rest and contractual requirements, with a constraint proof and a log of every manual override.
- **Out of scope:** - Physician seniority alone: not a rule.<br>- Request submission time: process artefact.<br>- Prior plan layout: format.
- **Primary metrics:** - Hard-constraint violations (must be zero)<br>- Burden dispersion within groups<br>- Solver gap and time to feasible
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that predicted durations and demands feeding the optimiser are calibrated, because a biased input silently shifts the optimum.
- **Known failure modes:** - Infeasible coverage<br>- Mid-cycle leave<br>- Privilege change<br>- Contested fairness group
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
- **Purpose:** Build equitable, compliant on-call rotations that meet specialty coverage, availability, rest and contractual requirements, with a constraint proof and a log of every manual override.
- **Label:** For "Physician On-Call & Call-Rotation Optimization": Build equitable, compliant on-call rotations that meet specialty coverage, availability, rest and contractual requirements, with a constraint proof and a log of every manual override. The reference kit's label belongs to a neighbouring problem and does not describe yours: The quantity to minimise is realised total cost. Predictions are inputs only; the plan is scored against true costs, and the oracle (the optimal plan under true costs) is the reference. Define your own label exactly as in M1. Design around this trap first: Soft-penalising a rest rule.
- **Sources:** - **Source:** Availability and leave inputs<br>**Owner:** Medical group leadership<br>**System Of Record:** Physician roster and privileges system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: roster snapshot.<br>- **Source:** Privileges and specialty inputs<br>**Owner:** Physician scheduling office<br>**System Of Record:** Leave and availability records<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: privilege register.<br>- **Source:** Burden history inputs<br>**Owner:** Medical staff office<br>**System Of Record:** Call rules and contracts register<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: closed cycles.<br>- **Source:** Rest and contract rules inputs<br>**Owner:** Legal<br>**System Of Record:** Scheduling system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: rule version.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Soft-penalising a rest rule<br>- Publishing without approval<br>- Using total call counts as fairness
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
