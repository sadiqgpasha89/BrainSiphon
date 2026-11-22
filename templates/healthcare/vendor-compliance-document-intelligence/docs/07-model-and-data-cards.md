# Vendor Compliance Document Intelligence: model card and data card

> Generated from the blueprint `healthcare/vendor-compliance-document-intelligence` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Vendor Compliance Document Intelligence · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Manual keying from PDFs into the vendor system.
- **Production model:** Layout-aware OCR and extraction with document classification and calibrated field confidences, a rules engine for requirement coverage and expiry, reconciliation to the vendor master and a reviewer workbench with highlighted source regions.
- **Intended use:** Extract and validate insurance, licences, certificates, training records, attestations and contract-linked evidence from vendor documents, with provenance, expiry alerts and a discrepancy queue for reviewers.
- **Out of scope:** - Logo and letterhead: layout style.<br>- Document file name: not content.<br>- Page count: not validity.
- **Primary metrics:** - Field-level F1 and exact match by document type<br>- Calibration of field confidence<br>- Requirement-coverage accuracy on audited files
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate field confidence so the "needs review" threshold gives the target accuracy among auto-accepted fields.
- **Known failure modes:** - Certificate lists several insured parties<br>- Scan is rotated or skewed<br>- Expiry stated in a non-standard way<br>- Document contains injected instructions
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
- **Purpose:** Extract and validate insurance, licences, certificates, training records, attestations and contract-linked evidence from vendor documents, with provenance, expiry alerts and a discrepancy queue for reviewers.
- **Label:** For "Vendor Compliance Document Intelligence": Extract and validate insurance, licences, certificates, training records, attestations and contract-linked evidence from vendor documents, with provenance, expiry alerts and a discrepancy queue for reviewers. The reference kit's label belongs to a neighbouring problem and does not describe yours: The label is the class of the document, assigned by the person who handled it; documents in the same thread share a label. Define your own label exactly as in M1. Design around this trap first: Splitting by page not by vendor.
- **Sources:** - **Source:** Field confidence inputs<br>**Owner:** Vendor management<br>**System Of Record:** Vendor credentialing and access management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: held-out document groups.<br>- **Source:** Coverage versus requirement inputs<br>**Owner:** Compliance<br>**System Of Record:** Vendor master data<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: requirement catalogue version.<br>- **Source:** Named-entity agreement inputs<br>**Owner:** Risk management<br>**System Of Record:** Contract repository<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: master as at scoring.<br>- **Source:** Expiry proximity inputs<br>**Owner:** Procurement<br>**System Of Record:** Document repository<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: document dates.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Splitting by page not by vendor<br>- Evaluating on clean PDFs only<br>- Counting extraction as verification
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
