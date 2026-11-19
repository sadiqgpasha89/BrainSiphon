# Collateral Valuation & Haircut Monitoring: model card and data card

> Generated from the blueprint `bfsi/collateral-valuation-and-haircut-monitoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Collateral Valuation & Haircut Monitoring · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Static haircut table by asset class with annual valuation, because it is the policy default and auditors expect it.
- **Production model:** Quantile regression and volatility models for liquid assets, indexed valuation for property and private assets with stale-value penalties, and a haircut recommender capped by policy bounds.
- **Intended use:** Revalue pledged collateral continuously and set haircuts so the bank is not under-secured when prices fall or liquidity dries up.
- **Out of scope:** - Collateral description free text: inconsistent wording, replaced by coded types.<br>- Loan officer identifier: not related to collateral value.<br>- Original appraiser name: proxy for cohort, not value.
- **Primary metrics:** - Coverage of the 95% quantile on back-tests<br>- Valuation error against realised sale price
- **Measured values (fill in):** ____________
- **Slices reported:** - Income band, age band and thin-file applicants<br>- Product, channel and region<br>- Protected classes under the applicable fair-lending or conduct rules<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Price feed outage<br>- Fire sale<br>- Duplicate pledging
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
- **Purpose:** Revalue pledged collateral continuously and set haircuts so the bank is not under-secured when prices fall or liquidity dries up.
- **Label:** For "Collateral Valuation & Haircut Monitoring": Revalue pledged collateral continuously and set haircuts so the bank is not under-secured when prices fall or liquidity dries up. The reference kit's label belongs to a neighbouring problem and does not describe yours: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Define your own label exactly as in M1. Design around this trap first: Back-test on calm markets misses stressed haircuts.
- **Sources:** - **Source:** Price momentum and volatility inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use settlement prices, not stale quotes.<br>- **Source:** Liquidity proxy inputs<br>**Owner:** Risk data office<br>**System Of Record:** General ledger and risk data warehouse<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: volumes are missing for private assets.<br>- **Source:** Valuation age inputs<br>**Owner:** Operations<br>**System Of Record:** Customer master and KYC repository<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: ageing must use the valuation date, not the booking date.<br>- **Source:** Concentration index inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: group borrowers by common ownership first.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Back-test on calm markets misses stressed haircuts<br>- Sale prices selection bias, only defaulted loans are sold
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
