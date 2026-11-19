# Search Relevance Evaluation with LLM Judges: use-case brief

> Generated from the blueprint `retail/search-relevance-llm-judge-evaluation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Search Relevance Evaluation with LLM Judges · **Domain:** retail · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Replace expensive human relevance labelling with calibrated LLM judges to evaluate ranking changes daily at scale. The system has to run as a scheduled batch job, inside these limits: Agreement with human raters, Bias auditing (position, verbosity) and Cost per judgement.

**Why it is hard.** The obvious approach is using judge scores raw, and it fails because lLM judges are consistently lenient on fluent but wrong results. The second trap is in "Rubric": the real signal is structured rubric with attribute checks, while teams usually reach for single vague score.

**Scale and stakes.** At 10 million users this is about 3.0K model-touching events a day, 0 requests per second on average and 0 at peak, at an estimated $1.9K a month. A mistake is expensive in the way evaluation cost per experiment measures it.

**What success looks like.** Offline: Kappa vs humans and Ranking-delta agreement. Online: Release decisions matching later A/B outcomes and Evaluation cost per experiment. The launch is judged on "Release decisions matching later A/B outcomes" while "Evaluation cost per experiment" must not get worse.

## Objective, loss and constraints

**Business objective.** Replace expensive human relevance labelling with calibrated LLM judges to evaluate ranking changes daily at scale.

**Training objective.** `\mathcal{L}=-\sum_i\log p_\theta(r_i\mid q_i,d_i)+\lambda\,\mathrm{Calibration}(\hat r,r_{\text{human}})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_\theta | The language model's probability of the next token y_t, given the earlier tokens and the context written after the bar. (one value per time step or token t and forecast step h) |
| r_i | The relevance grade for result i: the hat is the judge's grade and r_human the human grade. |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| q_i | The search query. |
| d_i | The document (product) shown for the query. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Penalty when the LLM judge's grades disagree with human grades on average. |
| \hat{r} | The model's predicted value of the quantity r. |

**Hard constraints**

- Agreement with human raters
- Bias auditing (position, verbosity)
- Cost per judgement
- Reproducibility

## The approach in one paragraph

Start with click-based implicit relevance metrics. Then earn the move to ensemble of rubric-driven LLM judges with anchor-set calibration, pairwise preference mode and confidence-weighted aggregation, and only if it beats the baseline on Kappa vs humans and Ranking-delta agreement after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Judge-human agreement | Cohen's kappa on anchor set. Judge reliability. Guard against: refresh anchors quarterly. |
| Add Rubric attribute coverage | Fraction of query attributes verified. Specific checking. Guard against: parse attributes deterministically. |
| Add Inter-judge variance | Disagreement across prompts and seeds. Uncertainty. Guard against: sampling at fixed temperature. |
| Run it as one pipeline | Query-result sampler (log pipeline), Rubric prompt builder (attribute parser), LLM judge ensemble (batch inference), Calibrator (isotonic on anchors), Metric aggregator (NDCG and win-rate) and Anchor set refresh (human raters), with Search team review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle judge model update | Pin judge versions and re-calibrate on anchors. |

**Deliberately not doing**

- Judge self-reported confidence: uncalibrated.
- Length of justification: not accuracy.

**How the approach is proven**

Prove it offline on Kappa vs humans and Ranking-delta agreement using time-ordered splits, then online on "Release decisions matching later A/B outcomes" with "Evaluation cost per experiment" as the guardrail. Watch for: Judge and ranker share a base model and Anchor set not representative of the tail.

## Baseline and production design

- **Baseline (build this first):** Click-based implicit relevance metrics.
- **Production design:** Ensemble of rubric-driven LLM judges with anchor-set calibration, pairwise preference mode and confidence-weighted aggregation.

## Why AI, and why this kind

**Why AI.** Replace expensive human relevance labelling with calibrated LLM judges to evaluate ranking changes daily at scale. The evidence that separates good from bad outcomes (Judge-human agreement, Rubric attribute coverage, Inter-judge variance) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "using judge scores raw" are what teams reach for first, and they fail because LLM judges are consistently lenient on fluent but wrong results. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Ensemble of rubric-driven LLM judges with anchor-set calibration, pairwise preference mode and confidence-weighted aggregation.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Judge-human agreement, Rubric attribute coverage, Inter-judge variance and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Click-based implicit relevance metrics | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Ensemble of rubric-driven LLM judges with anchor-set calibration, pairwise preference mode and confidence-weighted aggregation | chosen | Meets the run-window envelope at $20.58 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Release decisions matching later A/B outcomes) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Judge and ranker share a base model.
- Evaluation trap: Anchor set not representative of the tail.
- Judge model update: judge scores shift after a model upgrade so metrics are not comparable over time.
- Long-tail queries misjudged: evaluation misses tail regressions.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
