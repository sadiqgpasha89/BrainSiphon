# Ambient Clinical Scribe & Note Summarisation: model card and data card

> Generated from the blueprint `healthcare/clinical-note-summarization-ambient-scribe` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Ambient Clinical Scribe & Note Summarisation · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Clinician dictation and templates.
- **Production model:** Streaming medical ASR with diarisation, chunked summarisation with span grounding, structured EHR field extraction and review UI.
- **Intended use:** Transcribe clinic visits and draft SOAP notes and patient instructions for clinician review, returning hours to clinicians each week.
- **Out of scope:** - Small talk: not clinical.<br>- Note verbosity: burden.
- **Primary metrics:** - Unsupported-statement rate<br>- Medical entity F1
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the confidence that triggers abstention: among answers the system was 90% sure about, about 90% should be judged grounded and correct by humans.
- **Known failure modes:** - Multilingual visit with interpreter<br>- Patient declines recording midway
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including paediatric and elderly patients, renal failure, rare units and patients with missing devices; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Cite retrieved sources and show tool calls for every answer | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Transcribe clinic visits and draft SOAP notes and patient instructions for clinician review, returning hours to clinicians each week.
- **Label:** For "Ambient Clinical Scribe & Note Summarisation": Transcribe clinic visits and draft SOAP notes and patient instructions for clinician review, returning hours to clinicians each week. The reference kit's label belongs to a neighbouring problem and does not describe yours: Each golden question carries the expected value for the right version, or none when the documents never state it. A response is correct only when it gives that value or abstains on an unanswerable question. Define your own label exactly as in M1. Design around this trap first: Judging notes by fluency.
- **Sources:** - **Source:** Span-level support inputs<br>**Owner:** Clinical informatics<br>**System Of Record:** Electronic health record (EHR)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: alignment algorithm.<br>- **Source:** Medical entity accuracy inputs<br>**Owner:** Hospital data office<br>**System Of Record:** Laboratory, radiology and PACS systems<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: formulary dictionary.<br>- **Source:** Clinician edit ratio inputs<br>**Owner:** Integration team<br>**System Of Record:** Master patient index (MPI)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: excludes formatting edits.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Judging notes by fluency<br>- Test visits from a single specialty
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
