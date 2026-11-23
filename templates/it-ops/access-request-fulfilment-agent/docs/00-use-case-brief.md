# Access Request Fulfilment Agent: use-case brief

> Generated from the blueprint `it-ops/access-request-fulfilment-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Access Request Fulfilment Agent · **Domain:** it-ops · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Handle routine access requests by checking policy and role, routing approvals and provisioning low-risk access through workflow, with a full audit record. The system has to run interactively, within a few seconds, inside these limits: Provisioning only after required approvals, Privileged access never granted by the agent and Every request logged with the policy checked.

**Why it is hard.** The obvious approach is free-form approval, and it fails because manual exceptions weaken control. The second trap is in "Scope": the real signal is low-risk standard access, while teams usually reach for privileged or sensitive access.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $210.5K a month. A mistake is expensive in the way manual handling share measures it.

**What success looks like.** Offline: Policy decision accuracy, Separation of duty detection and Audit completeness. Online: Fulfilment time, Manual handling share and Access violations found in review. The launch is judged on "Fulfilment time" while "Manual handling share" must not get worse.

## Objective, loss and constraints

**Business objective.** Handle routine access requests by checking policy and role, routing approvals and provisioning low-risk access through workflow, with a full audit record.

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

- Provisioning only after required approvals
- Privileged access never granted by the agent
- Every request logged with the policy checked
- Low-risk fulfilment within 10 minutes
- 100K requests per year

## The approach in one paragraph

Start with ticket forms with manual approval and manual provisioning, because it is the usual process. Then earn the move to a workflow agent that interprets requests, checks policy and separation of duties, routes approvals and calls provisioning only for low-risk entitlements, and only if it beats the baseline on Policy decision accuracy and Separation of duty detection after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Role and entitlement match | Whether the role allows the access. Core. Guard against: from the directory. |
| Add Risk tier of the target | Sensitivity of the system. Routing. Guard against: from the catalogue. |
| Add Existing access | What the user already holds. Conflict checks. Guard against: from identity systems. |
| Run it as one pipeline | Request intake (service portal), Policy and role check (identity governance), Separation of duty check (rules), Approval routing (workflow), Provisioning (identity provider) and Confirmation (requester), with Audit record off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle conflicting duties | Block and explain the policy. |

**Deliberately not doing**

- Requester name: personal data.
- Request wording: weak link.
- Time of day: irrelevant.

**How the approach is proven**

Prove it offline on Policy decision accuracy, Separation of duty detection and Audit completeness using time-ordered splits, then online on "Fulfilment time" with "Manual handling share" as the guardrail. Watch for: Agent-granted privileged access, Approval by chat and Missing audit records.

## Baseline and production design

- **Baseline (build this first):** Ticket forms with manual approval and manual provisioning, because it is the usual process.
- **Production design:** A workflow agent that interprets requests, checks policy and separation of duties, routes approvals and calls provisioning only for low-risk entitlements.

## Why AI, and why this kind

**Why AI.** Handle routine access requests by checking policy and role, routing approvals and provisioning low-risk access through workflow, with a full audit record. The evidence that separates good from bad outcomes (Role and entitlement match, Risk tier of the target, Existing access) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "free-form approval" are what teams reach for first, and they fail because manual exceptions weaken control. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A workflow agent that interprets requests, checks policy and separation of duties, routes approvals and calls provisioning only for low-risk entitlements.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Role and entitlement match, Risk tier of the target, Existing access and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Ticket forms with manual approval and manual provisioning, because it is the usual process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A workflow agent that interprets requests, checks policy and separation of duties, routes approvals and calls provisioning only for low-risk entitlements | chosen | Meets the 2500 ms envelope at $4.68 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Fulfilment time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Agent-granted privileged access.
- Evaluation trap: Approval by chat.
- Conflicting duties: the access would break separation of duties.
- Missing approver: the approver has left.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
