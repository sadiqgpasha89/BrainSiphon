# Dynamic Credit Limit Optimization: model card and data card

> Generated from the blueprint `fintech/dynamic-credit-limit-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Dynamic Credit Limit Optimization · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Rule grid using score band and utilisation.
- **Production model:** Contextual bandit with a doubly-robust off-policy estimator and Lagrangian risk constraints, learned on a randomised exploration slice.
- **Intended use:** Raise or lower card limits monthly to maximise risk-adjusted revenue subject to loss and capital constraints.
- **Out of scope:** - Raw credit score change: already inside the hazard model.<br>- Marketing segment tag: redundant and unstable across campaigns.
- **Primary metrics:** - Doubly-robust policy value estimate<br>- Constraint violation rate in simulation
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer segment, tenure and new versus existing accounts<br>- Geography and channel (card-present, online, UPI)<br>- Protected-class proxies where lawful analysis is permitted, to check disparate impact<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Recession onset<br>- Logged-policy support gaps
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

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
- **Purpose:** Raise or lower card limits monthly to maximise risk-adjusted revenue subject to loss and capital constraints.
- **Label:** For "Dynamic Credit Limit Optimization": Raise or lower card limits monthly to maximise risk-adjusted revenue subject to loss and capital constraints. The reference kit's label: The reward is 1 if the chosen action succeeded and 0 otherwise. For every logged row the action, its reward and the probability of choosing it are recorded; only the chosen action's reward is observed. Design around this trap first: Naive A/B of limit changes confounded by selection.
- **Sources:** - **Source:** Spend-to-limit headroom inputs<br>**Owner:** Payments engineering<br>**System Of Record:** Core banking ledger<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use pre-decision cycles.<br>- **Source:** Early-delinquency hazard inputs<br>**Owner:** Risk analytics<br>**System Of Record:** Card management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: score at action time not later.<br>- **Source:** Elasticity estimate inputs<br>**Owner:** Customer data office<br>**System Of Record:** Customer identity and KYC (CIAM)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: needs randomised limit-test cohorts.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Naive A/B of limit changes confounded by selection<br>- No exploration data so counterfactuals are unsupported
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
