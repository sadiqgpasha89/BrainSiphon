# Behavioural Customer Segmentation with Embeddings: model card and data card

> Generated from the blueprint `retail/customer-segmentation-embeddings` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Behavioural Customer Segmentation with Embeddings · **Domain:** retail · **Latency tier:** batch · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** RFM quantile segmentation.
- **Production model:** Self-supervised sequence encoder plus constrained clustering with stability regularisation and automated segment profiling.
- **Intended use:** Learn actionable behavioural segments from purchase and browse sequences that marketing, merchandising and CRM can all use.
- **Out of scope:** - Raw demographic fields: sparse and risky for fairness.<br>- Account creation month: cohort artefact.
- **Primary metrics:** - Differential response (lift) between segments<br>- Stability (adjusted Rand) month to month
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Segment drift after new product launch<br>- Small segments get noisy
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including cold-start users, long-tail sellers and new catalogue items; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Learn actionable behavioural segments from purchase and browse sequences that marketing, merchandising and CRM can all use.
- **Label:** For "Behavioural Customer Segmentation with Embeddings": Learn actionable behavioural segments from purchase and browse sequences that marketing, merchandising and CRM can all use. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Evaluating clusters only on internal metrics.
- **Sources:** - **Source:** Sequence embedding of purchases inputs<br>**Owner:** Catalogue operations<br>**System Of Record:** Product information management (PIM)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: fixed observation window.<br>- **Source:** Price-tier mix inputs<br>**Owner:** E-commerce engineering<br>**System Of Record:** Order management system (OMS)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: normalise by category.<br>- **Source:** Channel and device mix inputs<br>**Owner:** Customer analytics<br>**System Of Record:** Customer data platform (CDP)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: consent-aware.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Evaluating clusters only on internal metrics<br>- No test of actionable difference
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
