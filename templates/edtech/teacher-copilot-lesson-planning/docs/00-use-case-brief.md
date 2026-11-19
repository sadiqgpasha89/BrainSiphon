# Teacher Copilot for Lesson Planning: use-case brief

> Generated from the blueprint `edtech/teacher-copilot-lesson-planning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Teacher Copilot for Lesson Planning · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Draft lesson plans, differentiated materials and rubrics aligned with standards, saving teacher prep time while keeping teachers in control. The system has to run interactively, within a few seconds, inside these limits: Standards alignment, Age-appropriate content and Teacher editing.

**Why it is hard.** The obvious approach is free generation, and it fails because plans must map to the curriculum. The second trap is in "Differentiation": the real signal is scaffolds for varied levels, while teams usually reach for one-size plans.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $121.5K a month. A mistake is expensive in the way plan reuse measures it.

**What success looks like.** Offline: Standards-alignment accuracy and Teacher acceptance rate. Online: Prep time saved and Plan reuse. The launch is judged on "Prep time saved" while "Plan reuse" must not get worse.

## Objective, loss and constraints

**Business objective.** Draft lesson plans, differentiated materials and rubrics aligned with standards, saving teacher prep time while keeping teachers in control.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{standards,context})+\lambda\,\mathrm{StandardMisalign}`

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
| \text{standards,context} | The curriculum standards and class context the lesson plan must follow. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{StandardMisalign} | Penalty when the generated plan does not address the required standard. |

**Hard constraints**

- Standards alignment
- Age-appropriate content
- Teacher editing
- Copyright

## The approach in one paragraph

Start with teachers adapt shared templates. Then earn the move to standards-grounded drafting with resource retrieval, differentiation generator, copyright filter and teacher edit loop, and only if it beats the baseline on Standards-alignment accuracy and Teacher acceptance rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Standards alignment score | Classifier coverage. Fit. Guard against: taxonomy. |
| Add Reading-level match | Text complexity. Accessibility. Guard against: tools. |
| Add Teacher edit distance | Edits made. Quality. Guard against: logging. |
| Run it as one pipeline | Standards retriever (curriculum DB), Lesson drafter (LLM), Differentiation generator (LLM) and Alignment and level check (classifiers), with Teacher request, Teacher edit and Usage feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle hallucinated references to non-existent resources | Citation validation to approved library. |

**Deliberately not doing**

- Plan length: not quality.
- Fancy formatting: cosmetic.

**How the approach is proven**

Prove it offline on Standards-alignment accuracy and Teacher acceptance rate using time-ordered splits, then online on "Prep time saved" with "Plan reuse" as the guardrail. Watch for: Judging plans by polish and Evaluating without teachers.

## Baseline and production design

- **Baseline (build this first):** Teachers adapt shared templates.
- **Production design:** Standards-grounded drafting with resource retrieval, differentiation generator, copyright filter and teacher edit loop.

## Why AI, and why this kind

**Why AI.** Draft lesson plans, differentiated materials and rubrics aligned with standards, saving teacher prep time while keeping teachers in control. The evidence that separates good from bad outcomes (Standards alignment score, Reading-level match, Teacher edit distance) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "free generation" are what teams reach for first, and they fail because plans must map to the curriculum. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: Standards-grounded drafting with resource retrieval, differentiation generator, copyright filter and teacher edit loop.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Standards alignment score, Reading-level match, Teacher edit distance and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Teachers adapt shared templates | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Standards-grounded drafting with resource retrieval, differentiation generator, copyright filter and teacher edit loop | chosen | Meets the 2500 ms envelope at $6.75 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Prep time saved) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Judging plans by polish.
- Evaluation trap: Evaluating without teachers.
- Hallucinated references to non-existent resources: teachers waste time.
- Cultural bias in examples: examples reflect one culture and exclude or confuse parts of the class.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
