# Price Elasticity Estimation (Causal): model card and data card

> Generated from the blueprint `retail/price-elasticity-causal-estimation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Price Elasticity Estimation (Causal) · **Domain:** retail · **Latency tier:** batch · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Log-log OLS elasticity.
- **Production model:** Double machine learning with causal forests, experiment-calibrated priors and uncertainty-aware downstream consumption.
- **Intended use:** Estimate causal price elasticities per category and segment for pricing and promotion decisions using experiments and quasi-experiments.
- **Out of scope:** - Page views: post-treatment variable.<br>- Basket size: post-treatment.
- **Primary metrics:** - Calibration against holdout experiments<br>- Coverage of confidence intervals
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Competitor price reaction during test<br>- Stock-outs in test cells
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including cold-start users, long-tail sellers and new catalogue items; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Return top reason codes (SHAP-based or monotone-constrained) with every decision | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Estimate causal price elasticities per category and segment for pricing and promotion decisions using experiments and quasi-experiments.
- **Label:** For "Price Elasticity Estimation (Causal)": Estimate causal price elasticities per category and segment for pricing and promotion decisions using experiments and quasi-experiments. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Conditioning on post-treatment variables.
- **Sources:** - **Source:** Randomised price cell assignment inputs<br>**Owner:** Catalogue operations<br>**System Of Record:** Product information management (PIM)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: randomisation integrity.<br>- **Source:** Cost-shock instrument inputs<br>**Owner:** E-commerce engineering<br>**System Of Record:** Order management system (OMS)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: exclusion restriction.<br>- **Source:** Segment descriptors inputs<br>**Owner:** Customer analytics<br>**System Of Record:** Customer data platform (CDP)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: pre-treatment only.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Conditioning on post-treatment variables<br>- Overlap failures in observational data
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
