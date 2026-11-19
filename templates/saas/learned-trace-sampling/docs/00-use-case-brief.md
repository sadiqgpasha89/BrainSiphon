# Learned Trace & Telemetry Sampling: use-case brief

> Generated from the blueprint `saas/learned-trace-sampling` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Learned Trace & Telemetry Sampling · **Domain:** saas · **Latency tier:** sub-10ms · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Decide in real time which traces and logs to keep so that rare errors and slow requests are retained while costs drop by 80%. The system has to run in under 10 milliseconds, inside these limits: Decision under 100 microseconds, Trillions of spans and Tail-based sampling needs buffering.

**Why it is hard.** The obvious approach is uniform sampling, and it fails because uniform sampling drops the rare traces that matter. The second trap is in "Placement": the real signal is decide at the collector with buffered traces, while teams usually reach for head sampling only.

**Scale and stakes.** At 10 million users this is about 300000.0M model-touching events a day, 3.5M requests per second on average and 27.8M at peak, at an estimated $10.15M a month. A mistake is expensive in the way observability cost measures it.

**What success looks like.** Offline: Retention rate of anomalous traces at budget and Storage savings. Online: Debug success with sampled data and Observability cost. The launch is judged on "Debug success with sampled data" while "Observability cost" must not get worse.

## Objective, loss and constraints

**Business objective.** Decide in real time which traces and logs to keep so that rare errors and slow requests are retained while costs drop by 80%.

**Training objective.** `\max\;\sum_r v_r\,\mathbb{1}[\text{keep}_r]\ \text{s.t. budget}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \sum_r | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| v_r | The value of keeping trace r, for example how informative it is. |
| \mathbb{1} | Indicator: equals 1 when the condition in the brackets is true and 0 otherwise. |
| \text{keep}_r | Whether trace r is kept (1) or dropped (0). |

**Hard constraints**

- Decision under 100 microseconds
- Trillions of spans
- Tail-based sampling needs buffering
- Cost budget

## The approach in one paragraph

Start with head-based 1% uniform sampling. Then earn the move to tail-sampling collectors with learned keep-probabilities from rarity, error and latency features, budget-constrained by controller, and only if it beats the baseline on Retention rate of anomalous traces at budget and Storage savings after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Error and latency outlier flags | Error status, latency percentiles. Retain. Guard against: thresholds. |
| Add Path rarity | Rarity of call path. Novelty. Guard against: sketches. |
| Add Customer or SLO importance | Tier of tenant. Priority. Guard against: config. |
| Run it as one pipeline | Span ingestion (collectors), Trace assembler (buffer), Value estimator (small model), Budget controller (keep probability), Sampler (decision) and Storage (trace backend), with Retention feedback off the critical path. |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle buffer memory exhausted during spikes | Backpressure policies with priority classes. |

**Deliberately not doing**

- Trace ID: random.
- Span count: weak.

**How the approach is proven**

Prove it offline on Retention rate of anomalous traces at budget and Storage savings using time-ordered splits, then online on "Debug success with sampled data" with "Observability cost" as the guardrail. Watch for: Evaluating on already-sampled data and Ignoring rare path coverage.

## Baseline and production design

- **Baseline (build this first):** Head-based 1% uniform sampling.
- **Production design:** Tail-sampling collectors with learned keep-probabilities from rarity, error and latency features, budget-constrained by controller.

## Why AI, and why this kind

**Why AI.** Decide in real time which traces and logs to keep so that rare errors and slow requests are retained while costs drop by 80%. The evidence that separates good from bad outcomes (Error and latency outlier flags, Path rarity, Customer or SLO importance) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "uniform sampling" are what teams reach for first, and they fail because uniform sampling drops the rare traces that matter. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Tail-sampling collectors with learned keep-probabilities from rarity, error and latency features, budget-constrained by controller.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Error and latency outlier flags, Path rarity, Customer or SLO importance and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Head-based 1% uniform sampling | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Tail-sampling collectors with learned keep-probabilities from rarity, error and latency features, budget-constrained by controller | chosen | Meets the 8 ms envelope at $0.0011 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Debug success with sampled data) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating on already-sampled data.
- Evaluation trap: Ignoring rare path coverage.
- Buffer memory exhausted during spikes: traces dropped unpredictably.
- Incident produces a flood of identical errors: budget consumed by duplicates.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
