# Commercial Insurance Submission Intake & Risk Extraction: model card and data card

> Generated from the blueprint `bfsi/commercial-submission-intake-and-risk-extraction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Commercial Insurance Submission Intake & Risk Extraction · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Manual re-keying by underwriting assistants, because it is the current process.
- **Production model:** Document classification and extraction with schema, appetite triage, missing-info agent and underwriter confirmation.
- **Intended use:** Read broker submissions (emails, ACORD forms, spreadsheets, loss runs) and extract structured risk data so underwriters can quote faster.
- **Out of scope:** - Email signature: Cosmetic text that is not risk data.<br>- Broker font: Cosmetic and has no meaning for the risk.<br>- Attachment names: Unreliable as brokers name files in different ways.
- **Primary metrics:** - Field accuracy<br>- Triage precision
- **Measured values (fill in):** ____________
- **Slices reported:** - Income band, age band and thin-file applicants<br>- Product, channel and region<br>- Protected classes under the applicable fair-lending or conduct rules<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the agent's "I am sure" signal against expert agreement so escalation thresholds mean what they say.
- **Known failure modes:** - Scanned loss runs<br>- Multiple locations<br>- Conflicting values
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including thin-file borrowers, new-to-bank customers, small-balance accounts and rare product lines; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Cite retrieved sources and show tool calls for every answer | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Read broker submissions (emails, ACORD forms, spreadsheets, loss runs) and extract structured risk data so underwriters can quote faster.
- **Label:** For "Commercial Insurance Submission Intake & Risk Extraction": Read broker submissions (emails, ACORD forms, spreadsheets, loss runs) and extract structured risk data so underwriters can quote faster. The reference kit's label belongs to a neighbouring problem and does not describe yours: The label is the class of the document, assigned by the person who handled it; documents in the same thread share a label. Define your own label exactly as in M1. Design around this trap first: Clean test submissions are better formatted than live ones.
- **Sources:** - **Source:** Field confidence inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: calibrate per field type, as amounts and dates differ.<br>- **Source:** Appetite match inputs<br>**Owner:** Risk data office<br>**System Of Record:** General ledger and risk data warehouse<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: appetite rules change often, so version them.<br>- **Source:** Loss run totals inputs<br>**Owner:** Operations<br>**System Of Record:** Customer master and KYC repository<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: parsing errors change the total, so compare with the printed total.<br>- **Source:** Missing data count inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: the definition of required varies by class.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Clean test submissions are better formatted than live ones<br>- Broker overlap, since the same brokers appear in training and in test and the model learns their templates
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
