# Healthcare Contract-Based Price Variance Detection: model card and data card

> Generated from the blueprint `healthcare/healthcare-contract-price-variance-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Contract-Based Price Variance Detection · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Spreadsheet comparison of invoice prices against the contract price list.
- **Production model:** An effective-dated price engine that computes the expected invoiced price with units, tiers, rebates, freight and tax, an item crosswalk with identifier-first matching, a variance-cause classifier and an anomaly ranker for residual cases.
- **Intended use:** Find differences between contracted and invoiced or paid prices after accounting for units, tiers, rebates, freight, taxes and amendments, and quantify the recoverable amount for finance to validate.
- **Out of scope:** - Invoice layout: style.<br>- Buyer identity: not a cause.<br>- Supplier sales representative: personal.
- **Primary metrics:** - Variance-detection precision and recall on audited invoices<br>- Recoverable-amount error against realised recoveries<br>- Cause-classification accuracy
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate field confidence so the "needs review" threshold gives the target accuracy among auto-accepted fields.
- **Known failure modes:** - Contract price schedule revised<br>- Supplier credit memo<br>- Mixed units on one invoice<br>- Disputed contract term
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
- **Purpose:** Find differences between contracted and invoiced or paid prices after accounting for units, tiers, rebates, freight, taxes and amendments, and quantify the recoverable amount for finance to validate.
- **Label:** For "Healthcare Contract-Based Price Variance Detection": Find differences between contracted and invoiced or paid prices after accounting for units, tiers, rebates, freight, taxes and amendments, and quantify the recoverable amount for finance to validate. The reference kit's label belongs to a neighbouring problem and does not describe yours: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Define your own label exactly as in M1. Design around this trap first: Treating all variance as recoverable.
- **Sources:** - **Source:** Contract price at invoice date inputs<br>**Owner:** Accounts payable<br>**System Of Record:** Accounts-payable and procurement system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: version at invoice date.<br>- **Source:** Tier and rebate position inputs<br>**Owner:** Procurement<br>**System Of Record:** Contract price schedules<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: cumulative at invoice date.<br>- **Source:** Freight and tax adjustments inputs<br>**Owner:** Contract management<br>**System Of Record:** Item crosswalk and master data<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: rules.<br>- **Source:** Variance persistence inputs<br>**Owner:** Finance<br>**System Of Record:** Payment system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: past invoices.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Treating all variance as recoverable<br>- Ignoring credit memos<br>- Using description similarity to match items
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
