# Credit Scoring for Thin-File Borrowers with Alternative Data: model card and data card

> Generated from the blueprint `fintech/credit-scoring-thin-file-alt-data` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Credit Scoring for Thin-File Borrowers with Alternative Data · **Domain:** fintech · **Latency tier:** sub-100ms · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Logistic regression on 25 cash-flow features with monotone constraints.
- **Production model:** Monotone gradient boosting with a fairness-constrained post-processing step and reject-inference via a 2% randomised approval cohort.
- **Intended use:** Extend fair credit to customers with no bureau history using cash-flow and behavioural data, at default rates equal to prime segments.
- **Out of scope:** - Device model: proxy for income and protected attributes.<br>- App install list: invasive, unstable and legally risky.
- **Primary metrics:** - Gini and KS on out-of-time sample<br>- Approval-rate parity ratios
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer segment, tenure and new versus existing accounts<br>- Geography and channel (card-present, online, UPI)<br>- Protected-class proxies where lawful analysis is permitted, to check disparate impact<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Open-banking API outage<br>- Gig-economy income seasonality
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

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
- **Purpose:** Extend fair credit to customers with no bureau history using cash-flow and behavioural data, at default rates equal to prime segments.
- **Label:** For "Credit Scoring for Thin-File Borrowers with Alternative Data": Extend fair credit to customers with no bureau history using cash-flow and behavioural data, at default rates equal to prime segments. The reference kit's label: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Design around this trap first: Reject inference omitted so scores are overconfident.
- **Sources:** - **Source:** Inflow volatility 90d inputs<br>**Owner:** Payments engineering<br>**System Of Record:** Core banking ledger<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: use only transactions before application date.<br>- **Source:** Minimum balance buffer inputs<br>**Owner:** Risk analytics<br>**System Of Record:** Card management system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: account-aggregator refresh timing must be as-of.<br>- **Source:** Recurring obligation coverage inputs<br>**Owner:** Customer data office<br>**System Of Record:** Customer identity and KYC (CIAM)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: match recurring payments only with prior-period data.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Reject inference omitted so scores are overconfident<br>- Out-of-time split skipped despite macro shifts
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
