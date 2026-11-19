# Contextual Targeting & Page Classification: model card and data card

> Generated from the blueprint `adtech/contextual-targeting-page-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Contextual Targeting & Page Classification · **Domain:** adtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Domain-level category lists.
- **Production model:** Distilled multilingual classifier with page cache keyed by canonical URL, async crawl and refresh, and fallback to URL-based classifier.
- **Intended use:** Classify page and video content into IAB topics and sentiment in real time to target ads without user identifiers.
- **Out of scope:** - Navigation boilerplate: repeated across pages.<br>- Comment sections: off-topic and risky.
- **Primary metrics:** - Macro-F1 on IAB taxonomy<br>- Cache hit rate
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Breaking news page not yet crawled<br>- Single-page apps change content without URL change
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new campaigns, small publishers and rare device types; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Classify page and video content into IAB topics and sentiment in real time to target ads without user identifiers.
- **Label:** For "Contextual Targeting & Page Classification": Classify page and video content into IAB topics and sentiment in real time to target ads without user identifiers. The reference kit's label: The label is the class of the document, assigned by the person who handled it; documents in the same thread share a label. Design around this trap first: Evaluating on clean article pages only.
- **Sources:** - **Source:** Page text embedding inputs<br>**Owner:** Ad platform engineering<br>**System Of Record:** Campaign and budget ledger<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: cleaning.<br>- **Source:** Entity and keyword extraction inputs<br>**Owner:** Measurement science<br>**System Of Record:** Billing and invoicing<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: quality.<br>- **Source:** Title and URL tokens inputs<br>**Owner:** Privacy engineering<br>**System Of Record:** Identity graph and consent store (CMP)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: regex.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Evaluating on clean article pages only<br>- Taxonomy version mismatch
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
