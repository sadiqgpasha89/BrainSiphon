# Joiner Mover Leaver Orchestration: model card and data card

> Generated from the blueprint `it-ops/joiner-mover-leaver-orchestration` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Joiner Mover Leaver Orchestration · **Domain:** it-ops · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Manual tickets raised by managers and processed by several teams, because it is the usual process.
- **Production model:** A workflow orchestrator that turns HR events into role-based tasks, executes low-risk steps, routes approvals for the rest and verifies completion with exceptions to owners.
- **Intended use:** Coordinate account, device and access changes when people join, move or leave, from HR events and policy, with approvals and verification so access matches the role at all times.
- **Out of scope:** - Employee name: personal data.<br>- Manager comments: personal data.<br>- Ticket wording: weak link.
- **Primary metrics:** - Entitlement delta accuracy<br>- Completion verification<br>- Time to revoke
- **Measured values (fill in):** ____________
- **Slices reported:** - Service tier, region and technology stack<br>- Ticket category and priority<br>- Site, device type and business unit<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the agent's "I am sure" signal against expert agreement so escalation thresholds mean what they say.
- **Known failure modes:** - Late HR data<br>- Dual role<br>- Device not returned
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
- **Purpose:** Coordinate account, device and access changes when people join, move or leave, from HR events and policy, with approvals and verification so access matches the role at all times.
- **Label:** For "Joiner Mover Leaver Orchestration": Coordinate account, device and access changes when people join, move or leave, from HR events and policy, with approvals and verification so access matches the role at all times. The reference kit's label belongs to a neighbouring problem and does not describe yours: Every case carries a verdict and the evidence lines that decide it. An agent is correct only when its verdict matches, every claim cites a real line showing the indicator it describes, and it escalates when the deciding lines are unavailable. Define your own label exactly as in M1. Design around this trap first: Manager emails as triggers.
- **Sources:** - **Source:** HR event type and date inputs<br>**Owner:** Infrastructure and operations<br>**System Of Record:** IT service management platform<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from HR system.<br>- **Source:** Role and department inputs<br>**Owner:** Service management<br>**System Of Record:** Configuration management database<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from HR and identity.<br>- **Source:** Current entitlements inputs<br>**Owner:** Security operations<br>**System Of Record:** Monitoring, logging and cloud billing platforms<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from identity systems.<br>- **Source:** Device and licence assignments inputs<br>**Owner:** Infrastructure and operations<br>**System Of Record:** IT service management platform<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from asset records.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Manager emails as triggers<br>- Assumed completion<br>- Copying access from peers
- **Privacy and deletion:** Employee device and activity data is aggregated to groups, collected only for service quality and security, never used to rank or discipline individuals, and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
