# Compressed Air Leak Detection: model card and data card

> Generated from the blueprint `manufacturing/compressed-air-leak-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Compressed Air Leak Detection · **Domain:** manufacturing · **Latency tier:** batch · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Periodic ultrasonic surveys by technicians, because it is the standard method and finds specific leaks.
- **Production model:** A baseline model on idle flow and zone submeters with a leak growth detector, repair priorities by energy cost and a work-order link for survey teams.
- **Intended use:** Detect compressed air leaks from flow, pressure and compressor data and prioritise repairs by energy cost so waste falls.
- **Out of scope:** - Meter name: an identifier.<br>- Operator name: irrelevant.<br>- Alarm text: vendor formatting.
- **Primary metrics:** - Leak estimate error on surveyed leaks<br>- Detection of seeded leaks<br>- Savings accuracy
- **Measured values (fill in):** ____________
- **Slices reported:** - Line, shift and plant<br>- Product variant and material lot<br>- Machine age, tooling and supplier batch<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - No idle window<br>- Process change<br>- Sensor drift
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new product variants, rare machines, first runs after a changeover and low-volume lots; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Return top reason codes (SHAP-based or monotone-constrained) with every decision | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Detect compressed air leaks from flow, pressure and compressor data and prioritise repairs by energy cost so waste falls.
- **Label:** For "Compressed Air Leak Detection": Detect compressed air leaks from flow, pressure and compressor data and prioritise repairs by energy cost so waste falls. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Total flow monitoring only.
- **Sources:** - **Source:** Idle-period flow inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from the production calendar.<br>- **Source:** Compressor load factor inputs<br>**Owner:** Quality engineering<br>**System Of Record:** ERP and production planning<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from the compressor.<br>- **Source:** Pressure decay rate inputs<br>**Owner:** Reliability and maintenance<br>**System Of Record:** CMMS or EAM maintenance system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from valves.<br>- **Source:** Zone flow trends inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from submeters.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Total flow monitoring only<br>- Counting leaks not cost<br>- Ignoring sensor drift
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
