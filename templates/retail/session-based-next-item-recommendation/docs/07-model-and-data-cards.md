# Session-Based Next-Item Recommendation: model card and data card

> Generated from the blueprint `retail/session-based-next-item-recommendation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Session-Based Next-Item Recommendation · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Item-to-item co-visitation counts.
- **Production model:** Causal transformer (SASRec-style) with in-memory session state, ANN lookup and business re-rank; retrained daily.
- **Intended use:** Recommend the next item for anonymous or logged-in sessions in real time, using only in-session behaviour when history is absent.
- **Out of scope:** - Use the session identifier or the total clicks in a session: the identifier is arbitrary and the click total is confounded with browsing style.<br>- Use raw click counts per item as a signal: they are dominated by crawlers and promotions, not genuine interest.<br>- Evaluate with random session splits or uniform random negatives: both flatter the model and hide the popularity shift that real traffic brings.<br>- Track shoppers across sites: the privacy constraint rules it out, and in-session behaviour is enough for this problem.
- **Primary metrics:** - HitRate@20 and MRR on time-split<br>- Catalogue coverage
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate click and conversion probabilities (isotonic or Platt) per surface and position so the ranker's scores can be compared and combined with business value.
- **Known failure modes:** - Bot traffic produces random sequences<br>- Sale event changes item popularity within minutes<br>- Anonymous session with a single click<br>- Out-of-stock item at the top of the list
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
- **Purpose:** Recommend the next item for anonymous or logged-in sessions in real time, using only in-session behaviour when history is absent.
- **Label:** There is no separate label: for each test session the prefix of clicks is the input and the final click is the target (leave-last-out). Sessions shorter than 3 clicks are skipped. Test sessions are humans only, but the training log is left unfiltered or filtered depending on the experiment.
- **Sources:** - **Source:** Last-k item embeddings inputs<br>**Owner:** Catalogue operations<br>**System Of Record:** Product information management (PIM)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: cap sequence length so latency stays inside the budget.<br>- **Source:** Dwell and scroll depth inputs<br>**Owner:** E-commerce engineering<br>**System Of Record:** Order management system (OMS)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: bots inflate or deflate dwell, so filter them first.<br>- **Source:** Session goal inference inputs<br>**Owner:** Customer analytics<br>**System Of Record:** Customer data platform (CDP)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: label from the eventual purchase carefully to avoid leakage.<br>- **Source:** Session theme category inputs<br>**Owner:** Catalogue operations<br>**System Of Record:** Product information management (PIM)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: compute from the prefix only, never including the item to be predicted.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Random session splits leak popularity<br>- Test sessions from the same day as training
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
