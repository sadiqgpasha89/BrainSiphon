# LLM Application Observability and SLOs: use-case brief

> Generated from the blueprint `it-ops/llm-application-observability-slo` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** LLM Application Observability and SLOs · **Domain:** it-ops · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Monitor AI assistants and agents used in IT for latency, cost, grounding quality and safety events, define service level objectives and alert owners when quality or cost drifts. The system has to run interactively, within a few seconds, inside these limits: Quality sampled and scored on a schedule, Safety events alerted within 5 minutes and Prompts and outputs stored with retention and redaction rules.

**Why it is hard.** The obvious approach is latency alone, and it fails because fast wrong answers are harmful. The second trap is in "Evidence": the real signal is sampled human and automated review, while teams usually reach for user thumbs only.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $419.4K a month. A mistake is expensive in the way cost per task measures it.

**What success looks like.** Offline: Agreement of automated scores with human review, Alert detection of seeded regressions and Redaction recall. Online: Regressions caught before users, Cost per task and Safety events. The launch is judged on "Regressions caught before users" while "Cost per task" must not get worse.

## Objective, loss and constraints

**Business objective.** Monitor AI assistants and agents used in IT for latency, cost, grounding quality and safety events, define service level objectives and alert owners when quality or cost drifts.

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

- Quality sampled and scored on a schedule
- Safety events alerted within 5 minutes
- Prompts and outputs stored with retention and redaction rules
- Owners set objectives
- 2M requests per day

## The approach in one paragraph

Start with request latency and error dashboards, because they are the standard monitoring. Then earn the move to a monitoring layer over the gateway with trace sampling, automated and human quality scoring, cost and safety dashboards and alerts against objectives, and only if it beats the baseline on Agreement of automated scores with human review and Alert detection of seeded regressions after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Groundedness score | Share of claims supported by sources. Quality. Guard against: from evaluators. |
| Add Tool error and retry rate | Failed tool calls. Reliability. Guard against: from traces. |
| Add Cost per task | Tokens and calls. Efficiency. Guard against: from the gateway. |
| Run it as one pipeline | Trace capture (gateway), Redaction (pattern and model), Quality sampling and scoring (evaluators), SLO calculation (analytics), Alerting (observability) and Model and prompt change gate (release process), with Owner review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle silent quality drift | Regression tests on a fixed set. |

**Deliberately not doing**

- User name: personal data.
- Prompt length alone: weak link.
- Model name alone: needs outcome data.

**How the approach is proven**

Prove it offline on Agreement of automated scores with human review, Alert detection of seeded regressions and Redaction recall using time-ordered splits, then online on "Regressions caught before users" with "Cost per task" as the guardrail. Watch for: Latency-only monitoring, User thumbs only and Raw prompt retention.

## Baseline and production design

- **Baseline (build this first):** Request latency and error dashboards, because they are the standard monitoring.
- **Production design:** A monitoring layer over the gateway with trace sampling, automated and human quality scoring, cost and safety dashboards and alerts against objectives.

## Why AI, and why this kind

**Why AI.** Monitor AI assistants and agents used in IT for latency, cost, grounding quality and safety events, define service level objectives and alert owners when quality or cost drifts. The evidence that separates good from bad outcomes (Groundedness score, Tool error and retry rate, Cost per task) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "latency alone" are what teams reach for first, and they fail because fast wrong answers are harmful. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: A monitoring layer over the gateway with trace sampling, automated and human quality scoring, cost and safety dashboards and alerts against objectives.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Groundedness score, Tool error and retry rate, Cost per task and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Request latency and error dashboards, because they are the standard monitoring | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A monitoring layer over the gateway with trace sampling, automated and human quality scoring, cost and safety dashboards and alerts against objectives | chosen | Meets the 2500 ms envelope at $4.66 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Regressions caught before users) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Latency-only monitoring.
- Evaluation trap: User thumbs only.
- Silent quality drift: a provider update changes outputs.
- Cost spike: a loop calls tools repeatedly.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
