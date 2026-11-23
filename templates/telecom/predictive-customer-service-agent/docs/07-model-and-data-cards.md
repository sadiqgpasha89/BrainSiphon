# Predictive Customer Service Agent: model card and data card

> Generated from the blueprint `telecom/predictive-customer-service-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Predictive Customer Service Agent · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A rules engine that triggers a message when a customer's cell has an open outage, because it is simple and shows the reach of a basic approach.
- **Production model:** An agent that reads the experience score, attributes the cause with read-only tools and chooses from approved remedies with cost limits, writing every action to the case with the reason and a human approval gate above thresholds.
- **Intended use:** Spot customers whose service is degrading, work out the cause from network and account data and act first with a fix, a credit or a message, so many problems are resolved before the customer contacts care.
- **Out of scope:** - Customer name: irrelevant and private.<br>- Handset colour: no link to service.<br>- Time since last bill: weak link.
- **Primary metrics:** - Cause attribution accuracy on audited cases<br>- Remedy appropriateness rating<br>- Opt-out compliance rate
- **Measured values (fill in):** ____________
- **Slices reported:** - Region, vendor and technology generation (4G or 5G)<br>- Subscriber segment, plan type and tenure<br>- Urban, suburban and rural cells and enterprise versus consumer traffic<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the agent's "I am sure" signal against expert agreement so escalation thresholds mean what they say.
- **Known failure modes:** - False degradation<br>- Customer already contacted<br>- Remedy cost spike
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new cells and sites with no history, rare vendor equipment, small enterprise accounts and roaming visitors; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Cite retrieved sources and show tool calls for every answer | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Spot customers whose service is degrading, work out the cause from network and account data and act first with a fix, a credit or a message, so many problems are resolved before the customer contacts care.
- **Label:** For "Predictive Customer Service Agent": Spot customers whose service is degrading, work out the cause from network and account data and act first with a fix, a credit or a message, so many problems are resolved before the customer contacts care. The reference kit's label belongs to a neighbouring problem and does not describe yours: Every case carries a verdict and the evidence lines that decide it. An agent is correct only when its verdict matches, every claim cites a real line showing the indicator it describes, and it escalates when the deciding lines are unavailable. Define your own label exactly as in M1. Design around this trap first: Counting avoided calls without a control.
- **Sources:** - **Source:** Experience score trend inputs<br>**Owner:** Network engineering<br>**System Of Record:** OSS: inventory, fault and performance management<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: join to the customer's serving cells.<br>- **Source:** Cause attribution inputs<br>**Owner:** OSS/BSS platform team<br>**System Of Record:** BSS: CRM, order management and billing<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: needs network and device data.<br>- **Source:** Prior contacts inputs<br>**Owner:** Customer data office<br>**System Of Record:** Network element configuration and orchestration layer<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from CRM as at action time.<br>- **Source:** Customer value tier inputs<br>**Owner:** Network engineering<br>**System Of Record:** OSS: inventory, fault and performance management<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: use bands not exact revenue.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Counting avoided calls without a control<br>- Unlimited credits<br>- Ignoring opt-outs
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
