# AI Tool Impact Assessment and Public Register: use-case brief

> Generated from the blueprint `public-safety/ai-tool-impact-assessment-register` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** AI Tool Impact Assessment and Public Register · **Domain:** public-safety · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Guide teams through a structured impact assessment for each AI tool before use, check it for gaps, and publish a register entry that states purpose, limits, data and oversight. The system has to run interactively, within a few seconds, inside these limits: No tool goes live without an approved assessment, Assessments check the purpose, data, bias tests and human oversight and Register entries are public in plain language.

**Why it is hard.** The obvious approach is optional guidance, and it fails because optional steps are skipped. The second trap is in "Content": the real signal is purpose, data, group impacts and oversight, while teams usually reach for a generic checklist.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $45.9K a month. A mistake is expensive in the way time to approval measures it.

**What success looks like.** Offline: Gaps found in audited assessments, Reassessment trigger recall and Register accuracy. Online: Tools with approved assessments, Time to approval and Incidents from unassessed tools. The launch is judged on "Tools with approved assessments" while "Time to approval" must not get worse.

## Objective, loss and constraints

**Business objective.** Guide teams through a structured impact assessment for each AI tool before use, check it for gaps, and publish a register entry that states purpose, limits, data and oversight.

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

- No tool goes live without an approved assessment
- Assessments check the purpose, data, bias tests and human oversight
- Register entries are public in plain language
- Reassessment on every material change
- 200 tools

## The approach in one paragraph

Start with word templates reviewed by a committee, because it is the common governance process. Then earn the move to a guided assessment tool with completeness and consistency checks, risk tiers that set required controls, a public register generator and automatic reassessment triggers, and only if it beats the baseline on Gaps found in audited assessments and Reassessment trigger recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Assessment completeness | Required sections completed. Gate. Guard against: from the form. |
| Add Data sensitivity class | Data categories used. Risk tier. Guard against: from the catalogue. |
| Add Decision impact on people | Whether people are affected directly. Risk tier. Guard against: from the assessment. |
| Run it as one pipeline | Assessment intake (governance portal), Completeness and consistency checks (rules and LLM), Risk tier (rules), Approval workflow (governance board), Register publication (public site) and Change trigger (release pipeline), with Annual review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle scope creep | Purpose binding and a reassessment gate. |

**Deliberately not doing**

- Author name: irrelevant.
- Document length: weak link.
- Template version: an artefact.

**How the approach is proven**

Prove it offline on Gaps found in audited assessments, Reassessment trigger recall and Register accuracy using time-ordered splits, then online on "Tools with approved assessments" with "Time to approval" as the guardrail. Watch for: Optional assessments, Generic checklists and Internal-only registers.

## Baseline and production design

- **Baseline (build this first):** Word templates reviewed by a committee, because it is the common governance process.
- **Production design:** A guided assessment tool with completeness and consistency checks, risk tiers that set required controls, a public register generator and automatic reassessment triggers.

## Why AI, and why this kind

**Why AI.** Guide teams through a structured impact assessment for each AI tool before use, check it for gaps, and publish a register entry that states purpose, limits, data and oversight. The evidence that separates good from bad outcomes (Assessment completeness, Data sensitivity class, Decision impact on people) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "optional guidance" are what teams reach for first, and they fail because optional steps are skipped. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: A guided assessment tool with completeness and consistency checks, risk tiers that set required controls, a public register generator and automatic reassessment triggers.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Assessment completeness, Data sensitivity class, Decision impact on people and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Word templates reviewed by a committee, because it is the common governance process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A guided assessment tool with completeness and consistency checks, risk tiers that set required controls, a public register generator and automatic reassessment triggers | chosen | Meets the 2500 ms envelope at $5.10 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Tools with approved assessments) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Optional assessments.
- Evaluation trap: Generic checklists.
- Scope creep: a tool is used for a new purpose.
- Vendor update: a supplier changes the model.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
