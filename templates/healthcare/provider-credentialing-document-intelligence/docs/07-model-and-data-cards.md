# Provider Credentialing Document Intelligence: model card and data card

> Generated from the blueprint `healthcare/provider-credentialing-document-intelligence` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Credentialing Document Intelligence · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Template-based OCR with regex field capture and a manual checklist.
- **Production model:** OCR and layout-aware extraction with document classification, field-level reconciliation against the provider master, deterministic completeness and consistency rules and a reviewer workbench with highlighted source regions.
- **Intended use:** Ingest provider applications and supporting evidence, classify each document, extract fields with page-level provenance, validate completeness and reconcile values across sources so credentialing staff review a ready evidence packet instead of raw paperwork.
- **Out of scope:** - Provider prestige or institution ranking: irrelevant to evidence completeness and a bias risk.<br>- Document layout aesthetics: rarely related to validity.<br>- Applicant nationality or name origin: protected and irrelevant.
- **Primary metrics:** - Field-level F1 and exact match by document type<br>- Calibration error of field confidence<br>- Missing-document detection recall
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate field confidence so the "needs review" threshold gives the target accuracy among auto-accepted fields.
- **Known failure modes:** - Low-quality scan<br>- Name change or transliteration<br>- Document in an unseen format<br>- Injected instruction in a document
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
- **Purpose:** Ingest provider applications and supporting evidence, classify each document, extract fields with page-level provenance, validate completeness and reconcile values across sources so credentialing staff review a ready evidence packet instead of raw paperwork.
- **Label:** For "Provider Credentialing Document Intelligence": Ingest provider applications and supporting evidence, classify each document, extract fields with page-level provenance, validate completeness and reconcile values across sources so credentialing staff review a ready evidence packet instead of raw paperwork. The reference kit's label belongs to a neighbouring problem and does not describe yours: The label is the class of the document, assigned by the person who handled it; documents in the same thread share a label. Define your own label exactly as in M1. Design around this trap first: Splitting train and test by page and not by provider.
- **Sources:** - **Source:** Field confidence inputs<br>**Owner:** Medical staff office<br>**System Of Record:** Credentialing and privileging system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: calibrate on held-out document groups.<br>- **Source:** Document-type completeness inputs<br>**Owner:** Credentialing verification organisation<br>**System Of Record:** Provider master data<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: requirements as of the application date.<br>- **Source:** Cross-source agreement inputs<br>**Owner:** Provider data governance<br>**System Of Record:** Primary-source verification services<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: compare against verification responses received before scoring.<br>- **Source:** Expiry window inputs<br>**Owner:** Privacy office<br>**System Of Record:** Document repository<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: use document dates not upload dates.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Splitting train and test by page and not by provider<br>- Scoring on clean scans only<br>- Counting extraction as verification
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
