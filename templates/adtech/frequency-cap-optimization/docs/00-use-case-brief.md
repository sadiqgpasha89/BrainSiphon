# Frequency Cap & Exposure Optimisation: use-case brief

> Generated from the blueprint `adtech/frequency-cap-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Frequency Cap & Exposure Optimisation · **Domain:** adtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Decide how often to show ads to each user to maximise conversions while limiting wasted impressions and annoyance. The system has to run in under 100 milliseconds, inside these limits: Cross-device counting, Consent and Real-time counters.

**Why it is hard.** The obvious approach is one global cap, and it fails because optimal frequency differs hugely across users. The second trap is in "Counting": the real signal is cross-device frequency estimation, while teams usually reach for per-device counts.

**Scale and stakes.** At 10 million users this is about 45.0M model-touching events a day, 521 requests per second on average and 3.1K at peak, at an estimated $4.1K a month. A mistake is expensive in the way complaint rate measures it.

**What success looks like.** Offline: Estimated incremental conversions vs wasted exposures and Response curve calibration. Online: Cost per incremental conversion and Complaint rate. The launch is judged on "Cost per incremental conversion" while "Complaint rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Decide how often to show ads to each user to maximise conversions while limiting wasted impressions and annoyance.

**Training objective.** `\max_{f}\;\sum_i \text{conv}_i(f_i)-\lambda\,\text{cost}(f_i)-\mu\,\text{annoyance}(f_i)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \max_{f} | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \text{conv}_i | Expected conversions for person i at frequency f_i. |
| f_i | The frequency cap: the number of times a person may see the ad, the thing being optimised. |
| \lambda | Weight on the media cost: how strongly it counts against the main objective. |
| \text{cost} | Media cost of showing the ad f_i times. |
| \mu | Weight on the annoyance penalty: how strongly it counts against the main objective. |
| \text{annoyance} | A penalty for ad fatigue: harm caused by showing too many ads. |

**Hard constraints**

- Cross-device counting
- Consent
- Real-time counters
- Publisher caps

## The approach in one paragraph

Start with global daily cap of 3 impressions. Then earn the move to per-user response-curve model with a bandit-chosen cap and shared cross-device exposure counters, and only if it beats the baseline on Estimated incremental conversions vs wasted exposures and Response curve calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Marginal conversion gain | Conversion probability change per exposure. Saturation. Guard against: experiments. |
| Add Recent exposure count | Impressions in 24h and 7d. Frequency. Guard against: counters. |
| Add User responsiveness | Prior response to the advertiser. Personalised cap. Guard against: history. |
| Run it as one pipeline | Ad request (DSP), Exposure counters (Redis), Response-curve model (GBDT), Cap policy (bandit), Bid decision (bidder), Exposure logging (Kafka) and Experiment holdouts (analytics). |
| Optimise the right thing | The objective weighs maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle counter inconsistency across regions | Regional replication with conservative caps. |

**Deliberately not doing**

- Creative ID: none.
- Ad slot ID: none.

**How the approach is proven**

Prove it offline on Estimated incremental conversions vs wasted exposures and Response curve calibration using time-ordered splits, then online on "Cost per incremental conversion" with "Complaint rate" as the guardrail. Watch for: Observational frequency effects confounded by targeting and Counting only same-device exposure.

## Baseline and production design

- **Baseline (build this first):** Global daily cap of 3 impressions.
- **Production design:** Per-user response-curve model with a bandit-chosen cap and shared cross-device exposure counters.

## Why AI, and why this kind

**Why AI.** Decide how often to show ads to each user to maximise conversions while limiting wasted impressions and annoyance. The evidence that separates good from bad outcomes (Marginal conversion gain, Recent exposure count, User responsiveness) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "one global cap" are what teams reach for first, and they fail because optimal frequency differs hugely across users. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: Per-user response-curve model with a bandit-chosen cap and shared cross-device exposure counters.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Marginal conversion gain, Recent exposure count, User responsiveness and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Global daily cap of 3 impressions | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Per-user response-curve model with a bandit-chosen cap and shared cross-device exposure counters | chosen | Meets the 80 ms envelope at $0.0031 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Cost per incremental conversion) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Observational frequency effects confounded by targeting.
- Evaluation trap: Counting only same-device exposure.
- Counter inconsistency across regions: over-exposure to users.
- Users on shared devices: caps applied to the wrong person.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
