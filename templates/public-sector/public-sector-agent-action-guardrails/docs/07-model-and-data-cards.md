# Public Sector Agent Action Guardrails: model card and data card

> Generated from the blueprint `public-sector/public-sector-agent-action-guardrails` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Public Sector Agent Action Guardrails · **Domain:** public-sector · **Latency tier:** seconds · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Team managers read a random sample of agent drafts each month, which misses most decisions.
- **Production model:** A rules gateway with decision tiers and a suspension switch, a decision trail with the signing caseworker, drift detection on drafts and a quarterly ombudsman pack for oversight leads.
- **Intended use:** Limit and record what AI agents do inside benefit systems, citizen records and payment runs so that every decision affecting a resident has a named human owner and a record an ombudsman can review.
- **Out of scope:** - Resident reference alone: an identifier.<br>- Letter length: not risk.<br>- Agent version string: needs outcome data.
- **Primary metrics:** - Tier coverage across schemes<br>- Block rate on seeded wrong decisions<br>- Decision trail completeness
- **Measured values (fill in):** ____________
- **Slices reported:** - Region and service channel<br>- Language and accessibility needs<br>- Case type and programme rule version<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the agent's "I am sure" signal against expert agreement so escalation thresholds mean what they say.
- **Known failure modes:** - Mass draft run<br>- Sign-off by routine<br>- New benefit scheme
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including people with complex or unusual circumstances, small language communities, rural areas and new programme rules; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Cite retrieved sources and show tool calls for every answer | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Limit and record what AI agents do inside benefit systems, citizen records and payment runs so that every decision affecting a resident has a named human owner and a record an ombudsman can review.
- **Label:** For "Public Sector Agent Action Guardrails": Limit and record what AI agents do inside benefit systems, citizen records and payment runs so that every decision affecting a resident has a named human owner and a record an ombudsman can review. The reference kit's label belongs to a neighbouring problem and does not describe yours: Every case carries a verdict and the evidence lines that decide it. An agent is correct only when its verdict matches, every claim cites a real line showing the indicator it describes, and it escalates when the deciding lines are unavailable. Define your own label exactly as in M1. Design around this trap first: Direct edit rights across case systems.
- **Sources:** - **Source:** Decision tier of the draft inputs<br>**Owner:** Digital service delivery<br>**System Of Record:** Case management and CRM<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: case system.<br>- **Source:** Drafts per caseworker per day inputs<br>**Owner:** Programme and policy owners<br>**System Of Record:** Tax, benefits and licensing systems<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: workflow log.<br>- **Source:** Caseworker change rate inputs<br>**Owner:** City operations<br>**System Of Record:** GIS and asset management<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: decision trail.<br>- **Source:** Appeal rate after release inputs<br>**Owner:** Digital service delivery<br>**System Of Record:** Case management and CRM<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: appeals system.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Direct edit rights across case systems<br>- Instruction-only limits<br>- Release allowed on new schemes
- **Privacy and deletion:** Purpose limitation applies to every dataset, cross-agency sharing needs a legal basis and consent where required, and no model uses protected characteristics or proxies to decide on individuals. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
