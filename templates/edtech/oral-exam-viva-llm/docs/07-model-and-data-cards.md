# Oral Exam & Viva Assessment with LLMs: model card and data card

> Generated from the blueprint `edtech/oral-exam-viva-llm` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Oral Exam & Viva Assessment with LLMs · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Instructors conduct oral exams individually.
- **Production model:** Voice dialogue agent with rubric-driven adaptive probing, accent-robust ASR, transcript-based scoring and instructor review.
- **Intended use:** Conduct structured oral assessments where an AI asks follow-up questions to probe understanding, with transcripts graded by rubric and reviewed by instructors.
- **Out of scope:** - Speaking speed: not understanding.<br>- Filler words: not understanding.
- **Primary metrics:** - Agreement with instructor scores<br>- Accent-group score parity
- **Measured values (fill in):** ____________
- **Slices reported:** - Age band, with minors analysed separately<br>- First-generation, language and accessibility groups<br>- Course, cohort and device<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the agent's "I am sure" signal against expert agreement so escalation thresholds mean what they say.
- **Known failure modes:** - ASR errors on technical terms<br>- Student attempts to manipulate the agent
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new learners, low-connectivity users and minority-language cohorts; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Cite retrieved sources and show tool calls for every answer | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Conduct structured oral assessments where an AI asks follow-up questions to probe understanding, with transcripts graded by rubric and reviewed by instructors.
- **Label:** For "Oral Exam & Viva Assessment with LLMs": Conduct structured oral assessments where an AI asks follow-up questions to probe understanding, with transcripts graded by rubric and reviewed by instructors. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Calibrated on a few instructors.
- **Sources:** - **Source:** Rubric criterion evidence inputs<br>**Owner:** Learning engineering<br>**System Of Record:** Learning management system (LMS)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: transcript quality.<br>- **Source:** Follow-up depth reached inputs<br>**Owner:** Registrar and data office<br>**System Of Record:** Student information system (SIS)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: dialogue.<br>- **Source:** ASR confidence inputs<br>**Owner:** Content team<br>**System Of Record:** Content and item bank<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: calibration.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Calibrated on a few instructors<br>- ASR errors ignored in evaluation
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
