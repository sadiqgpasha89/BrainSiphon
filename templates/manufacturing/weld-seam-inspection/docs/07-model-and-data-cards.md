# Weld Seam Inspection: model card and data card

> Generated from the blueprint `manufacturing/weld-seam-inspection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Weld Seam Inspection · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Tolerance bands on current and voltage per weld programme, because they are the standard controls and the benchmark.
- **Production model:** A multimodal model combining bead image features and process curves with a calibrated pass, rework or test-sample decision, plus a link to electrode wear counters.
- **Intended use:** Assess weld quality from seam images and process signals such as current and voltage, so weak welds are caught in line and rework is targeted.
- **Out of scope:** - Welder name: not a quality driver.<br>- Image resolution tweaks: an acquisition choice.<br>- Time of day alone: confounded with shift.
- **Primary metrics:** - Recall on destructive-test failures<br>- Escape rate by weld class<br>- Calibration of the pass decision
- **Measured values (fill in):** ____________
- **Slices reported:** - Line, shift and plant<br>- Product variant and material lot<br>- Machine age, tooling and supplier batch<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate detection scores per class and per condition so that a fixed threshold means the same precision across lines.
- **Known failure modes:** - Electrode wear<br>- Unusual coating<br>- Missing curve data
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

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
- **Purpose:** Assess weld quality from seam images and process signals such as current and voltage, so weak welds are caught in line and rework is targeted.
- **Label:** For "Weld Seam Inspection": Assess weld quality from seam images and process signals such as current and voltage, so weak welds are caught in line and rework is targeted. The reference kit's label belongs to a neighbouring problem and does not describe yours: An image is positive when it contains the finding (a defect, a lesion, a tampered region). Labels are per image; images of the same item share a group. Define your own label exactly as in M1. Design around this trap first: Using visual judgement as strength labels.
- **Sources:** - **Source:** Bead geometry score inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: camera calibration needed.<br>- **Source:** Current and voltage curve shape inputs<br>**Owner:** Quality engineering<br>**System Of Record:** ERP and production planning<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: align by weld phase.<br>- **Source:** Electrode wear count inputs<br>**Owner:** Reliability and maintenance<br>**System Of Record:** CMMS or EAM maintenance system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from the controller.<br>- **Source:** Material stack and coating inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from the order.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Using visual judgement as strength labels<br>- Ignoring wear<br>- Sampling only easy parts
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
