# Public Safety Agent Action Guardrails: model card and data card

> Generated from the blueprint `public-safety/public-safety-agent-action-guardrails` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Public Safety Agent Action Guardrails · **Domain:** public-safety · **Latency tier:** seconds · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Duty supervisors review a sample of agent suggestions after major incidents, which leaves routine days unchecked.
- **Production model:** A dispatch gateway with action tiers and a suspension switch, a time-stamped decision record with replay, drift detection on proposals and a monthly oversight pack for command staff.
- **Intended use:** Bound what AI agents may do in dispatch, records and alerting systems for emergency services, keep a human decision on every consequential step and preserve a record that can stand up to review.
- **Out of scope:** - Unit callsign alone: an identifier.<br>- Call note length: not risk.<br>- Agent release number alone: needs outcome data.
- **Primary metrics:** - Tier coverage across incident types<br>- Block rate on seeded unsafe proposals<br>- Decision record completeness
- **Measured values (fill in):** ____________
- **Slices reported:** - Area and call type<br>- Language and accessibility need<br>- Incident severity and time of day<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the agent's "I am sure" signal against expert agreement so escalation thresholds mean what they say.
- **Known failure modes:** - Alert flood<br>- Automation bias<br>- New station added
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including rare incident types, small language communities, rural areas and major events; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Cite retrieved sources and show tool calls for every answer | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Bound what AI agents may do in dispatch, records and alerting systems for emergency services, keep a human decision on every consequential step and preserve a record that can stand up to review.
- **Label:** For "Public Safety Agent Action Guardrails": Bound what AI agents may do in dispatch, records and alerting systems for emergency services, keep a human decision on every consequential step and preserve a record that can stand up to review. The reference kit's label belongs to a neighbouring problem and does not describe yours: Every case carries a verdict and the evidence lines that decide it. An agent is correct only when its verdict matches, every claim cites a real line showing the indicator it describes, and it escalates when the deciding lines are unavailable. Define your own label exactly as in M1. Design around this trap first: Direct dispatch rights.
- **Sources:** - **Source:** Action tier of the proposal inputs<br>**Owner:** Emergency communications<br>**System Of Record:** Computer-aided dispatch (CAD)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: dispatch system.<br>- **Source:** Proposals per incident inputs<br>**Owner:** Operations and investigations leadership<br>**System Of Record:** Records management and evidence systems<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: dispatch log.<br>- **Source:** Dispatcher override rate inputs<br>**Owner:** Chief data and ethics officer<br>**System Of Record:** Court case management<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: decision records.<br>- **Source:** Response time after proposal inputs<br>**Owner:** Emergency communications<br>**System Of Record:** Computer-aided dispatch (CAD)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: dispatch timeline.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Direct dispatch rights<br>- Instruction-only limits<br>- Full access at new stations
- **Privacy and deletion:** No model produces a risk score for a named individual, no biometric identification is performed, retention is limited and every access to case data is logged for oversight. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
