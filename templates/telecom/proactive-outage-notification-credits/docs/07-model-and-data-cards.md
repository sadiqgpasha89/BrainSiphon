# Proactive Outage Notification & Credits: model card and data card

> Generated from the blueprint `telecom/proactive-outage-notification-credits` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Proactive Outage Notification & Credits · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Send a generic SMS to every customer served by the affected cells, because it is the current practice and sets the reach baseline.
- **Production model:** Impact-verified customer lists, a calibrated restoration model, templated multilingual messages and a credit engine following policy, with a dashboard for the incident manager to approve broadcast and credit actions.
- **Intended use:** Notify affected customers of outages in their own channel with accurate restoration estimates and calculate goodwill credits within policy, so contacts during incidents fall.
- **Out of scope:** - Postcode alone: overreach.<br>- Customer value tier: should not affect who is told.<br>- Message length: not effectiveness.
- **Primary metrics:** - Impacted-customer precision and recall<br>- Restoration estimate coverage<br>- Credit calculation accuracy
- **Measured values (fill in):** ____________
- **Slices reported:** - Region, vendor and technology generation (4G or 5G)<br>- Subscriber segment, plan type and tenure<br>- Urban, suburban and rural cells and enterprise versus consumer traffic<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate field confidence so the "needs review" threshold gives the target accuracy among auto-accepted fields.
- **Known failure modes:** - Estimate wrong<br>- Partial restoration<br>- Mass credit exposure
- **Human oversight:** human-in-the-loop: A person approves or can reverse the consequential decision before it takes effect. The model recommends with evidence; overrides are recorded as labelled outcomes.

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
- **Purpose:** Notify affected customers of outages in their own channel with accurate restoration estimates and calculate goodwill credits within policy, so contacts during incidents fall.
- **Label:** For "Proactive Outage Notification & Credits": Notify affected customers of outages in their own channel with accurate restoration estimates and calculate goodwill credits within policy, so contacts during incidents fall. The reference kit's label belongs to a neighbouring problem and does not describe yours: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Define your own label exactly as in M1. Design around this trap first: Notifying by postcode.
- **Sources:** - **Source:** Impact membership inputs<br>**Owner:** Network engineering<br>**System Of Record:** OSS: inventory, fault and performance management<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: join to live topology.<br>- **Source:** Restoration estimate inputs<br>**Owner:** OSS/BSS platform team<br>**System Of Record:** BSS: CRM, order management and billing<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: calibrated range.<br>- **Source:** Contact preference inputs<br>**Owner:** Customer data office<br>**System Of Record:** Network element configuration and orchestration layer<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: from consent records.<br>- **Source:** Service importance inputs<br>**Owner:** Network engineering<br>**System Of Record:** OSS: inventory, fault and performance management<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: use only declared flags.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Notifying by postcode<br>- Promising a single time<br>- Unbounded credits
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
