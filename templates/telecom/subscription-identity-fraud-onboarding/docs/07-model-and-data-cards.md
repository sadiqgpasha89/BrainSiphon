# Subscription & Identity Fraud at Onboarding: model card and data card

> Generated from the blueprint `telecom/subscription-identity-fraud-onboarding` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Subscription & Identity Fraud at Onboarding · **Domain:** telecom · **Latency tier:** sub-100ms · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Rules on identity mismatches and blacklists, because they catch obvious fraud and are explainable.
- **Production model:** Gradient boosting on application and linkage graph features, scored from an online feature store with a calibrated probability and reason codes, plus a manual review queue.
- **Intended use:** Score new subscription and device-financing applications for identity and bust-out fraud so fraudsters are stopped at the door and genuine customers onboard quickly.
- **Out of scope:** - Applicant name: irrelevant and private.<br>- Email domain alone: weak link.<br>- Application time alone: weak link.
- **Primary metrics:** - Recall at fixed approval rate<br>- Calibration by segment<br>- Disparity checks across groups
- **Measured values (fill in):** ____________
- **Slices reported:** - Region, vendor and technology generation (4G or 5G)<br>- Subscriber segment, plan type and tenure<br>- Urban, suburban and rural cells and enterprise versus consumer traffic<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Thin-file genuine customer<br>- Ring adapts<br>- Vendor outage
- **Human oversight:** human-on-the-loop: The system acts within a bounded action space and a person monitors, samples and can halt it. The uncertain band routes to a review queue with a time limit.

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
- **Purpose:** Score new subscription and device-financing applications for identity and bust-out fraud so fraudsters are stopped at the door and genuine customers onboard quickly.
- **Label:** For "Subscription & Identity Fraud at Onboarding": Score new subscription and device-financing applications for identity and bust-out fraud so fraudsters are stopped at the door and genuine customers onboard quickly. The reference kit's label: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Design around this trap first: Evaluating on early cancellations.
- **Sources:** - **Source:** Identity attribute reuse inputs<br>**Owner:** Network engineering<br>**System Of Record:** OSS: inventory, fault and performance management<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: use hashed identifiers.<br>- **Source:** Device and channel risk inputs<br>**Owner:** OSS/BSS platform team<br>**System Of Record:** BSS: CRM, order management and billing<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: per channel.<br>- **Source:** Credit bureau inconsistency inputs<br>**Owner:** Customer data office<br>**System Of Record:** Network element configuration and orchestration layer<br>**Ingestion:** CDC or event stream (Kafka) with 30 seconds freshness at p95<br>**Quality:** Point-in-time rule: use official data.<br>- **Source:** Order value and device mix inputs<br>**Owner:** Network engineering<br>**System Of Record:** OSS: inventory, fault and performance management<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: per product.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Evaluating on early cancellations<br>- Ignoring linkage<br>- Fixed thresholds across all segments
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
