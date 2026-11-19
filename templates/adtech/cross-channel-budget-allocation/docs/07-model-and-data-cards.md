# Cross-Channel Budget Allocation with Bandits: model card and data card

> Generated from the blueprint `adtech/cross-channel-budget-allocation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Cross-Channel Budget Allocation with Bandits · **Domain:** adtech · **Latency tier:** batch · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Fixed budget split by channel.
- **Production model:** Bayesian bandit on incrementality-calibrated returns with exploration bounds and MMM prior.
- **Intended use:** Shift weekly budget between channels using experimentation-informed bandit policies to maximise incremental outcomes.
- **Out of scope:** - Channel name: none.<br>- Platform dashboard totals: biased.
- **Primary metrics:** - Simulated regret<br>- Agreement with incrementality tests
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that predicted durations and demands feeding the optimiser are calibrated, because a biased input silently shifts the optimum.
- **Known failure modes:** - Measurement lag hides negative effect of a shift<br>- Interference: social ads lift search conversions
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
- **Purpose:** Shift weekly budget between channels using experimentation-informed bandit policies to maximise incremental outcomes.
- **Label:** For "Cross-Channel Budget Allocation with Bandits": Shift weekly budget between channels using experimentation-informed bandit policies to maximise incremental outcomes. The reference kit's label belongs to a neighbouring problem and does not describe yours: The quantity to minimise is realised total cost. Predictions are inputs only; the plan is scored against true costs, and the oracle (the optimal plan under true costs) is the reference. Define your own label exactly as in M1. Design around this trap first: Using platform-reported conversions as rewards.
- **Sources:** - **Source:** Channel incremental ROAS inputs<br>**Owner:** Ad platform engineering<br>**System Of Record:** Campaign and budget ledger<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: experiments.<br>- **Source:** Posterior uncertainty inputs<br>**Owner:** Measurement science<br>**System Of Record:** Billing and invoicing<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: bayesian.<br>- **Source:** Platform-claimed vs incremental ratio inputs<br>**Owner:** Privacy engineering<br>**System Of Record:** Identity graph and consent store (CMP)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: tests.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Using platform-reported conversions as rewards<br>- No exploration constraints
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
