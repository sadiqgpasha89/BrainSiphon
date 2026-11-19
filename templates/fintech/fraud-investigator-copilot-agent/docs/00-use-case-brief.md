# Fraud Investigator Copilot Agent: use-case brief

> Generated from the blueprint `fintech/fraud-investigator-copilot-agent` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Fraud Investigator Copilot Agent · **Domain:** fintech · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Give fraud analysts a copilot that assembles the case timeline, links entities and proposes dispositions, cutting investigation time by 50%. The system has to run interactively, within a few seconds, inside these limits: Read-only tools by default, Immutable audit of every tool call and Data minimisation.

**Why it is hard.** The obvious approach is giving the model raw database access, and it fails because raw access leaks data and enables injection-driven exfiltration. The second trap is in "Evidence": the real signal is every claim linked to a record ID, while teams usually reach for free-form narrative.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 63 at peak, at an estimated $358.4K a month. A mistake is expensive in the way analyst-approved suggestion rate measures it.

**What success looks like.** Offline: Evidence link validity and Disposition match on replayed cases. Online: Investigation time per case and Analyst-approved suggestion rate. The launch is judged on "Investigation time per case" while "Analyst-approved suggestion rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Give fraud analysts a copilot that assembles the case timeline, links entities and proposes dispositions, cutting investigation time by 50%.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{tools})+\lambda\,\mathrm{UnsupportedClaim}`

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
| \text{tools} | The outputs of the investigation tools the agent has called. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{UnsupportedClaim} | Penalty for statements that no tool output supports. |

**Hard constraints**

- Read-only tools by default
- Immutable audit of every tool call
- Data minimisation
- Analyst remains decision maker

## The approach in one paragraph

Start with search and graph UI with saved queries. Then earn the move to planner agent with typed graph and transaction tools, a verifier, plan-then-act with step caps, and an eval harness replaying historical cases, and only if it beats the baseline on Evidence link validity and Disposition match on replayed cases after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Evidence link rate | Share of claims with valid record IDs. Trust metric. Guard against: verify IDs against the source system. |
| Add Tool-call success path | Steps needed and failures per case type. Efficiency and reliability. Guard against: sample by case complexity. |
| Add Disposition agreement | Agreement between copilot suggestion and senior analyst. Quality signal. Guard against: blind comparison. |
| Run it as one pipeline | Planner agent (LLM with tool schema), Entity graph tool (read-only graph API), Transaction query tool (parameterised SQL) and Claim verifier (record-ID check), with Case context loader, Analyst workspace and Tool audit log off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle injected instruction in a memo field | Untrusted-field sandboxing and instruction hierarchy. |

**Deliberately not doing**

- Narrative length: longer is not better.
- Confidence phrased in words: uncalibrated.

**How the approach is proven**

Prove it offline on Evidence link validity and Disposition match on replayed cases using time-ordered splits, then online on "Investigation time per case" with "Analyst-approved suggestion rate" as the guardrail. Watch for: Replay set contains cases the model was tuned on and Judging by analyst satisfaction instead of correctness.

## Baseline and production design

- **Baseline (build this first):** Search and graph UI with saved queries.
- **Production design:** Planner agent with typed graph and transaction tools, a verifier, plan-then-act with step caps, and an eval harness replaying historical cases.

## Why AI, and why this kind

**Why AI.** Give fraud analysts a copilot that assembles the case timeline, links entities and proposes dispositions, cutting investigation time by 50%. The evidence that separates good from bad outcomes (Evidence link rate, Tool-call success path, Disposition agreement) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "giving the model raw database access" are what teams reach for first, and they fail because raw access leaks data and enables injection-driven exfiltration. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: Planner agent with typed graph and transaction tools, a verifier, plan-then-act with step caps, and an eval harness replaying historical cases.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Evidence link rate, Tool-call success path, Disposition agreement and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Search and graph UI with saved queries | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Planner agent with typed graph and transaction tools, a verifier, plan-then-act with step caps, and an eval harness replaying historical cases | chosen | Meets the 2500 ms envelope at $13.27 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Investigation time per case) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Replay set contains cases the model was tuned on.
- Evaluation trap: Judging by analyst satisfaction instead of correctness.
- Injected instruction in a memo field: agent changes tool use.
- Tool latency spikes: agent retries tools in a loop and burns the budget.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
