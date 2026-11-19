# Shelf Monitoring & Planogram Compliance: model card and data card

> Generated from the blueprint `retail/shelf-monitoring-vision` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Shelf Monitoring & Planogram Compliance · **Domain:** retail · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Periodic manual audits with checklists.
- **Production model:** Detector plus SKU-embedding retrieval for open-set recognition, planogram-diff engine and prioritised task generator; models on edge GPUs.
- **Intended use:** Detect out-of-stock, misplaced and non-compliant products from shelf photos and robot images to cut lost sales.
- **Out of scope:** - Shelf lighting colour: environment.<br>- Camera model: device artefact.
- **Primary metrics:** - Detection mAP and SKU top-1 accuracy<br>- Task precision
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate detection scores per class and per condition so that a fixed threshold means the same precision across lines.
- **Known failure modes:** - Promotional displays off planogram<br>- Poor connectivity
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
- **Purpose:** Detect out-of-stock, misplaced and non-compliant products from shelf photos and robot images to cut lost sales.
- **Label:** For "Shelf Monitoring & Planogram Compliance": Detect out-of-stock, misplaced and non-compliant products from shelf photos and robot images to cut lost sales. The reference kit's label belongs to a neighbouring problem and does not describe yours: An image is positive when it contains the finding (a defect, a lesion, a tampered region). Labels are per image; images of the same item share a group. Define your own label exactly as in M1. Design around this trap first: Evaluation on clean shelf photos.
- **Sources:** - **Source:** Facing count vs planogram inputs<br>**Owner:** Catalogue operations<br>**System Of Record:** Product information management (PIM)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: accurate planogram version.<br>- **Source:** Empty-slot detection inputs<br>**Owner:** E-commerce engineering<br>**System Of Record:** Order management system (OMS)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: occlusion handling.<br>- **Source:** Price-tag OCR match inputs<br>**Owner:** Customer analytics<br>**System Of Record:** Customer data platform (CDP)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: tag detection quality.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Evaluation on clean shelf photos<br>- Different stores than training only in appearance
- **Privacy and deletion:** Consent-aware personalisation with opt-out honoured at feature-read time, retention limits on clickstream, and deletion propagated to feature stores and embeddings. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
