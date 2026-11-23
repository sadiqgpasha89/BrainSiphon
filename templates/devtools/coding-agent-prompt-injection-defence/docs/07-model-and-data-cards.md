# Coding Agent Prompt Injection Defence: model card and data card

> Generated from the blueprint `devtools/coding-agent-prompt-injection-defence` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Coding Agent Prompt Injection Defence · **Domain:** devtools · **Latency tier:** seconds · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A system prompt telling the model to ignore instructions in data, because it is the common first defence.
- **Production model:** A layered defence with taint tracking from untrusted sources to tool calls, a detector for injected instructions, approval gates for risky tools and regular red-team replay.
- **Intended use:** Detect and neutralise hostile instructions hidden in issues, code comments, dependencies and web pages that coding agents read, so untrusted text cannot steer the agent to leak data or run harmful commands.
- **Out of scope:** - Developer name: personal data.<br>- Repository name: an identifier.<br>- File extension alone: weak link.
- **Primary metrics:** - Attack success rate in replay<br>- Detection recall<br>- False block rate
- **Measured values (fill in):** ____________
- **Slices reported:** - Repository, language and team<br>- Change size and risk tier<br>- Contributor tenure and service criticality<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the agent's "I am sure" signal against expert agreement so escalation thresholds mean what they say.
- **Known failure modes:** - Hidden text<br>- Multi-step attack<br>- Trusted source compromise
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new repositories, rarely used languages, large refactors and first-time contributors; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Cite retrieved sources and show tool calls for every answer | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Detect and neutralise hostile instructions hidden in issues, code comments, dependencies and web pages that coding agents read, so untrusted text cannot steer the agent to leak data or run harmful commands.
- **Label:** For "Coding Agent Prompt Injection Defence": Detect and neutralise hostile instructions hidden in issues, code comments, dependencies and web pages that coding agents read, so untrusted text cannot steer the agent to leak data or run harmful commands. The reference kit's label belongs to a neighbouring problem and does not describe yours: The label is the class of the document, assigned by the person who handled it; documents in the same thread share a label. Define your own label exactly as in M1. Design around this trap first: Prompt-only defence.
- **Sources:** - **Source:** Instruction-like text in data inputs<br>**Owner:** Developer experience<br>**System Of Record:** Source control and code review platform<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from the classifier.<br>- **Source:** Tool risk tier inputs<br>**Owner:** Platform engineering<br>**System Of Record:** CI/CD and artifact registry<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from policy.<br>- **Source:** Data flow from untrusted source inputs<br>**Owner:** Application security<br>**System Of Record:** Issue tracker and developer portal<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from tracing.<br>- **Source:** Egress and file write targets inputs<br>**Owner:** Developer experience<br>**System Of Record:** Source control and code review platform<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from the gateway.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Prompt-only defence<br>- No planted attack tests<br>- Trusting dependency text
- **Privacy and deletion:** Developer activity data is aggregated to teams, never used to rank or discipline individuals, and employee agreements and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
