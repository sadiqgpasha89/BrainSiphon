# IT Ops Agent Action Guardrails: model card and data card

> Generated from the blueprint `it-ops/it-ops-agent-action-guardrails` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** IT Ops Agent Action Guardrails · **Domain:** it-ops · **Latency tier:** seconds · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A senior engineer reads the agent command history each Friday, because tickets alone do not show what ran.
- **Production model:** An automation broker with change tiers, command rate limits and a stop button, a command log tied to tickets with replay, drift detection on agent behaviour and a weekly change review for service owners.
- **Intended use:** Gate and record every change AI operations agents make to servers, cloud accounts and ticket workflows so on-call engineers can trust automation without losing sight of what it did.
- **Out of scope:** - Host nickname: a label only.<br>- Ticket priority label alone: not impact.<br>- Agent version string: needs outcome data.
- **Primary metrics:** - Tier coverage across services<br>- Block rate on seeded risky commands<br>- Command log completeness
- **Measured values (fill in):** ____________
- **Slices reported:** - Service tier, region and technology stack<br>- Ticket category and priority<br>- Site, device type and business unit<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the agent's "I am sure" signal against expert agreement so escalation thresholds mean what they say.
- **Known failure modes:** - Playbook loop<br>- Approval fatigue<br>- New cloud account
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new services, rarely used systems, major incidents and remote or legacy sites; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Cite retrieved sources and show tool calls for every answer | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Gate and record every change AI operations agents make to servers, cloud accounts and ticket workflows so on-call engineers can trust automation without losing sight of what it did.
- **Label:** For "IT Ops Agent Action Guardrails": Gate and record every change AI operations agents make to servers, cloud accounts and ticket workflows so on-call engineers can trust automation without losing sight of what it did. The reference kit's label belongs to a neighbouring problem and does not describe yours: Every case carries a verdict and the evidence lines that decide it. An agent is correct only when its verdict matches, every claim cites a real line showing the indicator it describes, and it escalates when the deciding lines are unavailable. Define your own label exactly as in M1. Design around this trap first: Permanent administrator accounts.
- **Sources:** - **Source:** Change tier of requested command inputs<br>**Owner:** Infrastructure and operations<br>**System Of Record:** IT service management platform<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: configuration database.<br>- **Source:** Commands per ticket inputs<br>**Owner:** Service management<br>**System Of Record:** Configuration management database<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: broker log.<br>- **Source:** Rollback frequency after agent changes inputs<br>**Owner:** Security operations<br>**System Of Record:** Monitoring, logging and cloud billing platforms<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: change records.<br>- **Source:** Service health after change inputs<br>**Owner:** Infrastructure and operations<br>**System Of Record:** IT service management platform<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: monitoring stack.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Permanent administrator accounts<br>- Prompt-only change rules<br>- Changes allowed in untiered accounts
- **Privacy and deletion:** Employee device and activity data is aggregated to groups, collected only for service quality and security, never used to rank or discipline individuals, and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
