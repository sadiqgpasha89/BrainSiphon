# Programming Assignment Feedback: use-case brief

> Generated from the blueprint `edtech/programming-assignment-feedback-llm` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Programming Assignment Feedback · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Give students hints and explanations on code submissions that guide learning without revealing full solutions. The system has to run interactively, within a few seconds, inside these limits: Do not give the full solution, Reproducible tests and Safe code execution.

**Why it is hard.** The obvious approach is rewriting the student's code, and it fails because rewriting robs the learning moment. The second trap is in "Verification": the real signal is run tests in a sandbox and ground hints on failures, while teams usually reach for lLM reasoning alone.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 63 at peak, at an estimated $108.9K a month. A mistake is expensive in the way time to solve measures it.

**What success looks like.** Offline: Hint helpfulness in rated studies and Leak rate. Online: Resubmission success rate and Time to solve. The launch is judged on "Resubmission success rate" while "Time to solve" must not get worse.

## Objective, loss and constraints

**Business objective.** Give students hints and explanations on code submissions that guide learning without revealing full solutions.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{code,tests})+\lambda\,\mathrm{SolutionLeak}`

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
| \text{code,tests} | The student's code and the test results the feedback is based on. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{SolutionLeak} | Penalty when the feedback gives away the full solution instead of a hint. |

**Hard constraints**

- Do not give the full solution
- Reproducible tests
- Safe code execution
- Fast feedback

## The approach in one paragraph

Start with autograder pass/fail output. Then earn the move to sandboxed test execution, misconception detection and LLM hint generation constrained by a leak checker with hint-level escalation, and only if it beats the baseline on Hint helpfulness in rated studies and Leak rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Failing test signature | Which tests fail and how. Diagnosis. Guard against: test design. |
| Add Misconception classifier | Common error pattern match. Targeted hint. Guard against: taxonomy. |
| Add Solution-leak score | Similarity of hint to reference solution. Policy. Guard against: check. |
| Run it as one pipeline | Submission (LMS), Sandbox runner (containers), Failure analyser (test traces), Hint generator (LLM), Leak and safety check (filters), Student view (IDE panel) and Learning analytics (events). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle student code tries to escape the sandbox | Strict sandboxing and resource limits. |

**Deliberately not doing**

- Code style only: not correctness.
- Variable names: noise.

**How the approach is proven**

Prove it offline on Hint helpfulness in rated studies and Leak rate using time-ordered splits, then online on "Resubmission success rate" with "Time to solve" as the guardrail. Watch for: Evaluating hints on correctness alone and Ignoring hint abuse patterns.

## Baseline and production design

- **Baseline (build this first):** Autograder pass/fail output.
- **Production design:** Sandboxed test execution, misconception detection and LLM hint generation constrained by a leak checker with hint-level escalation.

## Why AI, and why this kind

**Why AI.** Give students hints and explanations on code submissions that guide learning without revealing full solutions. The evidence that separates good from bad outcomes (Failing test signature, Misconception classifier, Solution-leak score) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "rewriting the student's code" are what teams reach for first, and they fail because rewriting robs the learning moment. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Sandboxed test execution, misconception detection and LLM hint generation constrained by a leak checker with hint-level escalation.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Failing test signature, Misconception classifier, Solution-leak score and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Autograder pass/fail output | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Sandboxed test execution, misconception detection and LLM hint generation constrained by a leak checker with hint-level escalation | chosen | Meets the 2500 ms envelope at $4.03 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Resubmission success rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating hints on correctness alone.
- Evaluation trap: Ignoring hint abuse patterns.
- Student code tries to escape the sandbox: security incident.
- Hint reveals the whole solution: assignment integrity lost.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
