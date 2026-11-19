# Move-Out Damage Assessment from Photos: model card and data card

> Generated from the blueprint `real-estate/move-out-damage-assessment-from-photos` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Move-Out Damage Assessment from Photos · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Manager walk-through with a checklist, because it is the norm.
- **Production model:** Alignment, change detection and damage grading with wear rules, cost estimates and a reviewer.
- **Intended use:** Compare move-in and move-out photos to identify damage beyond normal wear and estimate repair cost for deposit decisions.
- **Out of scope:** - Furniture: Removed or moved between photos and should not be read as damage.<br>- Lighting: Varies by time of day and window and should be normalised.<br>- Camera: Different phones change colour and sharpness and not the condition.
- **Primary metrics:** - Detection F1<br>- Cost error
- **Measured values (fill in):** ____________
- **Slices reported:** - Neighbourhood and price band<br>- Property type and listing age<br>- Fair-housing protected-class proxies such as area-level demographics<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate detection scores per class and per condition so that a fixed threshold means the same precision across lines.
- **Known failure modes:** - Different lighting<br>- Missing photos<br>- Dispute
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
- **Purpose:** Compare move-in and move-out photos to identify damage beyond normal wear and estimate repair cost for deposit decisions.
- **Label:** For "Move-Out Damage Assessment from Photos": Compare move-in and move-out photos to identify damage beyond normal wear and estimate repair cost for deposit decisions. The reference kit's label belongs to a neighbouring problem and does not describe yours: An image is positive when it contains the finding (a defect, a lesion, a tampered region). Labels are per image; images of the same item share a group. Define your own label exactly as in M1. Design around this trap first: Posed photos taken by a careful inspector are cleaner than tenants' own pictures.
- **Sources:** - **Source:** Change detection inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: lighting changes look like damage, so normalise first.<br>- **Source:** Damage class inputs<br>**Owner:** Property operations<br>**System Of Record:** Listing (MLS) feed and CRM<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: rare classes have few examples, so check per class.<br>- **Source:** Age of fixture inputs<br>**Owner:** Geospatial team<br>**System Of Record:** Building management system (BMS) and IoT hub<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: records are incomplete, so use building age as a fallback.<br>- **Source:** Repair cost table inputs<br>**Owner:** Portfolio data team<br>**System Of Record:** Property and portfolio management system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: rates vary by contractor and season, so use a range.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Posed photos taken by a careful inspector are cleaner than tenants' own pictures<br>- Rare damage types give too few test cases to estimate recall
- **Privacy and deletion:** Tenant PII minimised and masked, MLS licence terms respected (no redistribution), fair-housing protected-class features excluded from models. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
