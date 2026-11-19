# Order Execution & Slippage Minimisation: model card and data card

> Generated from the blueprint `fintech/order-execution-slippage-minimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Order Execution & Slippage Minimisation · **Domain:** fintech · **Latency tier:** sub-10ms · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Almgren-Chriss schedule with a TWAP fallback.
- **Production model:** PPO policy trained in an LOB simulator with domain randomisation, wrapped by hard participation and price-limit constraints, running on FPGA-adjacent hosts.
- **Intended use:** Slice large parent orders into child orders that minimise implementation shortfall against arrival price.
- **Out of scope:** - Order sizes of other participants: not observable reliably.<br>- Time-of-day dummies: captured by the volume curve.
- **Primary metrics:** - Shortfall vs benchmark in simulator<br>- Sim-to-real gap on shadow trades
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer segment, tenure and new versus existing accounts<br>- Geography and channel (card-present, online, UPI)<br>- Protected-class proxies where lawful analysis is permitted, to check disparate impact<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Venue outage mid-order<br>- Volatility spike beyond training range
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

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
- **Purpose:** Slice large parent orders into child orders that minimise implementation shortfall against arrival price.
- **Label:** For "Order Execution & Slippage Minimisation": Slice large parent orders into child orders that minimise implementation shortfall against arrival price. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Simulator lacks market impact.
- **Sources:** - **Source:** Order-book imbalance inputs<br>**Owner:** Payments engineering<br>**System Of Record:** Core banking ledger<br>**Ingestion:** CDC or event stream (Kafka) with 5 seconds freshness at p95<br>**Quality:** Point-in-time rule: snapshot at decision time.<br>- **Source:** Spread and depth ratio inputs<br>**Owner:** Risk analytics<br>**System Of Record:** Card management system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: use pre-trade quotes only.<br>- **Source:** Remaining-time urgency inputs<br>**Owner:** Customer data office<br>**System Of Record:** Customer identity and KYC (CIAM)<br>**Ingestion:** CDC or event stream (Kafka) with 5 seconds freshness at p95<br>**Quality:** Point-in-time rule: normalise by expected volume curve.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Simulator lacks market impact<br>- Training on one volatility regime
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
