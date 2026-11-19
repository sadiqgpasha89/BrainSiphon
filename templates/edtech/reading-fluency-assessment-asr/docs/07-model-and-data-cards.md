# Reading Fluency Assessment for Children: model card and data card

> Generated from the blueprint `edtech/reading-fluency-assessment-asr` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Reading Fluency Assessment for Children · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Teacher stopwatch assessment.
- **Production model:** Child-tuned speech model with forced alignment to passage text, miscue classification and teacher dashboards.
- **Intended use:** Measure oral reading fluency (words correct per minute, accuracy) from child audio to identify struggling readers early.
- **Out of scope:** - Voice pitch: age effect.<br>- Background chatter: channel.
- **Primary metrics:** - WCPM correlation with teacher scores<br>- Miscue detection F1
- **Measured values (fill in):** ____________
- **Slices reported:** - Age band, with minors analysed separately<br>- First-generation, language and accessibility groups<br>- Course, cohort and device<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate field confidence so the "needs review" threshold gives the target accuracy among auto-accepted fields.
- **Known failure modes:** - Classroom noise from other students<br>- Dialect pronunciation counted as errors
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

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
- **Purpose:** Measure oral reading fluency (words correct per minute, accuracy) from child audio to identify struggling readers early.
- **Label:** For "Reading Fluency Assessment for Children": Measure oral reading fluency (words correct per minute, accuracy) from child audio to identify struggling readers early. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Adult speech used for evaluation.
- **Sources:** - **Source:** Words correct per minute inputs<br>**Owner:** Learning engineering<br>**System Of Record:** Learning management system (LMS)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: timing.<br>- **Source:** Miscue types inputs<br>**Owner:** Registrar and data office<br>**System Of Record:** Student information system (SIS)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: alignment.<br>- **Source:** Self-correction rate inputs<br>**Owner:** Content team<br>**System Of Record:** Content and item bank<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: detection.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Adult speech used for evaluation<br>- Single dialect test set
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
