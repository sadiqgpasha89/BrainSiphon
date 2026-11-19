# Brand-Safety Content Classification: model card and data card

> Generated from the blueprint `adtech/brand-safety-content-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Brand-Safety Content Classification · **Domain:** adtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Keyword blocklists.
- **Production model:** Multimodal classifier with calibrated category scores, brand-specific thresholds and human review for appeals, cached at page/video level.
- **Intended use:** Detect unsafe or unsuitable content (violence, hate, adult, misinformation) near ads at page, video and stream level with fine-grained brand controls.
- **Out of scope:** - Ad slot position: none.<br>- Publisher size: none.
- **Primary metrics:** - Per-category precision and recall<br>- False block rate on news
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate detection scores per class and per condition so that a fixed threshold means the same precision across lines.
- **Known failure modes:** - News about sensitive events gets blocked broadly<br>- Adversarial text obfuscation by bad actors
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

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
- **Purpose:** Detect unsafe or unsuitable content (violence, hate, adult, misinformation) near ads at page, video and stream level with fine-grained brand controls.
- **Label:** For "Brand-Safety Content Classification": Detect unsafe or unsuitable content (violence, hate, adult, misinformation) near ads at page, video and stream level with fine-grained brand controls. The reference kit's label: The label is the class of the document, assigned by the person who handled it; documents in the same thread share a label. Design around this trap first: Training on keyword-labelled data.
- **Sources:** - **Source:** Category probabilities inputs<br>**Owner:** Ad platform engineering<br>**System Of Record:** Campaign and budget ledger<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: calibration.<br>- **Source:** Video-frame risk aggregation inputs<br>**Owner:** Measurement science<br>**System Of Record:** Billing and invoicing<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: sampling rate.<br>- **Source:** Page-level context inputs<br>**Owner:** Privacy engineering<br>**System Of Record:** Identity graph and consent store (CMP)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: cleaning.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Training on keyword-labelled data<br>- Test sets lacking news edge cases
- **Privacy and deletion:** Consent string checked before any user-level feature is read; sensitive categories excluded; aggregation and data minimisation for measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
