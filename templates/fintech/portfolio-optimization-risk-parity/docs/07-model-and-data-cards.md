# Robo-Advisor Portfolio Optimization: model card and data card

> Generated from the blueprint `fintech/portfolio-optimization-risk-parity` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Robo-Advisor Portfolio Optimization · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Target-date glide paths with threshold rebalancing.
- **Production model:** Black-Litterman with shrinkage risk, convex optimiser with turnover and tax constraints, user-level risk questionnaire calibrated via behaviour.
- **Intended use:** Construct and rebalance goal-based portfolios for millions of retail users that stay within each user's risk tolerance while minimising taxes and costs.
- **Out of scope:** - Recent 1-month returns: chasing performance increases risk.<br>- Forecast of next-day price: not forecastable at useful accuracy.
- **Primary metrics:** - Out-of-sample volatility vs target<br>- After-tax return in simulation
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer segment, tenure and new versus existing accounts<br>- Geography and channel (card-present, online, UPI)<br>- Protected-class proxies where lawful analysis is permitted, to check disparate impact<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Market crash with synchronized rebalancing<br>- User changes risk tolerance mid-cycle
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including thin-file and new-to-credit customers, first-time devices, small merchants; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Construct and rebalance goal-based portfolios for millions of retail users that stay within each user's risk tolerance while minimising taxes and costs.
- **Label:** For "Robo-Advisor Portfolio Optimization": Construct and rebalance goal-based portfolios for millions of retail users that stay within each user's risk tolerance while minimising taxes and costs. The reference kit's label belongs to a neighbouring problem and does not describe yours: The quantity to minimise is realised total cost. Predictions are inputs only; the plan is scored against true costs, and the oracle (the optimal plan under true costs) is the reference. Define your own label exactly as in M1. Design around this trap first: Backtest ignores taxes and transaction costs.
- **Sources:** - **Source:** Shrunk covariance matrix inputs<br>**Owner:** Payments engineering<br>**System Of Record:** Core banking ledger<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: rolling window must not include rebalance date.<br>- **Source:** Drift from target inputs<br>**Owner:** Risk analytics<br>**System Of Record:** Card management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use pre-trade market values.<br>- **Source:** Tax-lot loss harvesting value inputs<br>**Owner:** Customer data office<br>**System Of Record:** Customer identity and KYC (CIAM)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: check wash-sale window across accounts.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Backtest ignores taxes and transaction costs<br>- Risk questionnaire answers treated as true risk capacity
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
