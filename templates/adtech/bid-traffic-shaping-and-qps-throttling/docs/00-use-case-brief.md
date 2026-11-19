# Bid Traffic Shaping & QPS Throttling: use-case brief

> Generated from the blueprint `adtech/bid-traffic-shaping-and-qps-throttling` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Bid Traffic Shaping & QPS Throttling · **Domain:** adtech · **Latency tier:** sub-10ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Decide which bid requests to process or drop at ingestion to cut infrastructure cost while retaining most of the value. The system has to run in under 10 milliseconds, inside these limits: Decision under 0.5 ms, Hundreds of millions of requests per second across exchanges and Value estimates stale.

**Why it is hard.** The obvious approach is random sampling, and it fails because random sampling discards high-value traffic at the same rate. The second trap is in "Feedback": the real signal is learn value from won outcomes with exploration, while teams usually reach for static allow-lists.

**Scale and stakes.** At 10 million users this is about 120.0M model-touching events a day, 1.4K requests per second on average and 11.1K at peak, at an estimated $5.4K a month. A mistake is expensive in the way win volume retained measures it.

**What success looks like.** Offline: Value retained vs requests processed and Simulated cost savings. Online: Infrastructure cost per won impression and Win volume retained. The launch is judged on "Infrastructure cost per won impression" while "Win volume retained" must not get worse.

## Objective, loss and constraints

**Business objective.** Decide which bid requests to process or drop at ingestion to cut infrastructure cost while retaining most of the value.

**Training objective.** `\max_{\pi}\;\sum_r v_r\,\mathbb{1}[\text{process}_r]-\lambda\,\text{cost}\ \text{s.t. QPS}\le Q`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max_{\pi} | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \sum_r | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| v_r | The value of processing bid request r. |
| \mathbb{1} | Indicator: equals 1 when the condition in the brackets is true and 0 otherwise. |
| \text{process}_r | Whether request r is processed (1) or dropped (0). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \text{cost} | Compute cost of processing the requests. |
| Q | The maximum queries per second the system can handle. |

**Hard constraints**

- Decision under 0.5 ms
- Hundreds of millions of requests per second across exchanges
- Value estimates stale
- Exchange rate limits

## The approach in one paragraph

Start with static QPS caps per exchange. Then earn the move to segment-level value model with contextual bandit exploration and a load-aware throttle implemented in the ingestion proxy, and only if it beats the baseline on Value retained vs requests processed and Simulated cost savings after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Segment win-rate and value | Historical value per request type. Priority. Guard against: window. |
| Add Per-exchange cost | Processing cost per request. Cost. Guard against: cost model. |
| Add Current load | Cluster utilisation. Throttle. Guard against: real-time. |
| Run it as one pipeline | Bid request ingress (proxy), Segment classifier (hashed keys), Value table (in-memory), Throttle policy (load-aware), Pass-through to bidder (gRPC), Outcome stream (Kafka) and Policy updater (batch). |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle exchange traffic surges beyond capacity | Immediate load shedding with priority classes. |

**Deliberately not doing**

- Request ID: none.
- User-agent: none.

**How the approach is proven**

Prove it offline on Value retained vs requests processed and Simulated cost savings using time-ordered splits, then online on "Infrastructure cost per won impression" with "Win volume retained" as the guardrail. Watch for: Evaluating with historical traffic while throttling changes the data and Ignoring exploration needs.

## Baseline and production design

- **Baseline (build this first):** Static QPS caps per exchange.
- **Production design:** Segment-level value model with contextual bandit exploration and a load-aware throttle implemented in the ingestion proxy.

## Why AI, and why this kind

**Why AI.** Decide which bid requests to process or drop at ingestion to cut infrastructure cost while retaining most of the value. The evidence that separates good from bad outcomes (Segment win-rate and value, Per-exchange cost, Current load) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "random sampling" are what teams reach for first, and they fail because random sampling discards high-value traffic at the same rate. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: Segment-level value model with contextual bandit exploration and a load-aware throttle implemented in the ingestion proxy.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Segment win-rate and value, Per-exchange cost, Current load and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Static QPS caps per exchange | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Segment-level value model with contextual bandit exploration and a load-aware throttle implemented in the ingestion proxy | chosen | Meets the 8 ms envelope at $0.0015 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Infrastructure cost per won impression) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating with historical traffic while throttling changes the data.
- Evaluation trap: Ignoring exploration needs.
- Exchange traffic surges beyond capacity: bidder overloaded and latency spikes.
- Throttling starves exploration: value table stale.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
