# Telecom Agent Action Audit & Guardrails: use-case brief

> Generated from the blueprint `telecom/telecom-agent-action-audit-guardrails` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Telecom Agent Action Audit & Guardrails · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Gate and record the actions AI agents take on network configuration, service provisioning and billing adjustments so that operations, regulators and customers can rely on a complete trail. The system has to run interactively, within a few seconds, inside these limits: Network and billing rules enforced by an orchestration gate outside the agent, Agents never change core routing, bulk provisioning or customer credits above limits on their own and Network duty manager approval within 10 minutes for high impact changes.

**Why it is hard.** The obvious approach is instructions given to the agent, and it fails because core network changes need controls the agent cannot edit. The second trap is in "Scope": the real signal is per-domain roles for radio, core and billing, while teams usually reach for one shared automation account.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $87.0K a month. A mistake is expensive in the way service incidents traced to agent actions measures it.

**What success looks like.** Offline: Tier coverage across network domains, Block rate on seeded risky changes and Change trail completeness. Online: Risky changes stopped before execution, Service incidents traced to agent actions and Minutes to answer a regulator trail request. The launch is judged on "Risky changes stopped before execution" while "Service incidents traced to agent actions" must not get worse.

## Objective, loss and constraints

**Business objective.** Gate and record the actions AI agents take on network configuration, service provisioning and billing adjustments so that operations, regulators and customers can rely on a complete trail.

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

- Network and billing rules enforced by an orchestration gate outside the agent
- Agents never change core routing, bulk provisioning or customer credits above limits on their own
- Network duty manager approval within 10 minutes for high impact changes
- Change records kept for the regulator retention period
- Per-agent halt that stops its sessions within 10 s
- Compliance staff can answer trail queries over 12 months within 20 s

## The approach in one paragraph

Start with network managers review the agent action export each week, which does not show the effect on service. Then earn the move to an orchestration gate with change tiers and a halt switch, a change trail tied to tickets and customers, behaviour monitoring on agent actions and a monthly governance pack for operations and compliance, and only if it beats the baseline on Tier coverage across network domains and Block rate on seeded risky changes after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Change tier of request | The network layer and customer count affected. Approval routing. Guard against: inventory system. |
| Add Provisioning actions per hour | Volume against the domain baseline. Runaway detection. Guard against: orchestration log. |
| Add Duty manager override rate | Proposals changed or declined by managers. Trust signal. Guard against: approval records. |
| Run it as one pipeline | Orchestration gate (API proxy), Change tier decision (rules engine), Duty manager approval (change board), Change trail (append-only store), Action behaviour monitor (time-series model) and Trail replay console (search tool), with Monthly governance report off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle provisioning burst | Batch caps and staged rollout. |

**Deliberately not doing**

- Cell site name alone: an identifier.
- Ticket note length: not risk.
- Agent release label: needs outcome data.

**How the approach is proven**

Prove it offline on Tier coverage across network domains, Block rate on seeded risky changes and Change trail completeness using time-ordered splits, then online on "Risky changes stopped before execution" with "Service incidents traced to agent actions" as the guardrail. Watch for: One shared automation account, Instruction-only limits and Actions allowed on new vendor domains.

## Baseline and production design

- **Baseline (build this first):** Network managers review the agent action export each week, which does not show the effect on service.
- **Production design:** An orchestration gate with change tiers and a halt switch, a change trail tied to tickets and customers, behaviour monitoring on agent actions and a monthly governance pack for operations and compliance.

## Why AI, and why this kind

**Why AI.** Gate and record the actions AI agents take on network configuration, service provisioning and billing adjustments so that operations, regulators and customers can rely on a complete trail. The evidence that separates good from bad outcomes (Change tier of request, Provisioning actions per hour, Duty manager override rate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "instructions given to the agent" are what teams reach for first, and they fail because core network changes need controls the agent cannot edit. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: An orchestration gate with change tiers and a halt switch, a change trail tied to tickets and customers, behaviour monitoring on agent actions and a monthly governance pack for operations and compliance.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Change tier of request, Provisioning actions per hour, Duty manager override rate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Network managers review the agent action export each week, which does not show the effect on service | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| An orchestration gate with change tiers and a halt switch, a change trail tied to tickets and customers, behaviour monitoring on agent actions and a monthly governance pack for operations and compliance | chosen | Meets the 2500 ms envelope at $4.83 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Risky changes stopped before execution) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: One shared automation account.
- Evaluation trap: Instruction-only limits.
- Provisioning burst: an agent pushes a large batch of provisioning changes after a failed run.
- Board fatigue: duty managers approve routine proposals without checking impact.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
