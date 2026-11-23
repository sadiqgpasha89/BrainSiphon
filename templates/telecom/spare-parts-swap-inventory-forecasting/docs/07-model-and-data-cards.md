# Spare Parts & Swap Inventory Forecasting: model card and data card

> Generated from the blueprint `telecom/spare-parts-swap-inventory-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Spare Parts & Swap Inventory Forecasting · **Domain:** telecom · **Latency tier:** batch · **Difficulty:** advanced

Pre-filled where the blueprint knows the answer. Complete the blanks with measured values before the card is published inside your organisation.

## Model card

- **Name and version:** ____________
- **Owner:** ____________
- **Baseline model:** Reorder-point rules from average usage and a safety factor, because the supply team already uses them.
- **Production model:** A hierarchical forecast with intermittent demand methods driven by installed base, with lead time scenarios and a stocking optimiser by depot.
- **Intended use:** Forecast the demand for spare parts, modems and swap units by depot and part so stock-outs and write-offs both fall.
- **Out of scope:** - Depot manager: irrelevant.<br>- Part colour: irrelevant.<br>- Order number: an identifier.
- **Primary metrics:** - Weighted quantile loss<br>- Stock-out rate at service level<br>- Bias
- **Measured values (fill in):** ____________
- **Slices reported:** - Region, vendor and technology generation (4G or 5G)<br>- Subscriber segment, plan type and tenure<br>- Urban, suburban and rural cells and enterprise versus consumer traffic<br>- Report the metric and its interval on each slice; flag any slice whose gap to the overall result exceeds the agreed tolerance
- **Calibration:** Check that each prediction interval covers its nominal share (80% interval covers 75 to 85% of actuals) overall, by horizon and by top segment; recalibrate with conformal adjustment when it does not.
- **Known failure modes:** - New part<br>- Supplier disruption<br>- Return of repaired parts
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
- **Purpose:** Forecast the demand for spare parts, modems and swap units by depot and part so stock-outs and write-offs both fall.
- **Label:** For "Spare Parts & Swap Inventory Forecasting": Forecast the demand for spare parts, modems and swap units by depot and part so stock-outs and write-offs both fall. The reference kit's label belongs to a neighbouring problem and does not describe yours: The target is the observed value on day t+h divided by the series' recent average at forecast origin t, so one model serves every series. Capped days are excluded. Define your own label exactly as in M1. Design around this trap first: Fixed lead times.
- **Sources:** - **Source:** Installed base by age inputs<br>**Owner:** Network engineering<br>**System Of Record:** OSS: inventory, fault and performance management<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from asset records.<br>- **Source:** Failure rate by part type inputs<br>**Owner:** OSS/BSS platform team<br>**System Of Record:** BSS: CRM, order management and billing<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from repair data.<br>- **Source:** Supplier lead time inputs<br>**Owner:** Customer data office<br>**System Of Record:** Network element configuration and orchestration layer<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from purchase orders.<br>- **Source:** Planned rollout inputs<br>**Owner:** Network engineering<br>**System Of Record:** OSS: inventory, fault and performance management<br>**Ingestion:** Daily partition (CDC snapshot or file drop) with a manifest and row counts<br>**Quality:** Point-in-time rule: from the project plan.
- **Time coverage and refresh:** ____________
- **Known gaps and biases:** - Fixed lead times<br>- Using averages for slow parts<br>- Ignoring the repair loop
- **Privacy and deletion:** Subscriber identifiers pseudonymised before model use, location data aggregated or purpose-limited, retention enforced per record class and agents see only the fields a task needs. Deletion requests propagate by key to feature stores, embeddings, caches and training snapshots, with a measured deletion latency.
- **Maintenance owner and cadence:** ____________

## Changes since the last card

| Date | Change | Author |
|---|---|---|
| | | |
