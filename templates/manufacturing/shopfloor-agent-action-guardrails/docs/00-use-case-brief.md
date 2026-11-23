# Shop-Floor Agent Action Guardrails: use-case brief

> Generated from the blueprint `manufacturing/shopfloor-agent-action-guardrails` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Shop-Floor Agent Action Guardrails · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Keep AI agents inside safe limits when they touch recipes, work orders and machine parameters on the shop floor, and give quality and safety teams a trustworthy record of every change. The system has to run interactively, within a few seconds, inside these limits: Parameter limits enforced by a cell gateway between the agent and the machine controllers, Agents never change safety interlocks, recipe master data or line speed beyond validated bands and Shift supervisor approval before any recipe or setpoint change reaches a line.

**Why it is hard.** The obvious approach is instructions given to the agent, and it fails because a tampered prompt must never reach a press or oven. The second trap is in "Scope": the real signal is write access to named parameters on named lines, while teams usually reach for plant-wide write rights in the execution system.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 63 at peak, at an estimated $128.2K a month. A mistake is expensive in the way scrap tied to agent changes measures it.

**What success looks like.** Offline: Band coverage across lines, Block rate on seeded out-of-band edits and Change history completeness. Online: Out-of-band edits stopped before the line, Scrap tied to agent changes and Minutes to pull a change history for quality. The launch is judged on "Out-of-band edits stopped before the line" while "Scrap tied to agent changes" must not get worse.

## Objective, loss and constraints

**Business objective.** Keep AI agents inside safe limits when they touch recipes, work orders and machine parameters on the shop floor, and give quality and safety teams a trustworthy record of every change.

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

- Parameter limits enforced by a cell gateway between the agent and the machine controllers
- Agents never change safety interlocks, recipe master data or line speed beyond validated bands
- Shift supervisor approval before any recipe or setpoint change reaches a line
- Change records held for the full product life
- Per-line agent lock that blocks its writes within 5 s
- Quality engineers can pull any change history within 10 s

## The approach in one paragraph

Start with shift supervisors compare the agent change list with the paper logbook at the end of each shift. Then earn the move to a cell gateway with validated parameter bands and a line lock, a change history with before and after values, drift detection on agent edits and a weekly quality review for line managers, and only if it beats the baseline on Band coverage across lines and Block rate on seeded out-of-band edits after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Parameter change distance from validated band | How far the request is from approved limits. Blocking and approval routing. Guard against: machine controller data. |
| Add Recipe edits per shift | Change volume against the line norm. Runaway detection. Guard against: execution system. |
| Add Supervisor rejection rate | Agent proposals declined on the floor. Trust signal. Guard against: approval records. |
| Run it as one pipeline | Cell gateway (controller proxy), Parameter band decision (validated limits), Supervisor approval (shift workflow), Change history (versioned store), Edit drift monitor (control chart) and Change replay console (quality viewer), with Weekly quality report off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle setpoint creep | Cumulative drift limits per parameter. |

**Deliberately not doing**

- Machine nickname: a label only.
- Work order note length: not risk.
- Agent build number alone: needs outcome data.

**How the approach is proven**

Prove it offline on Band coverage across lines, Block rate on seeded out-of-band edits and Change history completeness using time-ordered splits, then online on "Out-of-band edits stopped before the line" with "Scrap tied to agent changes" as the guardrail. Watch for: Plant-wide write rights, Instruction-only limits and Edits allowed on unvalidated variants.

## Baseline and production design

- **Baseline (build this first):** Shift supervisors compare the agent change list with the paper logbook at the end of each shift.
- **Production design:** A cell gateway with validated parameter bands and a line lock, a change history with before and after values, drift detection on agent edits and a weekly quality review for line managers.

## Why AI, and why this kind

**Why AI.** Keep AI agents inside safe limits when they touch recipes, work orders and machine parameters on the shop floor, and give quality and safety teams a trustworthy record of every change. The evidence that separates good from bad outcomes (Parameter change distance from validated band, Recipe edits per shift, Supervisor rejection rate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "instructions given to the agent" are what teams reach for first, and they fail because A tampered prompt must never reach a press or oven. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A cell gateway with validated parameter bands and a line lock, a change history with before and after values, drift detection on agent edits and a weekly quality review for line managers.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Parameter change distance from validated band, Recipe edits per shift, Supervisor rejection rate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Shift supervisors compare the agent change list with the paper logbook at the end of each shift | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A cell gateway with validated parameter bands and a line lock, a change history with before and after values, drift detection on agent edits and a weekly quality review for line managers | chosen | Meets the 2500 ms envelope at $4.75 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Out-of-band edits stopped before the line) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Plant-wide write rights.
- Evaluation trap: Instruction-only limits.
- Setpoint creep: repeated small edits move a parameter outside the validated band over a shift.
- Approval by habit: supervisors tap approve to keep the line moving.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
