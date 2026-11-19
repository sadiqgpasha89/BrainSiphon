# First-Price Auction Bid Shading: model card and data card

> Generated from the blueprint `adtech/first-price-bid-shading` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** First-Price Auction Bid Shading · **Domain:** adtech · **Latency tier:** sub-10ms · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Bid a fixed fraction (0.8) of value.
- **Production model:** Censored distribution model of clearing price (e.g. mixture density network) with optimisation of expected surplus per request.
- **Intended use:** Shade bids below private value in first-price auctions to retain surplus while preserving win rate.
- **Out of scope:** - Bid request ID: none.<br>- Page URL query strings: high-cardinality.
- **Primary metrics:** - Surplus per impression in replay<br>- Win-price likelihood
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Exchange hides losing bid information<br>- Competitors adapt to shading
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
- **Purpose:** Shade bids below private value in first-price auctions to retain surplus while preserving win rate.
- **Label:** For "First-Price Auction Bid Shading": Shade bids below private value in first-price auctions to retain surplus while preserving win rate. The reference kit's label belongs to a neighbouring problem and does not describe yours: The reward is 1 if the chosen action succeeded and 0 otherwise. For every logged row the action, its reward and the probability of choosing it are recorded; only the chosen action's reward is observed. Define your own label exactly as in M1. Design around this trap first: Training on win prices only.
- **Sources:** - **Source:** Predicted clearing price inputs<br>**Owner:** Ad platform engineering<br>**System Of Record:** Campaign and budget ledger<br>**Ingestion:** CDC or event stream (Kafka) with 5 seconds freshness at p95<br>**Quality:** Point-in-time rule: exchange feedback.<br>- **Source:** Value estimate inputs<br>**Owner:** Measurement science<br>**System Of Record:** Billing and invoicing<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: calibrated.<br>- **Source:** Competition intensity inputs<br>**Owner:** Privacy engineering<br>**System Of Record:** Identity graph and consent store (CMP)<br>**Ingestion:** CDC or event stream (Kafka) with 5 seconds freshness at p95<br>**Quality:** Point-in-time rule: windowed.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Training on win prices only<br>- Replay assumes competitors do not react
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
