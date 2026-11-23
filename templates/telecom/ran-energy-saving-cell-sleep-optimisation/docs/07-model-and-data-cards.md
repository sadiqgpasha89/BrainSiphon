# RAN Energy Saving & Cell Sleep Optimisation: model card and data card

> Generated from the blueprint `telecom/ran-energy-saving-cell-sleep-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** RAN Energy Saving & Cell Sleep Optimisation · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** staff-principal

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** A static schedule that sleeps capacity layers at night where load is below a fixed threshold, because it is already deployed and sets the savings floor.
- **Production model:** A contextual bandit or constrained policy over load forecasts and neighbour headroom with hard guardrails, shadow mode first, matched-control evaluation and an instant revert on KPI breach.
- **Intended use:** Decide when to put cells, carriers and radio components into low-power states while holding coverage and user quality, so energy cost falls without degrading experience.
- **Out of scope:** - Cell name: an identifier.<br>- Weekday number alone: captured by load forecast.<br>- Operator on duty: unrelated.
- **Primary metrics:** - Energy saved against matched controls<br>- Guardrail breach rate<br>- Forecast quantile coverage
- **Measured values (fill in):** ____________
- **Slices reported:** - Region, vendor and technology generation (4G or 5G)<br>- Subscriber segment, plan type and tenure<br>- Urban, suburban and rural cells and enterprise versus consumer traffic<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Calibrate scores so that a score of 0.02 means a 2% event rate on the current population, per segment, because thresholds and costs are applied to the probability, not the rank.
- **Known failure modes:** - Unexpected event<br>- Neighbour failure<br>- Seasonal drift
- **Human oversight:** autonomous-with-audit: The system acts on its own inside guardrails; every decision is logged for replay, and humans review aggregate behaviour, drift and appeals rather than each decision.

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
- **Purpose:** Decide when to put cells, carriers and radio components into low-power states while holding coverage and user quality, so energy cost falls without degrading experience.
- **Label:** For "RAN Energy Saving & Cell Sleep Optimisation": Decide when to put cells, carriers and radio components into low-power states while holding coverage and user quality, so energy cost falls without degrading experience. The reference kit's label belongs to a neighbouring problem and does not describe yours: A row is positive when the outcome is later confirmed (a confirmed fraud, a default, a churn). A positive's label arrives 7 to 21 days after the event; a negative is only confirmed after the full maturity window. Define your own label exactly as in M1. Design around this trap first: Counting before and after savings.
- **Sources:** - **Source:** Predicted load next hour inputs<br>**Owner:** Network engineering<br>**System Of Record:** OSS: inventory, fault and performance management<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: forecast uncertainty must be used.<br>- **Source:** Neighbour headroom inputs<br>**Owner:** OSS/BSS platform team<br>**System Of Record:** BSS: CRM, order management and billing<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: needs live status.<br>- **Source:** Coverage criticality inputs<br>**Owner:** Customer data office<br>**System Of Record:** Network element configuration and orchestration layer<br>**Ingestion:** CDC or event stream (Kafka) with 60 seconds freshness at p95<br>**Quality:** Point-in-time rule: use planning data.<br>- **Source:** Wake-up latency inputs<br>**Owner:** Network engineering<br>**System Of Record:** OSS: inventory, fault and performance management<br>**Ingestion:** API lookup with a cached snapshot and a stale-with-flag fallback<br>**Quality:** Point-in-time rule: hardware specific.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Counting before and after savings<br>- Ignoring coverage cells<br>- Skipping shadow mode
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
