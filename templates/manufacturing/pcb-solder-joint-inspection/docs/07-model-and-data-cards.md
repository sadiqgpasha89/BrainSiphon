# PCB Solder Joint Inspection: model card and data card

> Generated from the blueprint `manufacturing/pcb-solder-joint-inspection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** PCB Solder Joint Inspection · **Domain:** manufacturing · **Latency tier:** sub-100ms · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Golden-board comparison with fixed tolerances per joint, because it is the incumbent in many lines.
- **Production model:** A joint-level classifier on 2D and 3D features with per-package thresholds, linked paste and reflow signals for root cause, and a programme generator from the placement file.
- **Intended use:** Classify solder joints and component placement on circuit boards from 2D and 3D images so shorts, opens and tombstones are caught before test.
- **Out of scope:** - Board serial number: an identifier.<br>- Operator on shift: not a defect driver.<br>- Silkscreen colour: no link to quality.
- **Primary metrics:** - Recall and precision per defect class<br>- Escape rate against in-circuit test<br>- Programme setup time
- **Measured values (fill in):** ____________
- **Slices reported:** - Line, shift and plant<br>- Product variant and material lot<br>- Machine age, tooling and supplier batch<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate detection scores per class and per condition so that a fixed threshold means the same precision across lines.
- **Known failure modes:** - New package type<br>- Warped board<br>- Reel change
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

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
- **Purpose:** Classify solder joints and component placement on circuit boards from 2D and 3D images so shorts, opens and tombstones are caught before test.
- **Label:** For "PCB Solder Joint Inspection": Classify solder joints and component placement on circuit boards from 2D and 3D images so shorts, opens and tombstones are caught before test. The reference kit's label belongs to a neighbouring problem and does not describe yours: An image is positive when it contains the finding (a defect, a lesion, a tampered region). Labels are per image; images of the same item share a group. Define your own label exactly as in M1. Design around this trap first: Trusting machine rejects as labels.
- **Sources:** - **Source:** Joint shape and volume inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: needs calibrated height.<br>- **Source:** Component offset and rotation inputs<br>**Owner:** Quality engineering<br>**System Of Record:** ERP and production planning<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from the placement file.<br>- **Source:** Stencil and paste measurement inputs<br>**Owner:** Reliability and maintenance<br>**System Of Record:** CMMS or EAM maintenance system<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: join by board id.<br>- **Source:** Reflow profile summary inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from the oven log.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Trusting machine rejects as labels<br>- One golden board<br>- Ignoring upstream paste data
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
