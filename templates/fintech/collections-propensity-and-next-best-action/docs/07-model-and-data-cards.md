# Collections Propensity & Next-Best-Action: model card and data card

> Generated from the blueprint `fintech/collections-propensity-and-next-best-action` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Collections Propensity & Next-Best-Action · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Propensity-to-pay model sorted by balance.
- **Production model:** Uplift model (T-learner with GBDT) feeding a constrained assignment optimiser over channels and agent capacity.
- **Intended use:** Choose the contact channel, time and offer that maximise cure rate per rupee of collection cost while respecting conduct rules.
- **Out of scope:** - Agent name: memorises individual agents, not strategy.<br>- Phone area code: location proxy with fairness risk.
- **Primary metrics:** - Qini coefficient<br>- Expected cure per contact
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer segment, tenure and new versus existing accounts<br>- Geography and channel (card-present, online, UPI)<br>- Protected-class proxies where lawful analysis is permitted, to check disparate impact<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that predicted durations and demands feeding the optimiser are calibrated, because a biased input silently shifts the optimum.
- **Known failure modes:** - Hardship flag arrives late<br>- Dialer capacity drops
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
- **Purpose:** Choose the contact channel, time and offer that maximise cure rate per rupee of collection cost while respecting conduct rules.
- **Label:** For "Collections Propensity & Next-Best-Action": Choose the contact channel, time and offer that maximise cure rate per rupee of collection cost while respecting conduct rules. The reference kit's label belongs to a neighbouring problem and does not describe yours: The reward is 1 if the chosen action succeeded and 0 otherwise. For every logged row the action, its reward and the probability of choosing it are recorded; only the chosen action's reward is observed. Define your own label exactly as in M1. Design around this trap first: Training on all contacted customers without a holdout.
- **Sources:** - **Source:** Promise-to-pay reliability inputs<br>**Owner:** Payments engineering<br>**System Of Record:** Core banking ledger<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: promise outcome known only after follow-up date.<br>- **Source:** Channel responsiveness inputs<br>**Owner:** Risk analytics<br>**System Of Record:** Card management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: exclude responses to the current campaign.<br>- **Source:** Days past due and roll rate inputs<br>**Owner:** Customer data office<br>**System Of Record:** Customer identity and KYC (CIAM)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: bucket at as-of date only.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Training on all contacted customers without a holdout<br>- Cure measured at different horizons across treatments
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
