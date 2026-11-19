# Payment Authorization Rate Uplift (Issuer-Side Retry & Tokenisation): model card and data card

> Generated from the blueprint `fintech/payment-authorization-rate-uplift` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Payment Authorization Rate Uplift (Issuer-Side Retry & Tokenisation) · **Domain:** fintech · **Latency tier:** sub-100ms · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Fixed retry schedule per decline code.
- **Production model:** GBDT predicting retry success per (delay, route) and choosing the best action under a friction budget, with network-token upgrade as an action.
- **Intended use:** Recover soft-declined payments by predicting when a retry, network token or 3DS step-up will succeed, lifting authorisation rates by 1-3 points.
- **Out of scope:** - Customer email domain: no relation to authorisation outcome.<br>- Cart item names: high-dimensional, adds little over value and category.
- **Primary metrics:** - Retry-success AUC<br>- Incremental auths in logged randomised holdout
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer segment, tenure and new versus existing accounts<br>- Geography and channel (card-present, online, UPI)<br>- Protected-class proxies where lawful analysis is permitted, to check disparate impact<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Scheme rule change<br>- Seasonal salary peaks
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including thin-file and new-to-credit customers, first-time devices, small merchants; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Return top reason codes (SHAP-based or monotone-constrained) with every decision | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Recover soft-declined payments by predicting when a retry, network token or 3DS step-up will succeed, lifting authorisation rates by 1-3 points.
- **Label:** For "Payment Authorization Rate Uplift (Issuer-Side Retry & Tokenisation)": Recover soft-declined payments by predicting when a retry, network token or 3DS step-up will succeed, lifting authorisation rates by 1-3 points. The reference kit's label belongs to a neighbouring problem and does not describe yours: The reward is 1 if the chosen action succeeded and 0 otherwise. For every logged row the action, its reward and the probability of choosing it are recorded; only the chosen action's reward is observed. Define your own label exactly as in M1. Design around this trap first: Observational retry data confounded by who was retried.
- **Sources:** - **Source:** Decline code family inputs<br>**Owner:** Payments engineering<br>**System Of Record:** Core banking ledger<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: map codes per scheme and version.<br>- **Source:** Time to payday proximity inputs<br>**Owner:** Risk analytics<br>**System Of Record:** Card management system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: compute from past cycles not future credits.<br>- **Source:** Prior retry outcomes inputs<br>**Owner:** Customer data office<br>**System Of Record:** Customer identity and KYC (CIAM)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: exclude the current retry chain.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Observational retry data confounded by who was retried<br>- No holdout so lift is not separable from natural recovery
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
