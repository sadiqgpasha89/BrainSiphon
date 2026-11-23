# Fibre Fault Localisation from OTDR & Telemetry: model card and data card

> Generated from the blueprint `telecom/fibre-fault-localisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Fibre Fault Localisation from OTDR & Telemetry · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Convert optical distance to ground distance with a fixed slack factor and send a crew, because it is the standard method.
- **Production model:** A model that corrects OTDR distance with route slack and past repair corrections to give a ground location range, plus a classifier for the fault type and a map for crew guidance.
- **Intended use:** Locate the position of a fibre cut or degradation from OTDR traces and optical telemetry so repair crews go to the right place the first time.
- **Out of scope:** - Technician name: irrelevant.<br>- Trace file name: an artefact.<br>- Region alone: weak link.
- **Primary metrics:** - Location error against repair records<br>- Fault type accuracy<br>- Share within 50 m
- **Measured values (fill in):** ____________
- **Slices reported:** - Region, vendor and technology generation (4G or 5G)<br>- Subscriber segment, plan type and tenure<br>- Urban, suburban and rural cells and enterprise versus consumer traffic<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Multiple events<br>- Wrong route record<br>- Aerial versus buried
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

## Fairness and responsible-AI notes

| Area | Control | Evidence |
|---|---|---|
| Fairness and bias | Report performance and error rates by slice, including new cells and sites with no history, rare vendor equipment, small enterprise accounts and roaming visitors; set floors per slice and treat a breach as a release blocker | Slice report per release and the recorded trade-off decisions |
| Explainability | Expose the main drivers or retrieved evidence behind each output | Reason-code or citation coverage metric and sampled human review |
| Human oversight | Define when a person decides, reviews or can halt the system, with stop authority and a time limit on the review queue | Oversight procedure and review-queue SLA reports |
| Transparency and accountability | Tell affected users when AI contributes to a decision, and name the accountable owner for the outcome | User-facing notice and the RACI entry |
| Appeal and override | A route to contest a decision and a logged override that becomes a labelled outcome | Appeal log with resolution times and override rate |

## Data card

- **Dataset name and owner:** ____________
- **Purpose:** Locate the position of a fibre cut or degradation from OTDR traces and optical telemetry so repair crews go to the right place the first time.
- **Label:** For "Fibre Fault Localisation from OTDR & Telemetry": Locate the position of a fibre cut or degradation from OTDR traces and optical telemetry so repair crews go to the right place the first time. The reference kit's label belongs to a neighbouring problem and does not describe yours: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Define your own label exactly as in M1. Design around this trap first: Using estimated locations as labels.
- **Sources:** - **Source:** OTDR event distance inputs<br>**Owner:** Network engineering<br>**System Of Record:** OSS: inventory, fault and performance management<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: needs refractive index calibration.<br>- **Source:** Route length slack inputs<br>**Owner:** OSS/BSS platform team<br>**System Of Record:** BSS: CRM, order management and billing<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from the route records.<br>- **Source:** Power drop pattern inputs<br>**Owner:** Customer data office<br>**System Of Record:** Network element configuration and orchestration layer<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from telemetry.<br>- **Source:** Past faults on the segment inputs<br>**Owner:** Network engineering<br>**System Of Record:** OSS: inventory, fault and performance management<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: from repair records.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Using estimated locations as labels<br>- Ignoring route slack<br>- Single event assumption
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
