# Pre-Launch Creative Performance Prediction: model card and data card

> Generated from the blueprint `adtech/pre-launch-creative-performance-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Pre-Launch Creative Performance Prediction · **Domain:** adtech · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Heuristic checklists (text ratio, logo size).
- **Production model:** Multimodal encoder with contextual ranking head trained on within-campaign pairs, and attribute explanations from interpretable heads.
- **Intended use:** Predict how well an image or video creative will perform before spending, so weak creatives are fixed or dropped.
- **Out of scope:** - File size: none.<br>- Upload timestamp: none.
- **Primary metrics:** - Pairwise ranking accuracy<br>- Spearman correlation with realised CTR
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate detection scores per class and per condition so that a fixed threshold means the same precision across lines.
- **Known failure modes:** - New visual trends shift performance drivers<br>- Context mismatch between train and use
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new campaigns, small publishers and rare device types; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Predict how well an image or video creative will perform before spending, so weak creatives are fixed or dropped.
- **Label:** For "Pre-Launch Creative Performance Prediction": Predict how well an image or video creative will perform before spending, so weak creatives are fixed or dropped. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Training data confounded by budget and targeting.
- **Sources:** - **Source:** Visual embedding inputs<br>**Owner:** Ad platform engineering<br>**System Of Record:** Campaign and budget ledger<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: domain tuning.<br>- **Source:** Attention heatmap inputs<br>**Owner:** Measurement science<br>**System Of Record:** Billing and invoicing<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: model.<br>- **Source:** Text-overlay legibility inputs<br>**Owner:** Privacy engineering<br>**System Of Record:** Identity graph and consent store (CMP)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: OCR.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Training data confounded by budget and targeting<br>- Absolute error reported instead of ranking quality
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
