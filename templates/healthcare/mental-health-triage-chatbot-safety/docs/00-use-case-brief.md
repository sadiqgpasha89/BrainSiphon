# Mental-Health Support Chatbot with Safety Triage: use-case brief

> Generated from the blueprint `healthcare/mental-health-triage-chatbot-safety` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Mental-Health Support Chatbot with Safety Triage · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Provide supportive, evidence-based conversations while detecting crisis signals and escalating to humans immediately and safely. The system has to run interactively, within a few seconds, inside these limits: Crisis detection recall above 99% on high-risk cases, Never provide diagnosis and Emergency resource routing.

**Why it is hard.** The obvious approach is relying on the LLM's own judgement, and it fails because models can be talked out of safety behaviour. The second trap is in "Scope": the real signal is supportive skills (CBT-style) within guard rails, while teams usually reach for open-ended therapy claims.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $102.6K a month. A mistake is expensive in the way user-reported helpfulness with safety audit measures it.

**What success looks like.** Offline: Crisis recall at high risk and Policy violation rate on red-team set. Online: Appropriate escalation rate and User-reported helpfulness with safety audit. The launch is judged on "Appropriate escalation rate" while "User-reported helpfulness with safety audit" must not get worse.

## Objective, loss and constraints

**Business objective.** Provide supportive, evidence-based conversations while detecting crisis signals and escalating to humans immediately and safely.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{SafetyViolation}`

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
| x | The user's message and conversation context. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{SafetyViolation} | Penalty when the reply is unsafe, for example missing a crisis signal or giving harmful advice. |

**Hard constraints**

- Crisis detection recall above 99% on high-risk cases
- Never provide diagnosis
- Emergency resource routing
- Clinical oversight

## The approach in one paragraph

Start with scripted decision-tree chatbot with hotline links. Then earn the move to dual-model design: crisis classifier and policy engine gate a supportive LLM, with immediate human handoff and region-aware emergency routing, and only if it beats the baseline on Crisis recall at high risk and Policy violation rate on red-team set after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Crisis-risk classifier score | Calibrated risk of self-harm intent. Escalation trigger. Guard against: tune for high recall. |
| Add Conversation risk trajectory | Change in risk over the session. Slow-burn crises. Guard against: windowed. |
| Add Policy adherence rate | Fraction of replies within guidelines. Quality. Guard against: red-team sets. |
| Run it as one pipeline | Chat gateway (app), Crisis classifier (fine-tuned encoder), Policy engine (hard rules), Supportive LLM (constrained prompts) and Safety output filter (guard model), with Human responder handoff and Audit and QA off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle indirect or coded crisis language | Continuous red-teaming and clinician-labelled hard cases. |

**Deliberately not doing**

- Chat sentiment average: not risk.
- Response friendliness rating: not safety.

**How the approach is proven**

Prove it offline on Crisis recall at high risk and Policy violation rate on red-team set using time-ordered splits, then online on "Appropriate escalation rate" with "User-reported helpfulness with safety audit" as the guardrail. Watch for: Red-team set written by builders only and Measuring engagement as success.

## Baseline and production design

- **Baseline (build this first):** Scripted decision-tree chatbot with hotline links.
- **Production design:** Dual-model design: crisis classifier and policy engine gate a supportive LLM, with immediate human handoff and region-aware emergency routing.

## Why AI, and why this kind

**Why AI.** Provide supportive, evidence-based conversations while detecting crisis signals and escalating to humans immediately and safely. The evidence that separates good from bad outcomes (Crisis-risk classifier score, Conversation risk trajectory, Policy adherence rate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "relying on the LLM's own judgement" are what teams reach for first, and they fail because models can be talked out of safety behaviour. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Dual-model design: crisis classifier and policy engine gate a supportive LLM, with immediate human handoff and region-aware emergency routing.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Crisis-risk classifier score, Conversation risk trajectory, Policy adherence rate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Scripted decision-tree chatbot with hotline links | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Dual-model design: crisis classifier and policy engine gate a supportive LLM, with immediate human handoff and region-aware emergency routing | chosen | Meets the 2500 ms envelope at $2.28 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Appropriate escalation rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Red-team set written by builders only.
- Evaluation trap: Measuring engagement as success.
- Indirect or coded crisis language: euphemistic or coded expressions of crisis are not recognised and escalation is missed.
- Jailbreak attempts to bypass guardrails: adversarial prompts push the model to produce unsafe content despite safety filters.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
