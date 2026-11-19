# Home Search Ranking: model card and data card

> Generated from the blueprint `real-estate/home-search-ranking` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Home Search Ranking · **Domain:** real-estate · **Latency tier:** sub-100ms · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Sort by newest with filters, because portals start this way.
- **Production model:** Two-stage retrieval and learning-to-rank on session context with exposure constraints and a freshness boost.
- **Intended use:** Rank homes for a buyer's search by the likelihood of engagement and fit, balancing relevance, freshness and seller fairness.
- **Out of scope:** - Photo count: Reflects portal and agent habits and not suitability for the buyer.<br>- Listing agent: Has no bearing on what the buyer wants and invites bias in exposure.<br>- Time on page alone: Confounded by distraction and device, and a long visit can mean confusion.
- **Primary metrics:** - NDCG@10<br>- Calibration of CTR
- **Measured values (fill in):** ____________
- **Slices reported:** - Neighbourhood and price band<br>- Property type and listing age<br>- Fair-housing protected-class proxies such as area-level demographics<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate click and conversion probabilities (isotonic or Platt) per surface and position so the ranker's scores can be compared and combined with business value.
- **Known failure modes:** - Cold start buyer<br>- Hot listing<br>- Broad search
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including thin-comp micro-markets, unusual property types and new developments; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Rank homes for a buyer's search by the likelihood of engagement and fit, balancing relevance, freshness and seller fairness.
- **Label:** For "Home Search Ranking": Rank homes for a buyer's search by the likelihood of engagement and fit, balancing relevance, freshness and seller fairness. The reference kit's label belongs to a neighbouring problem and does not describe yours: There is no separate label: for each test session the prefix of clicks is the input and the final click is the target (leave-last-out). Sessions shorter than three clicks are skipped. Define your own label exactly as in M1. Design around this trap first: Position bias in click logs means top results look better than they are.
- **Sources:** - **Source:** Price fit inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: the range changes during a search, so use the current one.<br>- **Source:** Saved and shared inputs<br>**Owner:** Property operations<br>**System Of Record:** Listing (MLS) feed and CRM<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: sparse for new listings, so smooth with a prior.<br>- **Source:** Listing freshness inputs<br>**Owner:** Geospatial team<br>**System Of Record:** Building management system (BMS) and IoT hub<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: decay too steeply and a good older home disappears.<br>- **Source:** Commute fit inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: routing data is expensive, so precompute for common destinations.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Position bias in click logs means top results look better than they are<br>- Offline replay cannot reproduce how buyers would respond to a different ranking
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
