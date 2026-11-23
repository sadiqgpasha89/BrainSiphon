# Real-Time Service Activation Agent: use-case brief

> Generated from the blueprint `telecom/realtime-service-activation-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Real-Time Service Activation Agent · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Take a validated order for a new feature, add-on or business service and drive it through eligibility, provisioning and verification in minutes, escalating only the exceptions to people. The system has to run interactively, within a few seconds, inside these limits: The agent works only from the product catalogue and approved order templates, Orders above a value or risk threshold need human approval and Every provisioning step is idempotent and reversible.

**Why it is hard.** The obvious approach is free-form requests turned into network changes, and it fails because free-form changes bypass product and billing controls. The second trap is in "Sequence": the real signal is ordered, idempotent steps with checkpoints, while teams usually reach for one bulk call to all systems.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $45.8K a month. A mistake is expensive in the way orders needing manual touch measures it.

**What success looks like.** Offline: Straight-through rate on replayed orders, Compensation correctness in fault injection and Eligibility decision accuracy. Online: Time to activate, Orders needing manual touch and Billing errors after activation. The launch is judged on "Time to activate" while "Orders needing manual touch" must not get worse.

## Objective, loss and constraints

**Business objective.** Take a validated order for a new feature, add-on or business service and drive it through eligibility, provisioning and verification in minutes, escalating only the exceptions to people.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)`

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
| x | The input features describing one example (what the model sees). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |

**Hard constraints**

- The agent works only from the product catalogue and approved order templates
- Orders above a value or risk threshold need human approval
- Every provisioning step is idempotent and reversible
- Customer consent and eligibility checked before activation
- 500K orders per day with activation inside 120 s for standard services

## The approach in one paragraph

Start with a workflow engine with fixed steps and a queue for failed orders, because it is the reference for activation time and exception volume. Then earn the move to a supervisor agent that plans steps from a typed order, calls provisioning tools with idempotency keys, verifies service state after each step and escalates typed exceptions with the evidence, with approval gates by order value and risk, and only if it beats the baseline on Straight-through rate on replayed orders and Compensation correctness in fault injection after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Eligibility check result | Pass or fail of coverage, credit and contract rules. Stops invalid orders early. Guard against: rules owned by product teams. |
| Add Dependency state | Status of upstream orders and resources the service needs. Predicts a stuck order. Guard against: needs live order state. |
| Add Step latency history | Median and p95 time of each provisioning step. Spots a slow system. Guard against: per system and per hour. |
| Run it as one pipeline | Order intake (order management), Eligibility and consent gate (rule engine), Step planning (agent with order templates), Provisioning calls (orchestrator tools) and Verification probes (service tests), with Exception escalation and Audit trail off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle downstream system timeout | Read back state before retrying and use idempotency keys. |

**Deliberately not doing**

- Order submission channel: does not change provisioning.
- Customer name: irrelevant and private.
- Sales agent identifier: irrelevant to activation.

**How the approach is proven**

Prove it offline on Straight-through rate on replayed orders, Compensation correctness in fault injection and Eligibility decision accuracy using time-ordered splits, then online on "Time to activate" with "Orders needing manual touch" as the guardrail. Watch for: Retrying without idempotency, Skipping the verification step and Letting the agent bypass the catalogue.

## Baseline and production design

- **Baseline (build this first):** A workflow engine with fixed steps and a queue for failed orders, because it is the reference for activation time and exception volume.
- **Production design:** A supervisor agent that plans steps from a typed order, calls provisioning tools with idempotency keys, verifies service state after each step and escalates typed exceptions with the evidence, with approval gates by order value and risk.

## Why AI, and why this kind

**Why AI.** Take a validated order for a new feature, add-on or business service and drive it through eligibility, provisioning and verification in minutes, escalating only the exceptions to people. The evidence that separates good from bad outcomes (Eligibility check result, Dependency state, Step latency history) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "free-form requests turned into network changes" are what teams reach for first, and they fail because free-form changes bypass product and billing controls. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A supervisor agent that plans steps from a typed order, calls provisioning tools with idempotency keys, verifies service state after each step and escalates typed exceptions with the evidence, with approval gates by order value and risk.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Eligibility check result, Dependency state, Step latency history and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A workflow engine with fixed steps and a queue for failed orders, because it is the reference for activation time and exception volume | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A supervisor agent that plans steps from a typed order, calls provisioning tools with idempotency keys, verifies service state after each step and escalates typed exceptions with the evidence, with approval gates by order value and risk | chosen | Meets the 2500 ms envelope at $5.09 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to activate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Retrying without idempotency.
- Evaluation trap: Skipping the verification step.
- Downstream system timeout: the step state is unknown.
- Partial activation: the network is on but billing is not.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
