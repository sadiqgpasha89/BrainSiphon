# DevTools Agent Action Guardrails: use-case brief

> Generated from the blueprint `devtools/devtools-agent-action-guardrails` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** DevTools Agent Action Guardrails · **Domain:** devtools · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Control every action AI coding agents take in source repositories, build pipelines and package registries, enforce approval tiers and give security reviewers a replayable record of each change. The system has to run interactively, within a few seconds, inside these limits: Branch protection and registry write rules enforced by a gateway the agent cannot edit, Agents never merge to protected branches, publish packages or change repository access settings and Release approvals by named code owners within 4 working hours.

**Why it is hard.** The obvious approach is instructions in the agent prompt, and it fails because a crafted issue comment can override prompt text. The second trap is in "Scope": the real signal is one short-lived token per agent and repository, while teams usually reach for a shared organisation access token.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $210.5K a month. A mistake is expensive in the way production incidents traced to agent changes measures it.

**What success looks like.** Offline: Rule coverage on branch tiers, Catch rate on seeded unsafe pushes and Replay completeness of sessions. Online: Unsafe pushes stopped at the gateway, Production incidents traced to agent changes and Minutes to answer a reviewer replay request. The launch is judged on "Unsafe pushes stopped at the gateway" while "Production incidents traced to agent changes" must not get worse.

## Objective, loss and constraints

**Business objective.** Control every action AI coding agents take in source repositories, build pipelines and package registries, enforce approval tiers and give security reviewers a replayable record of each change.

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

- Branch protection and registry write rules enforced by a gateway the agent cannot edit
- Agents never merge to protected branches, publish packages or change repository access settings
- Release approvals by named code owners within 4 working hours
- Commit and pipeline actions recorded in a tamper-evident ledger
- Per-agent revoke switch that stops its tokens within 30 s
- Reviewers can replay any agent session from the last 90 days within 5 s

## The approach in one paragraph

Start with team leads skim agent pull requests once a week, because there is no other check on what the agents changed. Then earn the move to a repository gateway with branch tiers, push rate limits and a token revoke switch, a signed change ledger with session replay, loop detection on pushes and a weekly review pack for security leads, and only if it beats the baseline on Rule coverage on branch tiers and Catch rate on seeded unsafe pushes after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Protected-branch touch attempts | Writes aimed at main, release and tag refs. Tier routing. Guard against: source host events. |
| Add Pushes per agent per hour | Push volume against the agent baseline. Runaway loop detection. Guard against: per agent token. |
| Add Reviewer overrides on agent pull requests | Forced merges and skipped checks. Governance health. Guard against: pull request metadata. |
| Run it as one pipeline | Repository gateway (git proxy), Branch tier decision (rules engine), Codeowner approval (pull request gate), Change ledger (signed event store), Push monitor (rate model) and Session replay console (web viewer), with Weekly review report off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle push loop | Per branch push caps and loop detection. |

**Deliberately not doing**

- Branch name prefix: a label only.
- Commit message length: not risk.
- Agent framework version alone: needs outcome data.

**How the approach is proven**

Prove it offline on Rule coverage on branch tiers, Catch rate on seeded unsafe pushes and Replay completeness of sessions using time-ordered splits, then online on "Unsafe pushes stopped at the gateway" with "Production incidents traced to agent changes" as the guardrail. Watch for: Prompt-only restrictions, Organisation-wide access tokens and Writes allowed on new registries.

## Baseline and production design

- **Baseline (build this first):** Team leads skim agent pull requests once a week, because there is no other check on what the agents changed.
- **Production design:** A repository gateway with branch tiers, push rate limits and a token revoke switch, a signed change ledger with session replay, loop detection on pushes and a weekly review pack for security leads.

## Why AI, and why this kind

**Why AI.** Control every action AI coding agents take in source repositories, build pipelines and package registries, enforce approval tiers and give security reviewers a replayable record of each change. The evidence that separates good from bad outcomes (Protected-branch touch attempts, Pushes per agent per hour, Reviewer overrides on agent pull requests) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "instructions in the agent prompt" are what teams reach for first, and they fail because A crafted issue comment can override prompt text. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A repository gateway with branch tiers, push rate limits and a token revoke switch, a signed change ledger with session replay, loop detection on pushes and a weekly review pack for security leads.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Protected-branch touch attempts, Pushes per agent per hour, Reviewer overrides on agent pull requests and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Team leads skim agent pull requests once a week, because there is no other check on what the agents changed | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A repository gateway with branch tiers, push rate limits and a token revoke switch, a signed change ledger with session replay, loop detection on pushes and a weekly review pack for security leads | chosen | Meets the 2500 ms envelope at $4.68 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Unsafe pushes stopped at the gateway) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Prompt-only restrictions.
- Evaluation trap: Organisation-wide access tokens.
- Push loop: an agent retries a failing fix and floods one branch with commits.
- Rubber-stamp reviews: code owners approve agent pull requests without reading them.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
