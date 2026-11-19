# SOC Investigation Copilot: model card and data card

> Generated from the blueprint `cybersecurity/soc-copilot-llm-investigation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** SOC Investigation Copilot · **Domain:** cybersecurity · **Latency tier:** seconds · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** SOAR playbooks with static enrichment steps.
- **Production model:** Planner–executor agent over typed security tools with evidence verification, step budgets and approval gates for containment actions.
- **Intended use:** Accelerate investigations by letting an agent gather evidence from SIEM, EDR and identity tools and propose verdicts with cited queries.
- **Out of scope:** - Count how many tools a case used or reward longer narratives: both reward activity rather than a correct, well-supported verdict.<br>- Trust the model's confidence wording: it is uncalibrated, and calibrated escalation comes from the verifier and the evidence rules.<br>- Give the agent free-form shell access: it turns any successful injection into damage.<br>- Judge on analyst satisfaction or showcase cases: they hide wrong verdicts that happened to sound convincing.
- **Primary metrics:** - Verdict accuracy on replayed cases<br>- Evidence link validity
- **Measured values (fill in):** ____________
- **Slices reported:** - Customer or user segment, tenure and new versus existing<br>- Geography, channel and device<br>- Protected-class proxies where lawful analysis is permitted<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the agent's "I am sure" signal against expert agreement so escalation thresholds mean what they say.
- **Known failure modes:** - Attacker plants instructions in log fields or file names<br>- Tool returns huge result sets<br>- Log backend outage hides the deciding evidence<br>- Paraphrased injection that evades pattern matching
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new tenants, rare log sources and low-volume languages; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Cite retrieved sources and show tool calls for every answer | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Accelerate investigations by letting an agent gather evidence from SIEM, EDR and identity tools and propose verdicts with cited queries.
- **Label:** Every case carries truth (malicious or benign) and evidence_ids: the log lines a careful analyst would cite. An agent is correct only when its verdict matches the truth, every claim cites an existing line that shows the indicator it describes, and it escalates rather than decides when the deciding lines are unavailable.
- **Sources:** - **Source:** Evidence link rate inputs<br>**Owner:** Detection engineering<br>**System Of Record:** SIEM and security data lake<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: check that each link points at a line that really contains the indicator.<br>- **Source:** Query success and retry count inputs<br>**Owner:** Security data platform<br>**System Of Record:** Asset inventory (CMDB) and identity directory<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: log every call, failure and retry with the case id.<br>- **Source:** Verdict agreement with senior analysts inputs<br>**Owner:** Identity and access team<br>**System Of Record:** Case and ticketing system (SOAR)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: reviewers must not see the agent's verdict before deciding.<br>- **Source:** Injection success rate inputs<br>**Owner:** Detection engineering<br>**System Of Record:** SIEM and security data lake<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: build the attack set from real log fields and file names, and keep it out of tuning.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Replay set includes cases used for prompt tuning<br>- Judging by analyst satisfaction not correctness
- **Privacy and deletion:** Employee-monitoring law and works-council rules, field-level masking in analyst views, retention by incident class. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
