# Cross-Channel Budget Allocation with Bandits: use-case brief

> Generated from the blueprint `adtech/cross-channel-budget-allocation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Cross-Channel Budget Allocation with Bandits · **Domain:** adtech · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Shift weekly budget between channels using experimentation-informed bandit policies to maximise incremental outcomes. The system has to run as a scheduled batch job, inside these limits: Channel minimums, Measurement lag and Interference between channels.

**Why it is hard.** The obvious approach is platform-reported conversions, and it fails because platforms over-claim conversions. The second trap is in "Safety": the real signal is constrained exploration, while teams usually reach for unconstrained reallocation.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way allocation stability measures it.

**What success looks like.** Offline: Simulated regret and Agreement with incrementality tests. Online: Incremental conversions at constant spend and Allocation stability. The launch is judged on "Incremental conversions at constant spend" while "Allocation stability" must not get worse.

## Objective, loss and constraints

**Business objective.** Shift weekly budget between channels using experimentation-informed bandit policies to maximise incremental outcomes.

**Training objective.** `\text{regret}=\sum_t\left(\max_a\mu_a-\mu_{a_t}\right)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \text{regret} | Regret: total reward lost by not always picking the best channel. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \max_a | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \mu_a | Expected reward of a channel; mu_a for channel a and mu_{a_t} for the channel chosen at round t. |

**Hard constraints**

- Channel minimums
- Measurement lag
- Interference between channels
- Weekly cadence

## The approach in one paragraph

Start with fixed budget split by channel. Then earn the move to bayesian bandit on incrementality-calibrated returns with exploration bounds and MMM prior, and only if it beats the baseline on Simulated regret and Agreement with incrementality tests after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Channel incremental ROAS | Experiment-based. True return. Guard against: experiments. |
| Add Posterior uncertainty | Variance of ROAS. Exploration. Guard against: bayesian. |
| Add Platform-claimed vs incremental ratio | Inflation factor. Calibration. Guard against: tests. |
| Run it as one pipeline | Channel data (APIs), Incrementality calibrator (lift tests), Bayesian bandit (Thompson), Constraint checker (minimums), Budget changes (ad platforms), Marketing lead (human) and Outcome measurement (geo tests). |
| Optimise the right thing | The objective weighs regret: total reward lost by not always picking the best channel, so the model is trained on the cost of the decision and not on a generic score. |
| Handle measurement lag hides negative effect of a shift | Gradual shifts with early-warning guardrails. |

**Deliberately not doing**

- Channel name: none.
- Platform dashboard totals: biased.

**How the approach is proven**

Prove it offline on Simulated regret and Agreement with incrementality tests using time-ordered splits, then online on "Incremental conversions at constant spend" with "Allocation stability" as the guardrail. Watch for: Using platform-reported conversions as rewards and No exploration constraints.

## Baseline and production design

- **Baseline (build this first):** Fixed budget split by channel.
- **Production design:** Bayesian bandit on incrementality-calibrated returns with exploration bounds and MMM prior.

## Why AI, and why this kind

**Why AI.** Shift weekly budget between channels using experimentation-informed bandit policies to maximise incremental outcomes. The evidence that separates good from bad outcomes (Channel incremental ROAS, Posterior uncertainty, Platform-claimed vs incremental ratio) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "platform-reported conversions" are what teams reach for first, and they fail because platforms over-claim conversions. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: Bayesian bandit on incrementality-calibrated returns with exploration bounds and MMM prior.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Channel incremental ROAS, Posterior uncertainty, Platform-claimed vs incremental ratio and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed budget split by channel | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Bayesian bandit on incrementality-calibrated returns with exploration bounds and MMM prior | chosen | Meets the run-window envelope at $0.018 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Incremental conversions at constant spend) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using platform-reported conversions as rewards.
- Evaluation trap: No exploration constraints.
- Measurement lag hides negative effect of a shift: damage found weeks late.
- Interference: social ads lift search conversions: channel credit misallocated.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
