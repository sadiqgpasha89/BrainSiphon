# Security Fix Suggestion Agent: model card and data card

> Generated from the blueprint `devtools/security-fix-suggestion-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Security Fix Suggestion Agent · **Domain:** devtools · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Developers fixing findings by hand using guidance pages, because it is the usual process.
- **Production model:** A fix agent with an approved pattern library, a sandbox that proves the flaw and the fix with tests and a pull request that includes the explanation and risk.
- **Intended use:** Suggest code fixes for confirmed security findings, with an explanation, a test that shows the flaw is closed and a pull request for the owner to review.
- **Out of scope:** - Developer name: personal data.<br>- Finding id: an identifier.<br>- Branch name: an artefact.
- **Primary metrics:** - Fix verification rate<br>- Reviewer acceptance<br>- Re-open rate
- **Measured values (fill in):** ____________
- **Slices reported:** - Repository, language and team<br>- Change size and risk tier<br>- Contributor tenure and service criticality<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the agent's "I am sure" signal against expert agreement so escalation thresholds mean what they say.
- **Known failure modes:** - Framework-specific fix<br>- Fix breaks behaviour<br>- Unconfirmed finding
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
- **Purpose:** Suggest code fixes for confirmed security findings, with an explanation, a test that shows the flaw is closed and a pull request for the owner to review.
- **Label:** For "Security Fix Suggestion Agent": Suggest code fixes for confirmed security findings, with an explanation, a test that shows the flaw is closed and a pull request for the owner to review. The reference kit's label belongs to a neighbouring problem and does not describe yours: Every case carries a verdict and the evidence lines that decide it. An agent is correct only when its verdict matches, every claim cites a real line showing the indicator it describes, and it escalates when the deciding lines are unavailable. Define your own label exactly as in M1. Design around this trap first: Fixing unconfirmed findings.
- **Sources:** - **Source:** Finding type and location inputs<br>**Owner:** Developer experience<br>**System Of Record:** Source control and code review platform<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from the scanner.<br>- **Source:** Code context inputs<br>**Owner:** Platform engineering<br>**System Of Record:** CI/CD and artifact registry<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from the repository.<br>- **Source:** Test outcome inputs<br>**Owner:** Application security<br>**System Of Record:** Issue tracker and developer portal<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from CI.<br>- **Source:** Fix pattern library inputs<br>**Owner:** Developer experience<br>**System Of Record:** Source control and code review platform<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from security guidance.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Fixing unconfirmed findings<br>- Patches without tests<br>- Auto-merge
- **Privacy and deletion:** Developer activity data is aggregated to teams, never used to rank or discipline individuals, and employee agreements and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
