# Risk-Adjusted Loan Pricing (RAROC): model card and data card

> Generated from the blueprint `bfsi/risk-adjusted-loan-pricing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Risk-Adjusted Loan Pricing (RAROC) · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Pricing grids by risk grade and tenor, with relationship-manager discretion within bands, because they are what the bank runs now.
- **Production model:** Win-probability model plus cost model giving expected return at each price, a constrained optimiser that picks the price within policy bounds, and a contextual bandit for exploration within safe ranges.
- **Intended use:** Recommend the loan rate and fees that meet the hurdle return on capital while winning the deals worth winning.
- **Out of scope:** - Time since last meeting: relationship manager noise.<br>- Branch: administrative.<br>- Loan purpose free text: inconsistent categories.
- **Primary metrics:** - Win-probability calibration<br>- Realised RAROC against predicted RAROC
- **Measured values (fill in):** ____________
- **Slices reported:** - Income band, age band and thin-file applicants<br>- Product, channel and region<br>- Protected classes under the applicable fair-lending or conduct rules<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Market rate shock<br>- Strategic client<br>- Sparse segments
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

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
- **Purpose:** Recommend the loan rate and fees that meet the hurdle return on capital while winning the deals worth winning.
- **Label:** For "Risk-Adjusted Loan Pricing (RAROC)": Recommend the loan rate and fees that meet the hurdle return on capital while winning the deals worth winning. The reference kit's label belongs to a neighbouring problem and does not describe yours: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Define your own label exactly as in M1. Design around this trap first: Truncated quote data biases elasticity.
- **Sources:** - **Source:** Quote-to-win curve inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: quote data is truncated where deals never reached a quote.<br>- **Source:** Expected loss and capital inputs<br>**Owner:** Risk data office<br>**System Of Record:** General ledger and risk data warehouse<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: risk parameters must be the approved ones.<br>- **Source:** Relationship profitability inputs<br>**Owner:** Operations<br>**System Of Record:** Customer master and KYC repository<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: allocation of shared costs is contested.<br>- **Source:** Competitor rate inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: often anecdotal, not systematically collected.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Truncated quote data biases elasticity<br>- Past discounts reflect relationship-manager habits, not customer need
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
