# Real-Time Bidding Bid Optimisation: model card and data card

> Generated from the blueprint `adtech/real-time-bidding-bid-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Real-Time Bidding Bid Optimisation · **Domain:** adtech · **Latency tier:** sub-10ms · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Linear bidding: bid = base value times pCTR times a pacing factor.
- **Production model:** Calibrated GBDT or DCN pCVR, a learned win-price model and a Lagrangian bid optimiser with a feedback pacing controller. Bids are shaded from a censored clearing-price model and scaled by a campaign multiplier that the pacer updates every few seconds, with in-flight spend reserved until the win notice arrives.
- **Intended use:** Compute the bid for every impression opportunity that maximises campaign value under budget and KPI constraints within the auction deadline.
- **Out of scope:** - Raw user-agent string: high cardinality, sparse and unstable.<br>- Bid request ID: random identifier.
- **Primary metrics:** - Log-loss and calibration error<br>- Offline simulated value under budget
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Exchange changes auction type from second to first price<br>- Delayed conversions arrive days after the impression<br>- Win notices delayed or dropped<br>- Pacer integral wind-up after an outage
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
- **Purpose:** Compute the bid for every impression opportunity that maximises campaign value under budget and KPI constraints within the auction deadline.
- **Label:** For "Real-Time Bidding Bid Optimisation": Compute the bid for every impression opportunity that maximises campaign value under budget and KPI constraints within the auction deadline. The reference kit's label: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Design around this trap first: Training only on won impressions ignores the censored losing bids.
- **Sources:** - **Source:** Calibrated pCVR inputs<br>**Owner:** Ad platform engineering<br>**System Of Record:** Campaign and budget ledger<br>**Ingestion:** CDC or event stream (Kafka) with 5 seconds freshness at p95<br>**Quality:** Point-in-time rule: calibrate on delayed-feedback-corrected labels.<br>- **Source:** Win-rate curve inputs<br>**Owner:** Measurement science<br>**System Of Record:** Billing and invoicing<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: censored data below the observed bids.<br>- **Source:** Pacing multiplier inputs<br>**Owner:** Privacy engineering<br>**System Of Record:** Identity graph and consent store (CMP)<br>**Ingestion:** CDC or event stream (Kafka) with 5 seconds freshness at p95<br>**Quality:** Point-in-time rule: real-time state.<br>- **Source:** Clearing-price density inputs<br>**Owner:** Ad platform engineering<br>**System Of Record:** Campaign and budget ledger<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: lost bids are right-censored, so fitting on won bids only makes the price look too high.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Training only on won impressions ignores the censored losing bids<br>- Offline replay cannot reproduce the market response to new bids
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
