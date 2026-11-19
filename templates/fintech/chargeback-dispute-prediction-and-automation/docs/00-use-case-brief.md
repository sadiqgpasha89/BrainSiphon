# Chargeback Dispute Prediction & Evidence Automation: use-case brief

> Generated from the blueprint `fintech/chargeback-dispute-prediction-and-automation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Chargeback Dispute Prediction & Evidence Automation · **Domain:** fintech · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict which disputes are winnable and auto-assemble the evidence package, raising representment win rate while cutting handling cost. The system has to run interactively, within a few seconds, inside these limits: Network-specific evidence deadlines, Merchant data residency and Win-rate versus cost ceilings.

**Why it is hard.** The obvious approach is overall dispute amount, and it fails because amount alone ignores what the network needs to see. The second trap is in "Economics": the real signal is expected recovery minus handling cost, while teams usually reach for contesting every dispute.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $12.3K a month. A mistake is expensive in the way cost per dispute handled measures it.

**What success looks like.** Offline: Win-prediction PR-AUC and Evidence-field accuracy. Online: Representment win rate and Cost per dispute handled. The launch is judged on "Representment win rate" while "Cost per dispute handled" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict which disputes are winnable and auto-assemble the evidence package, raising representment win rate while cutting handling cost.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)\cdot \text{amount}^{0.5}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \text{amount}^{0.5} | The transaction amount, raised to the power 0.5 so that large amounts count more without dominating. |

**Hard constraints**

- Network-specific evidence deadlines
- Merchant data residency
- Win-rate versus cost ceilings
- Template compliance per scheme

## The approach in one paragraph

Start with rule table by reason code with a standard evidence template. Then earn the move to win-probability GBDT plus an LLM that fills scheme-specific evidence templates from order, shipping and device logs under a schema validator, and only if it beats the baseline on Win-prediction PR-AUC and Evidence-field accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Evidence completeness score | Fraction of required evidence fields present for the reason code. Direct driver of outcome. Guard against: compute at submission time only. |
| Add 3DS liability shift flag | Whether the transaction authenticated with 3DS. Shifts liability to issuer. Guard against: verify with the authentication record not merchant claim. |
| Add Delivery confirmation lag | Delivery timestamp minus order timestamp. Proof timeline. Guard against: courier updates arrive later; use ones available at filing. |
| Run it as one pipeline | Dispute intake (network webhook), Evidence retriever (order and logistics APIs), Win-probability model (GBDT), Evidence composer (LLM with schema check), Compliance validator (scheme rules) and Outcome feed (network results), with Specialist review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle network deadline in 7 days | Deadline-aware prioritisation queue. |

**Deliberately not doing**

- Customer complaint text sentiment: emotive but not decisive in network rules.
- Dispute filing weekday: spurious calendar effect.

**How the approach is proven**

Prove it offline on Win-prediction PR-AUC and Evidence-field accuracy using time-ordered splits, then online on "Representment win rate" with "Cost per dispute handled" as the guardrail. Watch for: Training only on disputes the team chose to contest and Outcome labels delayed by 45-120 days.

## Baseline and production design

- **Baseline (build this first):** Rule table by reason code with a standard evidence template.
- **Production design:** Win-probability GBDT plus an LLM that fills scheme-specific evidence templates from order, shipping and device logs under a schema validator.

## Why AI, and why this kind

**Why AI.** Predict which disputes are winnable and auto-assemble the evidence package, raising representment win rate while cutting handling cost. The evidence that separates good from bad outcomes (Evidence completeness score, 3DS liability shift flag, Delivery confirmation lag) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "overall dispute amount" are what teams reach for first, and they fail because amount alone ignores what the network needs to see. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Win-probability GBDT plus an LLM that fills scheme-specific evidence templates from order, shipping and device logs under a schema validator.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Evidence completeness score, 3DS liability shift flag, Delivery confirmation lag and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rule table by reason code with a standard evidence template | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Win-probability GBDT plus an LLM that fills scheme-specific evidence templates from order, shipping and device logs under a schema validator | chosen | Meets the 2500 ms envelope at $2.72 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Representment win rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training only on disputes the team chose to contest.
- Evaluation trap: Outcome labels delayed by 45-120 days.
- Network deadline in 7 days: late evidence rejected.
- Template hallucinated fields: rejected submissions.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
