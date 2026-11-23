# Decision Explanation and Appeal Assistant: use-case brief

> Generated from the blueprint `public-sector/decision-explanation-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Decision Explanation and Appeal Assistant · **Domain:** public-sector · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Help caseworkers write clear decision letters from the recorded reasons and legal basis and tell people how to appeal, without changing the decision or adding reasons. The system has to run interactively, within a few seconds, inside these limits: Letters use only the recorded reasons and the legal basis, The assistant cannot change a decision and Appeal route and deadlines included from templates.

**Why it is hard.** The obvious approach is model reasoning, and it fails because invented reasons make decisions unlawful. The second trap is in "Right": the real signal is a clear reason and appeal route, while teams usually reach for a short outcome.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $45.8K a month. A mistake is expensive in the way appeals caused by unclear letters measures it.

**What success looks like.** Offline: Faithfulness to recorded reasons, Appeal section accuracy and Reading level targets. Online: Letter drafting time, Appeals caused by unclear letters and Complaints. The launch is judged on "Letter drafting time" while "Appeals caused by unclear letters" must not get worse.

## Objective, loss and constraints

**Business objective.** Help caseworkers write clear decision letters from the recorded reasons and legal basis and tell people how to appeal, without changing the decision or adding reasons.

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

- Letters use only the recorded reasons and the legal basis
- The assistant cannot change a decision
- Appeal route and deadlines included from templates
- Caseworker signs every letter
- Plain language and 12 translation options

## The approach in one paragraph

Start with letter templates filled by hand by caseworkers, because it is the current process. Then earn the move to a drafting assistant constrained to recorded reasons with template-based appeal sections, plain language checks, translation and a signature step, and only if it beats the baseline on Faithfulness to recorded reasons and Appeal section accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Decision record fields | Outcome, reasons and facts relied on. Content. Guard against: from the case system. |
| Add Legal basis | Statute and policy sections. Citation. Guard against: from the rule base. |
| Add Appeal deadline and route | Statutory deadlines. Required content. Guard against: from templates. |
| Run it as one pipeline | Decision record retrieval (case system), Template selection (rules), Letter draft (LLM with constraints), Reason and citation check (rules), Plain language check (metrics), Caseworker approval and signature (case system) and Outcome and appeal tracking (quarterly). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle missing reasons | Stop and ask the caseworker. |

**Deliberately not doing**

- Applicant name: irrelevant for the model.
- Letter length: weak link.
- Template colour: irrelevant.

**How the approach is proven**

Prove it offline on Faithfulness to recorded reasons, Appeal section accuracy and Reading level targets using time-ordered splits, then online on "Letter drafting time" with "Appeals caused by unclear letters" as the guardrail. Watch for: Invented reasons, Missing appeal route and Unsigned letters.

## Baseline and production design

- **Baseline (build this first):** Letter templates filled by hand by caseworkers, because it is the current process.
- **Production design:** A drafting assistant constrained to recorded reasons with template-based appeal sections, plain language checks, translation and a signature step.

## Why AI, and why this kind

**Why AI.** Help caseworkers write clear decision letters from the recorded reasons and legal basis and tell people how to appeal, without changing the decision or adding reasons. The evidence that separates good from bad outcomes (Decision record fields, Legal basis, Appeal deadline and route) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model reasoning" are what teams reach for first, and they fail because invented reasons make decisions unlawful. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: A drafting assistant constrained to recorded reasons with template-based appeal sections, plain language checks, translation and a signature step.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Decision record fields, Legal basis, Appeal deadline and route and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Letter templates filled by hand by caseworkers, because it is the current process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A drafting assistant constrained to recorded reasons with template-based appeal sections, plain language checks, translation and a signature step | chosen | Meets the 2500 ms envelope at $5.09 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Letter drafting time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Invented reasons.
- Evaluation trap: Missing appeal route.
- Missing reasons: the record lacks a reason.
- Rule update: the statute changes.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
