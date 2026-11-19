# Bayesian Marketing Mix Modelling: model card and data card

> Generated from the blueprint `adtech/marketing-mix-modeling-bayesian` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Bayesian Marketing Mix Modelling · **Domain:** adtech · **Latency tier:** batch · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Linear regression of sales on channel spend.
- **Production model:** Hierarchical Bayesian MMM with experiment-informed priors, time-varying coefficients and budget optimiser using posterior samples.
- **Intended use:** Estimate channel-level incremental ROI and saturation curves from aggregate data to guide cross-channel budgets.
- **Out of scope:** - Daily noise in spend: aggregated weekly.<br>- Creative-level data: too granular.
- **Primary metrics:** - Out-of-sample MAPE<br>- Posterior calibration vs experiments
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that each prediction interval covers its nominal share (80% interval covers 75 to 85% of actuals) overall, by horizon and by top segment; recalibrate with conformal adjustment when it does not.
- **Known failure modes:** - Spend moves in lockstep across channels<br>- Structural break (new product launch)
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new campaigns, small publishers and rare device types; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Estimate channel-level incremental ROI and saturation curves from aggregate data to guide cross-channel budgets.
- **Label:** For "Bayesian Marketing Mix Modelling": Estimate channel-level incremental ROI and saturation curves from aggregate data to guide cross-channel budgets. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Overfitting with many parameters on short history.
- **Sources:** - **Source:** Adstock decay parameter inputs<br>**Owner:** Ad platform engineering<br>**System Of Record:** Campaign and budget ledger<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: prior.<br>- **Source:** Saturation half-saturation point inputs<br>**Owner:** Measurement science<br>**System Of Record:** Billing and invoicing<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: spend range.<br>- **Source:** Seasonality and baseline inputs<br>**Owner:** Privacy engineering<br>**System Of Record:** Identity graph and consent store (CMP)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: calendar.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Overfitting with many parameters on short history<br>- Treating posterior mean as certain
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
