# Corporate Obligor Rating Migration Prediction: model card and data card

> Generated from the blueprint `bfsi/corporate-obligor-rating-migration` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Corporate Obligor Rating Migration Prediction · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Historical transition matrix by rating class and sector, because it is the standard reference and is interpretable.
- **Production model:** Ordinal gradient boosting with monotone constraints and macro covariates, calibrated per rating class, with reason codes and an override workflow.
- **Intended use:** Predict the probability that a corporate borrower's internal rating moves up or down within 12 months to guide limits, pricing and watchlists.
- **Out of scope:** - Company name length: no information.<br>- Region of head office: weak, proxies for sector mix.<br>- Number of directors: no stable link to credit migration.
- **Primary metrics:** - Ranked probability score<br>- Calibration by rating class
- **Measured values (fill in):** ____________
- **Slices reported:** - Income band, age band and thin-file applicants<br>- Product, channel and region<br>- Protected classes under the applicable fair-lending or conduct rules<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Merger or demerger<br>- Rating policy change<br>- Rare high-grade downgrades
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including thin-file borrowers, new-to-bank customers, small-balance accounts and rare product lines; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Return top reason codes (SHAP-based or monotone-constrained) with every decision | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Predict the probability that a corporate borrower's internal rating moves up or down within 12 months to guide limits, pricing and watchlists.
- **Label:** For "Corporate Obligor Rating Migration Prediction": Predict the probability that a corporate borrower's internal rating moves up or down within 12 months to guide limits, pricing and watchlists. The reference kit's label belongs to a neighbouring problem and does not describe yours: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Define your own label exactly as in M1. Design around this trap first: Pooling cycles in a random split understates downturn risk.
- **Sources:** - **Source:** Rating age and prior moves inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: review dates may be late.<br>- **Source:** Margin and coverage trend inputs<br>**Owner:** Risk data office<br>**System Of Record:** General ledger and risk data warehouse<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use contractual definitions.<br>- **Source:** Sector stress index inputs<br>**Owner:** Operations<br>**System Of Record:** Customer master and KYC repository<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: index must be as at the date.<br>- **Source:** Account behaviour inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: waivers can be recorded late.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Pooling cycles in a random split understates downturn risk<br>- Overrides in history hide the model's own errors
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
