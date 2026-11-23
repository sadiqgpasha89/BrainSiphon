# Customer Care Assistant over Knowledge Base: use-case brief

> Generated from the blueprint `telecom/care-assistant-knowledge-base` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Customer Care Assistant over Knowledge Base · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Answer customer and agent questions about plans, devices, coverage and billing from the operator's knowledge base with citations and safe escalation. The system has to run interactively, within a few seconds, inside these limits: Answers cite the knowledge article and effective date, Account actions not allowed in this use case and Escalation to a human on low confidence.

**Why it is hard.** The obvious approach is model memory of plans, and it fails because plans and prices change monthly. The second trap is in "Scope": the real signal is questions the knowledge base can answer, while teams usually reach for open-domain chat.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $418.8K a month. A mistake is expensive in the way repeat contacts measures it.

**What success looks like.** Offline: Faithfulness and citation precision on audited answers, Containment with correct resolution and Escalation recall for risky questions. Online: Contacts resolved without an agent, Repeat contacts and Handle time on escalated chats. The launch is judged on "Contacts resolved without an agent" while "Repeat contacts" must not get worse.

## Objective, loss and constraints

**Business objective.** Answer customer and agent questions about plans, devices, coverage and billing from the operator's knowledge base with citations and safe escalation.

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

- Answers cite the knowledge article and effective date
- Account actions not allowed in this use case
- Escalation to a human on low confidence
- Response within 4 s at 200K chats per day

## The approach in one paragraph

Start with keyword search over the knowledge base with a ranked list of articles, because it shows how far retrieval alone goes. Then earn the move to a retrieval-grounded assistant with article-level citations, effective-date filtering, plan-aware context and a confidence gate that escalates to a human agent with the conversation summary, and only if it beats the baseline on Faithfulness and citation precision on audited answers and Containment with correct resolution after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Retrieval relevance | Similarity between the question and top articles. Grounds the answer. Guard against: evaluate on real intents. |
| Add Article effective window | Whether the article is currently valid. Prevents stale answers. Guard against: needs structured dates. |
| Add Customer plan context | Plan and device with consent. Personalises the answer. Guard against: use only what the task needs. |
| Run it as one pipeline | Question intake (chat channel), Intent and plan context (CRM lookup), Retrieval (hybrid search), Grounded answer (LLM with citations) and Confidence and policy gate (rules), with Human handoff and Feedback and article gaps off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle conflicting articles | Prefer the latest and flag the conflict to content owners. |

**Deliberately not doing**

- Customer greeting style: not intent.
- Time of day: no link to the answer.
- Chat length: not quality.

**How the approach is proven**

Prove it offline on Faithfulness and citation precision on audited answers, Containment with correct resolution and Escalation recall for risky questions using time-ordered splits, then online on "Contacts resolved without an agent" with "Repeat contacts" as the guardrail. Watch for: Measuring containment without correctness, Indexing expired promotions and Letting the assistant change accounts.

## Baseline and production design

- **Baseline (build this first):** Keyword search over the knowledge base with a ranked list of articles, because it shows how far retrieval alone goes.
- **Production design:** A retrieval-grounded assistant with article-level citations, effective-date filtering, plan-aware context and a confidence gate that escalates to a human agent with the conversation summary.

## Why AI, and why this kind

**Why AI.** Answer customer and agent questions about plans, devices, coverage and billing from the operator's knowledge base with citations and safe escalation. The evidence that separates good from bad outcomes (Retrieval relevance, Article effective window, Customer plan context) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model memory of plans" are what teams reach for first, and they fail because plans and prices change monthly. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A retrieval-grounded assistant with article-level citations, effective-date filtering, plan-aware context and a confidence gate that escalates to a human agent with the conversation summary.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Retrieval relevance, Article effective window, Customer plan context and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword search over the knowledge base with a ranked list of articles, because it shows how far retrieval alone goes | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A retrieval-grounded assistant with article-level citations, effective-date filtering, plan-aware context and a confidence gate that escalates to a human agent with the conversation summary | chosen | Meets the 2500 ms envelope at $4.65 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Contacts resolved without an agent) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Measuring containment without correctness.
- Evaluation trap: Indexing expired promotions.
- Conflicting articles: two sources disagree.
- Question about a competitor: no source exists.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
