# Work Order Failure Code Classification: model card and data card

> Generated from the blueprint `manufacturing/work-order-failure-code-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Work Order Failure Code Classification · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Keyword rules mapping common terms to codes, because reliability teams already use similar lists.
- **Production model:** A multilingual text classifier constrained by asset class, with confidence-based auto-suggest and an audit sample, plus a monthly code quality report.
- **Intended use:** Assign standard failure codes and causes to maintenance work orders from technician text so reliability analysis rests on consistent data.
- **Out of scope:** - Technician name: irrelevant.<br>- Text length: not the code.<br>- Priority level alone: weak link.
- **Primary metrics:** - Top-one and top-three accuracy by asset class<br>- Agreement with engineer review<br>- Calibration
- **Measured values (fill in):** ____________
- **Slices reported:** - Line, shift and plant<br>- Product variant and material lot<br>- Machine age, tooling and supplier batch<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate field confidence so the "needs review" threshold gives the target accuracy among auto-accepted fields.
- **Known failure modes:** - Slang and abbreviations<br>- Multiple failures in one order<br>- New equipment
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
- **Purpose:** Assign standard failure codes and causes to maintenance work orders from technician text so reliability analysis rests on consistent data.
- **Label:** For "Work Order Failure Code Classification": Assign standard failure codes and causes to maintenance work orders from technician text so reliability analysis rests on consistent data. The reference kit's label: The label is the class of the document, assigned by the person who handled it; documents in the same thread share a label. Design around this trap first: Training on hurried default picks.
- **Sources:** - **Source:** Component and symptom terms inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: maintain a synonym list.<br>- **Source:** Asset class inputs<br>**Owner:** Quality engineering<br>**System Of Record:** ERP and production planning<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from the CMMS.<br>- **Source:** Action verbs inputs<br>**Owner:** Reliability and maintenance<br>**System Of Record:** CMMS or EAM maintenance system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: parse the action text.<br>- **Source:** Previous codes on the asset inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: use as a weak hint.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Training on hurried default picks<br>- Auto-assigning without review<br>- Ignoring asset class
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
