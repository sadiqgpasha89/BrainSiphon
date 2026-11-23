# Visual Defect Inspection: model card and data card

> Generated from the blueprint `manufacturing/visual-defect-inspection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Visual Defect Inspection · **Domain:** manufacturing · **Latency tier:** sub-100ms · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A rule-based vision check with fixed thresholds on edges and area, because it is stable and shows what a learned model must beat.
- **Production model:** A detection and segmentation model on an edge GPU per line with calibrated per-class thresholds, an active-learning loop from operator corrections and a drift monitor on image statistics.
- **Intended use:** Detect surface and assembly defects on parts moving on a line from camera images, classify the defect type and reject or flag the part before it ships.
- **Out of scope:** - Operator name: not a defect cause.<br>- Image file timestamp alone: no link to the defect.<br>- Background clutter: an acquisition artefact.
- **Primary metrics:** - Recall at fixed false reject rate per defect class<br>- Escape rate on held-out lots<br>- Calibration by class
- **Measured values (fill in):** ____________
- **Slices reported:** - Line, shift and plant<br>- Product variant and material lot<br>- Machine age, tooling and supplier batch<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate detection scores per class and per condition so that a fixed threshold means the same precision across lines.
- **Known failure modes:** - Lighting change<br>- New product variant<br>- Rare defect
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new product variants, rare machines, first runs after a changeover and low-volume lots; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Detect surface and assembly defects on parts moving on a line from camera images, classify the defect type and reject or flag the part before it ships.
- **Label:** For "Visual Defect Inspection": Detect surface and assembly defects on parts moving on a line from camera images, classify the defect type and reject or flag the part before it ships. The reference kit's label: An image is positive when it contains the finding (a defect, a lesion, a tampered region). Labels are per image; images of the same item share a group. Design around this trap first: Training on operator rejects as truth.
- **Sources:** - **Source:** Defect probability map inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: calibrate per defect class.<br>- **Source:** Part pose and fixture state inputs<br>**Owner:** Quality engineering<br>**System Of Record:** ERP and production planning<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from the fixture sensors.<br>- **Source:** Lighting and lens drift indicators inputs<br>**Owner:** Reliability and maintenance<br>**System Of Record:** CMMS or EAM maintenance system<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: track per camera.<br>- **Source:** Upstream process context inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: join from MES by part id.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Training on operator rejects as truth<br>- One lot for all training<br>- Evaluating on random frames from the same lot
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
