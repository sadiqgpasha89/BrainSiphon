# Build Time Prediction and Cache Optimisation: use-case brief

> Generated from the blueprint `devtools/build-time-prediction-cache-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Build Time Prediction and Cache Optimisation · **Domain:** devtools · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict build times and find the targets that dominate them, then recommend cache and parallelisation changes that cut waiting time safely. The system has to run as a scheduled batch job, inside these limits: Prediction within 15% for 80% of builds, Cache changes never alter build outputs and Owners approve configuration changes.

**Why it is hard.** The obvious approach is faster at any cost, and it fails because wrong cache hits ship wrong software. The second trap is in "Target": the real signal is the critical path of the build, while teams usually reach for total CPU time.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way cache hit rate measures it.

**What success looks like.** Offline: Prediction error, Critical path accuracy and Output equality after changes. Online: Median build time, Cache hit rate and Compute cost. The launch is judged on "Median build time" while "Cache hit rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict build times and find the targets that dominate them, then recommend cache and parallelisation changes that cut waiting time safely.

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

- Prediction within 15% for 80% of builds
- Cache changes never alter build outputs
- Owners approve configuration changes
- Daily analysis of 2M builds

## The approach in one paragraph

Start with developers noticing slow builds and fixing them ad hoc, because it is the common practice. Then earn the move to a build analyser that predicts durations, ranks critical-path targets and suggests cache and splitting changes, tested against output hashes, and only if it beats the baseline on Prediction error and Critical path accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Target duration history | Time per build target. Critical path. Guard against: from build tools. |
| Add Dependency graph | The build graph. Path. Guard against: from build files. |
| Add Cache hit rate by target | Share of cache hits. Opportunity. Guard against: from the cache. |
| Run it as one pipeline | Build event ingestion (build system), Critical path analysis (graph analysis), Duration model (gradient boosting), Recommendation (rules and model), Output hash validation (test builds), Pull request with change (code host) and Savings tracking (monthly). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle non-hermetic builds | Hermeticity checks. |

**Deliberately not doing**

- Developer name: personal data.
- Build number: an identifier.
- Branch name: an artefact.

**How the approach is proven**

Prove it offline on Prediction error, Critical path accuracy and Output equality after changes using time-ordered splits, then online on "Median build time" with "Cache hit rate" as the guardrail. Watch for: Speed at any cost, CPU time as the target and Unverified cache keys.

## Baseline and production design

- **Baseline (build this first):** Developers noticing slow builds and fixing them ad hoc, because it is the common practice.
- **Production design:** A build analyser that predicts durations, ranks critical-path targets and suggests cache and splitting changes, tested against output hashes.

## Why AI, and why this kind

**Why AI.** Predict build times and find the targets that dominate them, then recommend cache and parallelisation changes that cut waiting time safely. The evidence that separates good from bad outcomes (Target duration history, Dependency graph, Cache hit rate by target) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "faster at any cost" are what teams reach for first, and they fail because wrong cache hits ship wrong software. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: A build analyser that predicts durations, ranks critical-path targets and suggests cache and splitting changes, tested against output hashes.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Target duration history, Dependency graph, Cache hit rate by target and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Developers noticing slow builds and fixing them ad hoc, because it is the common practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A build analyser that predicts durations, ranks critical-path targets and suggests cache and splitting changes, tested against output hashes | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Median build time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Speed at any cost.
- Evaluation trap: CPU time as the target.
- Non-hermetic builds: cache keys miss inputs.
- Rare targets: little data exists.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
