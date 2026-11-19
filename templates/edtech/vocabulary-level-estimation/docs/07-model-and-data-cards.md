# Vocabulary Size & Level Estimation: model card and data card

> Generated from the blueprint `edtech/vocabulary-level-estimation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Vocabulary Size & Level Estimation · **Domain:** edtech · **Latency tier:** sub-100ms · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Standard vocabulary level tests (fixed words).
- **Production model:** Adaptive yes/no and meaning-recall tasks with a Bayesian word-knowledge model per learner, L1-aware priors and pseudo-word correction.
- **Intended use:** Estimate a learner's vocabulary size and unknown words quickly to select appropriate texts and drills.
- **Out of scope:** - Word length: weak.<br>- Part of speech: weak.
- **Primary metrics:** - Prediction of held-out word knowledge<br>- Correlation with proficiency tests
- **Measured values (fill in):** ____________
- **Slices reported:** - Age band, with minors analysed separately<br>- First-generation, language and accessibility groups<br>- Course, cohort and device<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Learners overclaim knowledge<br>- L1 with no data
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
- **Purpose:** Estimate a learner's vocabulary size and unknown words quickly to select appropriate texts and drills.
- **Label:** For "Vocabulary Size & Level Estimation": Estimate a learner's vocabulary size and unknown words quickly to select appropriate texts and drills. The reference kit's label belongs to a neighbouring problem and does not describe yours: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Define your own label exactly as in M1. Design around this trap first: Frequency bands only.
- **Sources:** - **Source:** Word frequency band inputs<br>**Owner:** Learning engineering<br>**System Of Record:** Learning management system (LMS)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: corpus.<br>- **Source:** Cognate indicator inputs<br>**Owner:** Registrar and data office<br>**System Of Record:** Student information system (SIS)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: dictionaries.<br>- **Source:** Response time inputs<br>**Owner:** Content team<br>**System Of Record:** Content and item bank<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: timing.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Frequency bands only<br>- No L1 variation
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
