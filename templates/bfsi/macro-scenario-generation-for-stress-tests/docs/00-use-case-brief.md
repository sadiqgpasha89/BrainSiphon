# Macroeconomic Scenario Generation for Stress Tests: use-case brief

> Generated from the blueprint `bfsi/macro-scenario-generation-for-stress-tests` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Macroeconomic Scenario Generation for Stress Tests · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Generate internally consistent macroeconomic paths for stress testing, translating a narrative (for example a property crash) into variables used by credit and market models. The system has to run as a scheduled batch job, inside these limits: Paths must be internally coherent (GDP, unemployment, rates, house prices), Regulator scenarios reproduced exactly and Scenario rationale documented.

**Why it is hard.** The obvious approach is independent shocks to each variable, and it fails because independent shocks create combinations that never occur. The second trap is in "Severity": the real signal is plausible but severe, calibrated to historical depth, while teams usually reach for arbitrary large shocks.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.9K a month. A mistake is expensive in the way reviewer acceptance rate measures it.

**What success looks like.** Offline: Out-of-sample path likelihood and Consistency checks pass rate. Online: Time to produce a scenario set and Reviewer acceptance rate. The launch is judged on "Time to produce a scenario set" while "Reviewer acceptance rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Generate internally consistent macroeconomic paths for stress testing, translating a narrative (for example a property crash) into variables used by credit and market models.

**Training objective.** `\mathcal{L}=\sum_t\mathrm{MSE}(\hat{x}_t,x_t)+\lambda\,\mathrm{KL}(q\|p)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{MSE} | Mean squared error: the average of squared differences between prediction and truth. |
| \hat{x}_t | The reconstruction of the input x produced by the decoder. (one value per time step or token t) |
| x_t | The input features describing one example (what the model sees). (one value per time step or token t) |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{KL} | Kullback-Leibler divergence: how far one probability distribution is from another (zero when they are identical). |
| q | Quantile level between 0 and 1, for example 0.9 for the 90th percentile. |
| \\|x\\| | Norm: the length of a vector. The squared norm of a difference is the sum of squared errors. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |

**Hard constraints**

- Paths must be internally coherent (GDP, unemployment, rates, house prices)
- Regulator scenarios reproduced exactly
- Scenario rationale documented
- Reviewed by the economics team

## The approach in one paragraph

Start with regulator-provided scenarios and a scalar severity multiplier, because they are mandated. Then earn the move to a Bayesian VAR with regime switching for joint paths, an analogue library for severity checks and an LLM assistant that drafts narratives and proposes shocks for economist approval, and only if it beats the baseline on Out-of-sample path likelihood and Consistency checks pass rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around VAR impulse responses | Estimated responses of variables to a shock to one variable. Preserves co-movement. Guard against: short histories give unstable estimates. |
| Add Historical analogues | Paths from past crises matched on shock type. Anchors severity. Guard against: few crises exist per country. |
| Add Regime indicator | Probability of expansion or contraction state. Changes response magnitudes. Guard against: regime labelling is subjective. |
| Run it as one pipeline | Macro data ingest (national statistics and market feeds), Historical store (time-series database), Joint path generator (Bayesian VAR with regimes), Analogue matcher (nearest-crisis search), Narrative drafter (LLM with retrieval) and Scenario library (versioned store), with Economist review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle structural break | Break tests and re-estimation windows. |

**Deliberately not doing**

- Daily market noise: irrelevant for quarterly paths.
- Social sentiment: too noisy for macro drivers.
- Forecaster consensus stale values: already priced into baselines.

**How the approach is proven**

Prove it offline on Out-of-sample path likelihood and Consistency checks pass rate using time-ordered splits, then online on "Time to produce a scenario set" with "Reviewer acceptance rate" as the guardrail. Watch for: Fitting on 2010-2019 gives mild shocks and LLM-drafted shocks may be fluent but not calibrated.

## Baseline and production design

- **Baseline (build this first):** Regulator-provided scenarios and a scalar severity multiplier, because they are mandated.
- **Production design:** A Bayesian VAR with regime switching for joint paths, an analogue library for severity checks and an LLM assistant that drafts narratives and proposes shocks for economist approval.

## Why AI, and why this kind

**Why AI.** Generate internally consistent macroeconomic paths for stress testing, translating a narrative (for example a property crash) into variables used by credit and market models. The evidence that separates good from bad outcomes (VAR impulse responses, Historical analogues, Regime indicator) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "independent shocks to each variable" are what teams reach for first, and they fail because independent shocks create combinations that never occur. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: A Bayesian VAR with regime switching for joint paths, an analogue library for severity checks and an LLM assistant that drafts narratives and proposes shocks for economist approval.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among VAR impulse responses, Historical analogues, Regime indicator and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Regulator-provided scenarios and a scalar severity multiplier, because they are mandated | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A Bayesian VAR with regime switching for joint paths, an analogue library for severity checks and an LLM assistant that drafts narratives and proposes shocks for economist approval | chosen | Meets the run-window envelope at $0.214 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to produce a scenario set) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Fitting on 2010-2019 gives mild shocks.
- Evaluation trap: LLM-drafted shocks may be fluent but not calibrated.
- Structural break: pre-break relationships no longer hold.
- Missing data for emerging markets: short or revised histories.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
