# Workforce Productivity & FTE Leakage Detection: model card and data card

> Generated from the blueprint `healthcare/workforce-productivity-fte-leakage-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Workforce Productivity & FTE Leakage Detection · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Static threshold on hours per patient-day against budget.
- **Production model:** Normalised KPI layer with robust seasonal baselines and a multivariate anomaly model on variance components, a data-quality gate in front and a variance-decomposition explainer behind it.
- **Intended use:** Detect unexplained variance between staffed hours, workload, service volume and approved budgets, and queue it as an investigation lead with an estimated financial exposure and no allegation attached.
- **Out of scope:** - Overtime alone: reflects coverage decisions as well as leakage.<br>- Individual punch patterns: privacy-sensitive and attributes intent.<br>- Single-day outliers: usually data or event artefacts.
- **Primary metrics:** - Precision of investigation leads at a review budget<br>- Exposure estimate error against closed investigations<br>- Data-defect share of flags
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Unit changes service mix<br>- Payroll system migration<br>- Budget revised mid-year<br>- Very small cost centres
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
- **Purpose:** Detect unexplained variance between staffed hours, workload, service volume and approved budgets, and queue it as an investigation lead with an estimated financial exposure and no allegation attached.
- **Label:** For "Workforce Productivity & FTE Leakage Detection": Detect unexplained variance between staffed hours, workload, service volume and approved budgets, and queue it as an investigation lead with an estimated financial exposure and no allegation attached. The reference kit's label belongs to a neighbouring problem and does not describe yours: A point is anomalous when it lies inside an anomaly interval. An event is detected when an alert fires inside the interval (or up to 3 hours after); delay is measured from the interval's start. Define your own label exactly as in M1. Design around this trap first: Calling a data gap a leakage finding.
- **Sources:** - **Source:** Hours per workload unit inputs<br>**Owner:** Finance workforce analytics<br>**System Of Record:** Timekeeping and payroll system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use the settled workload for the period.<br>- **Source:** Variance decomposition inputs<br>**Owner:** Operations excellence<br>**System Of Record:** Cost-centre and budget ledger<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: decomposition must reconcile to the ledger.<br>- **Source:** Budget-to-actual drift inputs<br>**Owner:** HR business partners<br>**System Of Record:** Patient volume and workload system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use closed periods for scoring.<br>- **Source:** Data-quality index inputs<br>**Owner:** Finance workforce analytics<br>**System Of Record:** Approved productivity-definition register<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: computed from the same extract as the metric.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Calling a data gap a leakage finding<br>- Scoring on unnormalised hours<br>- Reporting individual-level flags
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
