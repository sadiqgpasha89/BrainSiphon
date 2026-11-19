# Spend Insights & Financial Nudges Recommender: use-case brief

> Generated from the blueprint `fintech/spend-insights-and-nudges-recommender` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Spend Insights & Financial Nudges Recommender · **Domain:** fintech · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Deliver the one financial nudge per week that a user is most likely to act on and benefit from, without notification fatigue. The system has to run as a scheduled batch job, inside these limits: Regulatory suitability for financial prompts, Frequency caps and No dark patterns.

**Why it is hard.** The obvious approach is maximising taps, and it fails because clickbait nudges erode trust and complaints rise. The second trap is in "Fatigue": the real signal is per-user notification budget and recency decay, while teams usually reach for sending whenever a rule fires.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way opt-out rate measures it.

**What success looks like.** Offline: NDCG on action events and Benefit-weighted precision. Online: Goal progress per active user and Opt-out rate. The launch is judged on "Goal progress per active user" while "Opt-out rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Deliver the one financial nudge per week that a user is most likely to act on and benefit from, without notification fatigue.

**Training objective.** `\mathcal{L}=-\sum_{(u,n)}\left[r_{un}\log\sigma(s_{un})+(1-r_{un})\log(1-\sigma(s_{un}))\right]+\lambda\,\mathrm{FatiguePenalty}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_{(u,n)} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| r_{un} | Whether user u responded to nudge n: r_{un} is 1 if they acted on it. |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| \sigma | Sigmoid function: turns the score into a probability. |
| s_{un} | The model's score for showing nudge n to user u. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{FatiguePenalty} | Penalty for sending too many nudges to the same person. |

**Hard constraints**

- Regulatory suitability for financial prompts
- Frequency caps
- No dark patterns
- Quiet hours

## The approach in one paragraph

Start with rule-triggered nudges ranked by priority. Then earn the move to two-tower candidate model plus a multi-objective ranker (action probability, benefit, fatigue) with a weekly budget optimiser, and only if it beats the baseline on NDCG on action events and Benefit-weighted precision after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Savings-gap estimate | Gap between current savings rate and goal trajectory. Relevance of saving nudge. Guard against: uses balances as-of nudge time. |
| Add Subscription creep | New recurring charges relative to last quarter. Actionable saving. Guard against: detection before notification date. |
| Add Nudge response history | Open and action rate by nudge type. Personal preference. Guard against: exclude the nudge under evaluation. |
| Run it as one pipeline | Insight generator (Spark rules), Candidate retrieval (two-tower), Multi-objective ranker (GBDT), Budget optimiser (constrained selection), Suitability filter (compliance rules), Push dispatcher (notification service) and Response events (analytics). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle month-end paycheck day | Staggered sends and capacity-aware scheduler. |

**Deliberately not doing**

- Notification open within 1 second: accidental opens.
- Device language: weak correlation to preferences.

**How the approach is proven**

Prove it offline on NDCG on action events and Benefit-weighted precision using time-ordered splits, then online on "Goal progress per active user" with "Opt-out rate" as the guardrail. Watch for: Training on opens rather than helpful actions and Position bias from always-top placement.

## Baseline and production design

- **Baseline (build this first):** Rule-triggered nudges ranked by priority.
- **Production design:** Two-tower candidate model plus a multi-objective ranker (action probability, benefit, fatigue) with a weekly budget optimiser.

## Why AI, and why this kind

**Why AI.** Deliver the one financial nudge per week that a user is most likely to act on and benefit from, without notification fatigue. The evidence that separates good from bad outcomes (Savings-gap estimate, Subscription creep, Nudge response history) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "maximising taps" are what teams reach for first, and they fail because clickbait nudges erode trust and complaints rise. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Ranking over a large catalogue from implicit feedback needs candidate retrieval plus a learned ranker; neither rules nor a single classifier scales to the catalogue and context. Here the production design is: Two-tower candidate model plus a multi-objective ranker (action probability, benefit, fatigue) with a weekly budget optimiser.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Savings-gap estimate, Subscription creep, Nudge response history and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rule-triggered nudges ranked by priority | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Two-tower candidate model plus a multi-objective ranker (action probability, benefit, fatigue) with a weekly budget optimiser | chosen | Meets the run-window envelope at $0.037 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Sequence transformer ranker | later | Strong on rich histories but expensive to serve; adopt for the head tier once the cascade has an A/B-verified lift |
| LLM or agent as the decision maker | rejected | An LLM ranking every request costs far too much; use it for query understanding and offline catalogue enrichment |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a sequence transformer ranker beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Goal progress per active user) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on opens rather than helpful actions.
- Evaluation trap: Position bias from always-top placement.
- Month-end paycheck day: all users get saving nudges simultaneously.
- User in financial hardship: savings nudge is inappropriate.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
