# Malicious Package Detection: model card and data card

> Generated from the blueprint `devtools/typosquat-malicious-package-blocking` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Malicious Package Detection · **Domain:** devtools · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Vulnerability scanning of known issues and manual allow-lists, because they are the common controls.
- **Production model:** A scoring pipeline combining metadata, code and sandbox behaviour with a registry proxy that blocks and quarantines, plus an exception process.
- **Intended use:** Detect suspicious new package versions in registries and in build dependencies, such as typosquats and install-time scripts that fetch payloads, and block them before they enter builds.
- **Out of scope:** - Package description wording: weak link.<br>- Download count alone: weak link.<br>- README length: weak link.
- **Primary metrics:** - Detection of known malicious packages<br>- False block rate<br>- Time to detection after publish
- **Measured values (fill in):** ____________
- **Slices reported:** - Repository, language and team<br>- Change size and risk tier<br>- Contributor tenure and service criticality<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate field confidence so the "needs review" threshold gives the target accuracy among auto-accepted fields.
- **Known failure modes:** - Legitimate obfuscation<br>- Account takeover<br>- Delayed payload
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

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
- **Purpose:** Detect suspicious new package versions in registries and in build dependencies, such as typosquats and install-time scripts that fetch payloads, and block them before they enter builds.
- **Label:** For "Malicious Package Detection": Detect suspicious new package versions in registries and in build dependencies, such as typosquats and install-time scripts that fetch payloads, and block them before they enter builds. The reference kit's label belongs to a neighbouring problem and does not describe yours: The label is the class of the document, assigned by the person who handled it; documents in the same thread share a label. Define your own label exactly as in M1. Design around this trap first: Known-vulnerability scanning only.
- **Sources:** - **Source:** Name similarity to popular packages inputs<br>**Owner:** Developer experience<br>**System Of Record:** Source control and code review platform<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from the registry.<br>- **Source:** Install script behaviour inputs<br>**Owner:** Platform engineering<br>**System Of Record:** CI/CD and artifact registry<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from sandbox analysis.<br>- **Source:** Publisher change and maintainer history inputs<br>**Owner:** Application security<br>**System Of Record:** Issue tracker and developer portal<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from registry data.<br>- **Source:** Dependency graph position inputs<br>**Owner:** Developer experience<br>**System Of Record:** Source control and code review platform<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from the graph.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Known-vulnerability scanning only<br>- Warn-only controls<br>- Popularity as trust
- **Privacy and deletion:** Developer activity data is aggregated to teams, never used to rank or discipline individuals, and employee agreements and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
