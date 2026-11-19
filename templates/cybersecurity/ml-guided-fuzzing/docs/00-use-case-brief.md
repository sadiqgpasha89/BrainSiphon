# ML-Guided Fuzzing: use-case brief

> Generated from the blueprint `cybersecurity/ml-guided-fuzzing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** ML-Guided Fuzzing · **Domain:** cybersecurity · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Increase crash discovery per CPU hour by learning which inputs and mutations are most likely to reach new code. The system has to run as a scheduled batch job, inside these limits: Millions of executions per hour, Deterministic reproduction and Triage deduplication.

**Why it is hard.** The obvious approach is pure random mutation, and it fails because random wastes most executions on useless inputs. The second trap is in "Triage": the real signal is crash deduplication and exploitability ranking, while teams usually reach for raw crash counts.

**Scale and stakes.** At 10 million users this is about 30.0K model-touching events a day, 0 requests per second on average and 0 at peak, at an estimated $1.6K a month. A mistake is expensive in the way time to find regression measures it.

**What success looks like.** Offline: Unique crashes and new edges per CPU hour and Triage precision. Online: Bugs found per fuzz month and Time to find regression. The launch is judged on "Bugs found per fuzz month" while "Time to find regression" must not get worse.

## Objective, loss and constraints

**Business objective.** Increase crash discovery per CPU hour by learning which inputs and mutations are most likely to reach new code.

**Training objective.** `\max_\pi\;\mathbb{E}\!\left[\sum_t \text{new coverage}_t\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max_\pi | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \text{new coverage}_t | The new code paths reached by the test input chosen at step t; the policy is rewarded for exploring more of the program. |

**Hard constraints**

- Millions of executions per hour
- Deterministic reproduction
- Triage deduplication
- Safe sandbox

## The approach in one paragraph

Start with aFL-style coverage-guided fuzzing. Then earn the move to coverage-guided fuzzer with a learned mutation scheduler (bandit), grammar-based generator and crash triage classifier, and only if it beats the baseline on Unique crashes and new edges per CPU hour and Triage precision after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Coverage novelty reward | New edges per execution. Reward. Guard against: instrumentation. |
| Add Input structure features | Grammar-aware features. Smarter mutation. Guard against: parser. |
| Add Crash stack hash | Dedup key. Triage. Guard against: symbolisation. |
| Run it as one pipeline | Corpus manager (seed store), Mutation scheduler (bandit policy), Fuzz executors (sandbox fleet), Coverage monitor (instrumentation), Crash triager (dedup classifier), Security engineer (human) and Fixed bugs (feedback). |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle fuzz harness is shallow | Harness quality metrics and deeper entry points. |

**Deliberately not doing**

- Execution time per input: resource noise.
- Seed file name: none.

**How the approach is proven**

Prove it offline on Unique crashes and new edges per CPU hour and Triage precision using time-ordered splits, then online on "Bugs found per fuzz month" with "Time to find regression" as the guardrail. Watch for: Counting duplicate crashes as separate bugs and Benchmarks on toy targets.

## Baseline and production design

- **Baseline (build this first):** AFL-style coverage-guided fuzzing.
- **Production design:** Coverage-guided fuzzer with a learned mutation scheduler (bandit), grammar-based generator and crash triage classifier.

## Why AI, and why this kind

**Why AI.** Increase crash discovery per CPU hour by learning which inputs and mutations are most likely to reach new code. The evidence that separates good from bad outcomes (Coverage novelty reward, Input structure features, Crash stack hash) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "pure random mutation" are what teams reach for first, and they fail because random wastes most executions on useless inputs. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: Coverage-guided fuzzer with a learned mutation scheduler (bandit), grammar-based generator and crash triage classifier.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Coverage novelty reward, Input structure features, Crash stack hash and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: AFL-style coverage-guided fuzzing | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Coverage-guided fuzzer with a learned mutation scheduler (bandit), grammar-based generator and crash triage classifier | chosen | Meets the run-window envelope at $1.80 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Bugs found per fuzz month) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Counting duplicate crashes as separate bugs.
- Evaluation trap: Benchmarks on toy targets.
- Fuzz harness is shallow: coverage plateaus early.
- Flaky crashes not reproducible: non-reproducible crashes consume triage time and produce tickets nobody can act on.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
