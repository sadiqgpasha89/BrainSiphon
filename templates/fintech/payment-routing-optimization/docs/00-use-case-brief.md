# Payment Routing Optimization: use-case brief

> Generated from the blueprint `fintech/payment-routing-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Payment Routing Optimization · **Domain:** fintech · **Latency tier:** sub-10ms · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Route each payment to the acquirer or rail that maximises authorisation success at minimum fee, adapting to live outages and issuer behaviour. The system has to run in under 10 milliseconds, inside these limits: Routing decision under 5 ms, Acquirer contracts and minimum volume commitments and Idempotent retries without double charge.

**Why it is hard.** The obvious approach is static priority list by fee, and it fails because static lists miss intraday acquirer degradation. The second trap is in "Cost": the real signal is net expected value = success probability times margin minus fee, while teams usually reach for maximising success rate alone.

**Scale and stakes.** At 10 million users this is about 9.0M model-touching events a day, 104 requests per second on average and 833 at peak, at an estimated $3.7K a month. A mistake is expensive in the way blended processing cost per transaction measures it.

**What success looks like.** Offline: Replay-based inverse propensity value and Regret against oracle on logged data. Online: Authorisation rate uplift and Blended processing cost per transaction. The launch is judged on "Authorisation rate uplift" while "Blended processing cost per transaction" must not get worse.

## Objective, loss and constraints

**Business objective.** Route each payment to the acquirer or rail that maximises authorisation success at minimum fee, adapting to live outages and issuer behaviour.

**Training objective.** `\mathcal{L}=\sum_t \text{regret}_t,\;\;\text{regret}_t=\mu^*_{x_t}-\mu_{a_t,x_t}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \text{regret}_t | The reward lost at round t by not choosing the best route. |
| \mu^*_{x_t} | Expected success rate of a route: mu*_x for the best route in context x and mu_{a_t,x_t} for the route chosen. |

**Hard constraints**

- Routing decision under 5 ms
- Acquirer contracts and minimum volume commitments
- Idempotent retries without double charge
- PCI scope unchanged

## The approach in one paragraph

Start with priority-ordered failover list with a cost-first policy. Then earn the move to contextual Thompson sampling with decayed Beta posteriors per segment, a cost-aware reward, and an in-memory routing table refreshed every second, and only if it beats the baseline on Replay-based inverse propensity value and Regret against oracle on logged data after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Issuer-BIN success posterior | Beta posterior of auth success per (acquirer, BIN) with 30-minute decay. Fresh health signal. Guard against: decay must not use future outcomes. |
| Add Decline code mix | Share of soft vs hard declines by route in the last 15 min. Early outage indicator. Guard against: treat issuer decline codes consistently. |
| Add Fee schedule delta | Effective interchange and scheme fee difference. Cost term. Guard against: contract versions as-of transaction time. |
| Run it as one pipeline | Payment intake (API gateway), Segment key builder (BIN and amount features), Bandit router (in-memory posteriors), Fee and constraint check (contract rules), Acquirer dispatch (gateway adapters), Retry manager (idempotent cascades) and Outcome stream (Kafka to posteriors). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle acquirer silent failure | Circuit breaker on timeout rate and fast posterior decay. |

**Deliberately not doing**

- Cardholder country alone: already captured by BIN and currency.
- Merchant category full list: high cardinality with little route-specific signal.

**How the approach is proven**

Prove it offline on Replay-based inverse propensity value and Regret against oracle on logged data using time-ordered splits, then online on "Authorisation rate uplift" with "Blended processing cost per transaction" as the guardrail. Watch for: Replay evaluation ignores routes never chosen and Success measured without separating soft declines from fraud declines.

## Baseline and production design

- **Baseline (build this first):** Priority-ordered failover list with a cost-first policy.
- **Production design:** Contextual Thompson sampling with decayed Beta posteriors per segment, a cost-aware reward, and an in-memory routing table refreshed every second.

## Why AI, and why this kind

**Why AI.** Route each payment to the acquirer or rail that maximises authorisation success at minimum fee, adapting to live outages and issuer behaviour. The evidence that separates good from bad outcomes (Issuer-BIN success posterior, Decline code mix, Fee schedule delta) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "static priority list by fee" are what teams reach for first, and they fail because static lists miss intraday acquirer degradation. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Decisions are constrained (capacity, budgets, time windows), so a solver over predicted inputs beats scoring each decision in isolation. Here the production design is: Contextual Thompson sampling with decayed Beta posteriors per segment, a cost-aware reward, and an in-memory routing table refreshed every second.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Issuer-BIN success posterior, Decline code mix, Fee schedule delta and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Priority-ordered failover list with a cost-first policy | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Contextual Thompson sampling with decayed Beta posteriors per segment, a cost-aware reward, and an in-memory routing table refreshed every second | chosen | Meets the 8 ms envelope at $0.014 per 1,000 decisions and exposes the signals the baseline cannot use. |
| End-to-end learned policy | later | Hard to guarantee constraints; keep the solver for feasibility and learn only the inputs |
| LLM or agent as the decision maker | rejected | An LLM can translate planner requests into solver parameters, but must not produce the plan itself |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a end-to-end learned policy beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Authorisation rate uplift) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Replay evaluation ignores routes never chosen.
- Evaluation trap: Success measured without separating soft declines from fraud declines.
- Acquirer silent failure: success posterior lags real outage.
- Retry cascade double-charges: duplicate captures.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
