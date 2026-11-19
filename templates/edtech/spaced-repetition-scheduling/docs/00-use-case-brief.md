# Spaced Repetition Scheduling: use-case brief

> Generated from the blueprint `edtech/spaced-repetition-scheduling` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Spaced Repetition Scheduling · **Domain:** edtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Schedule reviews of vocabulary, facts and skills at the moment forgetting is likely, maximising retention per minute of study. The system has to run in under 100 milliseconds, inside these limits: Per-item memory state for millions of learners, Scheduling in 20 ms and Daily review caps.

**Why it is hard.** The obvious approach is fixed Leitner intervals, and it fails because items differ in difficulty and learners in memory strength. The second trap is in "Target": the real signal is retention target (e.g. 90%) tuned to workload, while teams usually reach for maximal frequency.

**Scale and stakes.** At 10 million users this is about 90.0M model-touching events a day, 1.0K requests per second on average and 6.3K at peak, at an estimated $4.7K a month. A mistake is expensive in the way study minutes per retained item measures it.

**What success looks like.** Offline: Log-loss and calibration of recall predictions and Retention at fixed workload. Online: Retention at 30 days and Study minutes per retained item. The launch is judged on "Retention at 30 days" while "Study minutes per retained item" must not get worse.

## Objective, loss and constraints

**Business objective.** Schedule reviews of vocabulary, facts and skills at the moment forgetting is likely, maximising retention per minute of study.

**Training objective.** `\mathcal{L}=-\sum_t\left[y_t\log R_t+(1-y_t)\log(1-R_t)\right],\ R_t=\exp\!\left(-\Delta t/S_t\right)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| y_t | The review outcome: 1 if recalled, 0 if forgotten. |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| R_t | The probability that the learner recalls the item at time t: R_t = exp(-Delta t / S_t). |
| \exp | Exponential function: e raised to the power shown. |
| \Delta | The time since the last review. |
| t | Review number. |
| S_t | Memory stability: how slowly this item is forgotten; higher means longer intervals. |

**Hard constraints**

- Per-item memory state for millions of learners
- Scheduling in 20 ms
- Daily review caps
- Interpretable intervals

## The approach in one paragraph

Start with fixed expanding intervals (SM-2). Then earn the move to fSRS-style memory model trained on review logs, scheduler targeting a desired retention with workload smoothing, personalised per learner, and only if it beats the baseline on Log-loss and calibration of recall predictions and Retention at fixed workload after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Elapsed time since last review | Days since review. Forgetting. Guard against: server time. |
| Add Item stability estimate | Model memory stability. Interval. Guard against: fit. |
| Add Recent review outcome history | Last four grades. State. Guard against: order. |
| Run it as one pipeline | Memory state store (key-value), Memory model (DSR), Scheduler (target retention) and Workload balancer (caps), with Review events, Review queue and Review logs off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle learner returns after months away | Triage by retention loss and gradual re-entry plan. |

**Deliberately not doing**

- Card text length: weak.
- Deck name: none.

**How the approach is proven**

Prove it offline on Log-loss and calibration of recall predictions and Retention at fixed workload using time-ordered splits, then online on "Retention at 30 days" with "Study minutes per retained item" as the guardrail. Watch for: Predicting recall on items that scheduling selected and Ignoring review-order effects.

## Baseline and production design

- **Baseline (build this first):** Fixed expanding intervals (SM-2).
- **Production design:** FSRS-style memory model trained on review logs, scheduler targeting a desired retention with workload smoothing, personalised per learner.

## Why AI, and why this kind

**Why AI.** Schedule reviews of vocabulary, facts and skills at the moment forgetting is likely, maximising retention per minute of study. The evidence that separates good from bad outcomes (Elapsed time since last review, Item stability estimate, Recent review outcome history) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "fixed Leitner intervals" are what teams reach for first, and they fail because items differ in difficulty and learners in memory strength. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: FSRS-style memory model trained on review logs, scheduler targeting a desired retention with workload smoothing, personalised per learner.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Elapsed time since last review, Item stability estimate, Recent review outcome history and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed expanding intervals (SM-2) | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| FSRS-style memory model trained on review logs, scheduler targeting a desired retention with workload smoothing, personalised per learner | chosen | Meets the 80 ms envelope at $0.0018 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Retention at 30 days) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Predicting recall on items that scheduling selected.
- Evaluation trap: Ignoring review-order effects.
- Learner returns after months away: backlog of thousands of due items.
- Clock changes or time zones: intervals miscomputed.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
