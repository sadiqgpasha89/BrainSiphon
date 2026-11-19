# Cart Abandonment & Basket Completion: model card and data card

> Generated from the blueprint `retail/cart-abandonment-and-basket-completion` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Cart Abandonment & Basket Completion · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Exit-intent popup with a fixed discount.
- **Production model:** Real-time propensity model with uplift-based intervention selection and a margin-aware discount budget.
- **Intended use:** Predict abandonment in-session and trigger the least intrusive intervention (shipping clarity, saved cart, add-ons) that lifts completed checkouts.
- **Out of scope:** - Number of pages viewed: confounded with browsing.<br>- Referrer domain: channel artefact.
- **Primary metrics:** - Qini and AUUC<br>- Intervention calibration
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate click and conversion probabilities (isotonic or Platt) per surface and position so the ranker's scores can be compared and combined with business value.
- **Known failure modes:** - Payment provider outage looks like abandonment<br>- Discount arbitrage by repeat abandoners
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
- **Purpose:** Predict abandonment in-session and trigger the least intrusive intervention (shipping clarity, saved cart, add-ons) that lifts completed checkouts.
- **Label:** For "Cart Abandonment & Basket Completion": Predict abandonment in-session and trigger the least intrusive intervention (shipping clarity, saved cart, add-ons) that lifts completed checkouts. The reference kit's label belongs to a neighbouring problem and does not describe yours: The reward is 1 if the chosen action succeeded and 0 otherwise. For every logged row the action, its reward and the probability of choosing it are recorded; only the chosen action's reward is observed. Define your own label exactly as in M1. Design around this trap first: Non-random past interventions.
- **Sources:** - **Source:** Shipping-cost shock inputs<br>**Owner:** Catalogue operations<br>**System Of Record:** Product information management (PIM)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: compute at the reveal event.<br>- **Source:** Payment error count inputs<br>**Owner:** E-commerce engineering<br>**System Of Record:** Order management system (OMS)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: count before intervention.<br>- **Source:** Return-visit pattern inputs<br>**Owner:** Customer analytics<br>**System Of Record:** Customer data platform (CDP)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: session stitching consent.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Non-random past interventions<br>- Counting recovered carts that would have converted anyway
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
