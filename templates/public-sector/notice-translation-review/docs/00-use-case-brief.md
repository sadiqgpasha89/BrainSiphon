# Official Notice Translation Review: use-case brief

> Generated from the blueprint `public-sector/notice-translation-review` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Official Notice Translation Review · **Domain:** public-sector · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Translate official notices and letters into residents' languages and flag meaning drift for a reviewer so the text stays accurate and readable. The system has to run interactively, within a few seconds, inside these limits: Reviewer approves legal or rights-related notices, Key terms follow an approved glossary and Original and translation stored together.

**Why it is hard.** The obvious approach is fluency, and it fails because a fluent error about a deadline harms people. The second trap is in "Glossary": the real signal is approved terms for legal concepts, while teams usually reach for free translation.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $12.4K a month. A mistake is expensive in the way time to publish measures it.

**What success looks like.** Offline: Reviewer edit rate, Critical error recall and Glossary compliance. Online: Translation cost per notice, Time to publish and Resident complaints about notices. The launch is judged on "Translation cost per notice" while "Time to publish" must not get worse.

## Objective, loss and constraints

**Business objective.** Translate official notices and letters into residents' languages and flag meaning drift for a reviewer so the text stays accurate and readable.

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

- Reviewer approves legal or rights-related notices
- Key terms follow an approved glossary
- Original and translation stored together
- Back-translation check on high-risk text
- 15 languages

## The approach in one paragraph

Start with human translators for all notices, because it is the quality standard and the starting point. Then earn the move to a glossary-constrained translation model with number and date checks, back-translation tests and a reviewer queue ranked by risk class, and only if it beats the baseline on Reviewer edit rate and Critical error recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Glossary term match | Whether key terms follow the glossary. Consistency. Guard against: from the glossary. |
| Add Back-translation difference | Difference after translating back. Drift. Guard against: from the check. |
| Add Deadline and amount extraction | Dates and numbers in the text. Critical content. Guard against: from extraction. |
| Run it as one pipeline | Notice intake (content system), Machine translation (constrained model), Number and glossary checks (rules), Back-translation test (model) and Approval and publish (content system), with Reviewer queue and Feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle rare language | Routing to human translators. |

**Deliberately not doing**

- Author name: irrelevant.
- Template colour: irrelevant.
- Letter length alone: weak link.

**How the approach is proven**

Prove it offline on Reviewer edit rate, Critical error recall and Glossary compliance using time-ordered splits, then online on "Translation cost per notice" with "Time to publish" as the guardrail. Watch for: Fluency as the metric, Skipping review for rights text and No glossary.

## Baseline and production design

- **Baseline (build this first):** Human translators for all notices, because it is the quality standard and the starting point.
- **Production design:** A glossary-constrained translation model with number and date checks, back-translation tests and a reviewer queue ranked by risk class.

## Why AI, and why this kind

**Why AI.** Translate official notices and letters into residents' languages and flag meaning drift for a reviewer so the text stays accurate and readable. The evidence that separates good from bad outcomes (Glossary term match, Back-translation difference, Deadline and amount extraction) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "fluency" are what teams reach for first, and they fail because A fluent error about a deadline harms people. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A glossary-constrained translation model with number and date checks, back-translation tests and a reviewer queue ranked by risk class.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Glossary term match, Back-translation difference, Deadline and amount extraction and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Human translators for all notices, because it is the quality standard and the starting point | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A glossary-constrained translation model with number and date checks, back-translation tests and a reviewer queue ranked by risk class | chosen | Meets the 2500 ms envelope at $0.687 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Translation cost per notice) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Fluency as the metric.
- Evaluation trap: Skipping review for rights text.
- Rare language: the model is weak.
- Legal change: a legal term changes in the glossary.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
