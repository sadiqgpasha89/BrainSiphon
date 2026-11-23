# Code Ownership Inference: model card and data card

> Generated from the blueprint `devtools/code-ownership-inference` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Code Ownership Inference · **Domain:** devtools · **Latency tier:** batch · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Ownership files updated by hand and asking in chat, because it is the usual practice.
- **Production model:** A ranking of candidate owning teams per path from contribution, on-call and review data with a pull request that updates ownership files after lead confirmation.
- **Intended use:** Infer likely owners for unowned code and services from contribution history, on-call data and reviews so ownership files are complete, for team leads to confirm.
- **Out of scope:** - Developer name alone: personal data.<br>- File age: weak link.<br>- Commit message: weak link.
- **Primary metrics:** - Agreement with confirmed owners<br>- Coverage of paths<br>- Review acceptance
- **Measured values (fill in):** ____________
- **Slices reported:** - Repository, language and team<br>- Change size and risk tier<br>- Contributor tenure and service criticality<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Reorganisation<br>- Shared libraries<br>- Bot commits
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
- **Purpose:** Infer likely owners for unowned code and services from contribution history, on-call data and reviews so ownership files are complete, for team leads to confirm.
- **Label:** For "Code Ownership Inference": Infer likely owners for unowned code and services from contribution history, on-call data and reviews so ownership files are complete, for team leads to confirm. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Individual owners.
- **Sources:** - **Source:** Recent commit share by team inputs<br>**Owner:** Developer experience<br>**System Of Record:** Source control and code review platform<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from version control.<br>- **Source:** Review and incident participation inputs<br>**Owner:** Platform engineering<br>**System Of Record:** CI/CD and artifact registry<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from tools.<br>- **Source:** On-call mapping inputs<br>**Owner:** Application security<br>**System Of Record:** Issue tracker and developer portal<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from the pager.<br>- **Source:** Team membership inputs<br>**Owner:** Developer experience<br>**System Of Record:** Source control and code review platform<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from HR directory.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Individual owners<br>- Authorship only<br>- Automatic assignment
- **Privacy and deletion:** Developer activity data is aggregated to teams, never used to rank or discipline individuals, and employee agreements and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
