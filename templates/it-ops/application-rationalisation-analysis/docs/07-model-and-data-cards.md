# Application Rationalisation Analysis: model card and data card

> Generated from the blueprint `it-ops/application-rationalisation-analysis` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Application Rationalisation Analysis · **Domain:** it-ops · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Annual portfolio reviews by enterprise architects, because they are the usual practice.
- **Production model:** An analytics pipeline that clusters applications by function, scores overlap, cost and health and presents consolidation options with evidence to owners.
- **Intended use:** Group applications by function, use, cost and technical health and recommend retire, consolidate or invest options with the evidence, for business and IT owners to decide.
- **Out of scope:** - Application owner name: personal data.<br>- Vendor brand: weak link.<br>- Application age alone: weak link.
- **Primary metrics:** - Cluster quality<br>- Savings estimate error<br>- Owner agreement
- **Measured values (fill in):** ____________
- **Slices reported:** - Service tier, region and technology stack<br>- Ticket category and priority<br>- Site, device type and business unit<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate field confidence so the "needs review" threshold gives the target accuracy among auto-accepted fields.
- **Known failure modes:** - Shadow IT<br>- Hidden dependency<br>- Regulatory retention
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
- **Purpose:** Group applications by function, use, cost and technical health and recommend retire, consolidate or invest options with the evidence, for business and IT owners to decide.
- **Label:** For "Application Rationalisation Analysis": Group applications by function, use, cost and technical health and recommend retire, consolidate or invest options with the evidence, for business and IT owners to decide. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Age as the criterion.
- **Sources:** - **Source:** Usage trend inputs<br>**Owner:** Infrastructure and operations<br>**System Of Record:** IT service management platform<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from usage data.<br>- **Source:** Total cost inputs<br>**Owner:** Service management<br>**System Of Record:** Configuration management database<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from finance.<br>- **Source:** Functional similarity inputs<br>**Owner:** Security operations<br>**System Of Record:** Monitoring, logging and cloud billing platforms<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from text models.<br>- **Source:** Technical health inputs<br>**Owner:** Infrastructure and operations<br>**System Of Record:** IT service management platform<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from scans.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Age as the criterion<br>- Name matching<br>- Model-made retirement decisions
- **Privacy and deletion:** Employee device and activity data is aggregated to groups, collected only for service quality and security, never used to rank or discipline individuals, and works-council rules govern any measurement. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
