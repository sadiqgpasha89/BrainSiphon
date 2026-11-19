# Insurance Agent Policy Document Assistant: model card and data card

> Generated from the blueprint `bfsi/agent-policy-document-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Insurance Agent Policy Document Assistant · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Search over PDFs and a helpdesk, because agents use them.
- **Production model:** Version-aware hybrid retrieval, clause-level answers with citations, verifier and abstention with handoff to underwriters.
- **Intended use:** Answer agents' and brokers' questions about product features, exclusions and underwriting rules from the insurer's current documents, with citations.
- **Out of scope:** - Brochure marketing text: Not binding and often differs from the policy wording.<br>- Agent name: Irrelevant to the answer.<br>- Question length: Weakly related to difficulty.
- **Primary metrics:** - Citation validity<br>- Escalation F1
- **Measured values (fill in):** ____________
- **Slices reported:** - Income band, age band and thin-file applicants<br>- Product, channel and region<br>- Protected classes under the applicable fair-lending or conduct rules<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the agent's "I am sure" signal against expert agreement so escalation thresholds mean what they say.
- **Known failure modes:** - Conflicting endorsements<br>- Out-of-scope request<br>- Injection in a document
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
- **Purpose:** Answer agents' and brokers' questions about product features, exclusions and underwriting rules from the insurer's current documents, with citations.
- **Label:** For "Insurance Agent Policy Document Assistant": Answer agents' and brokers' questions about product features, exclusions and underwriting rules from the insurer's current documents, with citations. The reference kit's label belongs to a neighbouring problem and does not describe yours: Every case carries a verdict and the evidence lines that decide it. An agent is correct only when its verdict matches, every claim cites a real line showing the indicator it describes, and it escalates when the deciding lines are unavailable. Define your own label exactly as in M1. Design around this trap first: Testing only on current documents hides failures on older versions agents still sell.
- **Sources:** - **Source:** Citation validity inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: A real clause can still not support the statement, so test entailment.<br>- **Source:** Version match inputs<br>**Owner:** Risk data office<br>**System Of Record:** General ledger and risk data warehouse<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: version metadata are often wrong.<br>- **Source:** Escalation precision inputs<br>**Owner:** Operations<br>**System Of Record:** Customer master and KYC repository<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: over-refusal makes the assistant unhelpful, so track both.<br>- **Source:** Retrieval recall inputs<br>**Owner:** Core banking IT<br>**System Of Record:** Core banking or policy administration system<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: gold sets are costly to build.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Testing only on current documents hides failures on older versions agents still sell<br>- Easy questions in the test set overstate performance on exclusions and endorsements
- **Privacy and deletion:** Purpose limitation across products, consent for bureau and alternative data, retention per regulation, and an explanation for adverse decisions. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
