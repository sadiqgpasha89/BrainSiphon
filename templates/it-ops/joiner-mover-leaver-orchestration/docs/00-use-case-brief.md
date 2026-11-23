# Joiner Mover Leaver Orchestration: use-case brief

> Generated from the blueprint `it-ops/joiner-mover-leaver-orchestration` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Joiner Mover Leaver Orchestration · **Domain:** it-ops · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Coordinate account, device and access changes when people join, move or leave, from HR events and policy, with approvals and verification so access matches the role at all times. The system has to run as a scheduled batch job, inside these limits: Leaver access removed within 1 hour of the HR event, Privileged access removed by human-approved steps and HR data used only for role and dates.

**Why it is hard.** The obvious approach is manager emails, and it fails because emails are late and incomplete. The second trap is in "Control": the real signal is verification after each step, while teams usually reach for assumed completion.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $2.2K a month. A mistake is expensive in the way time to full access on day one measures it.

**What success looks like.** Offline: Entitlement delta accuracy, Completion verification and Time to revoke. Online: Orphaned accounts, Time to full access on day one and Audit findings on leavers. The launch is judged on "Orphaned accounts" while "Time to full access on day one" must not get worse.

## Objective, loss and constraints

**Business objective.** Coordinate account, device and access changes when people join, move or leave, from HR events and policy, with approvals and verification so access matches the role at all times.

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

- Leaver access removed within 1 hour of the HR event
- Privileged access removed by human-approved steps
- HR data used only for role and dates
- Every step verified and logged
- 30K events per year

## The approach in one paragraph

Start with manual tickets raised by managers and processed by several teams, because it is the usual process. Then earn the move to a workflow orchestrator that turns HR events into role-based tasks, executes low-risk steps, routes approvals for the rest and verifies completion with exceptions to owners, and only if it beats the baseline on Entitlement delta accuracy and Completion verification after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around HR event type and date | Join, move or leave event. Trigger. Guard against: from HR system. |
| Add Role and department | Target role. Entitlement. Guard against: from HR and identity. |
| Add Current entitlements | Access held now. Delta. Guard against: from identity systems. |
| Run it as one pipeline | HR event intake (HR system), Role delta calculation (identity governance), Task plan (workflow), Low-risk provisioning (identity provider), Approval for sensitive steps (approvers) and Verification (scans), with Exception queue off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle late HR data | Emergency revocation path. |

**Deliberately not doing**

- Employee name: personal data.
- Manager comments: personal data.
- Ticket wording: weak link.

**How the approach is proven**

Prove it offline on Entitlement delta accuracy, Completion verification and Time to revoke using time-ordered splits, then online on "Orphaned accounts" with "Time to full access on day one" as the guardrail. Watch for: Manager emails as triggers, Assumed completion and Copying access from peers.

## Baseline and production design

- **Baseline (build this first):** Manual tickets raised by managers and processed by several teams, because it is the usual process.
- **Production design:** A workflow orchestrator that turns HR events into role-based tasks, executes low-risk steps, routes approvals for the rest and verifies completion with exceptions to owners.

## Why AI, and why this kind

**Why AI.** Coordinate account, device and access changes when people join, move or leave, from HR events and policy, with approvals and verification so access matches the role at all times. The evidence that separates good from bad outcomes (HR event type and date, Role and department, Current entitlements) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "manager emails" are what teams reach for first, and they fail because emails are late and incomplete. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A workflow orchestrator that turns HR events into role-based tasks, executes low-risk steps, routes approvals for the rest and verifies completion with exceptions to owners.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among HR event type and date, Role and department, Current entitlements and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual tickets raised by managers and processed by several teams, because it is the usual process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A workflow orchestrator that turns HR events into role-based tasks, executes low-risk steps, routes approvals for the rest and verifies completion with exceptions to owners | chosen | Meets the run-window envelope at $0.050 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Orphaned accounts) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Manager emails as triggers.
- Evaluation trap: Assumed completion.
- Late HR data: the event arrives after the leaving date.
- Dual role: a person holds two roles.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
