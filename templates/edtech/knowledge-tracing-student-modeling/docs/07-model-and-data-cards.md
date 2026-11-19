# Knowledge Tracing & Student Modelling: model card and data card

> Generated from the blueprint `edtech/knowledge-tracing-student-modeling` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Knowledge Tracing & Student Modelling · **Domain:** edtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Bayesian Knowledge Tracing per skill with fitted guess and slip.
- **Production model:** Attentive knowledge tracing (SAKT/AKT) with IRT-style item embeddings and forgetting, distilled to a small online model with state cached per learner.
- **Intended use:** Estimate each learner's evolving mastery per skill from their answer history to drive practice selection and progress reports.
- **Out of scope:** - Use the student identifier as an embedding: it memorises individuals and fails for every new student, which is the main growth case.<br>- Use total questions answered or session length: both measure engagement and login timing, not knowledge.<br>- Split interactions randomly: a student's own future answers would sit in training and every metric would look better than it is.<br>- Compare accuracy across skills as if practice were random: the tutor assigns more practice to weak skills, so the comparison reflects the tutor's choices.
- **Primary metrics:** - AUC and RMSE on next-response prediction (student-split)<br>- Calibration by skill
- **Measured values (fill in):** ____________
- **Slices reported:** - Age band, with minors analysed separately<br>- First-generation, language and accessibility groups<br>- Course, cohort and device<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that each prediction interval covers its nominal share (80% interval covers 75 to 85% of actuals) overall, by horizon and by top segment; recalibrate with conformal adjustment when it does not.
- **Known failure modes:** - New curriculum remaps skills<br>- Shared device with multiple siblings<br>- Learner returns after a long break<br>- Guessing on multiple-choice questions
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

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
- **Purpose:** Estimate each learner's evolving mastery per skill from their answer history to drive practice selection and progress reports.
- **Label:** correct = 1 when the learner answers the question right at first attempt. The prediction target is the correctness of the next answer given everything the learner did before it; `true_p` exists only in synthetic data and is the ceiling for any model.
- **Sources:** - **Source:** Recent correctness with recency weighting inputs<br>**Owner:** Learning engineering<br>**System Of Record:** Learning management system (LMS)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: order by timestamp not insertion.<br>- **Source:** Item difficulty parameter inputs<br>**Owner:** Registrar and data office<br>**System Of Record:** Student information system (SIS)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: calibrate on other students.<br>- **Source:** Time-since-last-practice inputs<br>**Owner:** Content team<br>**System Of Record:** Assessment platform and item bank<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: use server-side timestamps because device clocks drift.<br>- **Source:** Prior failures on the skill inputs<br>**Owner:** Learning engineering<br>**System Of Record:** Curriculum and skill taxonomy<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: count only answers given before the current one.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Predicting next answers with student leakage<br>- Ignoring that practice choice depends on the model
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
