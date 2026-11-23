# Multilingual Call Interpretation Assist: model card and data card

> Generated from the blueprint `public-safety/multilingual-call-interpretation-assist` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Multilingual Call Interpretation Assist · **Domain:** public-safety · **Latency tier:** sub-100ms · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A telephone interpreter service connected to the call, because it is the current approach.
- **Production model:** A language identification and ASR pipeline that shows source text and a labelled translation hint with confidence, connects the interpreter immediately and logs both.
- **Intended use:** Provide live transcription and translation hints for calls in other languages while a human interpreter is connected, so key facts reach the call taker sooner.
- **Out of scope:** - Caller name: personal data.<br>- Carrier: irrelevant.<br>- Call length: weak link.
- **Primary metrics:** - Digit and address accuracy<br>- Translation hint quality<br>- Language identification accuracy
- **Measured values (fill in):** ____________
- **Slices reported:** - Area and call type<br>- Language and accessibility need<br>- Incident severity and time of day<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Dialect<br>- Code switching<br>- Rare language
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including rare incident types, small language communities, rural areas and major events; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Provide live transcription and translation hints for calls in other languages while a human interpreter is connected, so key facts reach the call taker sooner.
- **Label:** For "Multilingual Call Interpretation Assist": Provide live transcription and translation hints for calls in other languages while a human interpreter is connected, so key facts reach the call taker sooner. The reference kit's label: The label is the class of the document, assigned by the person who handled it; documents in the same thread share a label. Design around this trap first: Replacing interpreters.
- **Sources:** - **Source:** Language identification confidence inputs<br>**Owner:** Emergency communications<br>**System Of Record:** Computer-aided dispatch (CAD)<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: from the classifier.<br>- **Source:** Number and address confidence inputs<br>**Owner:** Operations and investigations leadership<br>**System Of Record:** Records management and evidence systems<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from the ASR.<br>- **Source:** Translation quality estimate inputs<br>**Owner:** Chief data and ethics officer<br>**System Of Record:** Court case management<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: from the quality model.<br>- **Source:** Interpreter availability inputs<br>**Owner:** Emergency communications<br>**System Of Record:** Computer-aided dispatch (CAD)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from the telephony system.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Replacing interpreters<br>- Studio-audio testing<br>- Unlabelled machine translation
- **Privacy and deletion:** No model produces a risk score for a named individual, no biometric identification is performed, retention is limited and every access to case data is logged for oversight. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
