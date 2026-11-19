# Clinical Decision Support with RAG: use-case brief

> Generated from the blueprint `healthcare/clinical-decision-support-rag` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Clinical Decision Support with RAG · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Answer clinicians' point-of-care questions by retrieving guidelines and patient context with verified citations. The system has to run interactively, within a few seconds, inside these limits: Evidence-based citations only, Guideline version control and Patient-data minimisation.

**Why it is hard.** The obvious approach is parametric model memory, and it fails because medical facts in memory are outdated or wrong. The second trap is in "Personalisation": the real signal is patient-specific context via FHIR with consent, while teams usually reach for generic answers.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $99.8K a month. A mistake is expensive in the way clinician adoption and override rate measures it.

**What success looks like.** Offline: Citation entailment rate and Expert-graded answer accuracy. Online: Time to answer and Clinician adoption and override rate. The launch is judged on "Time to answer" while "Clinician adoption and override rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Answer clinicians' point-of-care questions by retrieving guidelines and patient context with verified citations.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{evidence})+\lambda\,\mathrm{CitationError}`

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
| \text{evidence} | The guideline and literature passages retrieved for the question. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{CitationError} | Penalty for citing a source that does not support the statement. |

**Hard constraints**

- Evidence-based citations only
- Guideline version control
- Patient-data minimisation
- Regulatory classification

## The approach in one paragraph

Start with upToDate-style search for clinicians. Then earn the move to hybrid retrieval over curated medical corpus, chart-aware reasoning LLM with citation verification and abstain-on-weak-evidence policy, and only if it beats the baseline on Citation entailment rate and Expert-graded answer accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Citation entailment rate | Claims supported by cited passages. Faithfulness. Guard against: nLI check. |
| Add Guideline recency | Publication date and supersession. Currency. Guard against: index metadata. |
| Add Patient-context grounding | Facts used from chart cited. Safety. Guard against: source link. |
| Run it as one pipeline | Question intake (EHR sidebar), Chart context fetch (FHIR with consent), Evidence retriever (hybrid search), Reasoning LLM (medical model) and Citation verifier (NLI), with Clinician decision and Feedback and audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle guideline conflict between societies | Present conflicting evidence with sources. |

**Deliberately not doing**

- Model self-reported certainty: unreliable.
- Answer length: none.

**How the approach is proven**

Prove it offline on Citation entailment rate and Expert-graded answer accuracy using time-ordered splits, then online on "Time to answer" with "Clinician adoption and override rate" as the guardrail. Watch for: Benchmarks leak into training data and Grading answers without checking citations.

## Baseline and production design

- **Baseline (build this first):** UpToDate-style search for clinicians.
- **Production design:** Hybrid retrieval over curated medical corpus, chart-aware reasoning LLM with citation verification and abstain-on-weak-evidence policy.

## Why AI, and why this kind

**Why AI.** Answer clinicians' point-of-care questions by retrieving guidelines and patient context with verified citations. The evidence that separates good from bad outcomes (Citation entailment rate, Guideline recency, Patient-context grounding) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "parametric model memory" are what teams reach for first, and they fail because medical facts in memory are outdated or wrong. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Hybrid retrieval over curated medical corpus, chart-aware reasoning LLM with citation verification and abstain-on-weak-evidence policy.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Citation entailment rate, Guideline recency, Patient-context grounding and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: UpToDate-style search for clinicians | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Hybrid retrieval over curated medical corpus, chart-aware reasoning LLM with citation verification and abstain-on-weak-evidence policy | chosen | Meets the 2500 ms envelope at $5.54 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to answer) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Benchmarks leak into training data.
- Evaluation trap: Grading answers without checking citations.
- Guideline conflict between societies: confident single answer.
- Retrieval returns outdated guideline: a superseded guideline is retrieved and the answer recommends outdated care.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
