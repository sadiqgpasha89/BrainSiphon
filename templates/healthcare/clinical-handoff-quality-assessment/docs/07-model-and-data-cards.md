# Clinical Handoff Quality Assessment: model card and data card

> Generated from the blueprint `healthcare/clinical-handoff-quality-assessment` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Clinical Handoff Quality Assessment · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A supervisor reads a sample of handoff notes against the checklist.
- **Production model:** An NLP and LLM extractor that fills checklist fields with cited source text, a deterministic validator against the approved checklist and structured observations, and a reviewer panel that shows missing fields and contradictions.
- **Intended use:** Check whether handoff records contain the structured elements an approved checklist requires and are internally consistent, and give the reviewer a completeness checklist with missing-field flags, contradictions and exact source text.
- **Out of scope:** - Note length: not quality.<br>- Author writing style: not completeness.<br>- Time of entry: process artefact.
- **Primary metrics:** - Field-level F1 with quote accuracy<br>- Missing-element recall on audited handoffs<br>- False contradiction rate
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate field confidence so the "needs review" threshold gives the target accuracy among auto-accepted fields.
- **Known failure modes:** - Abbreviation-heavy note<br>- Unit-specific checklist<br>- Structured data is stale<br>- Injected instruction in a note
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including paediatric and elderly patients, renal failure, rare units and patients with missing devices; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Check whether handoff records contain the structured elements an approved checklist requires and are internally consistent, and give the reviewer a completeness checklist with missing-field flags, contradictions and exact source text.
- **Label:** For "Clinical Handoff Quality Assessment": Check whether handoff records contain the structured elements an approved checklist requires and are internally consistent, and give the reviewer a completeness checklist with missing-field flags, contradictions and exact source text. The reference kit's label belongs to a neighbouring problem and does not describe yours: The label is the class of the document, assigned by the person who handled it; documents in the same thread share a label. Define your own label exactly as in M1. Design around this trap first: Letting the model grade quality.
- **Sources:** - **Source:** Element presence inputs<br>**Owner:** Clinical operations<br>**System Of Record:** Electronic health record handoff tool<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: extracted fields.<br>- **Source:** Structured-versus-narrative consistency inputs<br>**Owner:** Nursing leadership<br>**System Of Record:** Approved handoff checklist<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: record snapshot.<br>- **Source:** Extraction confidence inputs<br>**Owner:** Clinical informatics<br>**System Of Record:** Structured observation records<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: held-out notes.<br>- **Source:** Handoff context inputs<br>**Owner:** Patient safety<br>**System Of Record:** Workflow context<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: workflow records.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Letting the model grade quality<br>- Flagging without quotes<br>- Writing into the record
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
