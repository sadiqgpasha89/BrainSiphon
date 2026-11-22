# Healthcare Procurement Spend Anomaly Detection: model card and data card

> Generated from the blueprint `healthcare/healthcare-procurement-spend-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Procurement Spend Anomaly Detection · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A report of invoices above a fixed price or quantity threshold.
- **Production model:** Normalisation of units, currencies and item equivalence followed by rule checks and a robust seasonal anomaly model on price, quantity and frequency, with exposure ranking, contract-reference evidence and a review workflow.
- **Intended use:** Identify unusual purchasing amounts, frequency, unit prices, suppliers, categories and cost-centre patterns, and give procurement and finance a ranked exception queue with the expected-versus-actual variance and the evidence behind it.
- **Out of scope:** - Supplier name spelling: resolved by the master.<br>- Invoice number: identifier not signal.<br>- Cost-centre manager identity: personal and not a driver.
- **Primary metrics:** - Precision at the review capacity and recall on seeded and confirmed exceptions<br>- Variance-estimate error against resolved cases<br>- Alert acknowledgement rate
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Unit-of-measure change<br>- New item<br>- Emergency purchase<br>- Duplicate invoice
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
- **Purpose:** Identify unusual purchasing amounts, frequency, unit prices, suppliers, categories and cost-centre patterns, and give procurement and finance a ranked exception queue with the expected-versus-actual variance and the evidence behind it.
- **Label:** For "Healthcare Procurement Spend Anomaly Detection": Identify unusual purchasing amounts, frequency, unit prices, suppliers, categories and cost-centre patterns, and give procurement and finance a ranked exception queue with the expected-versus-actual variance and the evidence behind it. The reference kit's label: A point is anomalous when it lies inside an anomaly interval. An event is detected when an alert fires inside the interval (or up to 3 hours after); delay is measured from the interval's start. Design around this trap first: Comparing unnormalised units.
- **Sources:** - **Source:** Unit-price deviation inputs<br>**Owner:** Supply chain finance<br>**System Of Record:** Procurement and accounts-payable system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use normalised units and the price at the order date.<br>- **Source:** Order-frequency change inputs<br>**Owner:** Procurement<br>**System Of Record:** Supplier master data<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: trailing windows.<br>- **Source:** Supplier-concentration shift inputs<br>**Owner:** Accounts payable<br>**System Of Record:** Item catalogue and contract repository<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: contract status as at purchase.<br>- **Source:** Budget burn rate inputs<br>**Owner:** Cost-centre owners<br>**System Of Record:** Budget and general ledger<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: ledger as at the day.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Comparing unnormalised units<br>- Training on already-resolved cases<br>- Auto-holding suppliers on a score
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
