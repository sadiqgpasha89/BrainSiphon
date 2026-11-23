# Engineering Agent Action Guardrails: use-case brief

> Generated from the blueprint `engineering/engineering-agent-action-guardrails` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Engineering Agent Action Guardrails · **Domain:** engineering · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Control how AI agents change CAD models, bills of materials and simulation setups, keep release authority with named engineers and retain a design history that regulators and customers can inspect. The system has to run interactively, within a few seconds, inside these limits: Release rules enforced by the product data system rather than by agent instructions, Agents never release a drawing, change a safety critical dimension or alter a bill of materials on their own and Engineer approval by the responsible design owner within 1 working day.

**Why it is hard.** The obvious approach is instructions given to the agent, and it fails because drawings must follow controlled release. The second trap is in "Scope": the real signal is edit rights on working copies of named parts, while teams usually reach for write access to released data.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $210.5K a month. A mistake is expensive in the way engineering changes traced to agent edits measures it.

**What success looks like.** Offline: Release rule coverage across lines, Block rate on seeded unsafe edits and Revision trail completeness. Online: Unsafe edits stopped before release, Engineering changes traced to agent edits and Minutes to answer a design history request. The launch is judged on "Unsafe edits stopped before release" while "Engineering changes traced to agent edits" must not get worse.

## Objective, loss and constraints

**Business objective.** Control how AI agents change CAD models, bills of materials and simulation setups, keep release authority with named engineers and retain a design history that regulators and customers can inspect.

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

- Release rules enforced by the product data system rather than by agent instructions
- Agents never release a drawing, change a safety critical dimension or alter a bill of materials on their own
- Engineer approval by the responsible design owner within 1 working day
- Revision history kept for the product life plus 10 years
- Per-agent lock that blocks its writes within 15 s
- Reviewers can retrieve any revision trail within 10 s

## The approach in one paragraph

Start with design owners compare the agent edit list with the revision history before each release review. Then earn the move to a product data gateway with release states and a write lock, a revision trail with geometry comparison, drift detection on agent edits and a monthly design governance pack for engineering leads, and only if it beats the baseline on Release rule coverage across lines and Block rate on seeded unsafe edits after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Release state of the target | Working copy or released revision. Approval routing. Guard against: product data system. |
| Add Edits per part per day | Change volume against design norms. Runaway detection. Guard against: revision log. |
| Add Engineer rejection rate | Agent edits declined by design owners. Trust signal. Guard against: approval records. |
| Run it as one pipeline | Product data gateway (API proxy), Release state decision (lifecycle rules), Design owner approval (review workflow), Revision trail (versioned vault), Edit drift monitor (statistical model) and Revision replay console (model viewer), with Monthly design report off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle edit cascade | Impact limits on assemblies per change. |

**Deliberately not doing**

- Part nickname: a label only.
- Change note length: not risk.
- Agent build alone: needs outcome data.

**How the approach is proven**

Prove it offline on Release rule coverage across lines, Block rate on seeded unsafe edits and Revision trail completeness using time-ordered splits, then online on "Unsafe edits stopped before release" with "Engineering changes traced to agent edits" as the guardrail. Watch for: Write access to released data, Instruction-only limits and Edits allowed on new lines.

## Baseline and production design

- **Baseline (build this first):** Design owners compare the agent edit list with the revision history before each release review.
- **Production design:** A product data gateway with release states and a write lock, a revision trail with geometry comparison, drift detection on agent edits and a monthly design governance pack for engineering leads.

## Why AI, and why this kind

**Why AI.** Control how AI agents change CAD models, bills of materials and simulation setups, keep release authority with named engineers and retain a design history that regulators and customers can inspect. The evidence that separates good from bad outcomes (Release state of the target, Edits per part per day, Engineer rejection rate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "instructions given to the agent" are what teams reach for first, and they fail because drawings must follow controlled release. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A product data gateway with release states and a write lock, a revision trail with geometry comparison, drift detection on agent edits and a monthly design governance pack for engineering leads.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Release state of the target, Edits per part per day, Engineer rejection rate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Design owners compare the agent edit list with the revision history before each release review | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A product data gateway with release states and a write lock, a revision trail with geometry comparison, drift detection on agent edits and a monthly design governance pack for engineering leads | chosen | Meets the 2500 ms envelope at $4.68 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Unsafe edits stopped before release) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Write access to released data.
- Evaluation trap: Instruction-only limits.
- Edit cascade: an agent change to one part ripples across a large assembly.
- Review by trust: design owners approve agent edits after a quick glance.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
