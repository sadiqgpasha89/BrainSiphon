# Claims Triage & Straight-Through Processing: use-case brief

> Generated from the blueprint `bfsi/claims-triage-and-straight-through-processing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Claims Triage & Straight-Through Processing · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Route each insurance claim to straight-through payment, standard handling or a specialist based on complexity and risk. The system has to run interactively, within a few seconds, inside these limits: Automatic payment only for claims below a set value and risk limit, Fair-treatment and vulnerable-customer rules applied at triage and Every routing decision explained in words the handler can read.

**Why it is hard.** The obvious approach is the claim amount alone, and it fails because a small claim can be complex, such as disputed liability, and a large one can be simple. The second trap is in "Safety": the real signal is straight-through only for low-risk, low-value claims, while teams usually reach for maximising accuracy at any value.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $12.4K a month. A mistake is expensive in the way cycle time measures it.

**What success looks like.** Offline: Routing accuracy and STP leakage rate. Online: STP share and Cycle time. The launch is judged on "STP share" while "Cycle time" must not get worse.

## Objective, loss and constraints

**Business objective.** Route each insurance claim to straight-through payment, standard handling or a specialist based on complexity and risk.

**Training objective.** `\mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y_{\text{stp}})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \hat{y} | The model's prediction of y. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |

**Hard constraints**

- Automatic payment only for claims below a set value and risk limit
- Fair-treatment and vulnerable-customer rules applied at triage
- Every routing decision explained in words the handler can read
- A full audit trail from first notice to payment

## The approach in one paragraph

Start with rule-based routing by amount and type, because it is the current practice. Then earn the move to a triage model over text and structured data, a straight-through policy with limits and an exception queue, and only if it beats the baseline on Routing accuracy and STP leakage rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around First notice text | Encoder embedding of the claim description mapped to complexity classes. Describes what happened in the customer's words. Guard against: language varies, so test across channels. |
| Add Coverage check | Policy in force on the loss date and the peril covered, as binary flags. Eligibility decides whether a claim is payable at all. Guard against: data quality issues in policy records cause false denials. |
| Add Claimant history | Number of claims by the claimant in the last 3 years. Patterns of repeated claims. Guard against: fair-use rules limit how it can be used. |
| Run it as one pipeline | Claim intake (portal and call centre), Coverage verification (policy service), Triage model (boosting plus encoder), STP policy (rules), Payment (payment service) and Outcome log (warehouse), with Handler queue off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle catastrophe surge | Switch to surge rules with priority queues for vulnerable and high-severity claims and pre-agreed overflow handlers. |

**Deliberately not doing**

- Handler: The handler who first opens the claim has no bearing on its complexity.
- Day filed: Weak relation to complexity once the type is known.
- Channel: Reflects customer cohort and not the claim, so it risks unfair treatment.

**How the approach is proven**

Prove it offline on Routing accuracy and STP leakage rate using time-ordered splits, then online on "STP share" with "Cycle time" as the guardrail. Watch for: Labels come from past routing decisions, so the model learns the old process and its biases and Fraud found later is missing from the labels at training time.

## Baseline and production design

- **Baseline (build this first):** Rule-based routing by amount and type, because it is the current practice.
- **Production design:** A triage model over text and structured data, a straight-through policy with limits and an exception queue.

## Why AI, and why this kind

**Why AI.** Route each insurance claim to straight-through payment, standard handling or a specialist based on complexity and risk. The evidence that separates good from bad outcomes (First notice text, Coverage check, Claimant history) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "the claim amount alone" are what teams reach for first, and they fail because A small claim can be complex, such as disputed liability, and a large one can be simple. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A triage model over text and structured data, a straight-through policy with limits and an exception queue.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among First notice text, Coverage check, Claimant history and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rule-based routing by amount and type, because it is the current practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A triage model over text and structured data, a straight-through policy with limits and an exception queue | chosen | Meets the 2500 ms envelope at $1.37 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (STP share) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Labels come from past routing decisions, so the model learns the old process and its biases.
- Evaluation trap: Fraud found later is missing from the labels at training time.
- Catastrophe surge: a catastrophe produces a surge of claims that overwhelms normal routing and capacity.
- Mis-described loss: the claim is filed under the wrong peril so the routing and coverage check are wrong.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
