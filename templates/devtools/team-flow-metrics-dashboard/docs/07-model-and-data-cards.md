# Team Flow Metrics and Insights: model card and data card

> Generated from the blueprint `devtools/team-flow-metrics-dashboard` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Team Flow Metrics and Insights · **Domain:** devtools · **Latency tier:** batch · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Manually compiled engineering reports from the tracker, because they are the current practice.
- **Production model:** A metrics service with team-level aggregation, trend explanations and bottleneck hints, with access controls that block individual views.
- **Intended use:** Show team-level flow metrics such as lead time, deployment frequency and change failure rate with explanations of what moved, to support team improvement and never to rank people.
- **Out of scope:** - Developer name: personal data.<br>- Lines of code: a poor proxy.<br>- Commit counts: a poor proxy.
- **Primary metrics:** - Metric definition accuracy<br>- Aggregation privacy checks<br>- Insight usefulness in surveys
- **Measured values (fill in):** ____________
- **Slices reported:** - Repository, language and team<br>- Change size and risk tier<br>- Contributor tenure and service criticality<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Small team<br>- Gaming<br>- Data gaps
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new repositories, rarely used languages, large refactors and first-time contributors; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Return top reason codes (SHAP-based or monotone-constrained) with every decision | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Show team-level flow metrics such as lead time, deployment frequency and change failure rate with explanations of what moved, to support team improvement and never to rank people.
- **Label:** For "Team Flow Metrics and Insights": Show team-level flow metrics such as lead time, deployment frequency and change failure rate with explanations of what moved, to support team improvement and never to rank people. The reference kit's label belongs to a neighbouring problem and does not describe yours: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Define your own label exactly as in M1. Design around this trap first: Individual metrics.
- **Sources:** - **Source:** Lead time for changes inputs<br>**Owner:** Developer experience<br>**System Of Record:** Source control and code review platform<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from CI and CD.<br>- **Source:** Deployment frequency inputs<br>**Owner:** Platform engineering<br>**System Of Record:** CI/CD and artifact registry<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from CD.<br>- **Source:** Change failure rate inputs<br>**Owner:** Application security<br>**System Of Record:** Issue tracker and developer portal<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from incidents.<br>- **Source:** Time to restore inputs<br>**Owner:** Developer experience<br>**System Of Record:** Source control and code review platform<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from incidents.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Individual metrics<br>- Lines of code<br>- Metrics as targets
- **Privacy and deletion:** Developer activity data is aggregated to teams, never used to rank or discipline individuals, and employee agreements and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
