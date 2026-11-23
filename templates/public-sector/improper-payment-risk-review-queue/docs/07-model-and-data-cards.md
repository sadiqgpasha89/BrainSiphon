# Improper Payment Risk Review Queue: model card and data card

> Generated from the blueprint `public-sector/improper-payment-risk-review-queue` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Improper Payment Risk Review Queue · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Rules-based data matching alerts and random audits, because they are the current controls.
- **Production model:** A calibrated review-priority model trained on random audit samples, an officer workflow with a right to reply and a regular fairness and error-rate audit.
- **Intended use:** Rank payments and claims for post-payment review by the likelihood of error or overpayment so limited audit staff check where errors are likely, with no benefit stopped on a score alone.
- **Out of scope:** - Applicant name: irrelevant and private.<br>- Postcode text: a proxy for protected groups.<br>- Nationality: prohibited.
- **Primary metrics:** - Precision at the review capacity<br>- Calibration<br>- Review rate parity across groups
- **Measured values (fill in):** ____________
- **Slices reported:** - Region and service channel<br>- Language and accessibility needs<br>- Case type and programme rule version<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Biased labels<br>- Policy change<br>- Feedback loop
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including people with complex or unusual circumstances, small language communities, rural areas and new programme rules; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Return top reason codes (SHAP-based or monotone-constrained) with every decision | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Rank payments and claims for post-payment review by the likelihood of error or overpayment so limited audit staff check where errors are likely, with no benefit stopped on a score alone.
- **Label:** For "Improper Payment Risk Review Queue": Rank payments and claims for post-payment review by the likelihood of error or overpayment so limited audit staff check where errors are likely, with no benefit stopped on a score alone. The reference kit's label: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Design around this trap first: Automatic suspension.
- **Sources:** - **Source:** Income and circumstance mismatch inputs<br>**Owner:** Digital service delivery<br>**System Of Record:** Case management and CRM<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from data matching.<br>- **Source:** Late change reports inputs<br>**Owner:** Programme and policy owners<br>**System Of Record:** Tax, benefits and licensing systems<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from case history.<br>- **Source:** Payment pattern anomalies inputs<br>**Owner:** City operations<br>**System Of Record:** GIS and asset management<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from payments.<br>- **Source:** Past audit outcome inputs<br>**Owner:** Digital service delivery<br>**System Of Record:** Case management and CRM<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from audits.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Automatic suspension<br>- Flag-based labels<br>- Proxy features for protected groups
- **Privacy and deletion:** Purpose limitation applies to every dataset, cross-agency sharing needs a legal basis and consent where required, and no model uses protected characteristics or proxies to decide on individuals. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
