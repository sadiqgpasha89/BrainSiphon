# Search Ads Keyword & Copy Generation: use-case brief

> Generated from the blueprint `adtech/search-ads-keyword-generation-llm` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Search Ads Keyword & Copy Generation · **Domain:** adtech · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Generate keyword sets, match types and ad copy for search campaigns from a landing page and goal, with quality and policy controls. The system has to run interactively, within a few seconds, inside these limits: Keyword relevance and negative keywords, Trademark rules and Budget awareness.

**Why it is hard.** The obvious approach is free generation, and it fails because ungrounded keywords waste spend. The second trap is in "Negatives": the real signal is negative-keyword suggestions are as important as positives, while teams usually reach for positive keywords only.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $20.5K a month. A mistake is expensive in the way cost per acquisition measures it.

**What success looks like.** Offline: Relevance precision and CPA of generated vs manual keywords. Online: Time to launch and Cost per acquisition. The launch is judged on "Time to launch" while "Cost per acquisition" must not get worse.

## Objective, loss and constraints

**Business objective.** Generate keyword sets, match types and ad copy for search campaigns from a landing page and goal, with quality and policy controls.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{page})+\lambda\,\mathrm{PolicyViolation}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_\theta | The language model's probability of the next token y_t, given the earlier tokens and the context written after the bar. (one value per time step or token t and forecast step h) |
| y_t | The tokens of the target keyword text: y_t is the token at position t. |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| y_{<t} | All tokens before position t: the text the model has already read or generated. (one value per time step or token t) |
| \text{page} | The landing page content the model reads to generate keywords. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{PolicyViolation} | Penalty when generated keywords break search-ad policies (trademarks, prohibited terms). |

**Hard constraints**

- Keyword relevance and negative keywords
- Trademark rules
- Budget awareness
- Search policy compliance

## The approach in one paragraph

Start with template keywords from product titles. Then earn the move to landing-page-grounded generation, volume and CPC enrichment, relevance filter and negative-keyword miner using search-term data, and only if it beats the baseline on Relevance precision and CPA of generated vs manual keywords after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Search volume and CPC estimates | Planner data. Economics. Guard against: source. |
| Add Keyword-page relevance | Semantic similarity. Quality. Guard against: embeddings. |
| Add Historical query performance | Search-term reports. Learning. Guard against: window. |
| Run it as one pipeline | Landing page crawl (fetch), Keyword generator (LLM), Volume and CPC enrichment (planner API), Relevance and policy filter (classifier), Negative miner (search terms), Marketer approval (human) and Campaign performance (labels). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle trademark keywords of competitors | Trademark lists and policy filters. |

**Deliberately not doing**

- Keyword count: quantity not quality.
- Landing page footer: boilerplate.

**How the approach is proven**

Prove it offline on Relevance precision and CPA of generated vs manual keywords using time-ordered splits, then online on "Time to launch" with "Cost per acquisition" as the guardrail. Watch for: Evaluating on volume without conversions and Ignoring negative keywords.

## Baseline and production design

- **Baseline (build this first):** Template keywords from product titles.
- **Production design:** Landing-page-grounded generation, volume and CPC enrichment, relevance filter and negative-keyword miner using search-term data.

## Why AI, and why this kind

**Why AI.** Generate keyword sets, match types and ad copy for search campaigns from a landing page and goal, with quality and policy controls. The evidence that separates good from bad outcomes (Search volume and CPC estimates, Keyword-page relevance, Historical query performance) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "free generation" are what teams reach for first, and they fail because ungrounded keywords waste spend. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: Landing-page-grounded generation, volume and CPC enrichment, relevance filter and negative-keyword miner using search-term data.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Search volume and CPC estimates, Keyword-page relevance, Historical query performance and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Template keywords from product titles | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Landing-page-grounded generation, volume and CPC enrichment, relevance filter and negative-keyword miner using search-term data | chosen | Meets the 2500 ms envelope at $4.56 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to launch) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating on volume without conversions.
- Evaluation trap: Ignoring negative keywords.
- Trademark keywords of competitors: policy or legal violations.
- Broad keywords match irrelevant queries: broad-match keywords attract irrelevant queries and the budget is wasted on non-buyers.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
