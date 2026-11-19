# Plagiarism & AI-Generated Text Detection: model card and data card

> Generated from the blueprint `edtech/ai-text-and-plagiarism-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Plagiarism & AI-Generated Text Detection · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Text-matching software (Turnitin-style).
- **Production model:** Source matching with calibrated style-shift and process signals, presented as evidence for human review rather than verdicts.
- **Intended use:** Detect copied and AI-generated submissions with calibrated confidence and evidence, minimising wrongful accusations.
- **Out of scope:** - Perplexity alone: unreliable.<br>- Text length: confound.
- **Primary metrics:** - Calibration and subgroup FPR<br>- Source recall
- **Measured values (fill in):** ____________
- **Slices reported:** - Age band, with minors analysed separately<br>- First-generation, language and accessibility groups<br>- Course, cohort and device<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate field confidence so the "needs review" threshold gives the target accuracy among auto-accepted fields.
- **Known failure modes:** - Non-native writers flagged at higher rates<br>- Paraphrasing tools evade matching
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
- **Purpose:** Detect copied and AI-generated submissions with calibrated confidence and evidence, minimising wrongful accusations.
- **Label:** For "Plagiarism & AI-Generated Text Detection": Detect copied and AI-generated submissions with calibrated confidence and evidence, minimising wrongful accusations. The reference kit's label belongs to a neighbouring problem and does not describe yours: The label is the class of the document, assigned by the person who handled it; documents in the same thread share a label. Define your own label exactly as in M1. Design around this trap first: Training on AI text from older models.
- **Sources:** - **Source:** Source overlap evidence inputs<br>**Owner:** Learning engineering<br>**System Of Record:** Learning management system (LMS)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: index coverage.<br>- **Source:** Revision-history pattern inputs<br>**Owner:** Registrar and data office<br>**System Of Record:** Student information system (SIS)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: consent.<br>- **Source:** Style shift vs student baseline inputs<br>**Owner:** Content team<br>**System Of Record:** Content and item bank<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: baseline.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Training on AI text from older models<br>- Ignoring subgroup effects
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
