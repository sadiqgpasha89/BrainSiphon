# Listing Photo Quality & Room Classification: model card and data card

> Generated from the blueprint `real-estate/listing-photo-quality-and-room-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Listing Photo Quality & Room Classification · **Domain:** real-estate · **Latency tier:** sub-100ms · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Agent-ordered gallery with blur thresholds, because portals do this.
- **Production model:** A multi-task vision model for room class and quality with ordering rules and privacy blur.
- **Intended use:** Classify the room type and quality of each listing photo so galleries are ordered well and poor images are flagged to the agent.
- **Out of scope:** - File size: Depends on compression settings and the upload client and says nothing about the scene.<br>- Camera brand: Irrelevant to the room or its quality once exposure and blur are measured.<br>- Upload time: Reflects when the agent worked, not the room or the image.
- **Primary metrics:** - Room accuracy<br>- Quality rank correlation
- **Measured values (fill in):** ____________
- **Slices reported:** - Neighbourhood and price band<br>- Property type and listing age<br>- Fair-housing protected-class proxies such as area-level demographics<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate detection scores per class and per condition so that a fixed threshold means the same precision across lines.
- **Known failure modes:** - Floor plans in the gallery<br>- Night shots<br>- Regional room names
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
- **Purpose:** Classify the room type and quality of each listing photo so galleries are ordered well and poor images are flagged to the agent.
- **Label:** For "Listing Photo Quality & Room Classification": Classify the room type and quality of each listing photo so galleries are ordered well and poor images are flagged to the agent. The reference kit's label belongs to a neighbouring problem and does not describe yours: An image is positive when it contains the finding (a defect, a lesion, a tampered region). Labels are per image; images of the same item share a group. Define your own label exactly as in M1. Design around this trap first: Training mostly on professional photos hides failures on the phone pictures that most agents upload.
- **Sources:** - **Source:** Room class probability inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: rare rooms such as utility or study are under-represented, so check per-class recall.<br>- **Source:** Blur score inputs<br>**Owner:** Property operations<br>**System Of Record:** Listing (MLS) feed and CRM<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: depends on image size, so compute at a fixed resolution.<br>- **Source:** Exposure histogram inputs<br>**Owner:** Geospatial team<br>**System Of Record:** Building management system (BMS) and IoT hub<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: high-dynamic-range photos look clipped but are fine, so condition on the scene type.<br>- **Source:** Duplicate similarity inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: crops and filters change the hash, so use an embedding distance as a second check.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Training mostly on professional photos hides failures on the phone pictures that most agents upload<br>- Quality labels from a few raters are noisy and cap how well the model can do
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
