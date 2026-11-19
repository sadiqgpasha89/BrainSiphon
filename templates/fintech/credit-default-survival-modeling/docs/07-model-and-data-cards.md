# Credit Default Survival Modeling: model card and data card

> Generated from the blueprint `fintech/credit-default-survival-modeling` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Credit Default Survival Modeling · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Cox proportional hazards with monotone-binned features, because regulators already trust it.
- **Production model:** Discrete-time gradient-boosted hazard model with monotone constraints, calibrated per vintage, plus a macro scenario overlay.
- **Intended use:** Estimate time-to-default curves per borrower to set provisions, pricing and limits under IFRS 9 / CECL.
- **Out of scope:** - Raw ZIP code: proxy for protected classes and unstable, use regional macro features instead.<br>- Marketing channel of acquisition: correlates with vintage, not with repayment behaviour.
- **Primary metrics:** - Time-dependent AUC at 12 and 24 months<br>- Calibration of cumulative default by vintage
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer segment, tenure and new versus existing accounts<br>- Geography and channel (card-present, online, UPI)<br>- Protected-class proxies where lawful analysis is permitted, to check disparate impact<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Policy change mid-vintage<br>- Moratorium or forbearance
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
- **Purpose:** Estimate time-to-default curves per borrower to set provisions, pricing and limits under IFRS 9 / CECL.
- **Label:** For "Credit Default Survival Modeling": Estimate time-to-default curves per borrower to set provisions, pricing and limits under IFRS 9 / CECL. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Using current delinquency status instead of status as-of observation time.
- **Sources:** - **Source:** Months-on-book hazard shape inputs<br>**Owner:** Payments engineering<br>**System Of Record:** Core banking ledger<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: vintage effects mix with age if not stratified.<br>- **Source:** Utilisation trend 6m inputs<br>**Owner:** Risk analytics<br>**System Of Record:** Card management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use statement-date values, never month-end after the fact.<br>- **Source:** Payment-to-minimum ratio inputs<br>**Owner:** Customer data office<br>**System Of Record:** Customer identity and KYC (CIAM)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: delinquency flags computed after default leak the label.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Using current delinquency status instead of status as-of observation time<br>- Ignoring left truncation of older vintages
- **Privacy and deletion:** Tokenise PAN before it reaches the model plane; purpose-limited use of behavioural data; erasure is key deletion for non-ledger copies while ledger records stay under regulatory retention. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
