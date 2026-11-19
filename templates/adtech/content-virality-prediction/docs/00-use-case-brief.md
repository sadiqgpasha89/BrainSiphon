# Content Virality & Engagement Prediction: use-case brief

> Generated from the blueprint `adtech/content-virality-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Content Virality & Engagement Prediction · **Domain:** adtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict early whether a post or video will go viral to allocate promotion budget and inform creators. The system has to run in under 100 milliseconds, inside these limits: Heavy-tailed outcomes, Predictions from first minutes and Fairness to creators.

**Why it is hard.** The obvious approach is content features alone, and it fails because content quality predicts weakly vs early dynamics. The second trap is in "Tail": the real signal is predict log counts and rank, while teams usually reach for raw counts MSE.

**Scale and stakes.** At 10 million users this is about 15.0M model-touching events a day, 174 requests per second on average and 1.0K at peak, at an estimated $4.1K a month. A mistake is expensive in the way creator satisfaction measures it.

**What success looks like.** Offline: Spearman correlation on final reach and Top-k precision of viral posts. Online: Promotion ROI and Creator satisfaction. The launch is judged on "Promotion ROI" while "Creator satisfaction" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict early whether a post or video will go viral to allocate promotion budget and inform creators.

**Training objective.** `\mathcal{L}=\mathrm{Huber}(\log N_T,\log\hat N_T)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| N_T | The number of views or shares after T hours: N_T actual, and its hat the predicted value. |
| \hat{N}_T | The model's predicted count. |

**Hard constraints**

- Heavy-tailed outcomes
- Predictions from first minutes
- Fairness to creators
- Manipulation resistance

## The approach in one paragraph

Start with rank by engagement rate in the first hour. Then earn the move to cascade-aware temporal model on early trajectory with creator priors, calibrated tails and a budget allocator, and only if it beats the baseline on Spearman correlation on final reach and Top-k precision of viral posts after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Early velocity | Engagement in the first 10 minutes. Momentum. Guard against: window. |
| Add Cascade structure | Depth and breadth of shares. Spread. Guard against: graph. |
| Add Creator baseline reach | Typical engagement. Prior. Guard against: history. |
| Run it as one pipeline | Engagement events (stream), Cascade builder (graph), Virality predictor (temporal GNN), Promotion allocator (budget rules), Creator analytics (dashboard) and Final outcomes (labels), with Manager review off the critical path. |
| Optimise the right thing | The objective weighs huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training, so the model is trained on the cost of the decision and not on a generic score. |
| Handle coordinated inauthentic boosting | Authenticity filters before promotion. |

**Deliberately not doing**

- Post length: weak.
- Hashtag count: spurious.

**How the approach is proven**

Prove it offline on Spearman correlation on final reach and Top-k precision of viral posts using time-ordered splits, then online on "Promotion ROI" with "Creator satisfaction" as the guardrail. Watch for: Using future engagement leaked into features and Evaluating on already-viral samples.

## Baseline and production design

- **Baseline (build this first):** Rank by engagement rate in the first hour.
- **Production design:** Cascade-aware temporal model on early trajectory with creator priors, calibrated tails and a budget allocator.

## Why AI, and why this kind

**Why AI.** Predict early whether a post or video will go viral to allocate promotion budget and inform creators. The evidence that separates good from bad outcomes (Early velocity, Cascade structure, Creator baseline reach) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "content features alone" are what teams reach for first, and they fail because content quality predicts weakly vs early dynamics. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Cascade-aware temporal model on early trajectory with creator priors, calibrated tails and a budget allocator.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Early velocity, Cascade structure, Creator baseline reach and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rank by engagement rate in the first hour | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Cascade-aware temporal model on early trajectory with creator priors, calibrated tails and a budget allocator | chosen | Meets the 80 ms envelope at $0.0092 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Promotion ROI) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using future engagement leaked into features.
- Evaluation trap: Evaluating on already-viral samples.
- Coordinated inauthentic boosting: model promotes manipulated content.
- News event surge: all content seems viral.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
