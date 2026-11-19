# Subrogation Recovery Detection: use-case brief

> Generated from the blueprint `bfsi/subrogation-recovery-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Subrogation Recovery Detection · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Find paid claims where another party is liable so the insurer recovers money it would otherwise lose. The system has to run as a scheduled batch job, inside these limits: Statute-of-limitations dates tracked for every candidate and shown to the reviewer, A reviewer sees the evidence behind every flag and Recovery effort weighed against the expected net value.

**Why it is hard.** The obvious approach is the size of the claim, and it fails because a large claim with no liable party recovers nothing, and size says nothing about fault. The second trap is in "Value": the real signal is expected recovery net of the cost of pursuit, while teams usually reach for the probability of recovery alone.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 2 at peak, at an estimated $1.9K a month. A mistake is expensive in the way cost per recovered dollar measures it.

**What success looks like.** Offline: PR-AUC and Recovery value captured. Online: Recovery rate and Cost per recovered dollar. The launch is judged on "Recovery rate" while "Cost per recovered dollar" must not get worse.

## Objective, loss and constraints

**Business objective.** Find paid claims where another party is liable so the insurer recovers money it would otherwise lose.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Huber}(\hat{r}-r)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| \hat{r} | The model's predicted value of the quantity r. |
| r | The amount actually recovered on the claim, with \hat{r} the model's estimate. |

**Hard constraints**

- Statute-of-limitations dates tracked for every candidate and shown to the reviewer
- A reviewer sees the evidence behind every flag
- Recovery effort weighed against the expected net value
- Privacy rules followed when sharing information with other insurers

## The approach in one paragraph

Start with adjusters flag recovery by judgement, because that is the process. Then earn the move to text and tabular models for liability and recovery value, a deadline-aware ranker and a recovery team queue, and only if it beats the baseline on PR-AUC and Recovery value captured after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Fault phrases | Presence of phrases such as rear-ended, third party driver or defective product in the claim notes. A text signal of liability. Guard against: phrases need context, since a customer may blame themselves. |
| Add Police report match | Whether an attached report assigns fault to another party. A strong, formal signal. Guard against: reports are not available for every loss. |
| Add Counterparty insurer known | Whether the other party and their insurer are identified. A recovery needs someone to claim from. Guard against: data are often incomplete early in the claim. |
| Run it as one pipeline | Claims data (claims system), Notes processor (text pipeline), Liability model (encoder plus boosting), Value estimator (boosting), Legal tracker (case tool) and Outcome feed (warehouse), with Recovery queue off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle partial liability | Model recovery as a percentage of the loss and rank by expected net recovery. |

**Deliberately not doing**

- Adjuster: Who handled the claim does not decide whether a third party is liable.
- Claim number: An arbitrary identifier with no signal.
- Handling office: An administrative attribute that adds no fact about fault.

**How the approach is proven**

Prove it offline on PR-AUC and Recovery value captured using time-ordered splits, then online on "Recovery rate" with "Cost per recovered dollar" as the guardrail. Watch for: Past flags are biased to obvious cases, so the model repeats the cases staff already found and Outcomes arrive months later, so recent flags have no result yet.

## Baseline and production design

- **Baseline (build this first):** Adjusters flag recovery by judgement, because that is the process.
- **Production design:** Text and tabular models for liability and recovery value, a deadline-aware ranker and a recovery team queue.

## Why AI, and why this kind

**Why AI.** Find paid claims where another party is liable so the insurer recovers money it would otherwise lose. The evidence that separates good from bad outcomes (Fault phrases, Police report match, Counterparty insurer known) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "the size of the claim" are what teams reach for first, and they fail because A large claim with no liable party recovers nothing, and size says nothing about fault. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Text and tabular models for liability and recovery value, a deadline-aware ranker and a recovery team queue.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Fault phrases, Police report match, Counterparty insurer known and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Adjusters flag recovery by judgement, because that is the process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Text and tabular models for liability and recovery value, a deadline-aware ranker and a recovery team queue | chosen | Meets the run-window envelope at $0.424 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Recovery rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Past flags are biased to obvious cases, so the model repeats the cases staff already found.
- Evaluation trap: Outcomes arrive months later, so recent flags have no result yet.
- Partial liability: fault is shared between parties so a yes-or-no liability label misses part of the recovery.
- Opposing insurer disputes: the opposing insurer disputes liability and the case drags past the limitation date.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
