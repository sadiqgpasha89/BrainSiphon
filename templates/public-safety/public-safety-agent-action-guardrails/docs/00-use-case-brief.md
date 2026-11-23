# Public Safety Agent Action Guardrails: use-case brief

> Generated from the blueprint `public-safety/public-safety-agent-action-guardrails` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Public Safety Agent Action Guardrails · **Domain:** public-safety · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Bound what AI agents may do in dispatch, records and alerting systems for emergency services, keep a human decision on every consequential step and preserve a record that can stand up to review. The system has to run interactively, within a few seconds, inside these limits: Dispatch and alerting rules enforced by a gateway the agent cannot change, Agents never dispatch units, send public alerts or alter incident records without a human decision and Supervisor approval within 60 s for any action that moves a unit.

**Why it is hard.** The obvious approach is instructions given to the agent, and it fails because lives may depend on a rule that cannot be talked around. The second trap is in "Scope": the real signal is suggest-only access to dispatch and read access to records, while teams usually reach for direct dispatch rights.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 63 at peak, at an estimated $128.2K a month. A mistake is expensive in the way response time change after agent suggestions measures it.

**What success looks like.** Offline: Tier coverage across incident types, Block rate on seeded unsafe proposals and Decision record completeness. Online: Unsafe proposals blocked before dispatch, Response time change after agent suggestions and Minutes to answer an oversight request. The launch is judged on "Unsafe proposals blocked before dispatch" while "Response time change after agent suggestions" must not get worse.

## Objective, loss and constraints

**Business objective.** Bound what AI agents may do in dispatch, records and alerting systems for emergency services, keep a human decision on every consequential step and preserve a record that can stand up to review.

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

- Dispatch and alerting rules enforced by a gateway the agent cannot change
- Agents never dispatch units, send public alerts or alter incident records without a human decision
- Supervisor approval within 60 s for any action that moves a unit
- Records kept for the statutory retention period
- Per-agent suspension that stops its actions within 5 s
- Oversight staff can retrieve any action history within 10 s

## The approach in one paragraph

Start with duty supervisors review a sample of agent suggestions after major incidents, which leaves routine days unchecked. Then earn the move to a dispatch gateway with action tiers and a suspension switch, a time-stamped decision record with replay, drift detection on proposals and a monthly oversight pack for command staff, and only if it beats the baseline on Tier coverage across incident types and Block rate on seeded unsafe proposals after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Action tier of the proposal | Whether it moves a unit or sends a public message. Approval routing. Guard against: dispatch system. |
| Add Proposals per incident | Suggestion volume against the incident norm. Runaway detection. Guard against: dispatch log. |
| Add Dispatcher override rate | Proposals changed or declined by dispatchers. Trust and drift signal. Guard against: decision records. |
| Run it as one pipeline | Dispatch gateway (interface proxy), Action tier decision (rule set), Supervisor approval (dual confirmation), Decision record (time-stamped store), Proposal drift monitor (statistical model) and Incident replay console (review viewer), with Monthly oversight report off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle alert flood | Alert caps and mandatory supervisor release. |

**Deliberately not doing**

- Unit callsign alone: an identifier.
- Call note length: not risk.
- Agent release number alone: needs outcome data.

**How the approach is proven**

Prove it offline on Tier coverage across incident types, Block rate on seeded unsafe proposals and Decision record completeness using time-ordered splits, then online on "Unsafe proposals blocked before dispatch" with "Response time change after agent suggestions" as the guardrail. Watch for: Direct dispatch rights, Instruction-only limits and Full access at new stations.

## Baseline and production design

- **Baseline (build this first):** Duty supervisors review a sample of agent suggestions after major incidents, which leaves routine days unchecked.
- **Production design:** A dispatch gateway with action tiers and a suspension switch, a time-stamped decision record with replay, drift detection on proposals and a monthly oversight pack for command staff.

## Why AI, and why this kind

**Why AI.** Bound what AI agents may do in dispatch, records and alerting systems for emergency services, keep a human decision on every consequential step and preserve a record that can stand up to review. The evidence that separates good from bad outcomes (Action tier of the proposal, Proposals per incident, Dispatcher override rate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "instructions given to the agent" are what teams reach for first, and they fail because lives may depend on a rule that cannot be talked around. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A dispatch gateway with action tiers and a suspension switch, a time-stamped decision record with replay, drift detection on proposals and a monthly oversight pack for command staff.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Action tier of the proposal, Proposals per incident, Dispatcher override rate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Duty supervisors review a sample of agent suggestions after major incidents, which leaves routine days unchecked | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A dispatch gateway with action tiers and a suspension switch, a time-stamped decision record with replay, drift detection on proposals and a monthly oversight pack for command staff | chosen | Meets the 2500 ms envelope at $4.75 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Unsafe proposals blocked before dispatch) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Direct dispatch rights.
- Evaluation trap: Instruction-only limits.
- Alert flood: an agent proposes many public alerts during a fast-moving incident.
- Automation bias: dispatchers accept suggestions without checking the map.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
