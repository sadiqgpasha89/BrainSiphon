# MCQ Distractor Generation: use-case brief

> Generated from the blueprint `edtech/mcq-distractor-generation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** MCQ Distractor Generation · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Produce plausible but incorrect options that reflect common misconceptions to make multiple-choice items diagnostic. The system has to run interactively, within a few seconds, inside these limits: Distractors must be wrong but plausible, No ambiguous correct answers and Misconception taxonomy.

**Why it is hard.** The obvious approach is random wrong answers, and it fails because plausible distractors reveal thinking errors. The second trap is in "Validity": the real signal is ensure only one correct option, while teams usually reach for fluent distractors.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $12.2K a month. A mistake is expensive in the way teacher edit rate measures it.

**What success looks like.** Offline: Distractor selection-rate coverage and Ambiguity detection recall. Online: Item discrimination index and Teacher edit rate. The launch is judged on "Item discrimination index" while "Teacher edit rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Produce plausible but incorrect options that reflect common misconceptions to make multiple-choice items diagnostic.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(d_t\mid d_{<t},q,a)+\lambda\,\mathrm{MisconceptionAlign}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_\theta | The language model's probability of the next token y_t, given the earlier tokens and the context written after the bar. (one value per time step or token t and forecast step h) |
| d_t | The tokens of the wrong answer option (distractor) being generated: d_t is the token at position t and d_{<t} are the earlier ones. |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| d_{<t} | The tokens of the distractor generated before position t. |
| q | The question. |
| a | The correct answer. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{MisconceptionAlign} | Penalty when a distractor does not correspond to a real student misconception. |

**Hard constraints**

- Distractors must be wrong but plausible
- No ambiguous correct answers
- Misconception taxonomy
- Teacher control

## The approach in one paragraph

Start with heuristic distractors from nearby numbers or terms. Then earn the move to misconception-conditioned generation with solver-based ambiguity detection and selection-rate learning from pilots, and only if it beats the baseline on Distractor selection-rate coverage and Ambiguity detection recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Misconception tag | Taxonomy mapping. Diagnostic value. Guard against: labelling. |
| Add Option selection rate | Observed rate on pilots. Quality. Guard against: pilot data. |
| Add Ambiguity check | Solver finds multiple correct. Validity. Guard against: solver. |
| Run it as one pipeline | Item stem and key (item bank), Misconception retriever (taxonomy), Distractor generator (LLM), Ambiguity checker (solver), Quality ranker (GBDT) and Pilot statistics (feedback), with Teacher edits off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle distractor is arguably correct | Multi-solver ambiguity check and review. |

**Deliberately not doing**

- Option length: cue.
- Position of correct option: bias.

**How the approach is proven**

Prove it offline on Distractor selection-rate coverage and Ambiguity detection recall using time-ordered splits, then online on "Item discrimination index" with "Teacher edit rate" as the guardrail. Watch for: Evaluating by fluency and No pilot data.

## Baseline and production design

- **Baseline (build this first):** Heuristic distractors from nearby numbers or terms.
- **Production design:** Misconception-conditioned generation with solver-based ambiguity detection and selection-rate learning from pilots.

## Why AI, and why this kind

**Why AI.** Produce plausible but incorrect options that reflect common misconceptions to make multiple-choice items diagnostic. The evidence that separates good from bad outcomes (Misconception tag, Option selection rate, Ambiguity check) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "random wrong answers" are what teams reach for first, and they fail because plausible distractors reveal thinking errors. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Misconception-conditioned generation with solver-based ambiguity detection and selection-rate learning from pilots.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Misconception tag, Option selection rate, Ambiguity check and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Heuristic distractors from nearby numbers or terms | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Misconception-conditioned generation with solver-based ambiguity detection and selection-rate learning from pilots | chosen | Meets the 2500 ms envelope at $2.71 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Item discrimination index) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating by fluency.
- Evaluation trap: No pilot data.
- Distractor is arguably correct: students penalised unfairly.
- Distractor leaks the answer by style: test-wise students guess.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
