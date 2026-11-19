# Short-Answer Grading with LLMs: use-case brief

> Generated from the blueprint `edtech/short-answer-grading-llm` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Short-Answer Grading with LLMs · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Grade free-text answers against rubrics with explanations, giving consistent scoring and instant feedback at scale. The system has to run interactively, within a few seconds, inside these limits: Consistency across runs, Rubric-grounded reasoning and Teacher audit.

**Why it is hard.** The obvious approach is free-form LLM grading, and it fails because free-form grading is inconsistent across runs. The second trap is in "Calibration": the real signal is calibrate to human graders per question, while teams usually reach for trust model scores.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $36.3K a month. A mistake is expensive in the way appeal rate measures it.

**What success looks like.** Offline: Agreement (QWK) vs teachers and Run-to-run consistency. Online: Time to feedback and Appeal rate. The launch is judged on "Time to feedback" while "Appeal rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Grade free-text answers against rubrics with explanations, giving consistent scoring and instant feedback at scale.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{rubric},\text{answer})`

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
| \text{rubric} | The marking rubric the model is given. |
| \text{answer} | The student's answer being graded. |

**Hard constraints**

- Consistency across runs
- Rubric-grounded reasoning
- Teacher audit
- Student appeals

## The approach in one paragraph

Start with keyword matching and regex rubrics. Then earn the move to criterion-level LLM grading with reference answers, self-consistency checks, per-question calibration on teacher-graded samples and an appeals path, and only if it beats the baseline on Agreement (QWK) vs teachers and Run-to-run consistency after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Rubric-criterion match | Per-criterion judgment. Transparency. Guard against: rubric design. |
| Add Grader agreement with teachers | Kappa per question. Reliability. Guard against: sample. |
| Add Self-consistency across samples | Agreement over 3 runs. Stability. Guard against: sampling. |
| Run it as one pipeline | Answer intake (LMS), Rubric loader (question bank), Grader LLM (structured output), Self-consistency check (multiple samples), Calibration layer (per-question) and Appeals (human), with Teacher spot-check off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle unconventional but correct answers | Low-confidence routing and rubric updates. |

**Deliberately not doing**

- Answer length: not correctness.
- Student writing style: bias.

**How the approach is proven**

Prove it offline on Agreement (QWK) vs teachers and Run-to-run consistency using time-ordered splits, then online on "Time to feedback" with "Appeal rate" as the guardrail. Watch for: Rubrics too vague to test and Calibration data from easy questions.

## Baseline and production design

- **Baseline (build this first):** Keyword matching and regex rubrics.
- **Production design:** Criterion-level LLM grading with reference answers, self-consistency checks, per-question calibration on teacher-graded samples and an appeals path.

## Why AI, and why this kind

**Why AI.** Grade free-text answers against rubrics with explanations, giving consistent scoring and instant feedback at scale. The evidence that separates good from bad outcomes (Rubric-criterion match, Grader agreement with teachers, Self-consistency across samples) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "free-form LLM grading" are what teams reach for first, and they fail because free-form grading is inconsistent across runs. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Criterion-level LLM grading with reference answers, self-consistency checks, per-question calibration on teacher-graded samples and an appeals path.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Rubric-criterion match, Grader agreement with teachers, Self-consistency across samples and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword matching and regex rubrics | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Criterion-level LLM grading with reference answers, self-consistency checks, per-question calibration on teacher-graded samples and an appeals path | chosen | Meets the 2500 ms envelope at $2.02 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to feedback) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Rubrics too vague to test.
- Evaluation trap: Calibration data from easy questions.
- Unconventional but correct answers: marked wrong against reference.
- Prompt injection inside student answers: inflated scores.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
