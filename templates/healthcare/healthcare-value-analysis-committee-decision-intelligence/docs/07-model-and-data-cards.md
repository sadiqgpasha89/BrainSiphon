# Healthcare Value Analysis Committee Decision Intelligence: model card and data card

> Generated from the blueprint `healthcare/healthcare-value-analysis-committee-decision-intelligence` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Value Analysis Committee Decision Intelligence · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A coordinator assembles a packet from vendor dossiers and a literature search.
- **Production model:** Hybrid retrieval over approved evidence with an evidence-grading rubric, structured internal analytics, multi-criteria comparison and an LLM that drafts the packet strictly from retrieved passages with citations, labelling vendor material and stating gaps.
- **Intended use:** Prepare evidence-based review packets that compare products and services on clinical outcomes, safety, total cost, utilisation, implementation and alternatives, with source citations, uncertainty and conflict-of-interest disclosures.
- **Out of scope:** - Journal prestige alone: not study quality.<br>- Number of citations: popularity.<br>- Vendor presentation length: marketing.
- **Primary metrics:** - Citation precision and unsupported-claim rate<br>- Evidence-grade agreement with expert reviewers<br>- Gap-detection recall
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the confidence that triggers abstention: among answers the system was 90% sure about, about 90% should be judged grounded and correct by humans.
- **Known failure modes:** - Evidence is mostly vendor-supplied<br>- Conflicting studies<br>- New safety notice<br>- Injected instruction in a dossier
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
- **Purpose:** Prepare evidence-based review packets that compare products and services on clinical outcomes, safety, total cost, utilisation, implementation and alternatives, with source citations, uncertainty and conflict-of-interest disclosures.
- **Label:** For "Healthcare Value Analysis Committee Decision Intelligence": Prepare evidence-based review packets that compare products and services on clinical outcomes, safety, total cost, utilisation, implementation and alternatives, with source citations, uncertainty and conflict-of-interest disclosures. The reference kit's label: Each golden question carries the expected value for the right version, or none when the documents never state it. A response is correct only when it gives that value or abstains on an unanswerable question. Design around this trap first: Judging fluency over citations.
- **Sources:** - **Source:** Evidence grade inputs<br>**Owner:** Clinical value analysis<br>**System Of Record:** Value analysis request system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: grading scheme version.<br>- **Source:** Internal utilisation and cost inputs<br>**Owner:** Supply chain<br>**System Of Record:** Evidence and literature repository<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: period as stated.<br>- **Source:** Citation coverage inputs<br>**Owner:** Clinical leadership<br>**System Of Record:** Procurement and spend system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: checked against retrieved text.<br>- **Source:** Conflict flags inputs<br>**Owner:** Compliance<br>**System Of Record:** Clinical outcomes and utilisation data<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: disclosure data.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Judging fluency over citations<br>- Mixing vendor and independent evidence<br>- Letting the system recommend a decision
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
