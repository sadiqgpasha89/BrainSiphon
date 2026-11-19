# Payment Routing Optimization: model card and data card

> Generated from the blueprint `fintech/payment-routing-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Payment Routing Optimization · **Domain:** fintech · **Latency tier:** sub-10ms · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Priority-ordered failover list with a cost-first policy.
- **Production model:** Contextual Thompson sampling with decayed Beta posteriors per segment, a cost-aware reward, and an in-memory routing table refreshed every second.
- **Intended use:** Route each payment to the acquirer or rail that maximises authorisation success at minimum fee, adapting to live outages and issuer behaviour.
- **Out of scope:** - Cardholder country alone: already captured by BIN and currency.<br>- Merchant category full list: high cardinality with little route-specific signal.
- **Primary metrics:** - Replay-based inverse propensity value<br>- Regret against oracle on logged data
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer segment, tenure and new versus existing accounts<br>- Geography and channel (card-present, online, UPI)<br>- Protected-class proxies where lawful analysis is permitted, to check disparate impact<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that predicted durations and demands feeding the optimiser are calibrated, because a biased input silently shifts the optimum.
- **Known failure modes:** - Acquirer silent failure<br>- Retry cascade double-charges
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
- **Purpose:** Route each payment to the acquirer or rail that maximises authorisation success at minimum fee, adapting to live outages and issuer behaviour.
- **Label:** For "Payment Routing Optimization": Route each payment to the acquirer or rail that maximises authorisation success at minimum fee, adapting to live outages and issuer behaviour. The reference kit's label: The reward is 1 if the chosen action succeeded and 0 otherwise. For every logged row the action, its reward and the probability of choosing it are recorded; only the chosen action's reward is observed. Design around this trap first: Replay evaluation ignores routes never chosen.
- **Sources:** - **Source:** Issuer-BIN success posterior inputs<br>**Owner:** Payments engineering<br>**System Of Record:** Core banking ledger<br>**Ingestion:** CDC or event stream (Kafka) with 5 seconds freshness at p95<br>**Quality:** Point-in-time rule: decay must not use future outcomes.<br>- **Source:** Decline code mix inputs<br>**Owner:** Risk analytics<br>**System Of Record:** Card management system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: treat issuer decline codes consistently.<br>- **Source:** Fee schedule delta inputs<br>**Owner:** Customer data office<br>**System Of Record:** Customer identity and KYC (CIAM)<br>**Ingestion:** CDC or event stream (Kafka) with 5 seconds freshness at p95<br>**Quality:** Point-in-time rule: contract versions as-of transaction time.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Replay evaluation ignores routes never chosen<br>- Success measured without separating soft declines from fraud declines
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
