# Provider Network Expansion Optimization: model card and data card

> Generated from the blueprint `healthcare/provider-network-expansion-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Network Expansion Optimization · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Planners pick expansion targets from gap maps and relationships.
- **Production model:** A capacity-allocation and facility-location optimiser over access gain, contracting cost and capacity with hard access-target and budget constraints, a scenario engine and an eligibility filter for candidates.
- **Intended use:** Recommend where and which provider capacity to add to improve access, adequacy, cost and service coverage, and give strategy and contracting teams ranked expansion scenarios with the expected access improvement, cost and trade-offs.
- **Out of scope:** - Candidate marketing: not capacity.<br>- Practice name: label.<br>- Candidate rank in the directory: artefact.
- **Primary metrics:** - Access gain realised against predicted gain<br>- Constraint violations in proposals (must be zero)<br>- Solver gap and time to feasible
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that predicted durations and demands feeding the optimiser are calibrated, because a biased input silently shifts the optimum.
- **Known failure modes:** - Candidate declines<br>- Budget cut<br>- Demand forecast revised<br>- Overlapping candidates
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
- **Purpose:** Recommend where and which provider capacity to add to improve access, adequacy, cost and service coverage, and give strategy and contracting teams ranked expansion scenarios with the expected access improvement, cost and trade-offs.
- **Label:** For "Provider Network Expansion Optimization": Recommend where and which provider capacity to add to improve access, adequacy, cost and service coverage, and give strategy and contracting teams ranked expansion scenarios with the expected access improvement, cost and trade-offs. The reference kit's label belongs to a neighbouring problem and does not describe yours: The quantity to minimise is realised total cost. Predictions are inputs only; the plan is scored against true costs, and the oracle (the optimal plan under true costs) is the reference. Define your own label exactly as in M1. Design around this trap first: Ignoring candidate capacity.
- **Sources:** - **Source:** Access gain per candidate inputs<br>**Owner:** Network strategy<br>**System Of Record:** Network management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: gap model snapshot.<br>- **Source:** Contracting cost estimate inputs<br>**Owner:** Contracting<br>**System Of Record:** Gap and adequacy analytics<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: contract tables.<br>- **Source:** Candidate capacity inputs<br>**Owner:** Network planning<br>**System Of Record:** Provider candidate pool<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: candidate data.<br>- **Source:** Demand growth inputs<br>**Owner:** Finance<br>**System Of Record:** Contracting cost records<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: forecast snapshot.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Ignoring candidate capacity<br>- Counting overlapping gains twice<br>- Making contracting offers automatically
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
