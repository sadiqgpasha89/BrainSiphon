# Proof-of-Delivery Photo Verification: model card and data card

> Generated from the blueprint `supply-chain/proof-of-delivery-photo-verification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Proof-of-Delivery Photo Verification · **Domain:** supply-chain · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Driver self-reported POD with signature.
- **Production model:** On-device quality and privacy filters with server-side authenticity checks (hash, geotag, parcel detection).
- **Intended use:** Verify delivery photos (parcel at door, correct location, no sensitive content) to prevent fraud and disputes.
- **Out of scope:** - Photo brightness: environment.<br>- Phone model: device.
- **Primary metrics:** - Fraud detection recall<br>- False rejection of genuine PODs
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate detection scores per class and per condition so that a fixed threshold means the same precision across lines.
- **Known failure modes:** - Poor lighting at night<br>- Apartments with no clear door
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new lanes, slow-moving SKUs and small carriers; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Verify delivery photos (parcel at door, correct location, no sensitive content) to prevent fraud and disputes.
- **Label:** For "Proof-of-Delivery Photo Verification": Verify delivery photos (parcel at door, correct location, no sensitive content) to prevent fraud and disputes. The reference kit's label belongs to a neighbouring problem and does not describe yours: An image is positive when it contains the finding (a defect, a lesion, a tampered region). Labels are per image; images of the same item share a group. Define your own label exactly as in M1. Design around this trap first: Synthetic fraud unlike real.
- **Sources:** - **Source:** Parcel-in-scene detection inputs<br>**Owner:** Supply-chain planning<br>**System Of Record:** ERP (orders, inventory, finance)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: detector.<br>- **Source:** Photo reuse similarity inputs<br>**Owner:** Logistics IT<br>**System Of Record:** Warehouse and transport management systems (WMS, TMS)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: window.<br>- **Source:** Geotag distance to address inputs<br>**Owner:** Master data team<br>**System Of Record:** Supplier and EDI network<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: GPS accuracy.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Synthetic fraud unlike real<br>- Test photos from daytime only
- **Privacy and deletion:** Driver and worker data minimised and pseudonymised; supplier data shared under contract with purpose limits. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
