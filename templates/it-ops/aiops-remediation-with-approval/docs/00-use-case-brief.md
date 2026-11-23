# AIOps Remediation with Approval: use-case brief

> Generated from the blueprint `it-ops/aiops-remediation-with-approval` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** AIOps Remediation with Approval · **Domain:** it-ops · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Propose and run approved remediation steps for known incident patterns, such as restarting a service or clearing a queue, with verification and rollback, under pre-approved runbooks and human approval for anything else. The system has to run interactively, within a few seconds, inside these limits: Only pre-approved runbooks run automatically, Production changes need an approver unless the runbook is certified and Every step verified with rollback.

**Why it is hard.** The obvious approach is free-form commands, and it fails because free-form actions can cause outages. The second trap is in "Control": the real signal is verification after each step, while teams usually reach for assumed success.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $210.5K a month. A mistake is expensive in the way failed remediations measures it.

**What success looks like.** Offline: Pattern match precision, Rollback success rate and Verification coverage. Online: Mean time to restore for known patterns, Failed remediations and Manual toil. The launch is judged on "Mean time to restore for known patterns" while "Failed remediations" must not get worse.

## Objective, loss and constraints

**Business objective.** Propose and run approved remediation steps for known incident patterns, such as restarting a service or clearing a queue, with verification and rollback, under pre-approved runbooks and human approval for anything else.

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

- Only pre-approved runbooks run automatically
- Production changes need an approver unless the runbook is certified
- Every step verified with rollback
- Remediation within 5 minutes for approved patterns
- 10K executions per year

## The approach in one paragraph

Start with responders running runbook commands by hand, because it is the standard practice. Then earn the move to a remediation orchestrator that matches incidents to certified runbooks, runs checks, applies steps with approval tiers, verifies results and rolls back on failure, and only if it beats the baseline on Pattern match precision and Rollback success rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Incident pattern match | Match to a certified pattern. Gate. Guard against: from pattern library. |
| Add Blast radius | Services and users affected by the action. Risk. Guard against: from the CMDB. |
| Add Pre-check results | Health checks before the step. Gate. Guard against: from monitoring. |
| Run it as one pipeline | Incident pattern match (pattern library), Pre-checks (monitoring), Approval by tier (maker-checker), Step execution (automation platform), Post-checks (monitoring), Rollback on failure (automation platform) and Execution log (append-only store). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle pattern mismatch | Stop and hand to a human. |

**Deliberately not doing**

- Responder name: personal data.
- Incident number: an identifier.
- Chat wording: weak link.

**How the approach is proven**

Prove it offline on Pattern match precision, Rollback success rate and Verification coverage using time-ordered splits, then online on "Mean time to restore for known patterns" with "Failed remediations" as the guardrail. Watch for: Free-form commands, Model confidence as approval and Assumed success.

## Baseline and production design

- **Baseline (build this first):** Responders running runbook commands by hand, because it is the standard practice.
- **Production design:** A remediation orchestrator that matches incidents to certified runbooks, runs checks, applies steps with approval tiers, verifies results and rolls back on failure.

## Why AI, and why this kind

**Why AI.** Propose and run approved remediation steps for known incident patterns, such as restarting a service or clearing a queue, with verification and rollback, under pre-approved runbooks and human approval for anything else. The evidence that separates good from bad outcomes (Incident pattern match, Blast radius, Pre-check results) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "free-form commands" are what teams reach for first, and they fail because free-form actions can cause outages. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A remediation orchestrator that matches incidents to certified runbooks, runs checks, applies steps with approval tiers, verifies results and rolls back on failure.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Incident pattern match, Blast radius, Pre-check results and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Responders running runbook commands by hand, because it is the standard practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A remediation orchestrator that matches incidents to certified runbooks, runs checks, applies steps with approval tiers, verifies results and rolls back on failure | chosen | Meets the 2500 ms envelope at $4.68 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Mean time to restore for known patterns) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Free-form commands.
- Evaluation trap: Model confidence as approval.
- Pattern mismatch: the incident only looks like a known one.
- Step partially fails: a step changes some systems.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
