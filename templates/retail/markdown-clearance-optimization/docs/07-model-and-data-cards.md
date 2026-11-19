# Markdown & Clearance Optimisation: model card and data card

> Generated from the blueprint `retail/markdown-clearance-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Markdown & Clearance Optimisation · **Domain:** retail · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Fixed markdown cadence (25-50-70).
- **Production model:** Dynamic-programming markdown optimiser over a Bayesian sell-through model with category-level elasticity and cannibalisation terms.
- **Intended use:** Choose markdown depth and timing to sell through end-of-season stock at maximum recovery before a cut-off date.
- **Out of scope:** - Item colour popularity last year: already in baseline demand.<br>- Store manager ID: unrelated.
- **Primary metrics:** - Revenue recovery vs baseline in backtest<br>- Sell-through forecast MAPE
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Supply chain delay shifts arrivals<br>- Weather anomaly (warm winter)
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including cold-start users, long-tail sellers and new catalogue items; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Choose markdown depth and timing to sell through end-of-season stock at maximum recovery before a cut-off date.
- **Label:** For "Markdown & Clearance Optimisation": Choose markdown depth and timing to sell through end-of-season stock at maximum recovery before a cut-off date. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Backtests using realised future stock.
- **Sources:** - **Source:** Sell-through rate to date inputs<br>**Owner:** Catalogue operations<br>**System Of Record:** Product information management (PIM)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: as-of snapshot.<br>- **Source:** Weeks to season end inputs<br>**Owner:** E-commerce engineering<br>**System Of Record:** Order management system (OMS)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: season-specific calendars.<br>- **Source:** Elasticity by markdown depth inputs<br>**Owner:** Customer analytics<br>**System Of Record:** Customer data platform (CDP)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: fitted on prior seasons only.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Backtests using realised future stock<br>- Ignoring cannibalisation in simulation
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
