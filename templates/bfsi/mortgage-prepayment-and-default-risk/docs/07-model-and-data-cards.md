# Mortgage Prepayment & Default Risk Modelling: model card and data card

> Generated from the blueprint `bfsi/mortgage-prepayment-and-default-risk` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Mortgage Prepayment & Default Risk Modelling · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Pool-level CPR and CDR curves by seasoning and rate incentive, because servicers and traders already read them.
- **Production model:** Loan-level discrete-time competing-risk gradient boosting with macro-scenario covariates, calibrated against pool-level actuals each month.
- **Intended use:** Forecast monthly prepayment and default for each mortgage so pricing, hedging, provisioning and servicing capacity use the right cash flows.
- **Out of scope:** - Broker name: proxies for vintage and product, not for behaviour.<br>- Month-end balance rounding: numerical noise below any decision threshold.<br>- Application channel: correlates with cohort effects that change every year.
- **Primary metrics:** - Calibration of cumulative CPR and CDR by vintage<br>- Time-dependent concordance
- **Measured values (fill in):** ____________
- **Slices reported:** - Income band, age band and thin-file applicants<br>- Product, channel and region<br>- Protected classes under the applicable fair-lending or conduct rules<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Rate regime never seen in training<br>- Forbearance programmes<br>- Servicer transfer
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

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
- **Purpose:** Forecast monthly prepayment and default for each mortgage so pricing, hedging, provisioning and servicing capacity use the right cash flows.
- **Label:** For "Mortgage Prepayment & Default Risk Modelling": Forecast monthly prepayment and default for each mortgage so pricing, hedging, provisioning and servicing capacity use the right cash flows. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Random split leaks vintages across train and test.
- **Sources:** - **Source:** Refinance incentive inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: market rate must be as at the month, not today.<br>- **Source:** Loan seasoning curve inputs<br>**Owner:** Risk data office<br>**System Of Record:** General ledger and risk data warehouse<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: vintage and seasoning mix if not stratified.<br>- **Source:** Current LTV with house price index inputs<br>**Owner:** Operations<br>**System Of Record:** Customer master and KYC repository<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: HPI release lags the decision date.<br>- **Source:** Payment shock inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: the reset date must be known contractually, not learned from the outcome.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Random split leaks vintages across train and test<br>- Back-test in a calm rate year hides refinancing waves
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
