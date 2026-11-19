# Child-Safe Content Filtering: model card and data card

> Generated from the blueprint `edtech/child-safe-content-filtering` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Child-Safe Content Filtering · **Domain:** edtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Keyword blocklists and manual moderation.
- **Production model:** Multimodal classifiers with age-band thresholds, educational-context scoring and a safeguarding escalation pipeline with trained staff.
- **Intended use:** Filter text, images and chat in learning environments for age-inappropriate and unsafe content, with low over-blocking of educational material.
- **Out of scope:** - Message length: weak.<br>- Emoji count: weak.
- **Primary metrics:** - Per-category precision and recall<br>- Over-blocking rate on curriculum content
- **Measured values (fill in):** ____________
- **Slices reported:** - Age band, with minors analysed separately<br>- First-generation, language and accessibility groups<br>- Course, cohort and device<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate detection scores per class and per condition so that a fixed threshold means the same precision across lines.
- **Known failure modes:** - Medical biology textbook flagged<br>- Coded language among teens
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new learners, low-connectivity users and minority-language cohorts; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Filter text, images and chat in learning environments for age-inappropriate and unsafe content, with low over-blocking of educational material.
- **Label:** For "Child-Safe Content Filtering": Filter text, images and chat in learning environments for age-inappropriate and unsafe content, with low over-blocking of educational material. The reference kit's label: The label is the class of the document, assigned by the person who handled it; documents in the same thread share a label. Design around this trap first: Test data without educational content.
- **Sources:** - **Source:** Category scores by age band inputs<br>**Owner:** Learning engineering<br>**System Of Record:** Learning management system (LMS)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: policy definition.<br>- **Source:** Educational-context score inputs<br>**Owner:** Registrar and data office<br>**System Of Record:** Student information system (SIS)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: classifier.<br>- **Source:** Contact-risk signals inputs<br>**Owner:** Content team<br>**System Of Record:** Content and item bank<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: privacy.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Test data without educational content<br>- Ignoring age-band differences
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
