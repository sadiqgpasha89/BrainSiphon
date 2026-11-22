# Regulatory Quality Measure Gap Detection: model card and data card

> Generated from the blueprint `healthcare/regulatory-quality-measure-gap-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Regulatory Quality Measure Gap Detection · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Manual spreadsheet cross-walk of requirements to policies.
- **Production model:** Hybrid retrieval over versioned requirement and evidence collections, a requirement-to-evidence knowledge graph, rule checks for required fields and dates and an LLM that explains gaps strictly from retrieved passages with citations and abstention.
- **Intended use:** Identify missing documentation, measure evidence, workflow steps and data fields needed to satisfy selected quality requirements, with a requirement-to-evidence map that cites its sources and rule versions.
- **Out of scope:** - Document length: not evidence quality.<br>- Author seniority: not evidence quality.<br>- Query phrasing: model sensitivity.
- **Primary metrics:** - Citation precision and unsupported-claim rate<br>- Gap recall against audited gaps<br>- Abstention accuracy on requirements with no evidence
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the confidence that triggers abstention: among answers the system was 90% sure about, about 90% should be judged grounded and correct by humans.
- **Known failure modes:** - Evidence exists in a scanned file<br>- Policy updated after evidence date<br>- Conflicting policies<br>- Prompt injection in a document
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
- **Purpose:** Identify missing documentation, measure evidence, workflow steps and data fields needed to satisfy selected quality requirements, with a requirement-to-evidence map that cites its sources and rule versions.
- **Label:** For "Regulatory Quality Measure Gap Detection": Identify missing documentation, measure evidence, workflow steps and data fields needed to satisfy selected quality requirements, with a requirement-to-evidence map that cites its sources and rule versions. The reference kit's label: Each golden question carries the expected value for the right version, or none when the documents never state it. A response is correct only when it gives that value or abstains on an unanswerable question. Design around this trap first: Scoring answers without checking citations.
- **Sources:** - **Source:** Evidence coverage inputs<br>**Owner:** Quality and accreditation<br>**System Of Record:** Quality and performance reporting system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: retrieved from approved sources.<br>- **Source:** Evidence freshness inputs<br>**Owner:** Compliance<br>**System Of Record:** Policy and document repository<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: document dates.<br>- **Source:** Citation precision inputs<br>**Owner:** Clinical informatics<br>**System Of Record:** Evidence repository<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: judged on a labelled set.<br>- **Source:** Owner responsiveness inputs<br>**Owner:** Policy owners<br>**System Of Record:** Measure specification library<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: past cycles only.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Scoring answers without checking citations<br>- Using latest requirements for an old period<br>- Asking the model whether a requirement is met
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
