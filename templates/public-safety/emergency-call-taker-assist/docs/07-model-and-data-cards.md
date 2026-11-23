# Emergency Call Taker Assist: model card and data card

> Generated from the blueprint `public-safety/emergency-call-taker-assist` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Emergency Call Taker Assist · **Domain:** public-safety · **Latency tier:** sub-100ms · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Call takers typing notes while following paper or screen protocols, because it is the current practice.
- **Production model:** A streaming transcription and extraction service with a suggested-question panel and field pre-fill that the call taker accepts or edits, with a full log for quality review.
- **Intended use:** Listen to emergency calls in real time and show call takers a structured list of what has been said and which questions remain, so critical details are captured faster while the call taker decides every action.
- **Out of scope:** - Caller name: personal data.<br>- Call length: weak link.<br>- Phone model: irrelevant.
- **Primary metrics:** - Entity extraction accuracy on labelled calls<br>- Latency<br>- Prompt usefulness in call taker reviews
- **Measured values (fill in):** ____________
- **Slices reported:** - Area and call type<br>- Language and accessibility need<br>- Incident severity and time of day<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the confidence that triggers abstention: among answers the system was 90% sure about, about 90% should be judged grounded and correct by humans.
- **Known failure modes:** - Heavy accent<br>- Caller panic<br>- ASR outage
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including rare incident types, small language communities, rural areas and major events; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Cite retrieved sources and show tool calls for every answer | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Listen to emergency calls in real time and show call takers a structured list of what has been said and which questions remain, so critical details are captured faster while the call taker decides every action.
- **Label:** For "Emergency Call Taker Assist": Listen to emergency calls in real time and show call takers a structured list of what has been said and which questions remain, so critical details are captured faster while the call taker decides every action. The reference kit's label belongs to a neighbouring problem and does not describe yours: Each golden question carries the expected value for the right version, or none when the documents never state it. A response is correct only when it gives that value or abstains on an unanswerable question. Define your own label exactly as in M1. Design around this trap first: Automatic priority setting.
- **Sources:** - **Source:** Incident type cues inputs<br>**Owner:** Emergency communications<br>**System Of Record:** Computer-aided dispatch (CAD)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: from speech and text.<br>- **Source:** Location mentions inputs<br>**Owner:** Operations and investigations leadership<br>**System Of Record:** Records management and evidence systems<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from the transcript.<br>- **Source:** Missing protocol questions inputs<br>**Owner:** Chief data and ethics officer<br>**System Of Record:** Court case management<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: from the protocol.<br>- **Source:** Distress and urgency cues inputs<br>**Owner:** Emergency communications<br>**System Of Record:** Computer-aided dispatch (CAD)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from audio and text.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Automatic priority setting<br>- Clean-audio testing<br>- Using transcripts as truth
- **Privacy and deletion:** No model produces a risk score for a named individual, no biometric identification is performed, retention is limited and every access to case data is logged for oversight. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
