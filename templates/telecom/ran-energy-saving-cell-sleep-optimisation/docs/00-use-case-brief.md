# RAN Energy Saving & Cell Sleep Optimisation: use-case brief

> Generated from the blueprint `telecom/ran-energy-saving-cell-sleep-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** RAN Energy Saving & Cell Sleep Optimisation · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Decide when to put cells, carriers and radio components into low-power states while holding coverage and user quality, so energy cost falls without degrading experience. The system has to run interactively, within a few seconds, inside these limits: Quality guardrails on throughput, accessibility and drop rate, Coverage cells never sleep and emergency services stay reachable and Every state change reversible within seconds.

**Why it is hard.** The obvious approach is energy saved alone, and it fails because savings that hurt experience raise churn and complaints. The second trap is in "Constraint": the real signal is neighbour cells able to take the load, while teams usually reach for sleep when load is low.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $3.8K a month. A mistake is expensive in the way customer quality complaints in sleep areas measures it.

**What success looks like.** Offline: Energy saved against matched controls, Guardrail breach rate and Forecast quantile coverage. Online: Energy cost per site, Customer quality complaints in sleep areas and Wake-up events. The launch is judged on "Energy cost per site" while "Customer quality complaints in sleep areas" must not get worse.

## Objective, loss and constraints

**Business objective.** Decide when to put cells, carriers and radio components into low-power states while holding coverage and user quality, so energy cost falls without degrading experience.

**Training objective.** `\mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{y}_t | The model's prediction of y. (one value per time step or token t) |

**Hard constraints**

- Quality guardrails on throughput, accessibility and drop rate
- Coverage cells never sleep and emergency services stay reachable
- Every state change reversible within seconds
- Policy decisions every 15 minutes for 200K cells

## The approach in one paragraph

Start with a static schedule that sleeps capacity layers at night where load is below a fixed threshold, because it is already deployed and sets the savings floor. Then earn the move to a contextual bandit or constrained policy over load forecasts and neighbour headroom with hard guardrails, shadow mode first, matched-control evaluation and an instant revert on KPI breach, and only if it beats the baseline on Energy saved against matched controls and Guardrail breach rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Predicted load next hour | Forecast of users and traffic for the cell. Safe sleep needs low demand. Guard against: forecast uncertainty must be used. |
| Add Neighbour headroom | Spare capacity on overlapping cells. Absorbs the traffic. Guard against: needs live status. |
| Add Coverage criticality | Share of area covered only by this cell. Prevents holes. Guard against: use planning data. |
| Run it as one pipeline | KPI and energy ingestion (streaming), Load forecast (time-series model), Candidate set and guardrails (rule layer), Policy selection (constrained bandit), Action push (RAN controller), Quality monitor and revert (closed-loop) and Savings attribution (matched controls). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle unexpected event | Fast wake-up trigger on load and a conservative forecast quantile. |

**Deliberately not doing**

- Cell name: an identifier.
- Weekday number alone: captured by load forecast.
- Operator on duty: unrelated.

**How the approach is proven**

Prove it offline on Energy saved against matched controls, Guardrail breach rate and Forecast quantile coverage using time-ordered splits, then online on "Energy cost per site" with "Customer quality complaints in sleep areas" as the guardrail. Watch for: Counting before and after savings, Ignoring coverage cells and Skipping shadow mode.

## Baseline and production design

- **Baseline (build this first):** A static schedule that sleeps capacity layers at night where load is below a fixed threshold, because it is already deployed and sets the savings floor.
- **Production design:** A contextual bandit or constrained policy over load forecasts and neighbour headroom with hard guardrails, shadow mode first, matched-control evaluation and an instant revert on KPI breach.

## Why AI, and why this kind

**Why AI.** Decide when to put cells, carriers and radio components into low-power states while holding coverage and user quality, so energy cost falls without degrading experience. The evidence that separates good from bad outcomes (Predicted load next hour, Neighbour headroom, Coverage criticality) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "energy saved alone" are what teams reach for first, and they fail because savings that hurt experience raise churn and complaints. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: A contextual bandit or constrained policy over load forecasts and neighbour headroom with hard guardrails, shadow mode first, matched-control evaluation and an instant revert on KPI breach.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Predicted load next hour, Neighbour headroom, Coverage criticality and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A static schedule that sleeps capacity layers at night where load is below a fixed threshold, because it is already deployed and sets the savings floor | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A contextual bandit or constrained policy over load forecasts and neighbour headroom with hard guardrails, shadow mode first, matched-control evaluation and an instant revert on KPI breach | chosen | Meets the 2500 ms envelope at $0.084 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Energy cost per site) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Counting before and after savings.
- Evaluation trap: Ignoring coverage cells.
- Unexpected event: crowd arrives at a sleeping cell.
- Neighbour failure: the backup cell is down.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
