# Competitor Price Intelligence & Matching: model card and data card

> Generated from the blueprint `retail/competitor-price-intelligence` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Competitor Price Intelligence & Matching · **Domain:** retail · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Exact match on GTIN with manual spreadsheets.
- **Production model:** Crawl and structured extraction, multimodal pair matching with attribute conflict checks, confidence-gated price index.
- **Intended use:** Continuously match own SKUs to competitor listings and track prices and availability reliably for pricing teams.
- **Out of scope:** - Page layout features: scraper artefact.<br>- Competitor logo: none.
- **Primary metrics:** - Match precision and recall<br>- Extraction field accuracy
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate detection scores per class and per condition so that a fixed threshold means the same precision across lines.
- **Known failure modes:** - Competitor changes page layout<br>- Dynamic competitor pricing by user location
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

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
- **Purpose:** Continuously match own SKUs to competitor listings and track prices and availability reliably for pricing teams.
- **Label:** For "Competitor Price Intelligence & Matching": Continuously match own SKUs to competitor listings and track prices and availability reliably for pricing teams. The reference kit's label belongs to a neighbouring problem and does not describe yours: A pair of records is positive when both belong to the same hidden true cluster. Clusters are formed by connected components over the pairs the model links. Define your own label exactly as in M1. Design around this trap first: Precision measured on GTIN-matched easy pairs.
- **Sources:** - **Source:** Match confidence inputs<br>**Owner:** Catalogue operations<br>**System Of Record:** Product information management (PIM)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: per-category calibration.<br>- **Source:** Availability state inputs<br>**Owner:** E-commerce engineering<br>**System Of Record:** Order management system (OMS)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: parse structured data.<br>- **Source:** Unit price normalisation inputs<br>**Owner:** Customer analytics<br>**System Of Record:** Customer data platform (CDP)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: unit extraction accuracy.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Precision measured on GTIN-matched easy pairs<br>- Stale prices counted as fresh
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
