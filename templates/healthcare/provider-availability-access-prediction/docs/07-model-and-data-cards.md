# Provider Availability & Access Prediction: model card and data card

> Generated from the blueprint `healthcare/provider-availability-access-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Availability & Access Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A mystery-shopper call survey samples wait times a few times a year.
- **Production model:** A probabilistic wait-time forecaster that combines queueing analytics with a gradient-boosted time-series model over slots, demand, cancellations and capacity, with observed-versus-inferred labelling and a freshness report.
- **Intended use:** Estimate appointment wait times and access by specialty, location, provider and payer network, separating observed open slots from inferred estimates, so operations can validate availability before it is shown to members or patients.
- **Out of scope:** - Provider name: label.<br>- Directory sort order: artefact.<br>- Marketing text: not capacity.
- **Primary metrics:** - Weighted quantile loss and interval coverage<br>- Wait-time error against mystery-shopper calls<br>- Capacity-risk precision at the review capacity
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that each prediction interval covers its nominal share (80% interval covers 75 to 85% of actuals) overall, by horizon and by top segment; recalibrate with conformal adjustment when it does not.
- **Known failure modes:** - Provider with no online schedule<br>- Template change<br>- Holiday week<br>- New provider
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
- **Purpose:** Estimate appointment wait times and access by specialty, location, provider and payer network, separating observed open slots from inferred estimates, so operations can validate availability before it is shown to members or patients.
- **Label:** For "Provider Availability & Access Prediction": Estimate appointment wait times and access by specialty, location, provider and payer network, separating observed open slots from inferred estimates, so operations can validate availability before it is shown to members or patients. The reference kit's label: The target is the observed value on day t+h divided by the series' recent average at forecast origin t, so one model serves every series. Capped days are excluded. Design around this trap first: Presenting inferred waits as facts.
- **Sources:** - **Source:** Open slots and booking horizon inputs<br>**Owner:** Access operations<br>**System Of Record:** Scheduling system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: schedule snapshot.<br>- **Source:** Demand and referral inflow inputs<br>**Owner:** Network management<br>**System Of Record:** Referral and demand records<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: event stream.<br>- **Source:** Cancellation and no-show rate inputs<br>**Owner:** Provider relations<br>**System Of Record:** Provider capacity records<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: earlier periods.<br>- **Source:** Provider capacity inputs<br>**Owner:** Clinical operations<br>**System Of Record:** Provider directory<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: capacity records.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Presenting inferred waits as facts<br>- Using average wait only<br>- Ignoring cancellations
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
