# Personalised Product Search Ranking: model card and data card

> Generated from the blueprint `retail/personalized-search-ranking` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Personalised Product Search Ranking · **Domain:** retail · **Latency tier:** sub-100ms · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** BM25 with business-rule boosts.
- **Production model:** Two-stage: ANN plus BM25 hybrid retrieval, then a LambdaMART/transformer ranker with propensity correction, served with embedding and feature caches. Final score is w1 times P(click) plus w2 times P(cart given click) plus w3 times P(purchase given cart) times log(1+GMV) plus a seller exposure boost, with a position tower used in training only and Roaring-bitmap availability masks applied inside the retrieval shard.
- **Intended use:** Rank search results to maximise purchases per search session while preserving relevance and catalogue fairness to sellers.
- **Out of scope:** - Raw impressions count: rich-get-richer feedback loop.<br>- Item title length: spurious correlation with conversions.
- **Primary metrics:** - NDCG@10 with propensity weighting<br>- Recall@200 of retrieval
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate click and conversion probabilities (isotonic or Platt) per surface and position so the ranker's scores can be compared and combined with business value.
- **Known failure modes:** - New seller floods catalogue with keyword-stuffed items<br>- Embedding model update changes neighbour sets<br>- Hyperlocal stock flips mid-session
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
- **Purpose:** Rank search results to maximise purchases per search session while preserving relevance and catalogue fairness to sellers.
- **Label:** For "Personalised Product Search Ranking": Rank search results to maximise purchases per search session while preserving relevance and catalogue fairness to sellers. The reference kit's label belongs to a neighbouring problem and does not describe yours: There is no separate label: for each test session the prefix of clicks is the input and the final click is the target (leave-last-out). Sessions shorter than three clicks are skipped. Define your own label exactly as in M1. Design around this trap first: Training on clicks from the current ranker.
- **Sources:** - **Source:** Query-item semantic score inputs<br>**Owner:** Catalogue operations<br>**System Of Record:** Product information management (PIM)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: embeddings must be trained on pre-period logs.<br>- **Source:** Item price-rank within query inputs<br>**Owner:** E-commerce engineering<br>**System Of Record:** Order management system (OMS)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: compute over the retrieved set not the catalogue.<br>- **Source:** User-category affinity inputs<br>**Owner:** Customer analytics<br>**System Of Record:** Customer data platform (CDP)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: exclude events in the current session after the query.<br>- **Source:** Slot position (training only) inputs<br>**Owner:** Catalogue operations<br>**System Of Record:** Product information management (PIM)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: if position leaks into serving features the ranker reproduces the page layout.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Training on clicks from the current ranker<br>- Evaluating only on head queries
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
