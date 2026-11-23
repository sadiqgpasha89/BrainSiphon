# Prepaid Recharge & Top-up Prediction: model card and data card

> Generated from the blueprint `telecom/prepaid-recharge-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Prepaid Recharge & Top-up Prediction · **Domain:** telecom · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Predict the next recharge as the median interval of the last three recharges, because it is simple and effective.
- **Production model:** A survival model for time to next recharge combined with an amount model, producing intervals and a due-soon list for consented reminders and an aggregate liquidity forecast.
- **Intended use:** Predict when each prepaid customer will recharge and how much so offers, reminders and liquidity forecasts reflect real behaviour.
- **Out of scope:** - Customer name: irrelevant and private.<br>- SIM serial number: an identifier.<br>- Store location alone: weak link.
- **Primary metrics:** - Interval and amount error<br>- Calibration of the due-soon list<br>- Forecast coverage
- **Measured values (fill in):** ____________
- **Slices reported:** - Region, vendor and technology generation (4G or 5G)<br>- Subscriber segment, plan type and tenure<br>- Urban, suburban and rural cells and enterprise versus consumer traffic<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that each prediction interval covers its nominal share (80% interval covers 75 to 85% of actuals) overall, by horizon and by top segment; recalibrate with conformal adjustment when it does not.
- **Known failure modes:** - Dual-SIM users<br>- Promotion week<br>- Network outage
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
- **Purpose:** Predict when each prepaid customer will recharge and how much so offers, reminders and liquidity forecasts reflect real behaviour.
- **Label:** For "Prepaid Recharge & Top-up Prediction": Predict when each prepaid customer will recharge and how much so offers, reminders and liquidity forecasts reflect real behaviour. No reference kit models this label, so define it exactly as in M1. Design around this trap first: Counting zero recharge as churn.
- **Sources:** - **Source:** Days since last recharge inputs<br>**Owner:** Network engineering<br>**System Of Record:** OSS: inventory, fault and performance management<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: per customer.<br>- **Source:** Balance and burn rate inputs<br>**Owner:** OSS/BSS platform team<br>**System Of Record:** BSS: CRM, order management and billing<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: real-time balance.<br>- **Source:** Payday and calendar effects inputs<br>**Owner:** Customer data office<br>**System Of Record:** Network element configuration and orchestration layer<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: local calendar.<br>- **Source:** Recharge channel mix inputs<br>**Owner:** Network engineering<br>**System Of Record:** OSS: inventory, fault and performance management<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: aggregates only.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Counting zero recharge as churn<br>- Ignoring dual-SIM behaviour<br>- Targeting low balance customers with pressure
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
