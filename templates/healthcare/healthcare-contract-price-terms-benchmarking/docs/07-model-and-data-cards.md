# Healthcare Contract Price & Terms Benchmarking: model card and data card

> Generated from the blueprint `healthcare/healthcare-contract-price-terms-benchmarking` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Contract Price & Terms Benchmarking · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Manual comparison against the group purchasing organisation price file.
- **Production model:** Clause and price extraction into a normalised term store, cohort construction by item, tier, geography and term, statistical benchmarking with robust percentiles and intervals, and a flag layer for unfavourable terms with source and licence records.
- **Intended use:** Compare contract pricing and terms across the organisation's portfolio and approved benchmark datasets, building comparable cohorts so reviewers see normalised variance and unfavourable terms with stated confidence.
- **Out of scope:** - Supplier prestige: not a benchmark.<br>- Contract negotiation date alone: confounds with market trends.<br>- Account manager: personal.
- **Primary metrics:** - Median absolute error of normalised price against held-out contracts<br>- Cohort comparability rating by reviewers<br>- Interval coverage
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate field confidence so the "needs review" threshold gives the target accuracy among auto-accepted fields.
- **Known failure modes:** - Few comparables<br>- Bundled contracts<br>- Benchmark licence expires<br>- Currency and inflation
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
- **Purpose:** Compare contract pricing and terms across the organisation's portfolio and approved benchmark datasets, building comparable cohorts so reviewers see normalised variance and unfavourable terms with stated confidence.
- **Label:** For "Healthcare Contract Price & Terms Benchmarking": Compare contract pricing and terms across the organisation's portfolio and approved benchmark datasets, building comparable cohorts so reviewers see normalised variance and unfavourable terms with stated confidence. The reference kit's label belongs to a neighbouring problem and does not describe yours: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Define your own label exactly as in M1. Design around this trap first: Comparing unnormalised units.
- **Sources:** - **Source:** Normalised price percentile inputs<br>**Owner:** Procurement<br>**System Of Record:** Contract management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: cohort at the contract date.<br>- **Source:** Term favourability inputs<br>**Owner:** Legal<br>**System Of Record:** Item and service taxonomy<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: extracted with provenance.<br>- **Source:** Cohort size and dispersion inputs<br>**Owner:** Finance<br>**System Of Record:** Procurement and spend system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: at analysis time.<br>- **Source:** Volume-tier alignment inputs<br>**Owner:** Contract management<br>**System Of Record:** Approved benchmark data store<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: spend data.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Comparing unnormalised units<br>- Using unlicensed benchmark data<br>- Reporting medians from tiny cohorts
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
