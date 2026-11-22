# Healthcare Regulatory Change Impact Assessment: model card and data card

> Generated from the blueprint `healthcare/healthcare-regulatory-change-impact-assessment` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Healthcare Regulatory Change Impact Assessment · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A compliance lead builds an impact list in a spreadsheet after a meeting.
- **Production model:** Graph traversal over controls, policies, processes and facilities, retrieval for clause-level matching, and an LLM planner that drafts tasks through typed tools into a deterministic workflow with an approval gate.
- **Intended use:** Translate a confirmed regulatory change into the policies, controls, facilities, workflows, systems, owners, evidence and deadlines it affects, and draft a task plan with dependencies for the compliance owner to approve.
- **Out of scope:** - Change title wording: not impact.<br>- Owner seniority: not scope.<br>- Document formatting: layout.
- **Primary metrics:** - Impact recall and precision against expert-built impact maps<br>- Task-plan acceptance rate<br>- Deadline accuracy
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the agent's "I am sure" signal against expert agreement so escalation thresholds mean what they say.
- **Known failure modes:** - Stale knowledge graph<br>- Change affects only some facilities<br>- Conflicting owner records<br>- Injected instruction in a change record
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
- **Purpose:** Translate a confirmed regulatory change into the policies, controls, facilities, workflows, systems, owners, evidence and deadlines it affects, and draft a task plan with dependencies for the compliance owner to approve.
- **Label:** For "Healthcare Regulatory Change Impact Assessment": Translate a confirmed regulatory change into the policies, controls, facilities, workflows, systems, owners, evidence and deadlines it affects, and draft a task plan with dependencies for the compliance owner to approve. The reference kit's label belongs to a neighbouring problem and does not describe yours: Every case carries a verdict and the evidence lines that decide it. An agent is correct only when its verdict matches, every claim cites a real line showing the indicator it describes, and it escalates when the deciding lines are unavailable. Define your own label exactly as in M1. Design around this trap first: Auto-creating tasks without approval.
- **Sources:** - **Source:** Graph distance to the changed requirement inputs<br>**Owner:** Compliance<br>**System Of Record:** Compliance case system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: graph at assessment time.<br>- **Source:** Owner and facility scope inputs<br>**Owner:** Legal<br>**System Of Record:** Control and policy knowledge store<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: directory as at assessment.<br>- **Source:** Prior-change similarity inputs<br>**Owner:** Operations owners<br>**System Of Record:** Process inventory<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: closed change projects.<br>- **Source:** Dependency order inputs<br>**Owner:** Quality<br>**System Of Record:** Ownership directory<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: plan rules.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Auto-creating tasks without approval<br>- Letting the model compute dates<br>- Trusting an outdated graph
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
