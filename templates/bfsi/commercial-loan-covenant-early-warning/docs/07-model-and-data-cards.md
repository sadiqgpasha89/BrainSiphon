# Commercial Loan Covenant Breach Early Warning: model card and data card

> Generated from the blueprint `bfsi/commercial-loan-covenant-early-warning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Commercial Loan Covenant Breach Early Warning · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Rule-based watchlist on headroom under 15% plus two negative quarters, because credit officers already use it.
- **Production model:** Gradient boosting on headroom, trend and account-behaviour features with monotone constraints, calibrated per sector band, with a reason list for each flag.
- **Intended use:** Predict which corporate borrowers will breach a financial covenant in the next two quarters so relationship managers act before the breach.
- **Out of scope:** - Sector label alone: too coarse, a sector spans healthy and weak firms.<br>- Relationship age: weak link to near-term covenant stress.<br>- Number of facilities: mixes size and complexity, no causal link.
- **Primary metrics:** - PR-AUC at the watchlist size<br>- Lead time of correct warnings
- **Measured values (fill in):** ____________
- **Slices reported:** - Income band, age band and thin-file applicants<br>- Product, channel and region<br>- Protected classes under the applicable fair-lending or conduct rules<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Waiver or amendment before breach<br>- Restated accounts<br>- Parent group support
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
- **Purpose:** Predict which corporate borrowers will breach a financial covenant in the next two quarters so relationship managers act before the breach.
- **Label:** For "Commercial Loan Covenant Breach Early Warning": Predict which corporate borrowers will breach a financial covenant in the next two quarters so relationship managers act before the breach. The reference kit's label: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Design around this trap first: Using final accounts instead of as-reported ones inflates accuracy.
- **Sources:** - **Source:** Covenant headroom and slope inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use as-reported contractual definitions only.<br>- **Source:** Revenue momentum inputs<br>**Owner:** Risk data office<br>**System Of Record:** General ledger and risk data warehouse<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: management accounts arrive late and are sometimes restated.<br>- **Source:** Liquidity cushion inputs<br>**Owner:** Operations<br>**System Of Record:** Customer master and KYC repository<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: facility availability must be as at the date, not current.<br>- **Source:** Account behaviour inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: only valid for borrowers whose main account is held here.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Using final accounts instead of as-reported ones inflates accuracy<br>- Random split leaks the same borrower across quarters
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
