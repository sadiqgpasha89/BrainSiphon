# Coding Agent Sandbox and Permission Policy: use-case brief

> Generated from the blueprint `devtools/coding-agent-sandbox-permissions` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Coding Agent Sandbox and Permission Policy · **Domain:** devtools · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Run coding agents inside isolated sandboxes with least-privilege, short-lived credentials and egress controls so agents can build and test code but cannot reach production or exfiltrate data. The system has to run interactively, within a few seconds, inside these limits: Agents have no production credentials, Network egress limited to approved hosts and Credentials expire within 1 hour.

**Why it is hard.** The obvious approach is developer laptops, and it fails because a compromised session must not spread. The second trap is in "Credentials": the real signal is short-lived scoped tokens, while teams usually reach for long-lived personal tokens.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $210.1K a month. A mistake is expensive in the way blocked egress attempts measures it.

**What success looks like.** Offline: Escape tests, Egress block rate on seeded attempts and Token lifetime compliance. Online: Agent sessions without incidents, Blocked egress attempts and Credential exposure events. The launch is judged on "Agent sessions without incidents" while "Blocked egress attempts" must not get worse.

## Objective, loss and constraints

**Business objective.** Run coding agents inside isolated sandboxes with least-privilege, short-lived credentials and egress controls so agents can build and test code but cannot reach production or exfiltrate data.

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

- Agents have no production credentials
- Network egress limited to approved hosts
- Credentials expire within 1 hour
- Every command logged
- 20K agent sessions per day

## The approach in one paragraph

Start with agents running with the developer's credentials on their machine, because it is how early tools work. Then earn the move to a sandbox platform with per-task credentials, egress allow-lists, command logging, resource limits and automatic teardown, with policy as code reviewed by security, and only if it beats the baseline on Escape tests and Egress block rate on seeded attempts after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Sandbox policy compliance | Whether commands stayed in policy. Safety. Guard against: from logs. |
| Add Token scope and lifetime | Permissions and expiry. Risk. Guard against: from the credential service. |
| Add Egress attempts | Blocked and allowed connections. Exfiltration signal. Guard against: from network logs. |
| Run it as one pipeline | Task start (agent platform), Sandbox provisioning (isolated runtime), Credential issuance (credential broker), Policy enforcement (gateway), Command and network logging (append-only store) and Teardown (platform), with Policy review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle prompt injection in a repository | Egress limits and no production reach. |

**Deliberately not doing**

- Developer name: personal data.
- Task title wording: weak link.
- Repository name: an identifier.

**How the approach is proven**

Prove it offline on Escape tests, Egress block rate on seeded attempts and Token lifetime compliance using time-ordered splits, then online on "Agent sessions without incidents" with "Blocked egress attempts" as the guardrail. Watch for: Developer credentials for agents, Open internet access and Long-lived tokens.

## Baseline and production design

- **Baseline (build this first):** Agents running with the developer's credentials on their machine, because it is how early tools work.
- **Production design:** A sandbox platform with per-task credentials, egress allow-lists, command logging, resource limits and automatic teardown, with policy as code reviewed by security.

## Why AI, and why this kind

**Why AI.** Run coding agents inside isolated sandboxes with least-privilege, short-lived credentials and egress controls so agents can build and test code but cannot reach production or exfiltrate data. The evidence that separates good from bad outcomes (Sandbox policy compliance, Token scope and lifetime, Egress attempts) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "developer laptops" are what teams reach for first, and they fail because A compromised session must not spread. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A sandbox platform with per-task credentials, egress allow-lists, command logging, resource limits and automatic teardown, with policy as code reviewed by security.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Sandbox policy compliance, Token scope and lifetime, Egress attempts and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Agents running with the developer's credentials on their machine, because it is how early tools work | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A sandbox platform with per-task credentials, egress allow-lists, command logging, resource limits and automatic teardown, with policy as code reviewed by security | chosen | Meets the 2500 ms envelope at $4.67 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Agent sessions without incidents) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Developer credentials for agents.
- Evaluation trap: Open internet access.
- Prompt injection in a repository: the agent follows hostile instructions.
- Credential leak in output: a token appears in a log.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
