# Pull Request Review Assistant: model card and data card

> Generated from the blueprint `devtools/pull-request-review-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Pull Request Review Assistant · **Domain:** devtools · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Linters and human review, because they are the standard checks.
- **Production model:** A review agent that runs analysers, retrieves repository context and posts a few high-confidence comments with evidence, tracking the share that developers accept.
- **Intended use:** Comment on pull requests with likely bugs, missing tests and style problems, each backed by evidence from the diff and repository, while human reviewers keep the approval decision.
- **Out of scope:** - Author name: personal data.<br>- Pull request title wording: weak link.<br>- Time of day: irrelevant.
- **Primary metrics:** - Comment precision on audited samples<br>- Recall of seeded bugs<br>- Acceptance rate
- **Measured values (fill in):** ____________
- **Slices reported:** - Repository, language and team<br>- Change size and risk tier<br>- Contributor tenure and service criticality<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the agent's "I am sure" signal against expert agreement so escalation thresholds mean what they say.
- **Known failure modes:** - Large diff<br>- Wrong advice<br>- Generated code
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
- **Purpose:** Comment on pull requests with likely bugs, missing tests and style problems, each backed by evidence from the diff and repository, while human reviewers keep the approval decision.
- **Label:** For "Pull Request Review Assistant": Comment on pull requests with likely bugs, missing tests and style problems, each backed by evidence from the diff and repository, while human reviewers keep the approval decision. The reference kit's label belongs to a neighbouring problem and does not describe yours: Each golden question carries the expected value for the right version, or none when the documents never state it. A response is correct only when it gives that value or abstains on an unanswerable question. Define your own label exactly as in M1. Design around this trap first: Approving merges.
- **Sources:** - **Source:** Static analysis findings inputs<br>**Owner:** Developer experience<br>**System Of Record:** Source control and code review platform<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from CI.<br>- **Source:** Changed code risk indicators inputs<br>**Owner:** Platform engineering<br>**System Of Record:** CI/CD and artifact registry<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from version control.<br>- **Source:** Test coverage delta inputs<br>**Owner:** Application security<br>**System Of Record:** Issue tracker and developer portal<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from CI.<br>- **Source:** Similar past defects inputs<br>**Owner:** Developer experience<br>**System Of Record:** Source control and code review platform<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from the issue tracker.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Approving merges<br>- Comment volume as success<br>- Generic advice
- **Privacy and deletion:** Developer activity data is aggregated to teams, never used to rank or discipline individuals, and employee agreements and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
