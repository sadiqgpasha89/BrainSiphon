# Error Grouping and Log Clustering: model card and data card

> Generated from the blueprint `devtools/error-grouping-log-clustering` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Error Grouping and Log Clustering · **Domain:** devtools · **Latency tier:** seconds · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Group by exact message and top stack frame, because it is the standard behaviour.
- **Production model:** A grouping service using normalised traces, learned message templates and embeddings with release-aware regression flags and impact ranking.
- **Intended use:** Group production errors and log lines into issues by cause so engineers see a few ranked problems instead of millions of events.
- **Out of scope:** - User identifier: personal data.<br>- Event id: an identifier.<br>- Host name: weak link.
- **Primary metrics:** - Grouping purity<br>- Group stability<br>- Impact ranking accuracy
- **Measured values (fill in):** ____________
- **Slices reported:** - Repository, language and team<br>- Change size and risk tier<br>- Contributor tenure and service criticality<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate field confidence so the "needs review" threshold gives the target accuracy among auto-accepted fields.
- **Known failure modes:** - Renamed functions<br>- Very noisy errors<br>- PII in messages
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new repositories, rarely used languages, large refactors and first-time contributors; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Group production errors and log lines into issues by cause so engineers see a few ranked problems instead of millions of events.
- **Label:** For "Error Grouping and Log Clustering": Group production errors and log lines into issues by cause so engineers see a few ranked problems instead of millions of events. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Exact message grouping.
- **Sources:** - **Source:** Normalised stack trace inputs<br>**Owner:** Developer experience<br>**System Of Record:** Source control and code review platform<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from parsing.<br>- **Source:** Message template inputs<br>**Owner:** Platform engineering<br>**System Of Record:** CI/CD and artifact registry<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from parsing.<br>- **Source:** Release and deployment markers inputs<br>**Owner:** Application security<br>**System Of Record:** Issue tracker and developer portal<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from CD.<br>- **Source:** Users and sessions affected inputs<br>**Owner:** Developer experience<br>**System Of Record:** Source control and code review platform<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: aggregated.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Exact message grouping<br>- Event counts as rank<br>- Unmasked personal data
- **Privacy and deletion:** Developer activity data is aggregated to teams, never used to rank or discipline individuals, and employee agreements and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
