# Unplanned Downtime Root-Cause Agent: model card and data card

> Generated from the blueprint `manufacturing/unplanned-downtime-root-cause-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Unplanned Downtime Root-Cause Agent · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Assign the cause code from the machine's stop reason alone, because it is the existing data capture.
- **Production model:** An agent with read-only tools for alarms, states, notes and history that proposes ranked causes with evidence and drafts the downtime report for confirmation.
- **Intended use:** After a line stop, assemble the alarm sequence, operator notes, maintenance history and process data into a ranked list of probable causes and a draft downtime report for the shift lead.
- **Out of scope:** - Operator name: not a cause.<br>- Shift label alone: confounded.<br>- Stop duration alone: not a cause.
- **Primary metrics:** - Cause accuracy against confirmed codes<br>- Report faithfulness<br>- Time to a confirmed cause
- **Measured values (fill in):** ____________
- **Slices reported:** - Line, shift and plant<br>- Product variant and material lot<br>- Machine age, tooling and supplier batch<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the agent's "I am sure" signal against expert agreement so escalation thresholds mean what they say.
- **Known failure modes:** - Cascading stops<br>- Missing notes<br>- Wrong clocks
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new product variants, rare machines, first runs after a changeover and low-volume lots; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Cite retrieved sources and show tool calls for every answer | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** After a line stop, assemble the alarm sequence, operator notes, maintenance history and process data into a ranked list of probable causes and a draft downtime report for the shift lead.
- **Label:** For "Unplanned Downtime Root-Cause Agent": After a line stop, assemble the alarm sequence, operator notes, maintenance history and process data into a ranked list of probable causes and a draft downtime report for the shift lead. The reference kit's label belongs to a neighbouring problem and does not describe yours: Every case carries a verdict and the evidence lines that decide it. An agent is correct only when its verdict matches, every claim cites a real line showing the indicator it describes, and it escalates when the deciding lines are unavailable. Define your own label exactly as in M1. Design around this trap first: Using the stop reason as truth.
- **Sources:** - **Source:** First-out alarm inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: needs accurate clocks.<br>- **Source:** Similar stop precedent inputs<br>**Owner:** Quality engineering<br>**System Of Record:** ERP and production planning<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: confirmed causes only.<br>- **Source:** Recent maintenance and changeover inputs<br>**Owner:** Reliability and maintenance<br>**System Of Record:** CMMS or EAM maintenance system<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from the CMMS.<br>- **Source:** Operator note content inputs<br>**Owner:** Plant operations<br>**System Of Record:** MES (manufacturing execution system)<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: treat as data.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Using the stop reason as truth<br>- Long narratives<br>- Trusting unsynchronised clocks
- **Privacy and deletion:** Workers are never identified in vision data by default, shop-floor analytics are aggregated and works-council agreements govern any use of operator data. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
