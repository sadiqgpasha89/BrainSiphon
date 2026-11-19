# Supply-Chain Event Monitoring with LLM Agents: use-case brief

> Generated from the blueprint `supply-chain/supply-chain-news-event-monitoring-llm` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Supply-Chain Event Monitoring with LLM Agents · **Domain:** supply-chain · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Monitor global news, port notices and weather to detect events affecting specific lanes and suppliers and propose mitigation actions. The system has to run interactively, within a few seconds, inside these limits: Source attribution, False-alert rate low and Multilingual sources.

**Why it is hard.** The obvious approach is generic news summaries, and it fails because planners need impact on their lanes and suppliers. The second trap is in "Verification": the real signal is corroboration across independent sources, while teams usually reach for single-source alerts.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 4 at peak, at an estimated $20.5K a month. A mistake is expensive in the way alert-to-action ratio measures it.

**What success looks like.** Offline: Event detection precision and recall and Impact mapping accuracy. Online: Time from event to action and Alert-to-action ratio. The launch is judged on "Time from event to action" while "Alert-to-action ratio" must not get worse.

## Objective, loss and constraints

**Business objective.** Monitor global news, port notices and weather to detect events affecting specific lanes and suppliers and propose mitigation actions.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{articles})+\lambda\,\mathrm{Unsupported}`

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
| \text{articles} | The news articles the system reads. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Unsupported} | Penalty for statements the articles do not support. |

**Hard constraints**

- Source attribution
- False-alert rate low
- Multilingual sources
- Human approval for actions

## The approach in one paragraph

Start with keyword alerts on news feeds. Then earn the move to streaming ingestion, event extraction and clustering, graph-based impact analysis and an agent that proposes actions with cited evidence, and only if it beats the baseline on Event detection precision and recall and Impact mapping accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Network impact score | Exposure of company flows to event location. Prioritisation. Guard against: graph join. |
| Add Source corroboration count | Independent sources reporting. Credibility. Guard against: dedup. |
| Add Event severity classification | Severity class. Triage. Guard against: taxonomy. |
| Run it as one pipeline | News and notice feeds (ingestion), Event extractor (LLM structured), Event clusterer (embeddings), Network impact analyser (graph queries), Mitigation agent (LLM with tools) and Planner approval (human), with Outcome review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle duplicate reports of one event | Event clustering and dedup window. |

**Deliberately not doing**

- Article sentiment: not impact.
- Social media volume: rumour amplification.

**How the approach is proven**

Prove it offline on Event detection precision and recall and Impact mapping accuracy using time-ordered splits, then online on "Time from event to action" with "Alert-to-action ratio" as the guardrail. Watch for: Evaluation set built from major events only and Counting retrieved events as impactful.

## Baseline and production design

- **Baseline (build this first):** Keyword alerts on news feeds.
- **Production design:** Streaming ingestion, event extraction and clustering, graph-based impact analysis and an agent that proposes actions with cited evidence.

## Why AI, and why this kind

**Why AI.** Monitor global news, port notices and weather to detect events affecting specific lanes and suppliers and propose mitigation actions. The evidence that separates good from bad outcomes (Network impact score, Source corroboration count, Event severity classification) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "generic news summaries" are what teams reach for first, and they fail because planners need impact on their lanes and suppliers. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: Streaming ingestion, event extraction and clustering, graph-based impact analysis and an agent that proposes actions with cited evidence.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Network impact score, Source corroboration count, Event severity classification and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword alerts on news feeds | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Streaming ingestion, event extraction and clustering, graph-based impact analysis and an agent that proposes actions with cited evidence | chosen | Meets the 2500 ms envelope at $11.39 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time from event to action) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluation set built from major events only.
- Evaluation trap: Counting retrieved events as impactful.
- Duplicate reports of one event: repeated alerts.
- Mistranslation of local-language news: mistranslated place names map the event to the wrong location and the wrong suppliers.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
