# Patient Similarity & Cohort Search: model card and data card

> Generated from the blueprint `healthcare/patient-similarity-cohort-search` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Patient Similarity & Cohort Search · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** SQL cohort filters on diagnosis codes.
- **Production model:** Dual retrieval (structured embeddings plus note semantic search) with an LLM translating questions to validated cohort queries.
- **Intended use:** Let clinicians and researchers find similar patients and build cohorts from structured data and notes using natural-language queries.
- **Out of scope:** - Patient ID: none.<br>- Encounter count alone: utilisation bias.
- **Primary metrics:** - Cohort precision and recall vs manual chart review<br>- Retrieval NDCG
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate click and conversion probabilities (isotonic or Platt) per surface and position so the ranker's scores can be compared and combined with business value.
- **Known failure modes:** - Natural-language ambiguity<br>- Rare disease cohort re-identification risk
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
- **Purpose:** Let clinicians and researchers find similar patients and build cohorts from structured data and notes using natural-language queries.
- **Label:** For "Patient Similarity & Cohort Search": Let clinicians and researchers find similar patients and build cohorts from structured data and notes using natural-language queries. The reference kit's label belongs to a neighbouring problem and does not describe yours: There is no separate label: for each test session the prefix of clicks is the input and the final click is the target (leave-last-out). Sessions shorter than three clicks are skipped. Define your own label exactly as in M1. Design around this trap first: Gold cohorts from one disease.
- **Sources:** - **Source:** Longitudinal code embedding inputs<br>**Owner:** Clinical informatics<br>**System Of Record:** Electronic health record (EHR)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: time window.<br>- **Source:** Lab trajectory features inputs<br>**Owner:** Hospital data office<br>**System Of Record:** Laboratory, radiology and PACS systems<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: units normalised.<br>- **Source:** Note-derived phenotypes inputs<br>**Owner:** Integration team<br>**System Of Record:** Master patient index (MPI)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: negation handling.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Gold cohorts from one disease<br>- Embeddings trained on the same records used for test
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
