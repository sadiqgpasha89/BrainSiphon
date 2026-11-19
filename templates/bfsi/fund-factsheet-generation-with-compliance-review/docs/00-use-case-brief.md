# Fund Factsheet Generation with Compliance Review: use-case brief

> Generated from the blueprint `bfsi/fund-factsheet-generation-with-compliance-review` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Fund Factsheet Generation with Compliance Review · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Generate monthly fund factsheet commentary from portfolio data and manager notes, checked by a compliance verifier before review. The system has to run interactively, within a few seconds, inside these limits: Figures come from the performance system, Forbidden phrases and forward-looking claims blocked and Compliance signs every factsheet.

**Why it is hard.** The obvious approach is figures typed by the model, and it fails because wrong performance numbers are a regulatory event. The second trap is in "Language": the real signal is approved disclosures and balanced wording, while teams usually reach for promotional language.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $131.1K a month. A mistake is expensive in the way compliance rework measures it.

**What success looks like.** Offline: Figure exact match and Banned phrase recall. Online: Time to publish and Compliance rework. The launch is judged on "Time to publish" while "Compliance rework" must not get worse.

## Objective, loss and constraints

**Business objective.** Generate monthly fund factsheet commentary from portfolio data and manager notes, checked by a compliance verifier before review.

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

- Figures come from the performance system
- Forbidden phrases and forward-looking claims blocked
- Compliance signs every factsheet
- Version history kept

## The approach in one paragraph

Start with template with manager-written commentary, because it is the current process. Then earn the move to structured draft generation from data and notes, number and phrase verifiers, a disclosure checker and a compliance queue, and only if it beats the baseline on Figure exact match and Banned phrase recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Figure match | Share of numbers equal to the source. Accuracy. Guard against: rounding rules. |
| Add Banned phrase rate | Rate of phrases from the blacklist. Compliance. Guard against: list maintenance. |
| Add Edit distance | Changes by compliance. Usefulness. Guard against: style edits. |
| Run it as one pipeline | Performance data (attribution system), Manager notes (document store), Commentary drafter (LLM with schema), Number verifier (rule checks), Phrase and disclosure checker (rules plus classifier) and Publish (document system), with Compliance review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle late restatement | Lock the data version at drafting and re-check every figure before release. |

**Deliberately not doing**

- Draft length: style.
- Manager mood: irrelevant.
- Font choice: cosmetic.

**How the approach is proven**

Prove it offline on Figure exact match and Banned phrase recall using time-ordered splits, then online on "Time to publish" with "Compliance rework" as the guardrail. Watch for: Test notes are cleaner than real ones and Rules change between test and live.

## Baseline and production design

- **Baseline (build this first):** Template with manager-written commentary, because it is the current process.
- **Production design:** Structured draft generation from data and notes, number and phrase verifiers, a disclosure checker and a compliance queue.

## Why AI, and why this kind

**Why AI.** Generate monthly fund factsheet commentary from portfolio data and manager notes, checked by a compliance verifier before review. The evidence that separates good from bad outcomes (Figure match, Banned phrase rate, Edit distance) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "figures typed by the model" are what teams reach for first, and they fail because wrong performance numbers are a regulatory event. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Structured draft generation from data and notes, number and phrase verifiers, a disclosure checker and a compliance queue.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Figure match, Banned phrase rate, Edit distance and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Template with manager-written commentary, because it is the current process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Structured draft generation from data and notes, number and phrase verifiers, a disclosure checker and a compliance queue | chosen | Meets the 2500 ms envelope at $14.57 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to publish) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Test notes are cleaner than real ones.
- Evaluation trap: Rules change between test and live.
- Late restatement: performance figures change after the draft is written and the factsheet is wrong.
- New regulation: wording rules change and an approved template becomes non-compliant.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
