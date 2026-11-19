# Adaptive Reading & Text Simplification: use-case brief

> Generated from the blueprint `edtech/adaptive-reading-text-simplification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Adaptive Reading & Text Simplification · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Adapt reading passages to each learner's reading level while preserving meaning, with vocabulary supports and comprehension checks. The system has to run interactively, within a few seconds, inside these limits: Meaning preservation, Grade-level control and Copyright.

**Why it is hard.** The obvious approach is fluent simplification, and it fails because simplification can drop or alter facts. The second trap is in "Level": the real signal is controlled readability with a validated metric, while teams usually reach for readability formulas.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $238.3K a month. A mistake is expensive in the way reading time measures it.

**What success looks like.** Offline: Fact retention rate and Level accuracy vs human raters. Online: Comprehension scores and Reading time. The launch is judged on "Comprehension scores" while "Reading time" must not get worse.

## Objective, loss and constraints

**Business objective.** Adapt reading passages to each learner's reading level while preserving meaning, with vocabulary supports and comprehension checks.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x,\text{level})+\lambda\,\mathrm{MeaningDrift}`

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
| x | The original text. |
| \text{level} | The target reading level the text is simplified to. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{MeaningDrift} | Penalty when the simplified text changes the meaning of the original. |

**Hard constraints**

- Meaning preservation
- Grade-level control
- Copyright
- Dyslexia-friendly formats

## The approach in one paragraph

Start with leveled readers prepared by publishers. Then earn the move to level-conditioned simplification with fact-retention verification, vocabulary glosses and comprehension question generation, and only if it beats the baseline on Fact retention rate and Level accuracy vs human raters after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Reading-level estimate | Model-based readability. Level match. Guard against: calibration. |
| Add Key-fact retention | NLI-checked fact coverage. Fidelity. Guard against: fact extraction. |
| Add Vocabulary-support coverage | Glossed difficult words. Support. Guard against: lexicon. |
| Run it as one pipeline | Source passage (content bank), Level estimator (reading model), Simplifier (LLM), Fact-retention checker (NLI), Vocabulary glosser (lexicon) and Learner comprehension (analytics), with Teacher approval off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle simplification removes critical nuance | Fact-retention verifier and teacher review for key texts. |

**Deliberately not doing**

- Sentence count: weak.
- Passage length: weak.

**How the approach is proven**

Prove it offline on Fact retention rate and Level accuracy vs human raters using time-ordered splits, then online on "Comprehension scores" with "Reading time" as the guardrail. Watch for: Evaluating fluency not fidelity and Ignoring literary text.

## Baseline and production design

- **Baseline (build this first):** Leveled readers prepared by publishers.
- **Production design:** Level-conditioned simplification with fact-retention verification, vocabulary glosses and comprehension question generation.

## Why AI, and why this kind

**Why AI.** Adapt reading passages to each learner's reading level while preserving meaning, with vocabulary supports and comprehension checks. The evidence that separates good from bad outcomes (Reading-level estimate, Key-fact retention, Vocabulary-support coverage) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "fluent simplification" are what teams reach for first, and they fail because simplification can drop or alter facts. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Level-conditioned simplification with fact-retention verification, vocabulary glosses and comprehension question generation.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Reading-level estimate, Key-fact retention, Vocabulary-support coverage and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Leveled readers prepared by publishers | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Level-conditioned simplification with fact-retention verification, vocabulary glosses and comprehension question generation | chosen | Meets the 2500 ms envelope at $2.65 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Comprehension scores) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating fluency not fidelity.
- Evaluation trap: Ignoring literary text.
- Simplification removes critical nuance: misleads learners.
- Poetry and literary text: meaning changes with simplification.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
