# Real-Time Service Activation Agent: model card and data card

> Generated from the blueprint `telecom/realtime-service-activation-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Real-Time Service Activation Agent · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A workflow engine with fixed steps and a queue for failed orders, because it is the reference for activation time and exception volume.
- **Production model:** A supervisor agent that plans steps from a typed order, calls provisioning tools with idempotency keys, verifies service state after each step and escalates typed exceptions with the evidence, with approval gates by order value and risk.
- **Intended use:** Take a validated order for a new feature, add-on or business service and drive it through eligibility, provisioning and verification in minutes, escalating only the exceptions to people.
- **Out of scope:** - Order submission channel: does not change provisioning.<br>- Customer name: irrelevant and private.<br>- Sales agent identifier: irrelevant to activation.
- **Primary metrics:** - Straight-through rate on replayed orders<br>- Compensation correctness in fault injection<br>- Eligibility decision accuracy
- **Measured values (fill in):** ____________
- **Slices reported:** - Region, vendor and technology generation (4G or 5G)<br>- Subscriber segment, plan type and tenure<br>- Urban, suburban and rural cells and enterprise versus consumer traffic<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the agent's "I am sure" signal against expert agreement so escalation thresholds mean what they say.
- **Known failure modes:** - Downstream system timeout<br>- Partial activation<br>- Conflicting concurrent orders
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
- **Purpose:** Take a validated order for a new feature, add-on or business service and drive it through eligibility, provisioning and verification in minutes, escalating only the exceptions to people.
- **Label:** For "Real-Time Service Activation Agent": Take a validated order for a new feature, add-on or business service and drive it through eligibility, provisioning and verification in minutes, escalating only the exceptions to people. The reference kit's label: Every case carries a verdict and the evidence lines that decide it. An agent is correct only when its verdict matches, every claim cites a real line showing the indicator it describes, and it escalates when the deciding lines are unavailable. Design around this trap first: Retrying without idempotency.
- **Sources:** - **Source:** Eligibility check result inputs<br>**Owner:** Network engineering<br>**System Of Record:** OSS: inventory, fault and performance management<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: rules owned by product teams.<br>- **Source:** Dependency state inputs<br>**Owner:** OSS/BSS platform team<br>**System Of Record:** BSS: CRM, order management and billing<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: needs live order state.<br>- **Source:** Step latency history inputs<br>**Owner:** Customer data office<br>**System Of Record:** Network element configuration and orchestration layer<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: per system and per hour.<br>- **Source:** Customer consent record inputs<br>**Owner:** Network engineering<br>**System Of Record:** OSS: inventory, fault and performance management<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from the consent store at action time.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Retrying without idempotency<br>- Skipping the verification step<br>- Letting the agent bypass the catalogue
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
