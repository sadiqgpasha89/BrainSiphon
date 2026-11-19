# Radiology Report Drafting with Multimodal LLMs: use-case brief

> Generated from the blueprint `healthcare/radiology-report-generation-llm` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Radiology Report Drafting with Multimodal LLMs · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Draft structured radiology findings and impressions from images and priors for radiologist edit, cutting dictation time without introducing errors. The system has to run interactively, within a few seconds, inside these limits: Radiologist signs every report, Hallucination intolerance and PHI stays within hospital cloud.

**Why it is hard.** The obvious approach is bLEU or ROUGE, and it fails because n-gram metrics reward fluent templated text with wrong findings. The second trap is in "Role": the real signal is draft assistant with uncertainty flags, while teams usually reach for autonomous report.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $41.9K a month. A mistake is expensive in the way addendum rate measures it.

**What success looks like.** Offline: Entity-level F1 and laterality error rate and Radiologist edit distance. Online: Reporting time per study and Addendum rate. The launch is judged on "Reporting time per study" while "Addendum rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Draft structured radiology findings and impressions from images and priors for radiologist edit, cutting dictation time without introducing errors.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},I)+\lambda\,\mathrm{CheXbertMismatch}`

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
| I | The medical image the report describes. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{CheXbertMismatch} | Penalty when findings in the generated report differ from those in the reference report, as extracted by the CheXbert labeller. |

**Hard constraints**

- Radiologist signs every report
- Hallucination intolerance
- PHI stays within hospital cloud
- Latency under 10 s

## The approach in one paragraph

Start with template reports populated from classifier outputs. Then earn the move to vision encoder plus LLM fine-tuned on paired reports, retrieval of priors, deterministic safety checks (laterality, negation) and radiologist-in-the-loop editing, and only if it beats the baseline on Entity-level F1 and laterality error rate and Radiologist edit distance after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Finding-entity F1 | F1 over extracted clinical entities. Factual accuracy. Guard against: extraction model validated. |
| Add Laterality and negation checks | Rule-based consistency check. Dangerous error type. Guard against: deterministic checks. |
| Add Prior-comparison grounding | Statements referencing prior studies verified. Temporal accuracy. Guard against: prior retrieval correctness. |
| Run it as one pipeline | Study intake (PACS), Image encoder (ViT), Prior retrieval (RIS lookup), Safety checker (rule and entity checks) and Radiologist edit and sign (human), with Report drafter and Edit feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle hallucinated comparison to a nonexistent prior | Prior-grounding verifier blocks unsupported comparisons. |

**Deliberately not doing**

- Report length: not accuracy.
- Style similarity to training reports: masks factual errors.

**How the approach is proven**

Prove it offline on Entity-level F1 and laterality error rate and Radiologist edit distance using time-ordered splits, then online on "Reporting time per study" with "Addendum rate" as the guardrail. Watch for: Reference reports contain errors too and Test studies overlap with training patients.

## Baseline and production design

- **Baseline (build this first):** Template reports populated from classifier outputs.
- **Production design:** Vision encoder plus LLM fine-tuned on paired reports, retrieval of priors, deterministic safety checks (laterality, negation) and radiologist-in-the-loop editing.

## Why AI, and why this kind

**Why AI.** Draft structured radiology findings and impressions from images and priors for radiologist edit, cutting dictation time without introducing errors. The evidence that separates good from bad outcomes (Finding-entity F1, Laterality and negation checks, Prior-comparison grounding) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "BLEU or ROUGE" are what teams reach for first, and they fail because N-gram metrics reward fluent templated text with wrong findings. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Vision encoder plus LLM fine-tuned on paired reports, retrieval of priors, deterministic safety checks (laterality, negation) and radiologist-in-the-loop editing.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Finding-entity F1, Laterality and negation checks, Prior-comparison grounding and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Template reports populated from classifier outputs | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Vision encoder plus LLM fine-tuned on paired reports, retrieval of priors, deterministic safety checks (laterality, negation) and radiologist-in-the-loop editing | chosen | Meets the 2500 ms envelope at $9.31 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Reporting time per study) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Reference reports contain errors too.
- Evaluation trap: Test studies overlap with training patients.
- Hallucinated comparison to a nonexistent prior: misleading statement.
- Left/right swap: wrong-side finding.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
