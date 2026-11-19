# AML Graph Anomaly Detection: model card and data card

> Generated from the blueprint `fintech/aml-graph-anomaly-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** AML Graph Anomaly Detection · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Gradient-boosted trees on hand-built graph features, which matches current investigator logic and is explainable.
- **Production model:** Heterogeneous GraphSAGE with edge-type attention plus a GBDT head on motif features; GNNExplainer subgraph shown on every alert.
- **Intended use:** Surface layering, structuring and circular fund flows that rule-based monitoring cannot see, cutting false-positive alerts by half.
- **Out of scope:** - Transaction amount alone: structured amounts are deliberately just below thresholds.<br>- Account age: weakly informative and discriminatory in some jurisdictions.
- **Primary metrics:** - Precision at top-k alerts per analyst<br>- SAR conversion rate
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer segment, tenure and new versus existing accounts<br>- Geography and channel (card-present, online, UPI)<br>- Protected-class proxies where lawful analysis is permitted, to check disparate impact<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Entity resolution splits one customer into two<br>- Sanctions list update
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
- **Purpose:** Surface layering, structuring and circular fund flows that rule-based monitoring cannot see, cutting false-positive alerts by half.
- **Label:** For "AML Graph Anomaly Detection": Surface layering, structuring and circular fund flows that rule-based monitoring cannot see, cutting false-positive alerts by half. The reference kit's label: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Design around this trap first: Random edge split leaks future flows into training.
- **Sources:** - **Source:** Pass-through ratio inputs<br>**Owner:** Payments engineering<br>**System Of Record:** Core banking ledger<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: needs transaction timestamps not posting dates.<br>- **Source:** Cycle membership score inputs<br>**Owner:** Risk analytics<br>**System Of Record:** Card management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: windowing must exclude the alerting transaction itself.<br>- **Source:** Counterparty risk propagation inputs<br>**Owner:** Customer data office<br>**System Of Record:** Customer identity and KYC (CIAM)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: seed list must be frozen before the evaluation period.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Random edge split leaks future flows into training<br>- Evaluating on alerts rather than all accounts hides missed laundering
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
