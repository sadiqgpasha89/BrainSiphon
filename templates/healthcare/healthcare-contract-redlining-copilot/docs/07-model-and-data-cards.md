# Healthcare Contract Redlining Copilot: model card and data card

> Generated from the blueprint `healthcare/healthcare-contract-redlining-copilot` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Contract Redlining Copilot · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Counsel edits clauses manually using a playbook document.
- **Production model:** Retrieval of the matching playbook clause and fallback ladder, an LLM that proposes minimal tracked changes with a rationale and citations, a structured-diff validator that blocks text not found in approved language and a counsel approval workflow.
- **Intended use:** Suggest changes to contract clauses against approved legal playbooks and explain the rationale, the negotiation trade-offs and the unresolved legal questions, so counsel can review proposed redlines faster.
- **Out of scope:** - Writing fluency: style.<br>- Model confidence phrases: not calibrated.<br>- Counterparty identity: not legal merit.
- **Primary metrics:** - Approved-language adherence of suggested text<br>- Counsel acceptance rate and edit distance after review<br>- Unsupported-legal-claim rate
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the agent's "I am sure" signal against expert agreement so escalation thresholds mean what they say.
- **Known failure modes:** - No playbook clause exists<br>- Cross-references between clauses<br>- Counterparty counter-redline<br>- Prompt injection in the draft
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
- **Purpose:** Suggest changes to contract clauses against approved legal playbooks and explain the rationale, the negotiation trade-offs and the unresolved legal questions, so counsel can review proposed redlines faster.
- **Label:** For "Healthcare Contract Redlining Copilot": Suggest changes to contract clauses against approved legal playbooks and explain the rationale, the negotiation trade-offs and the unresolved legal questions, so counsel can review proposed redlines faster. The reference kit's label belongs to a neighbouring problem and does not describe yours: Every case carries a verdict and the evidence lines that decide it. An agent is correct only when its verdict matches, every claim cites a real line showing the indicator it describes, and it escalates when the deciding lines are unavailable. Define your own label exactly as in M1. Design around this trap first: Measuring fluency not approval.
- **Sources:** - **Source:** Playbook match inputs<br>**Owner:** Legal<br>**System Of Record:** Contract management system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: playbook version.<br>- **Source:** Deviation severity inputs<br>**Owner:** Procurement<br>**System Of Record:** Clause playbook and fallback library<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: classifier calibration.<br>- **Source:** Acceptance history inputs<br>**Owner:** Compliance<br>**System Of Record:** Document editing system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: past approved redlines.<br>- **Source:** Diff size inputs<br>**Owner:** Legal<br>**System Of Record:** Approved redline history<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: computed from the diff.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Measuring fluency not approval<br>- Allowing invented clause text<br>- Skipping adversarial draft tests
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
