# Detection Rule Generation (Sigma) with LLMs: use-case brief

> Generated from the blueprint `cybersecurity/detection-rule-generation-sigma-llm` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Detection Rule Generation (Sigma) with LLMs · **Domain:** cybersecurity · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Translate threat reports and attack techniques into tested detection rules, validated against telemetry for coverage and false positives. The system has to run interactively, within a few seconds, inside these limits: Rules must compile and run on target SIEMs, Test on benign baseline and Detection engineer review.

**Why it is hard.** The obvious approach is accept syntactically valid rules, and it fails because valid rules can be noisy or never fire. The second trap is in "Portability": the real signal is backend-specific compilation and tests, while teams usually reach for generic rule text.

**Scale and stakes.** At 10 million users this is about 15.0M model-touching events a day, 174 requests per second on average and 1.0K at peak, at an estimated $3.16M a month. A mistake is expensive in the way detections that fire in production measures it.

**What success looks like.** Offline: Compile rate and attack-hit rate and FP rate on baseline. Online: Time from report to deployed detection and Detections that fire in production. The launch is judged on "Time from report to deployed detection" while "Detections that fire in production" must not get worse.

## Objective, loss and constraints

**Business objective.** Translate threat reports and attack techniques into tested detection rules, validated against telemetry for coverage and false positives.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{TTP})+\lambda\,\mathrm{InvalidRule}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_\theta | The language model's probability of the next token y_t, given the earlier tokens and the context written after the bar. (one value per time step or token t and forecast step h) |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| y_{<t} | All tokens before position t: the text the model has already read or generated. (one value per time step or token t) |
| \text{TTP} | The attacker technique (tactic, technique or procedure) description the rule must detect. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{InvalidRule} | Penalty when the generated Sigma rule is syntactically invalid or cannot run on the log source. |

**Hard constraints**

- Rules must compile and run on target SIEMs
- Test on benign baseline
- Detection engineer review
- Version control

## The approach in one paragraph

Start with manual rule writing from reports. Then earn the move to technique-to-rule agent with backend compilers, attack-emulation tests, benign-baseline false-positive checks and PR-based review, and only if it beats the baseline on Compile rate and attack-hit rate and FP rate on baseline after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Rule syntax validity | Compiles on target backend. Basics. Guard against: backend tests. |
| Add Attack-simulation hit rate | Fires on emulated technique. Coverage. Guard against: emulation. |
| Add Benign false-positive rate | Hits on baseline logs. Quality. Guard against: 30-day baseline. |
| Run it as one pipeline | Technique mapper (LLM), Rule generator (LLM with schema), Backend compiler (Sigma converters), Test harness (emulation and baseline), Detection engineer (human) and Deployment (rule CI), with Threat report intake off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle generated rule matches common admin tooling | False-positive gating on baseline and allow-listing. |

**Deliberately not doing**

- Rule description length: none.
- Number of rules generated: volume not value.

**How the approach is proven**

Prove it offline on Compile rate and attack-hit rate and FP rate on baseline using time-ordered splits, then online on "Time from report to deployed detection" with "Detections that fire in production" as the guardrail. Watch for: Evaluating compile success only and Baseline telemetry unrepresentative.

## Baseline and production design

- **Baseline (build this first):** Manual rule writing from reports.
- **Production design:** Technique-to-rule agent with backend compilers, attack-emulation tests, benign-baseline false-positive checks and PR-based review.

## Why AI, and why this kind

**Why AI.** Translate threat reports and attack techniques into tested detection rules, validated against telemetry for coverage and false positives. The evidence that separates good from bad outcomes (Rule syntax validity, Attack-simulation hit rate, Benign false-positive rate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "accept syntactically valid rules" are what teams reach for first, and they fail because valid rules can be noisy or never fire. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: Technique-to-rule agent with backend compilers, attack-emulation tests, benign-baseline false-positive checks and PR-based review.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Rule syntax validity, Attack-simulation hit rate, Benign false-positive rate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual rule writing from reports | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Technique-to-rule agent with backend compilers, attack-emulation tests, benign-baseline false-positive checks and PR-based review | chosen | Meets the 2500 ms envelope at $7.02 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time from report to deployed detection) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating compile success only.
- Evaluation trap: Baseline telemetry unrepresentative.
- Generated rule matches common admin tooling: a generated rule matches normal administrator tooling and floods the SOC with alerts.
- Rule logic references fields not present in logs: silently never fires.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
