# Socratic AI Tutor: model card and data card

> Generated from the blueprint `edtech/ai-tutor-socratic` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Socratic AI Tutor · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Fixed hint sequences per problem.
- **Production model:** Tutor LLM with pedagogical policy, KT-informed adaptivity, calculator and verifier tools, safety filters and teacher dashboards.
- **Intended use:** Provide a tutor that guides learners with questions and scaffolding aligned to curriculum, rather than handing over answers.
- **Out of scope:** - Chat length: not learning.<br>- Student sentiment alone: not learning.
- **Primary metrics:** - Pedagogical quality rubric scores<br>- Answer-leak rate
- **Measured values (fill in):** ____________
- **Slices reported:** - Age band, with minors analysed separately<br>- First-generation, language and accessibility groups<br>- Course, cohort and device<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the confidence that triggers abstention: among answers the system was 90% sure about, about 90% should be judged grounded and correct by humans.
- **Known failure modes:** - Student pastes homework to get the answer<br>- Safety issues disclosed in chat (distress)
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

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
- **Purpose:** Provide a tutor that guides learners with questions and scaffolding aligned to curriculum, rather than handing over answers.
- **Label:** For "Socratic AI Tutor": Provide a tutor that guides learners with questions and scaffolding aligned to curriculum, rather than handing over answers. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Judging tutor on helpfulness ratings.
- **Sources:** - **Source:** Student mastery estimate inputs<br>**Owner:** Learning engineering<br>**System Of Record:** Learning management system (LMS)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: calibration.<br>- **Source:** Hint-ladder state inputs<br>**Owner:** Registrar and data office<br>**System Of Record:** Student information system (SIS)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: dialogue state.<br>- **Source:** Answer-leak rate inputs<br>**Owner:** Content team<br>**System Of Record:** Content and item bank<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: check.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Judging tutor on helpfulness ratings<br>- Evaluating without learning outcomes
- **Privacy and deletion:** Child-privacy law (COPPA, FERPA, GDPR-K), parental consent, no cross-institution profiling, retention aligned to enrolment. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
