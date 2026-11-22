# Clinical Communication Workload Optimization: model card and data card

> Generated from the blueprint `healthcare/clinical-communication-workload-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Clinical Communication Workload Optimization · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A committee reviews complaints about message overload each year.
- **Production model:** Clustering of near-duplicate messages, ranking of low-value notification categories, a workload forecast and a constrained optimiser for bundling and routing assignment that treats approved safety exclusions as hard constraints.
- **Intended use:** Reduce avoidable message overload by finding duplicates, bundling and routing improvements and by forecasting workload, while making sure urgent information still reaches an accountable recipient.
- **Out of scope:** - Message length: not value.<br>- Sender identity: not a value factor.<br>- Time of day alone: confounded.
- **Primary metrics:** - Safety-exclusion violations in proposals (must be zero)<br>- Duplicate-cluster precision on audited samples<br>- Forecast error by team
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that predicted durations and demands feeding the optimiser are calibrated, because a biased input silently shifts the optimum.
- **Known failure modes:** - Duplicate that is a legitimate repeat<br>- Seasonal surge<br>- Changed policy<br>- Small unit
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
- **Purpose:** Reduce avoidable message overload by finding duplicates, bundling and routing improvements and by forecasting workload, while making sure urgent information still reaches an accountable recipient.
- **Label:** For "Clinical Communication Workload Optimization": Reduce avoidable message overload by finding duplicates, bundling and routing improvements and by forecasting workload, while making sure urgent information still reaches an accountable recipient. The reference kit's label belongs to a neighbouring problem and does not describe yours: The quantity to minimise is realised total cost. Predictions are inputs only; the plan is scored against true costs, and the oracle (the optimal plan under true costs) is the reference. Define your own label exactly as in M1. Design around this trap first: Optimising volume while ignoring urgent categories.
- **Sources:** - **Source:** Duplicate cluster size inputs<br>**Owner:** Clinical operations<br>**System Of Record:** Secure messaging platform<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: message text and metadata.<br>- **Source:** Acknowledgement rate by category inputs<br>**Owner:** Nursing leadership<br>**System Of Record:** Alert and notification policy register<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: earlier periods.<br>- **Source:** Team workload inputs<br>**Owner:** Clinical informatics<br>**System Of Record:** Routing and roster records<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: roster and message data.<br>- **Source:** Policy category inputs<br>**Owner:** Patient safety<br>**System Of Record:** Workload and census data<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: policy register.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Optimising volume while ignoring urgent categories<br>- Suppressing without approval<br>- Clustering across unrelated patients
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
