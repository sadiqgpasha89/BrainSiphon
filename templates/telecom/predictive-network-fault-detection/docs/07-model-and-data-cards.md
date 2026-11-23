# Predictive Network Fault Detection: model card and data card

> Generated from the blueprint `telecom/predictive-network-fault-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Predictive Network Fault Detection · **Domain:** telecom · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Static thresholds on key counters per equipment class, because they are what the NOC already trusts and set the minimum to beat.
- **Production model:** Gradient boosting per equipment family over peer-normalised counters with survival-style horizons, calibrated risk scores and a per-element explanation shown in the work queue.
- **Intended use:** Predict element failures and severe degradations hours to days ahead from performance counters and logs so engineers can intervene before customers are affected.
- **Out of scope:** - Element hostname: encodes site not health.<br>- Technician name on last visit: no causal link.<br>- Raw alarm count: dominated by chatty devices.
- **Primary metrics:** - Precision and recall at 12 and 48 hour horizons<br>- Lead time distribution<br>- Calibration by equipment family
- **Measured values (fill in):** ____________
- **Slices reported:** - Region, vendor and technology generation (4G or 5G)<br>- Subscriber segment, plan type and tenure<br>- Urban, suburban and rural cells and enterprise versus consumer traffic<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that scores are calibrated across runs and segments, because thresholds are fixed while the population drifts.
- **Known failure modes:** - New equipment type<br>- Intervention hides the label<br>- Software upgrade changes counter meaning
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
- **Purpose:** Predict element failures and severe degradations hours to days ahead from performance counters and logs so engineers can intervene before customers are affected.
- **Label:** For "Predictive Network Fault Detection": Predict element failures and severe degradations hours to days ahead from performance counters and logs so engineers can intervene before customers are affected. The reference kit's label belongs to a neighbouring problem and does not describe yours: A point is anomalous when it lies inside an anomaly interval. An event is detected when an alert fires inside the interval (or up to 3 hours after); delay is measured from the interval's start. Define your own label exactly as in M1. Design around this trap first: Random split across time.
- **Sources:** - **Source:** Counter drift against peers inputs<br>**Owner:** Network engineering<br>**System Of Record:** OSS: inventory, fault and performance management<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: peer groups must exclude the failing element.<br>- **Source:** Temperature and power trend inputs<br>**Owner:** OSS/BSS platform team<br>**System Of Record:** BSS: CRM, order management and billing<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: needs sensor calibration per model.<br>- **Source:** Software version and recent restart count inputs<br>**Owner:** Customer data office<br>**System Of Record:** Network element configuration and orchestration layer<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: version must be as at prediction time.<br>- **Source:** Traffic load percentile inputs<br>**Owner:** Network engineering<br>**System Of Record:** OSS: inventory, fault and performance management<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: seasonality adjustment is required.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Random split across time<br>- Using post-failure counters as features<br>- Mixing vendor counter semantics
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
