# Floor-Plan Extraction from Images: model card and data card

> Generated from the blueprint `real-estate/floor-plan-extraction-from-images` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Floor-Plan Extraction from Images · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Manual tracing by operators, because it is accurate and slow.
- **Production model:** Segmentation with OCR and a vectoriser, plus consistency checks and a human correction tool.
- **Intended use:** Convert floor-plan images into structured rooms, dimensions and layouts for search, valuation and 3D tours.
- **Out of scope:** - Colour: A style choice of the drawing that does not change the layout.<br>- Watermark: Overlaid text that the model should ignore and not read as a label.<br>- Compass: Orientation marks carry no geometry or area information.
- **Primary metrics:** - Room IoU<br>- Area error
- **Measured values (fill in):** ____________
- **Slices reported:** - Neighbourhood and price band<br>- Property type and listing age<br>- Fair-housing protected-class proxies such as area-level demographics<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate detection scores per class and per condition so that a fixed threshold means the same precision across lines.
- **Known failure modes:** - Hand-drawn plans<br>- Multi-floor sheets<br>- Missing dimensions
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

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
- **Purpose:** Convert floor-plan images into structured rooms, dimensions and layouts for search, valuation and 3D tours.
- **Label:** For "Floor-Plan Extraction from Images": Convert floor-plan images into structured rooms, dimensions and layouts for search, valuation and 3D tours. The reference kit's label belongs to a neighbouring problem and does not describe yours: An image is positive when it contains the finding (a defect, a lesion, a tampered region). Labels are per image; images of the same item share a group. Define your own label exactly as in M1. Design around this trap first: Training on clean CAD exports hides failures on the hand-drawn and scanned plans that most listings contain.
- **Sources:** - **Source:** Wall segmentation inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: clutter such as furniture symbols and hatching confuses the mask, so evaluate per drawing style.<br>- **Source:** Dimension OCR inputs<br>**Owner:** Property operations<br>**System Of Record:** Listing (MLS) feed and CRM<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: A misread digit changes the scale by ten, so validate against the stated area.<br>- **Source:** Room label OCR inputs<br>**Owner:** Geospatial team<br>**System Of Record:** Building management system (BMS) and IoT hub<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: names are in many languages and abbreviations, so normalise by locale.<br>- **Source:** Area consistency inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: stated totals include or exclude walls and balconies, so allow for the convention.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Training on clean CAD exports hides failures on the hand-drawn and scanned plans that most listings contain<br>- Template leakage when the same architect's drawings appear in both training and test
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
