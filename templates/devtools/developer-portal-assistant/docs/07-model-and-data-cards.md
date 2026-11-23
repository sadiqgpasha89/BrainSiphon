# Internal Developer Portal Assistant: model card and data card

> Generated from the blueprint `devtools/developer-portal-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Internal Developer Portal Assistant · **Domain:** devtools · **Latency tier:** seconds · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A portal search and a help channel, because they are the current tools.
- **Production model:** A retrieval and workflow assistant over the catalogue with citations and a small set of approved actions that create tickets or scaffold new services after approval.
- **Intended use:** Answer questions about services, owners, dependencies and standards from the service catalogue and docs, and create tickets or scaffold templates through approved workflows.
- **Out of scope:** - Asker name: personal data.<br>- Chat length: weak link.<br>- Time of day: irrelevant.
- **Primary metrics:** - Answer faithfulness<br>- Action policy compliance<br>- Retrieval accuracy
- **Measured values (fill in):** ____________
- **Slices reported:** - Repository, language and team<br>- Change size and risk tier<br>- Contributor tenure and service criticality<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the confidence that triggers abstention: among answers the system was 90% sure about, about 90% should be judged grounded and correct by humans.
- **Known failure modes:** - Missing owner<br>- Duplicate services<br>- Unapproved action
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

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
- **Purpose:** Answer questions about services, owners, dependencies and standards from the service catalogue and docs, and create tickets or scaffold templates through approved workflows.
- **Label:** For "Internal Developer Portal Assistant": Answer questions about services, owners, dependencies and standards from the service catalogue and docs, and create tickets or scaffold templates through approved workflows. The reference kit's label: Each golden question carries the expected value for the right version, or none when the documents never state it. A response is correct only when it gives that value or abstains on an unanswerable question. Design around this trap first: Free-form command execution.
- **Sources:** - **Source:** Catalogue match inputs<br>**Owner:** Developer experience<br>**System Of Record:** Source control and code review platform<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from the catalogue.<br>- **Source:** Ownership and on-call inputs<br>**Owner:** Platform engineering<br>**System Of Record:** CI/CD and artifact registry<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from the portal.<br>- **Source:** Template eligibility inputs<br>**Owner:** Application security<br>**System Of Record:** Issue tracker and developer portal<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from rules.<br>- **Source:** Doc freshness inputs<br>**Owner:** Developer experience<br>**System Of Record:** Source control and code review platform<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from the doc system.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Free-form command execution<br>- Unsourced answers<br>- Ignoring permissions
- **Privacy and deletion:** Developer activity data is aggregated to teams, never used to rank or discipline individuals, and employee agreements and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
