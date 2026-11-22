# Healthcare Shift Incentive Optimization: model card and data card

> Generated from the blueprint `healthcare/healthcare-shift-incentive-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Shift Incentive Optimization · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A fixed incentive ladder that rises as the shift approaches.
- **Production model:** Contextual bandit or uplift model for fill probability by incentive level inside a budget-constrained optimiser with hard policy limits, propensity logging and a counterfactual evaluator.
- **Intended use:** Recommend the minimum effective incentive or mix of incentives needed to fill hard-to-staff shifts without exceeding labour budgets or breaching pay and fairness policy.
- **Out of scope:** - Employee personal characteristics: unfair targeting and no causal signal.<br>- Raw acceptance rate: confounded by which shifts get which offers.<br>- Manager identity: proxies for habit rather than effect.
- **Primary metrics:** - Off-policy value of the recommended incentives<br>- Fill-rate uplift with confidence interval<br>- Cost per additional fill
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that predicted durations and demands feeding the optimiser are calibrated, because a biased input silently shifts the optimum.
- **Known failure modes:** - Budget exhausted mid-period<br>- Incentive anchoring<br>- Policy change<br>- Sparse data for rare roles
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
- **Purpose:** Recommend the minimum effective incentive or mix of incentives needed to fill hard-to-staff shifts without exceeding labour budgets or breaching pay and fairness policy.
- **Label:** For "Healthcare Shift Incentive Optimization": Recommend the minimum effective incentive or mix of incentives needed to fill hard-to-staff shifts without exceeding labour budgets or breaching pay and fairness policy. The reference kit's label belongs to a neighbouring problem and does not describe yours: The quantity to minimise is realised total cost. Predictions are inputs only; the plan is scored against true costs, and the oracle (the optimal plan under true costs) is the reference. Define your own label exactly as in M1. Design around this trap first: Treating raw acceptance as incentive effect.
- **Sources:** - **Source:** Urgency inputs<br>**Owner:** Workforce management office<br>**System Of Record:** Workforce management and scheduling system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use time of the offer.<br>- **Source:** Historical response by shift type inputs<br>**Owner:** HR compensation<br>**System Of Record:** Pay-rule and incentive policy register<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: strictly past offers.<br>- **Source:** Marginal fill probability inputs<br>**Owner:** Finance<br>**System Of Record:** Labour budget ledger<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: estimate only from randomised or propensity-weighted data.<br>- **Source:** Pool depth inputs<br>**Owner:** Labour relations<br>**System Of Record:** Open-shift marketplace<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: eligibility as of offer time.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Treating raw acceptance as incentive effect<br>- Ignoring offers that managers chose selectively<br>- Optimising cost with no fairness check
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
