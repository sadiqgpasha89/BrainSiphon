# Grid Agent Action Guardrails: use-case brief

> Generated from the blueprint `energy/grid-agent-action-guardrails` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Grid Agent Action Guardrails · **Domain:** energy · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Constrain and record every action AI agents take around switching orders, outage tickets and SCADA setpoints so that operators stay in control of the grid and regulators can see what happened. The system has to run interactively, within a few seconds, inside these limits: Switching and setpoint limits enforced in a gate that sits in front of the control network, Agents never issue breaker operations, change protection settings or alter setpoints on their own and Operator countersign by a licensed grid operator for every field-facing action.

**Why it is hard.** The obvious approach is instructions given to the agent, and it fails because instructions cannot protect a live substation. The second trap is in "Scope": the real signal is read-only by default with named write windows, while teams usually reach for standing write rights to the energy management system.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $87.0K a month. A mistake is expensive in the way customer minutes lost from agent orders measures it.

**What success looks like.** Offline: Rule coverage across feeders, Block rate on seeded unsafe orders and Order record completeness. Online: Unsafe orders blocked before reaching the field, Customer minutes lost from agent orders and Minutes to produce a regulator evidence pack. The launch is judged on "Unsafe orders blocked before reaching the field" while "Customer minutes lost from agent orders" must not get worse.

## Objective, loss and constraints

**Business objective.** Constrain and record every action AI agents take around switching orders, outage tickets and SCADA setpoints so that operators stay in control of the grid and regulators can see what happened.

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

- Switching and setpoint limits enforced in a gate that sits in front of the control network
- Agents never issue breaker operations, change protection settings or alter setpoints on their own
- Operator countersign by a licensed grid operator for every field-facing action
- Action records stored write-once for 7 years
- Agent isolation switch that cuts its network paths within 10 s
- Compliance queries over 12 months answered within 30 s

## The approach in one paragraph

Start with control room supervisors read the agent order list at shift change, which is the only record of what it proposed. Then earn the move to a control-network gate with switching rules, rate limits and an isolation switch, a write-once order record with replay for regulators, drift detection on setpoint requests and a monthly reliability summary, and only if it beats the baseline on Rule coverage across feeders and Block rate on seeded unsafe orders after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Switching order risk class | The equipment and voltage level the order touches. Countersign routing. Guard against: order metadata. |
| Add Setpoint change magnitude | Size of the requested move against safe limits. Out-of-range blocking. Guard against: telemetry feed. |
| Add Operator rejection rate | Agent proposals declined by operators. Trust and drift signal. Guard against: order log. |
| Run it as one pipeline | Control network gate (protocol proxy), Switching rule decision (rule set), Operator countersign (dual control), Order record (write-once store), Setpoint drift monitor (statistical model) and Order replay console (operator display), with Monthly reliability report off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle order storm | Queue caps and storm mode that pauses proposals. |

**Deliberately not doing**

- Substation nickname: a label only.
- Ticket text length: not risk.
- Agent build number alone: needs outcome data.

**How the approach is proven**

Prove it offline on Rule coverage across feeders, Block rate on seeded unsafe orders and Order record completeness using time-ordered splits, then online on "Unsafe orders blocked before reaching the field" with "Customer minutes lost from agent orders" as the guardrail. Watch for: Agents with standing write rights, Instruction-only restrictions and Orders allowed on unmapped feeders.

## Baseline and production design

- **Baseline (build this first):** Control room supervisors read the agent order list at shift change, which is the only record of what it proposed.
- **Production design:** A control-network gate with switching rules, rate limits and an isolation switch, a write-once order record with replay for regulators, drift detection on setpoint requests and a monthly reliability summary.

## Why AI, and why this kind

**Why AI.** Constrain and record every action AI agents take around switching orders, outage tickets and SCADA setpoints so that operators stay in control of the grid and regulators can see what happened. The evidence that separates good from bad outcomes (Switching order risk class, Setpoint change magnitude, Operator rejection rate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "instructions given to the agent" are what teams reach for first, and they fail because instructions cannot protect a live substation. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A control-network gate with switching rules, rate limits and an isolation switch, a write-once order record with replay for regulators, drift detection on setpoint requests and a monthly reliability summary.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Switching order risk class, Setpoint change magnitude, Operator rejection rate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Control room supervisors read the agent order list at shift change, which is the only record of what it proposed | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A control-network gate with switching rules, rate limits and an isolation switch, a write-once order record with replay for regulators, drift detection on setpoint requests and a monthly reliability summary | chosen | Meets the 2500 ms envelope at $4.83 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Unsafe orders blocked before reaching the field) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Agents with standing write rights.
- Evaluation trap: Instruction-only restrictions.
- Order storm: an agent floods the queue with repeated switching proposals during a storm.
- Countersign haste: operators confirm proposals quickly during outages.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
