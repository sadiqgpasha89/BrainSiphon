# Open Data Catalogue Search and Quality: use-case brief

> Generated from the blueprint `public-sector/open-data-catalogue-search` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Open Data Catalogue Search and Quality · **Domain:** public-sector · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Help people find public datasets by meaning and check their quality and freshness so open data gets used and problems are fixed at the source. The system has to run interactively, within a few seconds, inside these limits: Search by meaning and by field, Quality and freshness shown with each dataset and No personal data in published sets.

**Why it is hard.** The obvious approach is keyword match, and it fails because users and datasets use different words. The second trap is in "Quality": the real signal is checks on schema, freshness and completeness, while teams usually reach for a download count.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $12.2K a month. A mistake is expensive in the way time to find data measures it.

**What success looks like.** Offline: Retrieval accuracy on judged queries, Quality check precision and Personal data recall. Online: Dataset use, Time to find data and Quality issues fixed. The launch is judged on "Dataset use" while "Time to find data" must not get worse.

## Objective, loss and constraints

**Business objective.** Help people find public datasets by meaning and check their quality and freshness so open data gets used and problems are fixed at the source.

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

- Search by meaning and by field
- Quality and freshness shown with each dataset
- No personal data in published sets
- Publisher notified of problems
- 20K datasets

## The approach in one paragraph

Start with a keyword search over the catalogue with manual quality notes, because it is the typical portal. Then earn the move to a hybrid search index with quality scores and a pre-publication scan for personal data, with publisher feedback and usage analytics, and only if it beats the baseline on Retrieval accuracy on judged queries and Quality check precision after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Query to dataset similarity | Semantic match of query and description. Retrieval. Guard against: embeddings. |
| Add Freshness and update cadence | Last update against schedule. Quality. Guard against: from metadata. |
| Add Schema and completeness checks | Missing values and type issues. Quality. Guard against: rules. |
| Run it as one pipeline | Catalogue harvest (portal), Metadata enrichment (LLM and rules), Quality checks (validation tools), Personal data scan (pattern and model), Search index (vector and keyword) and Usage analytics (monthly), with Publisher feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle stale dataset | Freshness alerts to the publisher. |

**Deliberately not doing**

- Publisher name: irrelevant for quality.
- Dataset id: an identifier.
- Upload date alone: weak link.

**How the approach is proven**

Prove it offline on Retrieval accuracy on judged queries, Quality check precision and Personal data recall using time-ordered splits, then online on "Dataset use" with "Time to find data" as the guardrail. Watch for: Keyword-only search, Popularity as quality and Self-certified privacy.

## Baseline and production design

- **Baseline (build this first):** A keyword search over the catalogue with manual quality notes, because it is the typical portal.
- **Production design:** A hybrid search index with quality scores and a pre-publication scan for personal data, with publisher feedback and usage analytics.

## Why AI, and why this kind

**Why AI.** Help people find public datasets by meaning and check their quality and freshness so open data gets used and problems are fixed at the source. The evidence that separates good from bad outcomes (Query to dataset similarity, Freshness and update cadence, Schema and completeness checks) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "keyword match" are what teams reach for first, and they fail because users and datasets use different words. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A hybrid search index with quality scores and a pre-publication scan for personal data, with publisher feedback and usage analytics.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Query to dataset similarity, Freshness and update cadence, Schema and completeness checks and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A keyword search over the catalogue with manual quality notes, because it is the typical portal | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A hybrid search index with quality scores and a pre-publication scan for personal data, with publisher feedback and usage analytics | chosen | Meets the 2500 ms envelope at $1.36 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Dataset use) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Keyword-only search.
- Evaluation trap: Popularity as quality.
- Stale dataset: updates stopped.
- Hidden personal data: a free-text column has names.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
