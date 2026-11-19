# Adversarial Robustness for Deployed Models: use-case brief

> Generated from the blueprint `cybersecurity/adversarial-ml-robustness` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Adversarial Robustness for Deployed Models · **Domain:** cybersecurity · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Measure and improve robustness of production classifiers (fraud, malware, vision) to evasion, poisoning and extraction attacks. The system has to run as a scheduled batch job, inside these limits: Utility-robustness trade-off, Realistic threat models and Feature-space constraints.

**Why it is hard.** The obvious approach is pixel Lp-ball attacks on tabular models, and it fails because unrealistic attacks mislead robustness estimates. The second trap is in "Evaluation": the real signal is adaptive attacks, while teams usually reach for fixed benchmark attacks.

**Scale and stakes.** At 10 million users this is about 30.0K model-touching events a day, 0 requests per second on average and 0 at peak, at an estimated $1.9K a month. A mistake is expensive in the way detection recall after attacker adaptation measures it.

**What success looks like.** Offline: Robust accuracy under adaptive domain attacks and Clean accuracy retention. Online: Evasion incidents and Detection recall after attacker adaptation. The launch is judged on "Evasion incidents" while "Detection recall after attacker adaptation" must not get worse.

## Objective, loss and constraints

**Business objective.** Measure and improve robustness of production classifiers (fraud, malware, vision) to evasion, poisoning and extraction attacks.

**Training objective.** `\min_\theta\;\mathbb{E}\!\left[\max_{\|\delta\|\le\epsilon}\mathcal{L}(f_\theta(x+\delta),y)\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min_\theta | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| \max_{\\|\delta\\|\le\epsilon} | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| f_\theta | The model: f_theta turns an input into a prediction. |
| x | The original input. |
| \delta | A small adversarial perturbation added to the input to fool the model; its size is limited to epsilon. |
| y | The true label. |

**Hard constraints**

- Utility-robustness trade-off
- Realistic threat models
- Feature-space constraints
- Continuous testing

## The approach in one paragraph

Start with standard training with input validation. Then earn the move to domain-constrained adversarial training, randomised ensembles, input-integrity checks and continuous red-team evaluation in CI, and only if it beats the baseline on Robust accuracy under adaptive domain attacks and Clean accuracy retention after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Robust accuracy under constrained attack | Accuracy under domain attack. Resilience. Guard against: attack realism. |
| Add Decision margin distribution | Margins on validation. Fragility. Guard against: calibration. |
| Add Poisoning sensitivity | Effect of injected samples. Training risk. Guard against: simulation. |
| Run it as one pipeline | Model and data registry (MLOps), Attack library (domain-constrained), Robust trainer (adversarial training), Evaluator (adaptive attacks), Release gate (robustness thresholds) and Monitoring (drift and attack signals), with Security review off the critical path. |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle attacker adapts to the deployed defence | Periodic adaptive red-teaming and bug-bounty feedback. |

**Deliberately not doing**

- Clean accuracy alone: hides vulnerability.
- Model size: weak.

**How the approach is proven**

Prove it offline on Robust accuracy under adaptive domain attacks and Clean accuracy retention using time-ordered splits, then online on "Evasion incidents" with "Detection recall after attacker adaptation" as the guardrail. Watch for: Non-adaptive attacks only and Unrealistic perturbation budgets.

## Baseline and production design

- **Baseline (build this first):** Standard training with input validation.
- **Production design:** Domain-constrained adversarial training, randomised ensembles, input-integrity checks and continuous red-team evaluation in CI.

## Why AI, and why this kind

**Why AI.** Measure and improve robustness of production classifiers (fraud, malware, vision) to evasion, poisoning and extraction attacks. The evidence that separates good from bad outcomes (Robust accuracy under constrained attack, Decision margin distribution, Poisoning sensitivity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "pixel Lp-ball attacks on tabular models" are what teams reach for first, and they fail because unrealistic attacks mislead robustness estimates. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Domain-constrained adversarial training, randomised ensembles, input-integrity checks and continuous red-team evaluation in CI.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Robust accuracy under constrained attack, Decision margin distribution, Poisoning sensitivity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Standard training with input validation | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Domain-constrained adversarial training, randomised ensembles, input-integrity checks and continuous red-team evaluation in CI | chosen | Meets the run-window envelope at $2.06 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Evasion incidents) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Non-adaptive attacks only.
- Evaluation trap: Unrealistic perturbation budgets.
- Attacker adapts to the deployed defence: robustness estimates are stale.
- Robust training reduces accuracy on rare classes: business metric drops.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
