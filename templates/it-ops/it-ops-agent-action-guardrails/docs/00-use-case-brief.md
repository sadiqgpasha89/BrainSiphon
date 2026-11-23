# IT Ops Agent Action Guardrails: use-case brief

> Generated from the blueprint `it-ops/it-ops-agent-action-guardrails` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** IT Ops Agent Action Guardrails · **Domain:** it-ops · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Gate and record every change AI operations agents make to servers, cloud accounts and ticket workflows so on-call engineers can trust automation without losing sight of what it did. The system has to run interactively, within a few seconds, inside these limits: Change policy enforced by an automation broker rather than by agent instructions, Agents never delete data stores, rotate root credentials or open firewall rules on their own and Change approvals by the service owner within 15 minutes for high tier changes.

**Why it is hard.** The obvious approach is instructions in the agent prompt, and it fails because prompt text is not a change control. The second trap is in "Scope": the real signal is temporary roles tied to one ticket, while teams usually reach for permanent administrator accounts.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $210.5K a month. A mistake is expensive in the way outages traced to agent changes measures it.

**What success looks like.** Offline: Tier coverage across services, Block rate on seeded risky commands and Command log completeness. Online: Risky commands stopped before execution, Outages traced to agent changes and Minutes to find what ran on a host. The launch is judged on "Risky commands stopped before execution" while "Outages traced to agent changes" must not get worse.

## Objective, loss and constraints

**Business objective.** Gate and record every change AI operations agents make to servers, cloud accounts and ticket workflows so on-call engineers can trust automation without losing sight of what it did.

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

- Change policy enforced by an automation broker rather than by agent instructions
- Agents never delete data stores, rotate root credentials or open firewall rules on their own
- Change approvals by the service owner within 15 minutes for high tier changes
- Every command logged with the ticket it came from
- Per-agent stop button that halts running playbooks within 20 s
- On-call engineers can retrieve the last 30 days of agent commands within 5 s

## The approach in one paragraph

Start with a senior engineer reads the agent command history each Friday, because tickets alone do not show what ran. Then earn the move to an automation broker with change tiers, command rate limits and a stop button, a command log tied to tickets with replay, drift detection on agent behaviour and a weekly change review for service owners, and only if it beats the baseline on Tier coverage across services and Block rate on seeded risky commands after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Change tier of requested command | The blast radius of the target system. Approval routing. Guard against: configuration database. |
| Add Commands per ticket | Volume of commands against the ticket norm. Runaway detection. Guard against: broker log. |
| Add Rollback frequency after agent changes | How often a change had to be undone. Quality of automation. Guard against: change records. |
| Run it as one pipeline | Automation broker (command proxy), Change tier decision (policy engine), Owner approval (change workflow), Command log (indexed event store), Behaviour monitor (anomaly model) and Command replay console (search tool), with Weekly change report off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle playbook loop | Retry caps and automatic stop after three failures. |

**Deliberately not doing**

- Host nickname: a label only.
- Ticket priority label alone: not impact.
- Agent version string: needs outcome data.

**How the approach is proven**

Prove it offline on Tier coverage across services, Block rate on seeded risky commands and Command log completeness using time-ordered splits, then online on "Risky commands stopped before execution" with "Outages traced to agent changes" as the guardrail. Watch for: Permanent administrator accounts, Prompt-only change rules and Changes allowed in untiered accounts.

## Baseline and production design

- **Baseline (build this first):** A senior engineer reads the agent command history each Friday, because tickets alone do not show what ran.
- **Production design:** An automation broker with change tiers, command rate limits and a stop button, a command log tied to tickets with replay, drift detection on agent behaviour and a weekly change review for service owners.

## Why AI, and why this kind

**Why AI.** Gate and record every change AI operations agents make to servers, cloud accounts and ticket workflows so on-call engineers can trust automation without losing sight of what it did. The evidence that separates good from bad outcomes (Change tier of requested command, Commands per ticket, Rollback frequency after agent changes) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "instructions in the agent prompt" are what teams reach for first, and they fail because prompt text is not a change control. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: An automation broker with change tiers, command rate limits and a stop button, a command log tied to tickets with replay, drift detection on agent behaviour and a weekly change review for service owners.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Change tier of requested command, Commands per ticket, Rollback frequency after agent changes and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A senior engineer reads the agent command history each Friday, because tickets alone do not show what ran | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| An automation broker with change tiers, command rate limits and a stop button, a command log tied to tickets with replay, drift detection on agent behaviour and a weekly change review for service owners | chosen | Meets the 2500 ms envelope at $4.68 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Risky commands stopped before execution) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Permanent administrator accounts.
- Evaluation trap: Prompt-only change rules.
- Playbook loop: an agent reruns a failing restart playbook against the same host.
- Approval fatigue: service owners accept high tier changes without checking.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
