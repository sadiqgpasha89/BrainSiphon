# Injection Moulding Parameter Tuning: use-case brief

> Generated from the blueprint `manufacturing/injection-moulding-parameter-tuning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Injection Moulding Parameter Tuning · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Suggest machine parameter changes for injection moulding to hold part quality as material and temperature drift, reducing setup time and scrap. The system has to run interactively, within a few seconds, inside these limits: Suggested changes within validated ranges, The setter approves each change and Part quality checks after every change.

**Why it is hard.** The obvious approach is fixed parameters all day, and it fails because material and temperature drift continuously. The second trap is in "Search": the real signal is a small, safe set of parameter moves, while teams usually reach for free exploration.

**Scale and stakes.** At 10 million users this is about 18.0M model-touching events a day, 208 requests per second on average and 1.3K at peak, at an estimated $5.9K a month. A mistake is expensive in the way setup time measures it.

**What success looks like.** Offline: Quality hold rate after suggested moves, Move acceptance and success and Drift detection lead time. Online: Scrap rate, Setup time and Setter interventions per shift. The launch is judged on "Scrap rate" while "Setup time" must not get worse.

## Objective, loss and constraints

**Business objective.** Suggest machine parameter changes for injection moulding to hold part quality as material and temperature drift, reducing setup time and scrap.

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

- Suggested changes within validated ranges
- The setter approves each change
- Part quality checks after every change
- Suggestion within 10 s of a drift alert
- 800 machines

## The approach in one paragraph

Start with manual adjustments by setters guided by a parameter sheet, because it reflects tacit expertise and the benchmark. Then earn the move to a contextual bandit over a small safe move set with cavity-pressure and quality feedback, setter approval and a rollback on any quality drop, and only if it beats the baseline on Quality hold rate after suggested moves and Move acceptance and success after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Cavity pressure curve features | Peak and integral of the cavity pressure curve. Fill and pack quality. Guard against: per tool. |
| Add Cycle time and cushion | Injection cycle time and cushion size. Process stability. Guard against: from the machine. |
| Add Melt and mould temperatures | Measured temperatures per zone. Material state. Guard against: sensor drift check. |
| Run it as one pipeline | Cycle data capture (machine controller), Drift detection (cavity pressure features), Move proposal (constrained bandit), Safe range check (rules), Setter approval (HMI), Part quality check (inspection) and Learning update (nightly). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle tool wear | Tool-life features and a maintenance trigger. |

**Deliberately not doing**

- Machine name: an identifier.
- Setter name: not a driver.
- Shot counter: a counter.

**How the approach is proven**

Prove it offline on Quality hold rate after suggested moves, Move acceptance and success and Drift detection lead time using time-ordered splits, then online on "Scrap rate" with "Setup time" as the guardrail. Watch for: Free exploration in production, Trusting machine status as quality and Ignoring tool wear.

## Baseline and production design

- **Baseline (build this first):** Manual adjustments by setters guided by a parameter sheet, because it reflects tacit expertise and the benchmark.
- **Production design:** A contextual bandit over a small safe move set with cavity-pressure and quality feedback, setter approval and a rollback on any quality drop.

## Why AI, and why this kind

**Why AI.** Suggest machine parameter changes for injection moulding to hold part quality as material and temperature drift, reducing setup time and scrap. The evidence that separates good from bad outcomes (Cavity pressure curve features, Cycle time and cushion, Melt and mould temperatures) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "fixed parameters all day" are what teams reach for first, and they fail because material and temperature drift continuously. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: A contextual bandit over a small safe move set with cavity-pressure and quality feedback, setter approval and a rollback on any quality drop.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Cavity pressure curve features, Cycle time and cushion, Melt and mould temperatures and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual adjustments by setters guided by a parameter sheet, because it reflects tacit expertise and the benchmark | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A contextual bandit over a small safe move set with cavity-pressure and quality feedback, setter approval and a rollback on any quality drop | chosen | Meets the 2500 ms envelope at $0.011 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Scrap rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Free exploration in production.
- Evaluation trap: Trusting machine status as quality.
- Tool wear: optimal parameters shift slowly.
- New material: prior moves do not apply.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
