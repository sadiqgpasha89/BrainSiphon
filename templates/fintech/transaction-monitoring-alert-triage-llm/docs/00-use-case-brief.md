# Transaction Monitoring Alert Triage with LLM Agents: use-case brief

> Generated from the blueprint `fintech/transaction-monitoring-alert-triage-llm` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Transaction Monitoring Alert Triage with LLM Agents · **Domain:** fintech · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Auto-summarise and pre-dispose low-risk AML alerts with cited evidence so analysts spend time only on genuinely suspicious cases. The system has to run interactively, within a few seconds, inside these limits: Every claim must cite a transaction or KYC record, No customer PII sent outside the VPC and Human approval for any SAR decision.

**Why it is hard.** The obvious approach is fluent narratives that sound right, and it fails because an unsupported sentence in a SAR narrative is a regulatory finding. The second trap is in "Autonomy": the real signal is agent drafts and recommends, human disposes, while teams usually reach for fully autonomous closure of alerts.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 417 at peak, at an estimated $1.42M a month. A mistake is expensive in the way missed-suspicious rate in QA sample measures it.

**What success looks like.** Offline: Citation precision and recall and Disposition agreement with senior analysts. Online: Analyst minutes per alert and Missed-suspicious rate in QA sample. The launch is judged on "Analyst minutes per alert" while "Missed-suspicious rate in QA sample" must not get worse.

## Objective, loss and constraints

**Business objective.** Auto-summarise and pre-dispose low-risk AML alerts with cited evidence so analysts spend time only on genuinely suspicious cases.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{evidence})+\gamma\,\mathrm{CitationMiss}`

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
| \text{evidence} | The transactions and customer facts the narrative must be based on. |
| \gamma | Weight on the citation penalty: how strongly it counts against the main objective. |
| \mathrm{CitationMiss} | Penalty for sentences in the narrative that do not cite a transaction or record. |

**Hard constraints**

- Every claim must cite a transaction or KYC record
- No customer PII sent outside the VPC
- Human approval for any SAR decision
- p95 under 6 s

## The approach in one paragraph

Start with template-based narrative generator with rule-driven pre-disposition, which is auditable and cheap. Then earn the move to tool-using agent on a private 70B-class model with a typed transaction-query tool, KYC retriever and a verifier that rejects uncited claims, and only if it beats the baseline on Citation precision and recall and Disposition agreement with senior analysts after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Evidence coverage | Fraction of narrative sentences linked to a source record. Detects hallucination directly. Guard against: coverage must be computed on the final text not the draft. |
| Add Rule-hit context | Which scenario fired and its threshold distance. Anchors the investigation. Guard against: include scenario version to stay point-in-time. |
| Add Customer behaviour baseline | 12-month median and MAD of monthly flows. Defines what is unusual for this person. Guard against: baseline excludes the alert month. |
| Run it as one pipeline | Alert intake (queue consumer), Evidence retriever (SQL tools plus vector search), Planner LLM (vLLM private model), Citation verifier (NLI plus rule checks) and Guardrail filter (PII and policy), with Analyst workspace and Audit log off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle prompt injection inside a payment reference field | Treat all record fields as data, strip instructions, tool allow-lists. |

**Deliberately not doing**

- Long free-text KYC notes: stale and contradictory, retrieve structured fields first.
- Full transaction dump in prompt: blows context and dilutes attention, summarise windows instead.

**How the approach is proven**

Prove it offline on Citation precision and recall and Disposition agreement with senior analysts using time-ordered splits, then online on "Analyst minutes per alert" with "Missed-suspicious rate in QA sample" as the guardrail. Watch for: Golden set written by the same team that prompts the model and Measuring fluency instead of factual support.

## Baseline and production design

- **Baseline (build this first):** Template-based narrative generator with rule-driven pre-disposition, which is auditable and cheap.
- **Production design:** Tool-using agent on a private 70B-class model with a typed transaction-query tool, KYC retriever and a verifier that rejects uncited claims.

## Why AI, and why this kind

**Why AI.** Auto-summarise and pre-dispose low-risk AML alerts with cited evidence so analysts spend time only on genuinely suspicious cases. The evidence that separates good from bad outcomes (Evidence coverage, Rule-hit context, Customer behaviour baseline) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "fluent narratives that sound right" are what teams reach for first, and they fail because an unsupported sentence in a SAR narrative is a regulatory finding. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: Tool-using agent on a private 70B-class model with a typed transaction-query tool, KYC retriever and a verifier that rejects uncited claims.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Evidence coverage, Rule-hit context, Customer behaviour baseline and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Template-based narrative generator with rule-driven pre-disposition, which is auditable and cheap | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Tool-using agent on a private 70B-class model with a typed transaction-query tool, KYC retriever and a verifier that rejects uncited claims | chosen | Meets the 2500 ms envelope at $7.90 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Analyst minutes per alert) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Golden set written by the same team that prompts the model.
- Evaluation trap: Measuring fluency instead of factual support.
- Prompt injection inside a payment reference field: agent follows attacker text.
- Model update changes narrative style: analyst trust drops.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
