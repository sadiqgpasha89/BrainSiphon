# Tax-Aware Portfolio Rebalancing: model card and data card

> Generated from the blueprint `bfsi/tax-aware-portfolio-rebalancing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Tax-Aware Portfolio Rebalancing · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Calendar rebalancing to target with a drift threshold, because it is common practice.
- **Production model:** A convex or mixed-integer optimiser with lot-level tax models and cost estimates, wrapped in a policy check and advisor review.
- **Intended use:** Recommend trades that bring accounts back to target allocation at the lowest tax and trading cost.
- **Out of scope:** - Account nickname: irrelevant.<br>- Advisor: irrelevant.<br>- Statement date: arbitrary.
- **Primary metrics:** - After-tax tracking error<br>- Tax saved versus naive
- **Measured values (fill in):** ____________
- **Slices reported:** - Income band, age band and thin-file applicants<br>- Product, channel and region<br>- Protected classes under the applicable fair-lending or conduct rules<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that predicted durations and demands feeding the optimiser are calibrated, because a biased input silently shifts the optimum.
- **Known failure modes:** - Wash-sale<br>- Concentrated stock<br>- Client withdraws cash
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including thin-file borrowers, new-to-bank customers, small-balance accounts and rare product lines; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Recommend trades that bring accounts back to target allocation at the lowest tax and trading cost.
- **Label:** For "Tax-Aware Portfolio Rebalancing": Recommend trades that bring accounts back to target allocation at the lowest tax and trading cost. The reference kit's label belongs to a neighbouring problem and does not describe yours: The quantity to minimise is realised total cost. Predictions are inputs only; the plan is scored against true costs, and the oracle (the optimal plan under true costs) is the reference. Define your own label exactly as in M1. Design around this trap first: Back-test ignores lot constraints.
- **Sources:** - **Source:** Drift versus band inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: targets change.<br>- **Source:** Unrealised gain by lot inputs<br>**Owner:** Risk data office<br>**System Of Record:** General ledger and risk data warehouse<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: lot data errors.<br>- **Source:** Cash flow available inputs<br>**Owner:** Operations<br>**System Of Record:** Customer master and KYC repository<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: timing.<br>- **Source:** Trading cost estimate inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: estimates vary.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Back-test ignores lot constraints<br>- Static prices
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
