# Shift Staffing & Skill Matching: model card and data card

> Generated from the blueprint `manufacturing/shift-staffing-skill-matching` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Shift Staffing & Skill Matching · **Domain:** manufacturing · **Latency tier:** batch · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A fixed roster by shift pattern with manual swaps, because it is the common approach.
- **Production model:** A forecast of labour hours with a roster optimiser that respects skills and labour rules, producing a draft for supervisors and a skill-gap report for training plans.
- **Intended use:** Forecast labour demand by line and skill and propose shift rosters that meet the plan within contract and labour rules, using aggregated data and no individual performance scoring.
- **Out of scope:** - Employee name: irrelevant and private.<br>- Age alone: irrelevant and risky.<br>- Badge swipe time: a monitoring artefact.
- **Primary metrics:** - Roster feasibility<br>- Forecast error in hours<br>- Skill coverage attainment
- **Measured values (fill in):** ____________
- **Slices reported:** - Line, shift and plant<br>- Product variant and material lot<br>- Machine age, tooling and supplier batch<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that each prediction interval covers its nominal share (80% interval covers 75 to 85% of actuals) overall, by horizon and by top segment; recalibrate with conformal adjustment when it does not.
- **Known failure modes:** - Sudden absences<br>- New line start-up<br>- Rule change
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
- **Purpose:** Forecast labour demand by line and skill and propose shift rosters that meet the plan within contract and labour rules, using aggregated data and no individual performance scoring.
- **Label:** For "Shift Staffing & Skill Matching": Forecast labour demand by line and skill and propose shift rosters that meet the plan within contract and labour rules, using aggregated data and no individual performance scoring. The reference kit's label belongs to a neighbouring problem and does not describe yours: A pair of records is positive when both belong to the same hidden true cluster. Clusters are formed by connected components over the pairs the model links. Define your own label exactly as in M1. Design around this trap first: Individual monitoring.
- **Sources:** - **Source:** Planned production hours by line inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from planning.<br>- **Source:** Skill coverage per station inputs<br>**Owner:** Quality engineering<br>**System Of Record:** ERP and production planning<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from training records.<br>- **Source:** Absence rate by group inputs<br>**Owner:** Reliability and maintenance<br>**System Of Record:** CMMS or EAM maintenance system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: aggregated only.<br>- **Source:** Overtime budget remaining inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from HR.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Individual monitoring<br>- Headcount-only plans<br>- Ignoring labour rules
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
