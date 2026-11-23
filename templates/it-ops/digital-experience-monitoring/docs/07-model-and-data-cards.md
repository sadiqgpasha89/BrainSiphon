# Digital Employee Experience Monitoring: model card and data card

> Generated from the blueprint `it-ops/digital-experience-monitoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Digital Employee Experience Monitoring · **Domain:** it-ops · **Latency tier:** batch · **Difficulty:** foundational

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Survey-based satisfaction reports and ticket counts, because they are the usual measures.
- **Production model:** A group-level experience index with root cause pointers by site, application and device class, with access limits and a governance review.
- **Intended use:** Measure application responsiveness, logins and meeting quality from device and network data to find group-level problems and fix them, with data aggregated to groups and never used to rank employees.
- **Out of scope:** - Employee name: personal data.<br>- Application window titles: privacy-invasive.<br>- Time online: not experience.
- **Primary metrics:** - Index validity against survey<br>- Cause attribution accuracy<br>- Aggregation privacy checks
- **Measured values (fill in):** ____________
- **Slices reported:** - Service tier, region and technology stack<br>- Ticket category and priority<br>- Site, device type and business unit<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - Small group<br>- Agent gaps<br>- Misuse risk
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new services, rarely used systems, major incidents and remote or legacy sites; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Measure application responsiveness, logins and meeting quality from device and network data to find group-level problems and fix them, with data aggregated to groups and never used to rank employees.
- **Label:** For "Digital Employee Experience Monitoring": Measure application responsiveness, logins and meeting quality from device and network data to find group-level problems and fix them, with data aggregated to groups and never used to rank employees. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Individual scores.
- **Sources:** - **Source:** Application response times inputs<br>**Owner:** Infrastructure and operations<br>**System Of Record:** IT service management platform<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from agents.<br>- **Source:** Login and sign-in failures inputs<br>**Owner:** Service management<br>**System Of Record:** Configuration management database<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from identity logs.<br>- **Source:** Meeting quality inputs<br>**Owner:** Security operations<br>**System Of Record:** Monitoring, logging and cloud billing platforms<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from collaboration tools.<br>- **Source:** Device and network health inputs<br>**Owner:** Infrastructure and operations<br>**System Of Record:** IT service management platform<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from agents.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Individual scores<br>- Productivity claims<br>- Window title capture
- **Privacy and deletion:** Employee device and activity data is aggregated to groups, collected only for service quality and security, never used to rank or discipline individuals, and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
