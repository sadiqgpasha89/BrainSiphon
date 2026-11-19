# Creative Optimisation with Bandits: use-case brief

> Generated from the blueprint `adtech/creative-optimization-bandits` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Creative Optimisation with Bandits · **Domain:** adtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Choose which creative variant to show each user to maximise conversions, learning quickly while exploring new variants. The system has to run in under 100 milliseconds, inside these limits: Few impressions per variant, Creative fatigue and Brand guidelines.

**Why it is hard.** The obvious approach is a/B test with fixed split, and it fails because fixed splits waste traffic on losers. The second trap is in "Fatigue": the real signal is time-decaying creative performance, while teams usually reach for stationary assumption.

**Scale and stakes.** At 10 million users this is about 30.0M model-touching events a day, 347 requests per second on average and 2.1K at peak, at an estimated $4.0K a month. A mistake is expensive in the way creative refresh cycle measures it.

**What success looks like.** Offline: Offline replay regret and Posterior calibration. Online: Conversion rate lift vs rotation and Creative refresh cycle. The launch is judged on "Conversion rate lift vs rotation" while "Creative refresh cycle" must not get worse.

## Objective, loss and constraints

**Business objective.** Choose which creative variant to show each user to maximise conversions, learning quickly while exploring new variants.

**Training objective.** `\text{regret}_T=\sum_{t=1}^T\left(\mu^*_{x_t}-\mu_{a_t,x_t}\right)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \text{regret}_T | Regret: the total reward lost, up to round T, by not always showing the best creative. |
| \sum_{t=1}^T | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mu^*_{x_t} | The expected reward (click rate) of a creative: mu_{a,x} for creative a in context x, and mu* for the best creative in that context. |

**Hard constraints**

- Few impressions per variant
- Creative fatigue
- Brand guidelines
- Fast learning

## The approach in one paragraph

Start with even rotation, then manual pick of the winner. Then earn the move to contextual Thompson sampling with attribute-based priors for new creatives and decay for fatigue, and only if it beats the baseline on Offline replay regret and Posterior calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Variant posterior CTR | Beta posterior by context. Selection. Guard against: prior. |
| Add Creative age and exposures | Frequency per user. Fatigue. Guard against: counts. |
| Add Creative attributes | Colour, copy tone, format. Generalisation. Guard against: annotation. |
| Run it as one pipeline | Ad request (ad server), Context features (cache), Bandit selector (Thompson sampling), Creative renderer (template), Impression and click logs (stream) and Posterior updater (online), with Creative review off the critical path. |
| Optimise the right thing | The objective weighs regret: the total reward lost, up to round T, by not always showing the best creative, so the model is trained on the cost of the decision and not on a generic score. |
| Handle early random luck promotes a poor creative | Minimum exploration floor and prior shrinkage. |

**Deliberately not doing**

- Creative file name: none.
- Designer: none.

**How the approach is proven**

Prove it offline on Offline replay regret and Posterior calibration using time-ordered splits, then online on "Conversion rate lift vs rotation" with "Creative refresh cycle" as the guardrail. Watch for: Replay with non-uniform logging and Ignoring non-stationarity.

## Baseline and production design

- **Baseline (build this first):** Even rotation, then manual pick of the winner.
- **Production design:** Contextual Thompson sampling with attribute-based priors for new creatives and decay for fatigue.

## Why AI, and why this kind

**Why AI.** Choose which creative variant to show each user to maximise conversions, learning quickly while exploring new variants. The evidence that separates good from bad outcomes (Variant posterior CTR, Creative age and exposures, Creative attributes) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A/B test with fixed split" are what teams reach for first, and they fail because fixed splits waste traffic on losers. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: Contextual Thompson sampling with attribute-based priors for new creatives and decay for fatigue.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Variant posterior CTR, Creative age and exposures, Creative attributes and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Even rotation, then manual pick of the winner | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Contextual Thompson sampling with attribute-based priors for new creatives and decay for fatigue | chosen | Meets the 80 ms envelope at $0.0044 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Conversion rate lift vs rotation) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Replay with non-uniform logging.
- Evaluation trap: Ignoring non-stationarity.
- Early random luck promotes a poor creative: allocation collapses on a noisy winner.
- Brand guideline violations in generated creatives: unapproved creative shown.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
