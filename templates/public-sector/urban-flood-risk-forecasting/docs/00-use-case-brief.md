# Urban Flood Risk Forecasting: use-case brief

> Generated from the blueprint `public-sector/urban-flood-risk-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Urban Flood Risk Forecasting · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Forecast street-level flood risk from rainfall forecasts, drainage state and river levels so the city can pre-position pumps, close roads and warn residents in time. The system has to run as a scheduled batch job, inside these limits: Risk maps for the next 6 hours updated every 15 minutes, Warnings issued by named duty officers and Intervals and scenario ranges shown.

**Why it is hard.** The obvious approach is rainfall totals, and it fails because totals do not show where water collects. The second trap is in "Model": the real signal is a drainage network model with learned corrections, while teams usually reach for a pure statistical map.

**Scale and stakes.** At 10 million users this is about 288.0M model-touching events a day, 3.3K requests per second on average and 3.3K at peak, at an estimated $16.4K a month. A mistake is expensive in the way warning lead time measures it.

**What success looks like.** Offline: Flooded street detection against observed events, Lead time and Calibration. Online: Properties flooded, Warning lead time and Pump deployment accuracy. The launch is judged on "Properties flooded" while "Warning lead time" must not get worse.

## Objective, loss and constraints

**Business objective.** Forecast street-level flood risk from rainfall forecasts, drainage state and river levels so the city can pre-position pumps, close roads and warn residents in time.

**Training objective.** `\mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ECE} | Expected calibration error: the average gap between predicted probability and observed frequency across probability bins. |

**Hard constraints**

- Risk maps for the next 6 hours updated every 15 minutes
- Warnings issued by named duty officers
- Intervals and scenario ranges shown
- Works with sparse gauges
- 50K drainage assets

## The approach in one paragraph

Start with fixed rainfall thresholds for alerts by catchment, because they are the standard trigger. Then earn the move to a hybrid hydraulic and learned model that predicts flooded streets with scenario ranges, links to pump and crew planning and keeps a duty officer in charge of warnings, and only if it beats the baseline on Flooded street detection against observed events and Lead time after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Rainfall nowcast and forecast | Radar and model rainfall. Main driver. Guard against: from weather services. |
| Add Drain and pump status | Blocked drains and pump availability. Capacity. Guard against: from telemetry and work orders. |
| Add River and tide levels | Gauge levels. Boundary condition. Guard against: from gauges. |
| Run it as one pipeline | Rainfall and gauge ingestion (weather and telemetry), Network state (asset and work order data), Hydraulic simulation (drainage model), Learned correction (gradient boosting), Risk map (operations dashboard), Duty officer warning (alert system) and Post-event verification (reports and imagery). |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle blocked drain | Telemetry and a complaint-based update. |

**Deliberately not doing**

- Gauge name: an identifier.
- Report author: irrelevant.
- Map style: an artefact.

**How the approach is proven**

Prove it offline on Flooded street detection against observed events, Lead time and Calibration using time-ordered splits, then online on "Properties flooded" with "Warning lead time" as the guardrail. Watch for: Rainfall thresholds only, Map without actions and Ignoring drain state.

## Baseline and production design

- **Baseline (build this first):** Fixed rainfall thresholds for alerts by catchment, because they are the standard trigger.
- **Production design:** A hybrid hydraulic and learned model that predicts flooded streets with scenario ranges, links to pump and crew planning and keeps a duty officer in charge of warnings.

## Why AI, and why this kind

**Why AI.** Forecast street-level flood risk from rainfall forecasts, drainage state and river levels so the city can pre-position pumps, close roads and warn residents in time. The evidence that separates good from bad outcomes (Rainfall nowcast and forecast, Drain and pump status, River and tide levels) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "rainfall totals" are what teams reach for first, and they fail because totals do not show where water collects. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: A hybrid hydraulic and learned model that predicts flooded streets with scenario ranges, links to pump and crew planning and keeps a duty officer in charge of warnings.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Rainfall nowcast and forecast, Drain and pump status, River and tide levels and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed rainfall thresholds for alerts by catchment, because they are the standard trigger | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A hybrid hydraulic and learned model that predicts flooded streets with scenario ranges, links to pump and crew planning and keeps a duty officer in charge of warnings | chosen | Meets the run-window envelope at $0.0019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Properties flooded) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Rainfall thresholds only.
- Evaluation trap: Map without actions.
- Blocked drain: capacity is lower than modelled.
- Extreme rainfall: the event is beyond history.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
