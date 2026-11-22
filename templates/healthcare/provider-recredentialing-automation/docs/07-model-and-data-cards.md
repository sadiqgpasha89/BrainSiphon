# Provider Recredentialing Automation: model card and data card

> Generated from the blueprint `healthcare/provider-recredentialing-automation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Recredentialing Automation · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Manual recredentialing with a spreadsheet tracker and email reminders.
- **Production model:** A deterministic case state machine with an LLM agent that retrieves evidence, drafts reminders and the committee summary through typed tools, verifies citations, routes exceptions and stops at every approval gate.
- **Intended use:** Orchestrate periodic recredentialing cycles, evidence collection, verification, exception routing and committee packet preparation with a deterministic case state machine and human sign-off for every adverse finding.
- **Out of scope:** - Provider reputation: irrelevant to evidence.<br>- Model confidence phrases: not a calibrated signal.<br>- Message tone: style not substance.
- **Primary metrics:** - Citation faithfulness and unsupported-claim rate<br>- Task success on replayed cases<br>- Unauthorised tool-call attempts blocked
- **Measured values (fill in):** ____________
- **Slices reported:** - Age, sex, ethnicity and language<br>- Site and device (case mix, equipment differences)<br>- Comorbidity and acuity bands, including the sickest decile<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the agent's "I am sure" signal against expert agreement so escalation thresholds mean what they say.
- **Known failure modes:** - Conflicting evidence<br>- Verification service timeout<br>- Prompt injection in an uploaded file<br>- Provider disputes a finding
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
- **Purpose:** Orchestrate periodic recredentialing cycles, evidence collection, verification, exception routing and committee packet preparation with a deterministic case state machine and human sign-off for every adverse finding.
- **Label:** For "Provider Recredentialing Automation": Orchestrate periodic recredentialing cycles, evidence collection, verification, exception routing and committee packet preparation with a deterministic case state machine and human sign-off for every adverse finding. The reference kit's label belongs to a neighbouring problem and does not describe yours: Every case carries a verdict and the evidence lines that decide it. An agent is correct only when its verdict matches, every claim cites a real line showing the indicator it describes, and it escalates when the deciding lines are unavailable. Define your own label exactly as in M1. Design around this trap first: Letting the agent finalise a case.
- **Sources:** - **Source:** Evidence completeness inputs<br>**Owner:** Medical staff office<br>**System Of Record:** Credentialing and privileging system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: checklist version as of the due date.<br>- **Source:** Exception severity inputs<br>**Owner:** Credentialing operations<br>**System Of Record:** Provider master data<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: rule output not the model's opinion.<br>- **Source:** Citation coverage inputs<br>**Owner:** Compliance<br>**System Of Record:** Document repository<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: check against retrieved sources.<br>- **Source:** Time to due date inputs<br>**Owner:** Privileging committee<br>**System Of Record:** Committee and meeting management<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: calendar.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Letting the agent finalise a case<br>- Judging fluent summaries without citation checks<br>- Skipping replay of adversarial documents
- **Privacy and deletion:** Minimum-necessary access, de-identification and re-identification-risk review before training, purpose and consent tracking, jurisdiction-pinned storage. Deletion requests propagate by key to feature stores, embeddings and caches; records under statutory retention are sealed rather than deleted, and the exception is recorded.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
