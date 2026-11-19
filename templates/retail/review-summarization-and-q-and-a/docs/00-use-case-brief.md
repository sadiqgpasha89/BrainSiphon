# Review Summarisation & Product Q&A: use-case brief

> Generated from the blueprint `retail/review-summarization-and-q-and-a` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Review Summarisation & Product Q&A · **Domain:** retail · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Summarise thousands of reviews into balanced pros/cons and answer product questions with citations from reviews and specs. The system has to run interactively, within a few seconds, inside these limits: Balanced, not cherry-picked, Cite review IDs and Cost per product page cached.

**Why it is hard.** The obvious approach is single overall summary, and it fails because overall summaries hide that battery is bad while screen is great. The second trap is in "Trust": the real signal is weight by verified purchase and spam score, while teams usually reach for all reviews equal.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $200.6K a month. A mistake is expensive in the way conversion lift measures it.

**What success looks like.** Offline: Faithfulness and aspect recall and Human preference vs baseline. Online: Time on page to decision and Conversion lift. The launch is judged on "Time on page to decision" while "Conversion lift" must not get worse.

## Objective, loss and constraints

**Business objective.** Summarise thousands of reviews into balanced pros/cons and answer product questions with citations from reviews and specs.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{AspectCoverage}`

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
| x | The reviews the summary is based on. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{AspectCoverage} | Penalty when the summary leaves out important aspects mentioned in the reviews (battery life, fit, price). |

**Hard constraints**

- Balanced, not cherry-picked
- Cite review IDs
- Cost per product page cached
- Spam-resistant

## The approach in one paragraph

Start with extractive top-helpful review snippets. Then earn the move to offline aspect extraction, per-aspect map-reduce summarisation with citations, cached per product, and a live Q&A retriever for questions, and only if it beats the baseline on Faithfulness and aspect recall and Human preference vs baseline after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Aspect coverage | Share of frequent aspects represented. Completeness. Guard against: aspects extracted offline. |
| Add Review quality weight | Helpfulness and verified-purchase weight. Trust. Guard against: votes as-of. |
| Add Support rate | Share of summary claims supported by cited reviews. Faithfulness. Guard against: entailment check. |
| Run it as one pipeline | Spam filter (classifier), Aspect extractor (distilled model), Summariser (LLM map-reduce), Faithfulness check (NLI), Product page cache (CDN) and Q&A retriever (hybrid search), with Review ingestion off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle new product with 3 reviews | Minimum-evidence rule and uncertainty wording. |

**Deliberately not doing**

- Extreme 1-star rants: outliers.
- Emoji counts: no content.

**How the approach is proven**

Prove it offline on Faithfulness and aspect recall and Human preference vs baseline using time-ordered splits, then online on "Time on page to decision" with "Conversion lift" as the guardrail. Watch for: Summaries judged for fluency not support and Evaluating on well-reviewed products only.

## Baseline and production design

- **Baseline (build this first):** Extractive top-helpful review snippets.
- **Production design:** Offline aspect extraction, per-aspect map-reduce summarisation with citations, cached per product, and a live Q&A retriever for questions.

## Why AI, and why this kind

**Why AI.** Summarise thousands of reviews into balanced pros/cons and answer product questions with citations from reviews and specs. The evidence that separates good from bad outcomes (Aspect coverage, Review quality weight, Support rate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "single overall summary" are what teams reach for first, and they fail because overall summaries hide that battery is bad while screen is great. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Offline aspect extraction, per-aspect map-reduce summarisation with citations, cached per product, and a live Q&A retriever for questions.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Aspect coverage, Review quality weight, Support rate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Extractive top-helpful review snippets | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Offline aspect extraction, per-aspect map-reduce summarisation with citations, cached per product, and a live Q&A retriever for questions | chosen | Meets the 2500 ms envelope at $2.23 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time on page to decision) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Summaries judged for fluency not support.
- Evaluation trap: Evaluating on well-reviewed products only.
- New product with 3 reviews: summary overconfident.
- Review bombing campaign: summary flips overnight.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
