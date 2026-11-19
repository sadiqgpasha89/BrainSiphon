# Question Generation with LLMs: use-case brief

> Generated from the blueprint `edtech/question-generation-llm` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Question Generation with LLMs · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Generate curriculum-aligned questions with correct answers, plausible distractors and difficulty tags for teacher review. The system has to run interactively, within a few seconds, inside these limits: Factual correctness, Alignment to learning objectives and Bias and sensitivity.

**Why it is hard.** The obvious approach is trust generated keys, and it fails because generated answer keys are wrong 5-15% of the time. The second trap is in "Alignment": the real signal is retrieval from approved materials, while teams usually reach for open-world generation.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $20.5K a month. A mistake is expensive in the way item quality after pilot measures it.

**What success looks like.** Offline: Key correctness rate and Teacher acceptance rate. Online: Teacher time saved and Item quality after pilot. The launch is judged on "Teacher time saved" while "Item quality after pilot" must not get worse.

## Objective, loss and constraints

**Business objective.** Generate curriculum-aligned questions with correct answers, plausible distractors and difficulty tags for teacher review.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{objective,context})+\lambda\,\mathrm{Unanswerable}`

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
| \text{objective,context} | The learning objective and source material the question is generated from. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Unanswerable} | Penalty when the generated question cannot be answered from the given context. |

**Hard constraints**

- Factual correctness
- Alignment to learning objectives
- Bias and sensitivity
- Teacher approval

## The approach in one paragraph

Start with template-based question banks. Then earn the move to retrieval-grounded generation, independent solver verification, distractor ranking and difficulty prediction before teacher approval, and only if it beats the baseline on Key correctness rate and Teacher acceptance rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Independent solve agreement | Solver matches key. Correctness. Guard against: solver quality. |
| Add Objective-match score | Classifier alignment to objective. Alignment. Guard against: taxonomy. |
| Add Distractor plausibility | Model-estimated selection rate. Quality. Guard against: calibration. |
| Run it as one pipeline | Objective and material selection (UI), Retriever (approved content), Question generator (LLM), Solver verifier (independent model), Difficulty and distractor ranker (models) and Item bank (metadata), with Teacher approval off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle wrong answer key accepted | Verification by independent solvers and teacher spot-checks. |

**Deliberately not doing**

- Question length: weak.
- Style: weak.

**How the approach is proven**

Prove it offline on Key correctness rate and Teacher acceptance rate using time-ordered splits, then online on "Teacher time saved" with "Item quality after pilot" as the guardrail. Watch for: Evaluating without a solver check and Fluency judged as quality.

## Baseline and production design

- **Baseline (build this first):** Template-based question banks.
- **Production design:** Retrieval-grounded generation, independent solver verification, distractor ranking and difficulty prediction before teacher approval.

## Why AI, and why this kind

**Why AI.** Generate curriculum-aligned questions with correct answers, plausible distractors and difficulty tags for teacher review. The evidence that separates good from bad outcomes (Independent solve agreement, Objective-match score, Distractor plausibility) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "trust generated keys" are what teams reach for first, and they fail because generated answer keys are wrong 5-15% of the time. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Retrieval-grounded generation, independent solver verification, distractor ranking and difficulty prediction before teacher approval.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Independent solve agreement, Objective-match score, Distractor plausibility and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Template-based question banks | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Retrieval-grounded generation, independent solver verification, distractor ranking and difficulty prediction before teacher approval | chosen | Meets the 2500 ms envelope at $4.55 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Teacher time saved) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating without a solver check.
- Evaluation trap: Fluency judged as quality.
- Wrong answer key accepted: students are taught or graded incorrectly.
- Culturally biased examples: exclusion of groups.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
