# Property Recommendation for Cold-Start Buyers: model card and data card

> Generated from the blueprint `real-estate/property-recommendation-for-cold-start-buyers` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Property Recommendation for Cold-Start Buyers · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Popular homes in the searched area, because it is safe.
- **Production model:** Two-tower model with content features, bandit exploration and reasons for each recommendation.
- **Intended use:** Recommend homes to new buyers from a few early actions or a short questionnaire and refine as signals arrive.
- **Out of scope:** - Device: Mostly a proxy for income and not a preference for a property.<br>- Referrer: Weakly related to what the buyer wants once their actions are known.<br>- Time of day: Reflects the buyer's schedule, not their taste.
- **Primary metrics:** - Hit rate@20<br>- Coverage
- **Measured values (fill in):** ____________
- **Slices reported:** - Neighbourhood and price band<br>- Property type and listing age<br>- Fair-housing protected-class proxies such as area-level demographics<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate click and conversion probabilities (isotonic or Platt) per surface and position so the ranker's scores can be compared and combined with business value.
- **Known failure modes:** - Misleading early clicks<br>- Shared accounts<br>- Budget change
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
- **Purpose:** Recommend homes to new buyers from a few early actions or a short questionnaire and refine as signals arrive.
- **Label:** For "Property Recommendation for Cold-Start Buyers": Recommend homes to new buyers from a few early actions or a short questionnaire and refine as signals arrive. The reference kit's label belongs to a neighbouring problem and does not describe yours: There is no separate label: for each test session the prefix of clicks is the input and the final click is the target (leave-last-out). Sessions shorter than three clicks are skipped. Define your own label exactly as in M1. Design around this trap first: Historical logs are dominated by popular homes so offline scores favour popularity.
- **Sources:** - **Source:** Questionnaire answers inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: self-report is imprecise, so treat it as a prior and not a rule.<br>- **Source:** Early views inputs<br>**Owner:** Property operations<br>**System Of Record:** Listing (MLS) feed and CRM<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: curiosity clicks are noisy, so weight saves above views.<br>- **Source:** Item embedding inputs<br>**Owner:** Geospatial team<br>**System Of Record:** Building management system (BMS) and IoT hub<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: needs retraining as the market changes.<br>- **Source:** Lookalike buyers inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: sparse in the first sessions, so use it with a small weight.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Historical logs are dominated by popular homes so offline scores favour popularity<br>- New users behave differently from established ones, so a test on old users overstates cold-start quality
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
