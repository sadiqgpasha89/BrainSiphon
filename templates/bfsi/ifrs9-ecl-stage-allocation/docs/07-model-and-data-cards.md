# IFRS 9 Expected Credit Loss Staging: model card and data card

> Generated from the blueprint `bfsi/ifrs9-ecl-stage-allocation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** IFRS 9 Expected Credit Loss Staging · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Rule-based staging on days past due and a PD ratio threshold, because it is simple and the auditors know it.
- **Production model:** Behavioural PD models with origination PD held, monotone gradient boosting, hysteresis rules on stage migration and a scenario engine that weights macro paths.
- **Intended use:** Allocate each exposure to IFRS 9 stage 1, 2 or 3 and estimate lifetime expected loss so provisions respond to deteriorating credit without whipsaw.
- **Out of scope:** - Customer tenure: weak link once behaviour is observed.<br>- Number of products: proxy for relationship, not for risk.<br>- Branch code: administrative noise.
- **Primary metrics:** - Calibration of PD by stage<br>- Stability of stage migration matrix
- **Measured values (fill in):** ____________
- **Slices reported:** - Income band, age band and thin-file applicants<br>- Product, channel and region<br>- Protected classes under the applicable fair-lending or conduct rules<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Model change at quarter end<br>- Missing origination PD for legacy loans<br>- Pandemic-style payment holidays
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including thin-file borrowers, new-to-bank customers, small-balance accounts and rare product lines; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Return top reason codes (SHAP-based or monotone-constrained) with every decision | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Allocate each exposure to IFRS 9 stage 1, 2 or 3 and estimate lifetime expected loss so provisions respond to deteriorating credit without whipsaw.
- **Label:** For "IFRS 9 Expected Credit Loss Staging": Allocate each exposure to IFRS 9 stage 1, 2 or 3 and estimate lifetime expected loss so provisions respond to deteriorating credit without whipsaw. The reference kit's label: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Design around this trap first: Random split ignores economic cycles.
- **Sources:** - **Source:** Lifetime PD ratio inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: the origination PD must be preserved, not re-estimated.<br>- **Source:** Days past due flag inputs<br>**Owner:** Risk data office<br>**System Of Record:** General ledger and risk data warehouse<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: counted on contractual due dates, not posting dates.<br>- **Source:** Watchlist and forbearance inputs<br>**Owner:** Operations<br>**System Of Record:** Customer master and KYC repository<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: flags must have effective dates to avoid leakage.<br>- **Source:** Macro sensitivity inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: sensitivities are estimated on few downturns.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Random split ignores economic cycles<br>- Calibrating on benign years understates stage 2
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
