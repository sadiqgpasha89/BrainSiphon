# Cloud Misconfiguration Detection: model card and data card

> Generated from the blueprint `it-ops/cloud-misconfiguration-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Cloud Misconfiguration Detection · **Domain:** it-ops · **Latency tier:** batch · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Periodic scans with severity-ordered lists, because they are the standard tooling.
- **Production model:** A posture engine that adds exposure and data context to scanner findings, ranks them and opens fix pull requests for owners.
- **Intended use:** Find risky cloud settings such as public storage, open ports and weak identity rules and rank them by exposure and data sensitivity, opening fixes through infrastructure code.
- **Out of scope:** - Resource id: an identifier.<br>- Scanner name: weak link.<br>- Owner name: personal data.
- **Primary metrics:** - Rank accuracy on confirmed exposures<br>- Rule coverage<br>- Fix acceptance
- **Measured values (fill in):** ____________
- **Slices reported:** - Service tier, region and technology stack<br>- Ticket category and priority<br>- Site, device type and business unit<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Intentional exposure<br>- Multi-account sprawl<br>- Short-lived resources
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new services, rarely used systems, major incidents and remote or legacy sites; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Return top reason codes (SHAP-based or monotone-constrained) with every decision | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Find risky cloud settings such as public storage, open ports and weak identity rules and rank them by exposure and data sensitivity, opening fixes through infrastructure code.
- **Label:** For "Cloud Misconfiguration Detection": Find risky cloud settings such as public storage, open ports and weak identity rules and rank them by exposure and data sensitivity, opening fixes through infrastructure code. The reference kit's label belongs to a neighbouring problem and does not describe yours: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Define your own label exactly as in M1. Design around this trap first: Severity-only ranking.
- **Sources:** - **Source:** Internet exposure inputs<br>**Owner:** Infrastructure and operations<br>**System Of Record:** IT service management platform<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from network analysis.<br>- **Source:** Data sensitivity inputs<br>**Owner:** Service management<br>**System Of Record:** Configuration management database<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from the data catalogue.<br>- **Source:** Identity permissions inputs<br>**Owner:** Security operations<br>**System Of Record:** Monitoring, logging and cloud billing platforms<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from identity analysis.<br>- **Source:** Compliance mapping inputs<br>**Owner:** Infrastructure and operations<br>**System Of Record:** IT service management platform<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from policy.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Severity-only ranking<br>- Console-only fixes<br>- Findings with no context
- **Privacy and deletion:** Employee device and activity data is aggregated to groups, collected only for service quality and security, never used to rank or discipline individuals, and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
