# Socratic AI Tutor: use-case brief

> Generated from the blueprint `edtech/ai-tutor-socratic` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Socratic AI Tutor · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Provide a tutor that guides learners with questions and scaffolding aligned to curriculum, rather than handing over answers. The system has to run interactively, within a few seconds, inside these limits: Age-appropriate safety, Curriculum-correct content and Do not leak final answers prematurely.

**Why it is hard.** The obvious approach is answer-giving chatbot, and it fails because handing over answers short-circuits learning. The second trap is in "Correctness": the real signal is verify maths and facts with tools, while teams usually reach for lLM arithmetic and recall.

**Scale and stakes.** At 10 million users this is about 9.0M model-touching events a day, 104 requests per second on average and 625 at peak, at an estimated $891.8K a month. A mistake is expensive in the way teacher-reported usefulness measures it.

**What success looks like.** Offline: Pedagogical quality rubric scores and Answer-leak rate. Online: Learning gain vs control and Teacher-reported usefulness. The launch is judged on "Learning gain vs control" while "Teacher-reported usefulness" must not get worse.

## Objective, loss and constraints

**Business objective.** Provide a tutor that guides learners with questions and scaffolding aligned to curriculum, rather than handing over answers.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{dialogue,curriculum})+\lambda\,\mathrm{AnswerLeak}`

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
| \text{dialogue,curriculum} | The conversation so far and the curriculum the tutor must stay within. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{AnswerLeak} | Penalty when the tutor states the answer instead of guiding the student with questions. |

**Hard constraints**

- Age-appropriate safety
- Curriculum-correct content
- Do not leak final answers prematurely
- Teacher visibility

## The approach in one paragraph

Start with fixed hint sequences per problem. Then earn the move to tutor LLM with pedagogical policy, KT-informed adaptivity, calculator and verifier tools, safety filters and teacher dashboards, and only if it beats the baseline on Pedagogical quality rubric scores and Answer-leak rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Student mastery estimate | KT mastery state. Adapts difficulty. Guard against: calibration. |
| Add Hint-ladder state | Hint level used. Scaffold. Guard against: dialogue state. |
| Add Answer-leak rate | Fraction of turns revealing answers early. Pedagogy. Guard against: check. |
| Run it as one pipeline | Student message (app), Safety and age filter (classifier), Dialogue manager (policy), Tutor LLM (constrained), Maths and fact verifier (tools) and Student response (stream), with Teacher dashboard off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle student pastes homework to get the answer | Intent detection and scaffold-only policy. |

**Deliberately not doing**

- Chat length: not learning.
- Student sentiment alone: not learning.

**How the approach is proven**

Prove it offline on Pedagogical quality rubric scores and Answer-leak rate using time-ordered splits, then online on "Learning gain vs control" with "Teacher-reported usefulness" as the guardrail. Watch for: Judging tutor on helpfulness ratings and Evaluating without learning outcomes.

## Baseline and production design

- **Baseline (build this first):** Fixed hint sequences per problem.
- **Production design:** Tutor LLM with pedagogical policy, KT-informed adaptivity, calculator and verifier tools, safety filters and teacher dashboards.

## Why AI, and why this kind

**Why AI.** Provide a tutor that guides learners with questions and scaffolding aligned to curriculum, rather than handing over answers. The evidence that separates good from bad outcomes (Student mastery estimate, Hint-ladder state, Answer-leak rate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "answer-giving chatbot" are what teams reach for first, and they fail because handing over answers short-circuits learning. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Tutor LLM with pedagogical policy, KT-informed adaptivity, calculator and verifier tools, safety filters and teacher dashboards.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Student mastery estimate, Hint-ladder state, Answer-leak rate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed hint sequences per problem | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Tutor LLM with pedagogical policy, KT-informed adaptivity, calculator and verifier tools, safety filters and teacher dashboards | chosen | Meets the 2500 ms envelope at $3.30 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Learning gain vs control) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Judging tutor on helpfulness ratings.
- Evaluation trap: Evaluating without learning outcomes.
- Student pastes homework to get the answer: tutor gives full solution.
- Safety issues disclosed in chat (distress): a learner discloses distress in chat and the tutor carries on with the lesson, ignoring the safeguarding need.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
