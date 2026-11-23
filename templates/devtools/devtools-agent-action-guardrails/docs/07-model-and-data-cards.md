# DevTools Agent Action Guardrails: model card and data card

> Generated from the blueprint `devtools/devtools-agent-action-guardrails` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** DevTools Agent Action Guardrails · **Domain:** devtools · **Latency tier:** seconds · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Team leads skim agent pull requests once a week, because there is no other check on what the agents changed.
- **Production model:** A repository gateway with branch tiers, push rate limits and a token revoke switch, a signed change ledger with session replay, loop detection on pushes and a weekly review pack for security leads.
- **Intended use:** Control every action AI coding agents take in source repositories, build pipelines and package registries, enforce approval tiers and give security reviewers a replayable record of each change.
- **Out of scope:** - Branch name prefix: a label only.<br>- Commit message length: not risk.<br>- Agent framework version alone: needs outcome data.
- **Primary metrics:** - Rule coverage on branch tiers<br>- Catch rate on seeded unsafe pushes<br>- Replay completeness of sessions
- **Measured values (fill in):** ____________
- **Slices reported:** - Repository, language and team<br>- Change size and risk tier<br>- Contributor tenure and service criticality<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the agent's "I am sure" signal against expert agreement so escalation thresholds mean what they say.
- **Known failure modes:** - Push loop<br>- Rubber-stamp reviews<br>- New registry added
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
- **Purpose:** Control every action AI coding agents take in source repositories, build pipelines and package registries, enforce approval tiers and give security reviewers a replayable record of each change.
- **Label:** For "DevTools Agent Action Guardrails": Control every action AI coding agents take in source repositories, build pipelines and package registries, enforce approval tiers and give security reviewers a replayable record of each change. The reference kit's label belongs to a neighbouring problem and does not describe yours: Every case carries a verdict and the evidence lines that decide it. An agent is correct only when its verdict matches, every claim cites a real line showing the indicator it describes, and it escalates when the deciding lines are unavailable. Define your own label exactly as in M1. Design around this trap first: Prompt-only restrictions.
- **Sources:** - **Source:** Protected-branch touch attempts inputs<br>**Owner:** Developer experience<br>**System Of Record:** Source control and code review platform<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: source host events.<br>- **Source:** Pushes per agent per hour inputs<br>**Owner:** Platform engineering<br>**System Of Record:** CI/CD and artifact registry<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: per agent token.<br>- **Source:** Reviewer overrides on agent pull requests inputs<br>**Owner:** Application security<br>**System Of Record:** Issue tracker and developer portal<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: pull request metadata.<br>- **Source:** Pipeline result after agent change inputs<br>**Owner:** Developer experience<br>**System Of Record:** Source control and code review platform<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: CI results.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Prompt-only restrictions<br>- Organisation-wide access tokens<br>- Writes allowed on new registries
- **Privacy and deletion:** Developer activity data is aggregated to teams, never used to rank or discipline individuals, and employee agreements and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
