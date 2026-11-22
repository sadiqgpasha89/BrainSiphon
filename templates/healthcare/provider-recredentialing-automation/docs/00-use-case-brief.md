# Provider Recredentialing Automation: use-case brief

> Generated from the blueprint `healthcare/provider-recredentialing-automation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Recredentialing Automation · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Orchestrate periodic recredentialing cycles, evidence collection, verification, exception routing and committee packet preparation with a deterministic case state machine and human sign-off for every adverse finding. The system has to run interactively, within a few seconds, inside these limits: An agent only drafts, retrieves and routes and every adverse finding, approval, denial or privilege change needs human sign-off, Tool permissions are least privilege and read-only by default and Messages to providers are drafts until approved.

**Why it is hard.** The obvious approach is a free-running agent, and it fails because the case must be resumable and auditable. The second trap is in "Authority": the real signal is draft and route only, while teams usually reach for approve or deny.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 4 at peak, at an estimated $20.5K a month. A mistake is expensive in the way specialist hours per case measures it.

**What success looks like.** Offline: Citation faithfulness and unsupported-claim rate, Task success on replayed cases and Unauthorised tool-call attempts blocked. Online: Recredentialing cycle time, Specialist hours per case and Cases completed before expiry. The launch is judged on "Recredentialing cycle time" while "Specialist hours per case" must not get worse.

## Objective, loss and constraints

**Business objective.** Orchestrate periodic recredentialing cycles, evidence collection, verification, exception routing and committee packet preparation with a deterministic case state machine and human sign-off for every adverse finding.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{case})+\lambda\,\mathrm{PolicyViolation}`

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
| \text{case} | The case context the agent conditions on: the due date, evidence on file and the policy version. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{PolicyViolation} | A penalty when a draft or tool call breaks a permission, approval gate or citation rule. |

**Hard constraints**

- An agent only drafts, retrieves and routes and every adverse finding, approval, denial or privilege change needs human sign-off
- Tool permissions are least privilege and read-only by default
- Messages to providers are drafts until approved
- Summaries cite source documents and abstain when evidence is absent
- Documents are untrusted input and cannot trigger actions
- Case state transitions are deterministic and logged

## The approach in one paragraph

Start with manual recredentialing with a spreadsheet tracker and email reminders. Then earn the move to a deterministic case state machine with an LLM agent that retrieves evidence, drafts reminders and the committee summary through typed tools, verifies citations, routes exceptions and stops at every approval gate, and only if it beats the baseline on Citation faithfulness and unsupported-claim rate and Task success on replayed cases after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Evidence completeness | Required items received and verified by the checklist. Drives the next action. Guard against: checklist version as of the due date. |
| Add Exception severity | Rule-classified severity of each discrepancy. Prioritises human review. Guard against: rule output not the model's opinion. |
| Add Citation coverage | Share of summary statements with a source span. Measures faithfulness. Guard against: check against retrieved sources. |
| Run it as one pipeline | Evidence retriever (document store with search), Verification tool caller (typed verification APIs), Summary and draft agent (LLM with citations) and Policy and permission guard (policy rules), with Case intake and due-date scheduler, Credentialing specialist review and Case audit trail off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle conflicting evidence | Surface both and route as an exception. |

**Deliberately not doing**

- Provider reputation: irrelevant to evidence.
- Model confidence phrases: not a calibrated signal.
- Message tone: style not substance.

**How the approach is proven**

Prove it offline on Citation faithfulness and unsupported-claim rate, Task success on replayed cases and Unauthorised tool-call attempts blocked using time-ordered splits, then online on "Recredentialing cycle time" with "Specialist hours per case" as the guardrail. Watch for: Letting the agent finalise a case, Judging fluent summaries without citation checks and Skipping replay of adversarial documents.

## Baseline and production design

- **Baseline (build this first):** Manual recredentialing with a spreadsheet tracker and email reminders.
- **Production design:** A deterministic case state machine with an LLM agent that retrieves evidence, drafts reminders and the committee summary through typed tools, verifies citations, routes exceptions and stops at every approval gate.

## Why AI, and why this kind

**Why AI.** Orchestrate periodic recredentialing cycles, evidence collection, verification, exception routing and committee packet preparation with a deterministic case state machine and human sign-off for every adverse finding. The evidence that separates good from bad outcomes (Evidence completeness, Exception severity, Citation coverage) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A free-running agent" are what teams reach for first, and they fail because the case must be resumable and auditable. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A deterministic case state machine with an LLM agent that retrieves evidence, drafts reminders and the committee summary through typed tools, verifies citations, routes exceptions and stops at every approval gate.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Evidence completeness, Exception severity, Citation coverage and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual recredentialing with a spreadsheet tracker and email reminders | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A deterministic case state machine with an LLM agent that retrieves evidence, drafts reminders and the committee summary through typed tools, verifies citations, routes exceptions and stops at every approval gate | chosen | Meets the 2500 ms envelope at $11.40 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Recredentialing cycle time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Letting the agent finalise a case.
- Evaluation trap: Judging fluent summaries without citation checks.
- Conflicting evidence: the agent chooses one source.
- Verification service timeout: the case stalls.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
