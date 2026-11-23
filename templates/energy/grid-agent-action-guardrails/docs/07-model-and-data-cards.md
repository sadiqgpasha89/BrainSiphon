# Grid Agent Action Guardrails: model card and data card

> Generated from the blueprint `energy/grid-agent-action-guardrails` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Grid Agent Action Guardrails · **Domain:** energy · **Latency tier:** seconds · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Control room supervisors read the agent order list at shift change, which is the only record of what it proposed.
- **Production model:** A control-network gate with switching rules, rate limits and an isolation switch, a write-once order record with replay for regulators, drift detection on setpoint requests and a monthly reliability summary.
- **Intended use:** Constrain and record every action AI agents take around switching orders, outage tickets and SCADA setpoints so that operators stay in control of the grid and regulators can see what happened.
- **Out of scope:** - Substation nickname: a label only.<br>- Ticket text length: not risk.<br>- Agent build number alone: needs outcome data.
- **Primary metrics:** - Rule coverage across feeders<br>- Block rate on seeded unsafe orders<br>- Order record completeness
- **Measured values (fill in):** ____________
- **Slices reported:** - Feeder, region and voltage level<br>- Weather regime and season<br>- Asset age, vendor and customer segment<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the agent's "I am sure" signal against expert agreement so escalation thresholds mean what they say.
- **Known failure modes:** - Order storm<br>- Countersign haste<br>- Unmapped feeder
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including rare fault types, new feeder configurations, extreme weather events and newly connected distributed generation; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Cite retrieved sources and show tool calls for every answer | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Constrain and record every action AI agents take around switching orders, outage tickets and SCADA setpoints so that operators stay in control of the grid and regulators can see what happened.
- **Label:** For "Grid Agent Action Guardrails": Constrain and record every action AI agents take around switching orders, outage tickets and SCADA setpoints so that operators stay in control of the grid and regulators can see what happened. The reference kit's label belongs to a neighbouring problem and does not describe yours: Every case carries a verdict and the evidence lines that decide it. An agent is correct only when its verdict matches, every claim cites a real line showing the indicator it describes, and it escalates when the deciding lines are unavailable. Define your own label exactly as in M1. Design around this trap first: Agents with standing write rights.
- **Sources:** - **Source:** Switching order risk class inputs<br>**Owner:** Network operations<br>**System Of Record:** SCADA and ADMS (advanced distribution management)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: order metadata.<br>- **Source:** Setpoint change magnitude inputs<br>**Owner:** Asset management<br>**System Of Record:** Meter data management and billing (CIS)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: telemetry feed.<br>- **Source:** Operator rejection rate inputs<br>**Owner:** Retail and customer operations<br>**System Of Record:** Asset management and GIS<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: order log.<br>- **Source:** Post-switching telemetry inputs<br>**Owner:** Network operations<br>**System Of Record:** SCADA and ADMS (advanced distribution management)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: SCADA historian.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Agents with standing write rights<br>- Instruction-only restrictions<br>- Orders allowed on unmapped feeders
- **Privacy and deletion:** Half-hourly consumption can reveal household behaviour, so models use aggregated or minimised data, consent is recorded and individual-level inferences about occupancy are not produced. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
