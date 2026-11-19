# Automated Essay Scoring: use-case brief

> Generated from the blueprint `edtech/automated-essay-scoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Automated Essay Scoring · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Score essays against rubrics with human-level agreement and give actionable feedback, with transparency and fairness. The system has to run interactively, within a few seconds, inside these limits: Agreement with expert raters (QWK), Bias auditing across groups and Gaming resistance.

**Why it is hard.** The obvious approach is single holistic score, and it fails because students and teachers need diagnostic feedback. The second trap is in "Robustness": the real signal is test against adversarial and off-topic essays, while teams usually reach for agreement on typical essays.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $12.2K a month. A mistake is expensive in the way student revision quality measures it.

**What success looks like.** Offline: Quadratic weighted kappa vs raters and Subgroup score differences. Online: Teacher time saved and Student revision quality. The launch is judged on "Teacher time saved" while "Student revision quality" must not get worse.

## Objective, loss and constraints

**Business objective.** Score essays against rubrics with human-level agreement and give actionable feedback, with transparency and fairness.

**Training objective.** `\mathcal{L}=\mathrm{OrdinalMSE}(y,\hat y)+\lambda\,\mathrm{RubricTraitLoss}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{OrdinalMSE} | Squared error between predicted and true scores that respects the ordered scale of grades. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \hat{y} | The model's prediction of y. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{RubricTraitLoss} | Penalty for errors on individual rubric traits such as organisation or grammar, not just the overall score. |

**Hard constraints**

- Agreement with expert raters (QWK)
- Bias auditing across groups
- Gaming resistance
- Teacher override

## The approach in one paragraph

Start with feature-based regression on length, grammar and vocabulary. Then earn the move to fine-tuned transformer with trait heads plus an adversarial detector, calibrated against multi-rater consensus, with human review for low confidence, and only if it beats the baseline on Quadratic weighted kappa vs raters and Subgroup score differences after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Rubric trait scores | Multi-head trait predictions. Feedback. Guard against: annotated rubric. |
| Add Discourse coherence features | Coherence model score. Organisation. Guard against: parser quality. |
| Add Prompt relevance | Semantic match to the prompt. Off-topic detection. Guard against: embeddings. |
| Run it as one pipeline | Essay submission (LMS), Preprocessing (cleaning), Trait scorer (fine-tuned encoder), Adversarial detector (classifier), Calibration and confidence (ordinal) and Rater labels (feedback), with Teacher review off the critical path. |
| Optimise the right thing | The objective weighs squared error between predicted and true scores that respects the ordered scale of grades, so the model is trained on the cost of the decision and not on a generic score. |
| Handle essay topics change between years | Prompt-specific calibration and anchor essays. |

**Deliberately not doing**

- Essay length alone: gameable.
- Rare word counts: gameable.

**How the approach is proven**

Prove it offline on Quadratic weighted kappa vs raters and Subgroup score differences using time-ordered splits, then online on "Teacher time saved" with "Student revision quality" as the guardrail. Watch for: Training on single-rater scores and Not testing bias across dialects.

## Baseline and production design

- **Baseline (build this first):** Feature-based regression on length, grammar and vocabulary.
- **Production design:** Fine-tuned transformer with trait heads plus an adversarial detector, calibrated against multi-rater consensus, with human review for low confidence.

## Why AI, and why this kind

**Why AI.** Score essays against rubrics with human-level agreement and give actionable feedback, with transparency and fairness. The evidence that separates good from bad outcomes (Rubric trait scores, Discourse coherence features, Prompt relevance) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "single holistic score" are what teams reach for first, and they fail because students and teachers need diagnostic feedback. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Fine-tuned transformer with trait heads plus an adversarial detector, calibrated against multi-rater consensus, with human review for low confidence.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Rubric trait scores, Discourse coherence features, Prompt relevance and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Feature-based regression on length, grammar and vocabulary | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Fine-tuned transformer with trait heads plus an adversarial detector, calibrated against multi-rater consensus, with human review for low confidence | chosen | Meets the 2500 ms envelope at $2.71 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Teacher time saved) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on single-rater scores.
- Evaluation trap: Not testing bias across dialects.
- Essay topics change between years: score distribution shifts.
- Students learn to game surface features: scores inflate without quality.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
