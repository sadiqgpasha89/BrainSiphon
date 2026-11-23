# Public Sector Agent Action Guardrails: use-case brief

> Generated from the blueprint `public-sector/public-sector-agent-action-guardrails` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Public Sector Agent Action Guardrails · **Domain:** public-sector · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Limit and record what AI agents do inside benefit systems, citizen records and payment runs so that every decision affecting a resident has a named human owner and a record an ombudsman can review. The system has to run interactively, within a few seconds, inside these limits: Eligibility and payment rules enforced by a gateway outside the agent, Agents never approve benefits, change a resident record or release a payment on their own and Caseworker sign-off within 2 working days for any decision that affects a resident.

**Why it is hard.** The obvious approach is instructions given to the agent, and it fails because residents are owed decisions that rules and law bind. The second trap is in "Scope": the real signal is draft-only rights with named fields, while teams usually reach for direct edit rights across case systems.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 63 at peak, at an estimated $128.2K a month. A mistake is expensive in the way appeals traced to agent drafts measures it.

**What success looks like.** Offline: Tier coverage across schemes, Block rate on seeded wrong decisions and Decision trail completeness. Online: Wrong drafts stopped before release, Appeals traced to agent drafts and Days to answer an ombudsman request. The launch is judged on "Wrong drafts stopped before release" while "Appeals traced to agent drafts" must not get worse.

## Objective, loss and constraints

**Business objective.** Limit and record what AI agents do inside benefit systems, citizen records and payment runs so that every decision affecting a resident has a named human owner and a record an ombudsman can review.

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

- Eligibility and payment rules enforced by a gateway outside the agent
- Agents never approve benefits, change a resident record or release a payment on their own
- Caseworker sign-off within 2 working days for any decision that affects a resident
- Decision records kept for the statutory retention period
- Per-agent suspension that stops its actions within 15 s
- Oversight staff can retrieve any record trail within 20 s

## The approach in one paragraph

Start with team managers read a random sample of agent drafts each month, which misses most decisions. Then earn the move to a rules gateway with decision tiers and a suspension switch, a decision trail with the signing caseworker, drift detection on drafts and a quarterly ombudsman pack for oversight leads, and only if it beats the baseline on Tier coverage across schemes and Block rate on seeded wrong decisions after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Decision tier of the draft | Whether it changes entitlement or payment. Sign-off routing. Guard against: case system. |
| Add Drafts per caseworker per day | Volume against the team norm. Runaway detection. Guard against: workflow log. |
| Add Caseworker change rate | Drafts edited or rejected before release. Trust signal. Guard against: decision trail. |
| Run it as one pipeline | Rules gateway (service proxy), Decision tier rules (policy engine), Caseworker sign-off (workflow), Decision trail (immutable store), Draft drift monitor (statistical model) and Trail replay console (review viewer), with Quarterly oversight report off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle mass draft run | Batch caps and a hold for sampling. |

**Deliberately not doing**

- Resident reference alone: an identifier.
- Letter length: not risk.
- Agent version string: needs outcome data.

**How the approach is proven**

Prove it offline on Tier coverage across schemes, Block rate on seeded wrong decisions and Decision trail completeness using time-ordered splits, then online on "Wrong drafts stopped before release" with "Appeals traced to agent drafts" as the guardrail. Watch for: Direct edit rights across case systems, Instruction-only limits and Release allowed on new schemes.

## Baseline and production design

- **Baseline (build this first):** Team managers read a random sample of agent drafts each month, which misses most decisions.
- **Production design:** A rules gateway with decision tiers and a suspension switch, a decision trail with the signing caseworker, drift detection on drafts and a quarterly ombudsman pack for oversight leads.

## Why AI, and why this kind

**Why AI.** Limit and record what AI agents do inside benefit systems, citizen records and payment runs so that every decision affecting a resident has a named human owner and a record an ombudsman can review. The evidence that separates good from bad outcomes (Decision tier of the draft, Drafts per caseworker per day, Caseworker change rate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "instructions given to the agent" are what teams reach for first, and they fail because residents are owed decisions that rules and law bind. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A rules gateway with decision tiers and a suspension switch, a decision trail with the signing caseworker, drift detection on drafts and a quarterly ombudsman pack for oversight leads.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Decision tier of the draft, Drafts per caseworker per day, Caseworker change rate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Team managers read a random sample of agent drafts each month, which misses most decisions | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A rules gateway with decision tiers and a suspension switch, a decision trail with the signing caseworker, drift detection on drafts and a quarterly ombudsman pack for oversight leads | chosen | Meets the 2500 ms envelope at $4.75 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Wrong drafts stopped before release) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Direct edit rights across case systems.
- Evaluation trap: Instruction-only limits.
- Mass draft run: an agent drafts hundreds of decisions after a rule change without a pause.
- Sign-off by routine: caseworkers sign drafts without reading the evidence.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
