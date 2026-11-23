# Community Safety Feedback Analysis: use-case brief

> Generated from the blueprint `public-safety/community-safety-feedback-analysis` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Community Safety Feedback Analysis · **Domain:** public-safety · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Group and summarise residents' safety concerns from surveys, meetings and reports by theme and area with quotes linked to the source, so priorities reflect community voices. The system has to run as a scheduled batch job, inside these limits: Every theme links to example comments, Minority views shown and Names removed.

**Why it is hard.** The obvious approach is a single summary, and it fails because a summary can hide minority views. The second trap is in "Fairness": the real signal is equal weight to each respondent, while teams usually reach for weighting by volume.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $2.0K a month. A mistake is expensive in the way community trust in summaries measures it.

**What success looks like.** Offline: Theme coherence, Quote faithfulness and Stance accuracy. Online: Analysis time, Community trust in summaries and Minority themes surfaced. The launch is judged on "Analysis time" while "Community trust in summaries" must not get worse.

## Objective, loss and constraints

**Business objective.** Group and summarise residents' safety concerns from surveys, meetings and reports by theme and area with quotes linked to the source, so priorities reflect community voices.

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

- Every theme links to example comments
- Minority views shown
- Names removed
- Officials and community partners review
- 100K comments

## The approach in one paragraph

Start with staff reading comments and summarising by hand, because it is the current process. Then earn the move to a clustering and summarisation pipeline with campaign detection, representative quotes and a community review step before publication, and only if it beats the baseline on Theme coherence and Quote faithfulness after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Theme assignment | Which theme a comment belongs to. Grouping. Guard against: from clustering. |
| Add Area aggregate | Counts by area. Priority. Guard against: aggregated. |
| Add Duplicate and campaign detection | Near-identical comments. Weighting. Guard against: from similarity. |
| Run it as one pipeline | Comment intake (surveys and meetings), Redaction (pattern and model), Theme clustering (embeddings), Stance classification (classifier), Summary draft (LLM with quotes) and Publication (community report), with Community review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle campaign flood | Campaign flags. |

**Deliberately not doing**

- Respondent name: personal data.
- Comment length: weak link.
- Channel alone: weak link.

**How the approach is proven**

Prove it offline on Theme coherence, Quote faithfulness and Stance accuracy using time-ordered splits, then online on "Analysis time" with "Community trust in summaries" as the guardrail. Watch for: Single summaries, Counting campaign copies as views and Named analysis.

## Baseline and production design

- **Baseline (build this first):** Staff reading comments and summarising by hand, because it is the current process.
- **Production design:** A clustering and summarisation pipeline with campaign detection, representative quotes and a community review step before publication.

## Why AI, and why this kind

**Why AI.** Group and summarise residents' safety concerns from surveys, meetings and reports by theme and area with quotes linked to the source, so priorities reflect community voices. The evidence that separates good from bad outcomes (Theme assignment, Area aggregate, Duplicate and campaign detection) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A single summary" are what teams reach for first, and they fail because A summary can hide minority views. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: A clustering and summarisation pipeline with campaign detection, representative quotes and a community review step before publication.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Theme assignment, Area aggregate, Duplicate and campaign detection and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Staff reading comments and summarising by hand, because it is the current process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A clustering and summarisation pipeline with campaign detection, representative quotes and a community review step before publication | chosen | Meets the run-window envelope at $0.111 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Analysis time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Single summaries.
- Evaluation trap: Counting campaign copies as views.
- Campaign flood: many copies arrive.
- Translation: comments arrive in other languages.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
