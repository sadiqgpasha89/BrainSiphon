# Alarm Correlation & Root-Cause Grouping: model card and data card

> Generated from the blueprint `telecom/alarm-correlation-root-cause-grouping` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Alarm Correlation & Root-Cause Grouping · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Rule-based correlation on parent and child dependencies and a fixed time window, because it is the incumbent and sets the bar for reduction in alarm volume.
- **Production model:** A graph model over the topology with temporal attention on alarm sequences, producing incident groups and a ranked root-cause list, with human feedback on each grouping fed back as labels.
- **Intended use:** Group the alarms raised by one underlying fault across a multi-vendor network and rank the likely root element, so the NOC works one incident instead of thousands of alarms.
- **Out of scope:** - Alarm severity assigned by the vendor: scales differ across vendors.<br>- Alarm text length: a formatting artefact.<br>- Element age: weak link to this fault.
- **Primary metrics:** - Alarm reduction ratio at a fixed grouping purity<br>- Root cause in top three<br>- Misgrouping rate on confirmed incidents
- **Measured values (fill in):** ____________
- **Slices reported:** - Region, vendor and technology generation (4G or 5G)<br>- Subscriber segment, plan type and tenure<br>- Urban, suburban and rural cells and enterprise versus consumer traffic<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Flapping link<br>- Maintenance window<br>- Missing topology link
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new cells and sites with no history, rare vendor equipment, small enterprise accounts and roaming visitors; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Return top reason codes (SHAP-based or monotone-constrained) with every decision | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Group the alarms raised by one underlying fault across a multi-vendor network and rank the likely root element, so the NOC works one incident instead of thousands of alarms.
- **Label:** For "Alarm Correlation & Root-Cause Grouping": Group the alarms raised by one underlying fault across a multi-vendor network and rank the likely root element, so the NOC works one incident instead of thousands of alarms. The reference kit's label belongs to a neighbouring problem and does not describe yours: A pair of records is positive when both belong to the same hidden true cluster. Clusters are formed by connected components over the pairs the model links. Define your own label exactly as in M1. Design around this trap first: Time-window correlation without topology.
- **Sources:** - **Source:** Topological distance to the alarm cluster inputs<br>**Owner:** Network engineering<br>**System Of Record:** OSS: inventory, fault and performance management<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: topology must be current.<br>- **Source:** Alarm onset order inputs<br>**Owner:** OSS/BSS platform team<br>**System Of Record:** BSS: CRM, order management and billing<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: element clocks drift and need normalising.<br>- **Source:** Historical co-occurrence inputs<br>**Owner:** Customer data office<br>**System Of Record:** Network element configuration and orchestration layer<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: use only confirmed incident labels.<br>- **Source:** Service impact breadth inputs<br>**Owner:** Network engineering<br>**System Of Record:** OSS: inventory, fault and performance management<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: join to the live service model.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Time-window correlation without topology<br>- Evaluating on closed tickets that were merged by hand<br>- Ignoring clock drift
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
