# Longevity & Mortality Forecasting: model card and data card

> Generated from the blueprint `bfsi/longevity-and-mortality-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Longevity & Mortality Forecasting · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Standard mortality tables with an improvement scale, because they are widely accepted.
- **Production model:** Bayesian cohort model with credibility-weighted portfolio experience and scenarios for medical change and shocks.
- **Intended use:** Forecast mortality improvement by age and cohort for pension and annuity pricing and reserving.
- **Out of scope:** - Policy ID: An identifier with no relation to mortality.<br>- Broker: The sales channel does not change mortality once the product is known.<br>- Month of death: Seasonal noise that does not matter for annual rates.
- **Primary metrics:** - Out-of-sample log mortality error<br>- Coverage
- **Measured values (fill in):** ____________
- **Slices reported:** - Income band, age band and thin-file applicants<br>- Product, channel and region<br>- Protected classes under the applicable fair-lending or conduct rules<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that each prediction interval covers its nominal share (80% interval covers 75 to 85% of actuals) overall, by horizon and by top segment; recalibrate with conformal adjustment when it does not.
- **Known failure modes:** - Pandemic years<br>- Data lag<br>- Small portfolio
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including thin-file borrowers, new-to-bank customers, small-balance accounts and rare product lines; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Forecast mortality improvement by age and cohort for pension and annuity pricing and reserving.
- **Label:** For "Longevity & Mortality Forecasting": Forecast mortality improvement by age and cohort for pension and annuity pricing and reserving. The reference kit's label belongs to a neighbouring problem and does not describe yours: The target is the observed value on day t+h divided by the series' recent average at forecast origin t, so one model serves every series. Capped days are excluded. Define your own label exactly as in M1. Design around this trap first: A back-test through stable years makes any trend model look accurate.
- **Sources:** - **Source:** Age-period-cohort effects inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: the three effects are not fully identifiable, so impose a documented constraint.<br>- **Source:** Population improvement inputs<br>**Owner:** Risk data office<br>**System Of Record:** General ledger and risk data warehouse<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: revisions change past values.<br>- **Source:** Portfolio experience ratio inputs<br>**Owner:** Operations<br>**System Of Record:** Customer master and KYC repository<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: credibility is low for small portfolios, so blend.<br>- **Source:** Cause-of-death mix inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: data lag by one to two years.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - A back-test through stable years makes any trend model look accurate<br>- Revisions to published death counts mean the data used at the time differ from today's
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
