# SOC Investigation Copilot: use-case brief

> Generated from the blueprint `cybersecurity/soc-copilot-llm-investigation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** SOC Investigation Copilot · **Domain:** cybersecurity · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** A security operations centre receives thousands of alerts a day, and most of the analyst's time on each one goes into the same routine: open the alert, pull the surrounding SIEM events, check the endpoint, look up the user and the address, and decide whether it is benign, suspicious or an incident. The copilot does the gathering. It plans which questions to ask, runs read-only queries across the SIEM, endpoint detection, identity and threat-intelligence tools, links every claim to the log line that supports it, and proposes a verdict for an analyst to accept or change. It never contains, isolates or disables anything on its own.

**Why it is hard.** The inputs are attacker-controlled. A log field, a file name or an email subject can carry instructions, and an agent that reads them while holding tools can be steered into running the wrong query or changing its verdict. The cost of errors is lopsided: a fluent wrong benign verdict lets a live attack continue unnoticed, so when evidence is missing the only safe output is escalation. Tool results can be enormous or absent, a log backend outage can hide the deciding evidence, and an agent that fills the gap with a plausible story is worse than one that stops. And the usual measures mislead: analyst satisfaction and demo cases flatter, and cases used for prompt tuning poison the replay set.

**Scale and stakes.** The sizing this entry assumes is extreme: about 300 million model-touching events a day, 3,472 per second on average and 21,000 at peak, provisioned for 31,000, which at an LLM step budget per case means tens of thousands of H100-class GPUs and an estimated $106.5M a month, or $11.84 per thousand decisions. No SOC runs an agent investigation on 300 million alerts, which is itself a design lesson: an inexpensive triage model has to send only the ambiguous fraction to the agent, and the unit of capacity is cases, not raw events. The stakes are a missed intrusion on one side and an analyst team that stops trusting the tool on the other.

**What success looks like.** Offline, verdict accuracy on replayed cases with known ground truth, evidence link validity, and resistance to a held-out set of planted attacks on the agent itself. Online, the launch is judged on investigation time per alert, with escalation precision as the guardrail: the copilot should escalate when evidence is missing and not escalate everything. Every action is read-only unless a human approves it, every step is in an audit log, and an injection attempt never changes a verdict or triggers a tool call.

## Objective, loss and constraints

**Business objective.** Accelerate investigations by letting an agent gather evidence from SIEM, EDR and identity tools and propose verdicts with cited queries.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{tool results})+\lambda\,\mathrm{UnsupportedClaim}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_\theta | The language model's probability of the next token y_t, given the earlier tokens and the context written after the bar. (one value per time step or token t and forecast step h) |
| y_t | The tokens of the target investigation write-up: y_t at position t. |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| y_{<t} | All tokens before position t: the text the model has already read or generated. (one value per time step or token t) |
| \text{tool results} | The output of the security tools the agent has queried, which is what its answer must be based on. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{UnsupportedClaim} | Penalty for statements in the verdict that no tool result supports. |

**Hard constraints**

- Read-only tools by default
- Response actions need approval
- Full audit trail
- Prompt-injection resistance

## The approach in one paragraph

Start with the SOAR playbooks the team already trusts, since static enrichment steps are predictable and auditable, and let the agent earn the cases they cannot handle. The agent is a planner and executor over typed, least-privilege, read-only tools. Its only way to take effect in the world is to propose a verdict with cited evidence, which an independent verifier checks line by line, and any containment action goes through a human approval gate. Safety does not rely on the model resisting injection; it relies on what the model is allowed to do.

**Moves**

| Move | Detail |
|---|---|
| Replace free-form access with typed tools | Offer a fixed set of query tools for the SIEM, endpoint, identity and threat intelligence, each with typed arguments, scoped permissions and row limits, with no shell, no arbitrary HTTP and no write access. |
| Treat every log as untrusted data | Wrap tool output as quoted data, never as instructions, enforce a per-case tool allow-list and step budget, and use any injection filter only as an alarm, because paraphrases will get past patterns. |
| Make evidence the unit of a verdict | Require each claim to cite a log line, and have an independent verifier open the line and confirm it contains the indicator before the verdict is shown. |
| Make missing evidence a first-class result | If a tool fails, a backend is down or no deciding line exists, the case escalates with a stated reason and is never auto-closed as benign without a cited deciding line. |
| Summarise before the context overflows | Use paginating and summarising tools for large results, so the agent sees counts, top values and anomalies rather than a million rows. |
| Gate every action that changes anything | Containment, isolation and account actions are proposals with a prepared command that an analyst approves, and the approval is part of the audit record. |

**Deliberately not doing**

- Count how many tools a case used or reward longer narratives: both reward activity rather than a correct, well-supported verdict.
- Trust the model's confidence wording: it is uncalibrated, and calibrated escalation comes from the verifier and the evidence rules.
- Give the agent free-form shell access: it turns any successful injection into damage.
- Judge on analyst satisfaction or showcase cases: they hide wrong verdicts that happened to sound convincing.

**How the approach is proven**

Offline, replay held-out cases with known ground truth that were never used for prompt tuning, and score verdict accuracy, evidence link validity and the share of planted-injection cases in which the agent changes its verdict or acts. Online, run in advisory mode beside analysts, compare blind senior-analyst verdicts with the agent's, and measure investigation time per alert and escalation precision, widening autonomy only while the injection success rate stays at zero on the attack set.

## Baseline and production design

- **Baseline (build this first):** SOAR playbooks with static enrichment steps.
- **Production design:** Planner–executor agent over typed security tools with evidence verification, step budgets and approval gates for containment actions.

## Why AI, and why this kind

**Why AI.** Accelerate investigations by letting an agent gather evidence from SIEM, EDR and identity tools and propose verdicts with cited queries. The evidence that separates good from bad outcomes (Evidence link rate, Query success and retry count, Verdict agreement with senior analysts) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "free-form shell access" are what teams reach for first, and they fail because free-form access enables injection-driven damage. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: Planner–executor agent over typed security tools with evidence verification, step budgets and approval gates for containment actions.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Evidence link rate, Query success and retry count, Verdict agreement with senior analysts and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: SOAR playbooks with static enrichment steps | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Planner–executor agent over typed security tools with evidence verification, step budgets and approval gates for containment actions | chosen | Meets the 2500 ms envelope at $11.84 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Investigation time per alert) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- An attacker plants instructions in log fields or file names, the agent follows them, and an unintended tool call is run.
- A tool returns a huge result set, the context overflows, and the agent silently drops the key facts.
- The log backend is down and the deciding evidence is hidden, so the agent writes a plausible benign verdict from the little it has.
- A paraphrased injection evades a keyword filter, so a defence based only on pattern matching fails when it matters.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
