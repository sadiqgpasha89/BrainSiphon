# NOC Incident Triage Copilot: use-case brief

> Generated from the blueprint `telecom/noc-incident-triage-copilot` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** NOC Incident Triage Copilot · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Summarise an incident for NOC engineers, pull the relevant topology, change history, similar past incidents and runbook steps, and draft the next actions so triage time falls. The system has to run interactively, within a few seconds, inside these limits: Every statement links to the source record it came from, The copilot proposes and the engineer decides and No write access to network systems.

**Why it is hard.** The obvious approach is model recall of how the network works, and it fails because a fluent wrong explanation is worse than none. The second trap is in "Scope": the real signal is read-only tools for the engineer's own incident, while teams usually reach for free access to every system.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $419.0K a month. A mistake is expensive in the way escalations to tier three measures it.

**What success looks like.** Offline: Citation precision and faithfulness against engineer review, Next-step usefulness ratings and Retrieval hit rate for confirmed causes. Online: Time to first diagnosis, Escalations to tier three and Repeat incidents. The launch is judged on "Time to first diagnosis" while "Escalations to tier three" must not get worse.

## Objective, loss and constraints

**Business objective.** Summarise an incident for NOC engineers, pull the relevant topology, change history, similar past incidents and runbook steps, and draft the next actions so triage time falls.

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

- Every statement links to the source record it came from
- The copilot proposes and the engineer decides
- No write access to network systems
- Summary available within 10 s of an incident opening

## The approach in one paragraph

Start with keyword search over past tickets and runbooks, because it shows how much value retrieval alone gives engineers. Then earn the move to a retrieval-grounded copilot with read-only tools for topology, change history and KPIs, structured summaries with citations and an engineer feedback button on every suggestion, and only if it beats the baseline on Citation precision and faithfulness against engineer review and Next-step usefulness ratings after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Incident similarity | Embedding and attribute match to past confirmed incidents. Finds precedent. Guard against: index only confirmed causes. |
| Add Change adjacency | Changes near the same elements and time. Prime suspect list. Guard against: needs applied timestamps. |
| Add Runbook coverage | Whether an approved runbook matches the symptoms. Directs the engineer. Guard against: version runbooks with topology. |
| Run it as one pipeline | Incident intake (ticketing events), Evidence retrieval (search and vector index), Topology and KPI tools (read-only APIs), Draft summary and next steps (LLM with citations) and Quality evaluation (weekly replay), with Engineer review and Feedback capture off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle conflicting past incidents | Show both with confidence and the differences. |

**Deliberately not doing**

- Engineer chat banter: not incident evidence.
- Ticket age: not a diagnostic signal.
- Copy-pasted logs: duplicates evidence.

**How the approach is proven**

Prove it offline on Citation precision and faithfulness against engineer review, Next-step usefulness ratings and Retrieval hit rate for confirmed causes using time-ordered splits, then online on "Time to first diagnosis" with "Escalations to tier three" as the guardrail. Watch for: Evaluating fluency not faithfulness, Letting the copilot execute commands and Indexing unresolved tickets as truth.

## Baseline and production design

- **Baseline (build this first):** Keyword search over past tickets and runbooks, because it shows how much value retrieval alone gives engineers.
- **Production design:** A retrieval-grounded copilot with read-only tools for topology, change history and KPIs, structured summaries with citations and an engineer feedback button on every suggestion.

## Why AI, and why this kind

**Why AI.** Summarise an incident for NOC engineers, pull the relevant topology, change history, similar past incidents and runbook steps, and draft the next actions so triage time falls. The evidence that separates good from bad outcomes (Incident similarity, Change adjacency, Runbook coverage) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model recall of how the network works" are what teams reach for first, and they fail because A fluent wrong explanation is worse than none. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A retrieval-grounded copilot with read-only tools for topology, change history and KPIs, structured summaries with citations and an engineer feedback button on every suggestion.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Incident similarity, Change adjacency, Runbook coverage and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword search over past tickets and runbooks, because it shows how much value retrieval alone gives engineers | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A retrieval-grounded copilot with read-only tools for topology, change history and KPIs, structured summaries with citations and an engineer feedback button on every suggestion | chosen | Meets the 2500 ms envelope at $4.66 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to first diagnosis) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating fluency not faithfulness.
- Evaluation trap: Letting the copilot execute commands.
- Conflicting past incidents: two precedents suggest different fixes.
- Missing logs: the summary overstates certainty.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
