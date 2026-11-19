# Complaint Root-Cause Mining: model card and data card

> Generated from the blueprint `bfsi/complaint-root-cause-mining` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Complaint Root-Cause Mining · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Manual tagging and a monthly report, because it is the current process.
- **Production model:** A classifier for regulatory categories and a clustering pipeline with labelled root causes and emerging-issue alerts.
- **Intended use:** Classify complaints and cluster them by root cause so the bank fixes processes and meets regulatory complaint-handling duties.
- **Out of scope:** - Complaint length: Style of the customer and not the severity of the issue.<br>- Channel: A cohort effect that does not change the cause.<br>- Time of day: Has no link to the cause of a complaint.
- **Primary metrics:** - Category macro-F1<br>- Cluster purity
- **Measured values (fill in):** ____________
- **Slices reported:** - Income band, age band and thin-file applicants<br>- Product, channel and region<br>- Protected classes under the applicable fair-lending or conduct rules<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate field confidence so the "needs review" threshold gives the target accuracy among auto-accepted fields.
- **Known failure modes:** - Multi-issue complaint<br>- Product launch<br>- Language mix
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

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
- **Purpose:** Classify complaints and cluster them by root cause so the bank fixes processes and meets regulatory complaint-handling duties.
- **Label:** For "Complaint Root-Cause Mining": Classify complaints and cluster them by root cause so the bank fixes processes and meets regulatory complaint-handling duties. The reference kit's label: The label is the class of the document, assigned by the person who handled it; documents in the same thread share a label. Design around this trap first: Labels from stressed staff vary with workload, so the training set is noisy.
- **Sources:** - **Source:** Complaint embedding inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: language and writing style affect the clusters.<br>- **Source:** Product and process tags inputs<br>**Owner:** Risk data office<br>**System Of Record:** General ledger and risk data warehouse<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: tagging quality varies by team.<br>- **Source:** Repeat complainant inputs<br>**Owner:** Operations<br>**System Of Record:** Customer master and KYC repository<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: privacy rules limit the use.<br>- **Source:** Resolution outcome inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: outcomes come weeks later.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Labels from stressed staff vary with workload, so the training set is noisy<br>- Cluster drift as products and wording change, so last year's clusters no longer match
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
