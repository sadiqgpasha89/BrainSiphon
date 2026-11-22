# Healthcare Contract Clause Risk Classification: model card and data card

> Generated from the blueprint `healthcare/healthcare-contract-clause-risk-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Contract Clause Risk Classification · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A keyword search for liability and indemnity clauses.
- **Production model:** Document parsing into clauses, a fine-tuned transformer classifier and a retrieval comparison against playbook language, combined with deterministic checks on extracted values such as caps and notice periods, and a ranked reviewer queue.
- **Intended use:** Identify clauses that deviate from approved playbooks or create legal, financial, privacy, security, operational or clinical-continuity risk, and rank them for counsel review with source spans and the deviation from the fallback language.
- **Out of scope:** - Contract length: not risk.<br>- Counterparty brand: not clause risk.<br>- Formatting and numbering style: layout.
- **Primary metrics:** - Macro-F1 by clause type and risk type<br>- Deviation-detection recall at the reviewer capacity<br>- Span-level agreement with counsel
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate field confidence so the "needs review" threshold gives the target accuracy among auto-accepted fields.
- **Known failure modes:** - Scanned contract with poor text<br>- Amended clause<br>- Unusual jurisdiction<br>- Rare clause type
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
- **Purpose:** Identify clauses that deviate from approved playbooks or create legal, financial, privacy, security, operational or clinical-continuity risk, and rank them for counsel review with source spans and the deviation from the fallback language.
- **Label:** For "Healthcare Contract Clause Risk Classification": Identify clauses that deviate from approved playbooks or create legal, financial, privacy, security, operational or clinical-continuity risk, and rank them for counsel review with source spans and the deviation from the fallback language. The reference kit's label belongs to a neighbouring problem and does not describe yours: The label is the class of the document, assigned by the person who handled it; documents in the same thread share a label. Define your own label exactly as in M1. Design around this trap first: Splitting by clause not by contract.
- **Sources:** - **Source:** Playbook deviation score inputs<br>**Owner:** Legal<br>**System Of Record:** Contract management system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: playbook version.<br>- **Source:** Clause type and obligation direction inputs<br>**Owner:** Procurement<br>**System Of Record:** Clause library and legal playbook<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: parsed text.<br>- **Source:** Liability and indemnity terms inputs<br>**Owner:** Privacy and security<br>**System Of Record:** Document repository<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: extracted with provenance.<br>- **Source:** Data-handling terms inputs<br>**Owner:** Compliance<br>**System Of Record:** Contract metadata<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: extracted with provenance.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Splitting by clause not by contract<br>- Training on negotiated final text only<br>- Treating the model as legal advice
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
