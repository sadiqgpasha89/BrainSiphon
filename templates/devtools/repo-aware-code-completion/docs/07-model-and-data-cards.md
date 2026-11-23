# Repository-Aware Code Completion: model card and data card

> Generated from the blueprint `devtools/repo-aware-code-completion` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Repository-Aware Code Completion · **Domain:** devtools · **Latency tier:** sub-100ms · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Language-server completion and snippets, because it is the standard editor feature.
- **Production model:** A completion model with repository retrieval, a secret and licence filter, latency budgets and aggregated acceptance metrics, all running in the company boundary.
- **Intended use:** Suggest the next lines and functions while a developer types, using the open files and the repository's own conventions, so common code is written faster and consistent with the codebase.
- **Out of scope:** - Developer name: personal data.<br>- Editor theme: irrelevant.<br>- Keystroke timing: a monitoring artefact.
- **Primary metrics:** - Offline acceptance on held-out code<br>- Secret leakage tests<br>- Latency at p95
- **Measured values (fill in):** ____________
- **Slices reported:** - Repository, language and team<br>- Change size and risk tier<br>- Contributor tenure and service criticality<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate the confidence that triggers abstention: among answers the system was 90% sure about, about 90% should be judged grounded and correct by humans.
- **Known failure modes:** - Private repository access<br>- Outdated API<br>- Large monorepo
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
- **Purpose:** Suggest the next lines and functions while a developer types, using the open files and the repository's own conventions, so common code is written faster and consistent with the codebase.
- **Label:** For "Repository-Aware Code Completion": Suggest the next lines and functions while a developer types, using the open files and the repository's own conventions, so common code is written faster and consistent with the codebase. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Shown-suggestion metrics.
- **Sources:** - **Source:** Cursor and file context inputs<br>**Owner:** Developer experience<br>**System Of Record:** Source control and code review platform<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: from the editor.<br>- **Source:** Related file retrieval inputs<br>**Owner:** Platform engineering<br>**System Of Record:** CI/CD and artifact registry<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from the code index.<br>- **Source:** Language and framework inputs<br>**Owner:** Application security<br>**System Of Record:** Issue tracker and developer portal<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: from the project.<br>- **Source:** Acceptance history aggregate inputs<br>**Owner:** Developer experience<br>**System Of Record:** Source control and code review platform<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: team-level.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Shown-suggestion metrics<br>- Unfiltered output<br>- Ignoring repository access rights
- **Privacy and deletion:** Developer activity data is aggregated to teams, never used to rank or discipline individuals, and employee agreements and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
