# Mortgage Underwriting Document Automation: model card and data card

> Generated from the blueprint `bfsi/mortgage-underwriting-document-automation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Mortgage Underwriting Document Automation · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Template-based OCR with regex validation and a manual queue for failures, because it is auditable and sets the cost floor.
- **Production model:** Layout-aware transformer for classification and extraction with calibrated field confidence, plus deterministic cross-document reconciliation rules and an underwriter exception queue.
- **Intended use:** Classify, extract and cross-check the documents in a mortgage file (payslips, bank statements, tax returns, ID, valuation) so underwriters review exceptions instead of retyping fields.
- **Out of scope:** - Page count of the pack: depends on the applicant's scanner and not on credit quality.<br>- File name: set by the broker and changes between submissions.<br>- Postcode of the applicant: proxy risk in a document task, adds nothing to extraction.
- **Primary metrics:** - Field-level exact match per field type<br>- Document classification macro-F1
- **Measured values (fill in):** ____________
- **Slices reported:** - Income band, age band and thin-file applicants<br>- Product, channel and region<br>- Protected classes under the applicable fair-lending or conduct rules<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate detection scores per class and per condition so that a fixed threshold means the same precision across lines.
- **Known failure modes:** - Phone photo of a payslip<br>- Multi-employer applicant<br>- Non-standard currency or date format
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including thin-file borrowers, new-to-bank customers, small-balance accounts and rare product lines; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Classify, extract and cross-check the documents in a mortgage file (payslips, bank statements, tax returns, ID, valuation) so underwriters review exceptions instead of retyping fields.
- **Label:** For "Mortgage Underwriting Document Automation": Classify, extract and cross-check the documents in a mortgage file (payslips, bank statements, tax returns, ID, valuation) so underwriters review exceptions instead of retyping fields. The reference kit's label belongs to a neighbouring problem and does not describe yours: The label is the class of the document, assigned by the person who handled it; documents in the same thread share a label. Define your own label exactly as in M1. Design around this trap first: Test files from the same broker as training inflate extraction accuracy.
- **Sources:** - **Source:** Net pay to statement credit match inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: matching window must use document dates, not upload dates.<br>- **Source:** Document tamper score inputs<br>**Owner:** Risk data office<br>**System Of Record:** General ledger and risk data warehouse<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: scanner and phone-camera files must not be scored against born-digital files.<br>- **Source:** Field confidence margin inputs<br>**Owner:** Operations<br>**System Of Record:** Customer master and KYC repository<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: margin must come from a calibrated model, not raw softmax.<br>- **Source:** Pay frequency consistency inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: year-to-date fields are absent on some payslips.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Test files from the same broker as training inflate extraction accuracy<br>- Synthetic payslips are cleaner than real phone photos
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
