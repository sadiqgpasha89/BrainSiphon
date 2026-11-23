# Operator Work-Instruction Assistant: use-case brief

> Generated from the blueprint `manufacturing/operator-work-instruction-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Operator Work-Instruction Assistant · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Answer operator questions about work instructions, quality checks and changeover steps at the station, in the operator's language, from controlled documents only. The system has to run interactively, within a few seconds, inside these limits: Answers come from the controlled document set with revision numbers, Safety and quality-critical steps shown verbatim and The assistant cannot change any setting.

**Why it is hard.** The obvious approach is model memory, and it fails because wrong instructions cause scrap and injuries. The second trap is in "Language": the real signal is translations checked by quality, while teams usually reach for free translation by the model.

**Scale and stakes.** At 10 million users this is about 9.0M model-touching events a day, 104 requests per second on average and 625 at peak, at an estimated $1.25M a month. A mistake is expensive in the way first-pass yield on changeovers measures it.

**What success looks like.** Offline: Answer faithfulness on audited questions, Retrieval accuracy and Critical step accuracy. Online: Operator questions to supervisors, First-pass yield on changeovers and Training time for new operators. The launch is judged on "Operator questions to supervisors" while "First-pass yield on changeovers" must not get worse.

## Objective, loss and constraints

**Business objective.** Answer operator questions about work instructions, quality checks and changeover steps at the station, in the operator's language, from controlled documents only.

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

- Answers come from the controlled document set with revision numbers
- Safety and quality-critical steps shown verbatim
- The assistant cannot change any setting
- Works offline at the station
- Answer within 3 s

## The approach in one paragraph

Start with printed instruction binders and a search box on the document system, because they are the current tools. Then earn the move to a retrieval-grounded assistant with station context, controlled translations, verbatim critical steps, voice input and a feedback loop to document owners, and only if it beats the baseline on Answer faithfulness on audited questions and Retrieval accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Station and product context | Station and the product on it. Retrieves the right instruction. Guard against: from MES. |
| Add Document revision status | Current or superseded. Prevents old steps. Guard against: from document control. |
| Add Question intent | Procedure, parameter, defect or safety. Routes the answer. Guard against: classified. |
| Run it as one pipeline | Question intake (station tablet or voice), Station context (MES lookup), Retrieval (hybrid search), Answer with citation (LLM with controlled content), Critical step insertion (document store) and Usage analytics (BI), with Feedback to owners off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle superseded instruction | Revision checks and cache expiry. |

**Deliberately not doing**

- Operator name: irrelevant.
- Time of day: irrelevant.
- Device model: irrelevant.

**How the approach is proven**

Prove it offline on Answer faithfulness on audited questions, Retrieval accuracy and Critical step accuracy using time-ordered splits, then online on "Operator questions to supervisors" with "First-pass yield on changeovers" as the guardrail. Watch for: Free translation of safety steps, Missing revision control and Open-domain chat.

## Baseline and production design

- **Baseline (build this first):** Printed instruction binders and a search box on the document system, because they are the current tools.
- **Production design:** A retrieval-grounded assistant with station context, controlled translations, verbatim critical steps, voice input and a feedback loop to document owners.

## Why AI, and why this kind

**Why AI.** Answer operator questions about work instructions, quality checks and changeover steps at the station, in the operator's language, from controlled documents only. The evidence that separates good from bad outcomes (Station and product context, Document revision status, Question intent) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model memory" are what teams reach for first, and they fail because wrong instructions cause scrap and injuries. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: A retrieval-grounded assistant with station context, controlled translations, verbatim critical steps, voice input and a feedback loop to document owners.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Station and product context, Document revision status, Question intent and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Printed instruction binders and a search box on the document system, because they are the current tools | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A retrieval-grounded assistant with station context, controlled translations, verbatim critical steps, voice input and a feedback loop to document owners | chosen | Meets the 2500 ms envelope at $4.62 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Operator questions to supervisors) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Free translation of safety steps.
- Evaluation trap: Missing revision control.
- Superseded instruction: an old document is cached.
- Noise at the station: voice input fails.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
