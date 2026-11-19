# Out-of-Stock Substitution Recommendations: model card and data card

> Generated from the blueprint `retail/out-of-stock-substitution` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Out-of-Stock Substitution Recommendations · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Same-category cheapest in-stock item.
- **Production model:** Pairwise ranker trained on substitution outcomes with constraint filters and real-time stock-aware candidate generation.
- **Intended use:** Offer the best in-stock substitute when a grocery or retail item is unavailable, preserving the order and customer trust.
- **Out of scope:** - Item popularity: picks popular not suitable.<br>- Picker ID: personal habit.
- **Primary metrics:** - Top-1 acceptance prediction<br>- Constraint violation rate
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate click and conversion probabilities (isotonic or Platt) per surface and position so the ranker's scores can be compared and combined with business value.
- **Known failure modes:** - Inventory data inaccurate<br>- Allergen data missing for new product
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
- **Purpose:** Offer the best in-stock substitute when a grocery or retail item is unavailable, preserving the order and customer trust.
- **Label:** For "Out-of-Stock Substitution Recommendations": Offer the best in-stock substitute when a grocery or retail item is unavailable, preserving the order and customer trust. The reference kit's label belongs to a neighbouring problem and does not describe yours: There is no separate label: for each test session the prefix of clicks is the input and the final click is the target (leave-last-out). Sessions shorter than three clicks are skipped. Define your own label exactly as in M1. Design around this trap first: Acceptance logged only for offered items.
- **Sources:** - **Source:** Historic substitution acceptance inputs<br>**Owner:** Catalogue operations<br>**System Of Record:** Product information management (PIM)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: matured pairs.<br>- **Source:** Price delta and unit size delta inputs<br>**Owner:** E-commerce engineering<br>**System Of Record:** Order management system (OMS)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: normalised units.<br>- **Source:** User substitution tolerance inputs<br>**Owner:** Customer analytics<br>**System Of Record:** Customer data platform (CDP)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: excludes the current order.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Acceptance logged only for offered items<br>- Safety constraints not tested separately
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
