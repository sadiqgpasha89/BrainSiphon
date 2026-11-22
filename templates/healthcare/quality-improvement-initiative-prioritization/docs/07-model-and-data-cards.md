# Quality Improvement Initiative Prioritization: model card and data card

> Generated from the blueprint `healthcare/quality-improvement-initiative-prioritization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Quality Improvement Initiative Prioritization · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Ranking by sponsor request and a cost threshold.
- **Production model:** Multi-criteria scoring with versioned weights, a constrained portfolio optimiser for resource allocation under budget and capacity limits, a rank-stability sensitivity analysis and a decision record generator.
- **Intended use:** Rank proposed improvement projects by patient impact, compliance urgency, feasibility, cost, equity and expected benefit, giving leaders a transparent portfolio with trade-offs and assumptions to decide from.
- **Out of scope:** - Sponsor seniority: pressure not merit.<br>- Project name or branding: not value.<br>- Past project success rate of the team: confounded.
- **Primary metrics:** - Rank stability under weight perturbation<br>- Portfolio value vs the best feasible portfolio<br>- Estimate calibration against realised benefit
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that predicted durations and demands feeding the optimiser are calibrated, because a biased input silently shifts the optimum.
- **Known failure modes:** - Weights disputed<br>- Cost estimates change<br>- Dependencies between projects<br>- Proposals game the criteria
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
- **Purpose:** Rank proposed improvement projects by patient impact, compliance urgency, feasibility, cost, equity and expected benefit, giving leaders a transparent portfolio with trade-offs and assumptions to decide from.
- **Label:** For "Quality Improvement Initiative Prioritization": Rank proposed improvement projects by patient impact, compliance urgency, feasibility, cost, equity and expected benefit, giving leaders a transparent portfolio with trade-offs and assumptions to decide from. The reference kit's label belongs to a neighbouring problem and does not describe yours: The quantity to minimise is realised total cost. Predictions are inputs only; the plan is scored against true costs, and the oracle (the optimal plan under true costs) is the reference. Define your own label exactly as in M1. Design around this trap first: Treating estimated benefits as certain.
- **Sources:** - **Source:** Expected patient impact inputs<br>**Owner:** Quality and patient safety<br>**System Of Record:** Quality management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: estimates from the stated source.<br>- **Source:** Compliance urgency inputs<br>**Owner:** Strategy office<br>**System Of Record:** Project and portfolio tracking<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: calendar.<br>- **Source:** Feasibility inputs<br>**Owner:** Finance<br>**System Of Record:** Finance and budget system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: current capacity.<br>- **Source:** Equity benefit inputs<br>**Owner:** Health equity office<br>**System Of Record:** Quality gap and incident repositories<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: group definitions agreed in advance.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Treating estimated benefits as certain<br>- Ignoring budget as a constraint<br>- Letting weights be chosen to produce a preferred answer
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
