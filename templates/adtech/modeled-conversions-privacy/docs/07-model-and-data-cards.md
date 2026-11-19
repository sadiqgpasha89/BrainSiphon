# Modelled Conversions under Privacy Constraints: model card and data card

> Generated from the blueprint `adtech/modeled-conversions-privacy` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Modelled Conversions under Privacy Constraints · **Domain:** adtech · **Latency tier:** batch · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Report observed conversions only and accept undercounting.
- **Production model:** Bias-corrected conversion model trained on consented traffic, applied to aggregates with differential-privacy noise and uncertainty intervals.
- **Intended use:** Estimate unobservable conversions from aggregate and consented signals to keep measurement accurate as identifiers disappear.
- **Out of scope:** - Raw IDs: not allowed.<br>- Page URLs with identifiers: privacy risk.
- **Primary metrics:** - Error vs consented holdout<br>- Interval coverage
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Consent mix shifts after banner redesign<br>- Small segments hit privacy thresholds
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new campaigns, small publishers and rare device types; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Return top reason codes (SHAP-based or monotone-constrained) with every decision | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Estimate unobservable conversions from aggregate and consented signals to keep measurement accurate as identifiers disappear.
- **Label:** For "Modelled Conversions under Privacy Constraints": Estimate unobservable conversions from aggregate and consented signals to keep measurement accurate as identifiers disappear. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Consented users differ from non-consented.
- **Sources:** - **Source:** Consented-user conversion rate inputs<br>**Owner:** Ad platform engineering<br>**System Of Record:** Campaign and budget ledger<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: sampling.<br>- **Source:** Consent-rate by segment inputs<br>**Owner:** Measurement science<br>**System Of Record:** Billing and invoicing<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: estimates.<br>- **Source:** Aggregate click-to-conversion lag inputs<br>**Owner:** Privacy engineering<br>**System Of Record:** Identity graph and consent store (CMP)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: windows.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Consented users differ from non-consented<br>- Evaluating without privacy noise
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
