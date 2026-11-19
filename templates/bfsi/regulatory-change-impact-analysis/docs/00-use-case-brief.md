# Regulatory Change Impact Analysis: use-case brief

> Generated from the blueprint `bfsi/regulatory-change-impact-analysis` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Regulatory Change Impact Analysis · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Read new regulations and consultations, map them to the bank's policies, processes and systems, and draft an impact assessment for compliance owners. The system has to run interactively, within a few seconds, inside these limits: Every mapped obligation cites the regulatory paragraph, Compliance owner approves the mapping and Regulator documents only from official sources.

**Why it is hard.** The obvious approach is summaries of the whole document, and it fails because summaries lose the 'must by date' that drives work. The second trap is in "Mapping": the real signal is obligations linked to existing controls and policies, while teams usually reach for keyword overlap.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $431.2K a month. A mistake is expensive in the way missed obligations at audit measures it.

**What success looks like.** Offline: Obligation precision and recall and Citation validity. Online: Time from publication to impact assessment and Missed obligations at audit. The launch is judged on "Time from publication to impact assessment" while "Missed obligations at audit" must not get worse.

## Objective, loss and constraints

**Business objective.** Read new regulations and consultations, map them to the bank's policies, processes and systems, and draft an impact assessment for compliance owners.

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

- Every mapped obligation cites the regulatory paragraph
- Compliance owner approves the mapping
- Regulator documents only from official sources
- Audit log of drafts and decisions

## The approach in one paragraph

Start with compliance team reads and maps changes manually using spreadsheets, because it is the current process. Then earn the move to an agent with retrieval over regulator sites and the policy library, structured obligation extraction, mapping to controls with citations and a review queue for compliance owners, and only if it beats the baseline on Obligation precision and recall and Citation validity after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Obligation extraction precision | Share of extracted obligations accepted by the owner. Core quality. Guard against: needs a labelled test set. |
| Add Policy mapping recall | Share of true links found. Missed links are risks. Guard against: gold links are costly to build. |
| Add Effective date correctness | Extracted date versus the official date. Drives plans. Guard against: phased dates are common. |
| Run it as one pipeline | Regulatory feed (official publication monitors), Document parser (layout-aware parser), Obligation extractor (LLM with schema), Policy mapper (hybrid retrieval), Impact drafter (LLM with citations) and Obligation register (GRC database), with Owner review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle ambiguous drafting | Present both readings and escalate to legal. |

**Deliberately not doing**

- Document length: style.
- Law firm commentary: useful but not authoritative.
- Headline tone: irrelevant.

**How the approach is proven**

Prove it offline on Obligation precision and recall and Citation validity using time-ordered splits, then online on "Time from publication to impact assessment" with "Missed obligations at audit" as the guardrail. Watch for: Evaluation on documents seen in prompts and Gold links biased to common policies.

## Baseline and production design

- **Baseline (build this first):** Compliance team reads and maps changes manually using spreadsheets, because it is the current process.
- **Production design:** An agent with retrieval over regulator sites and the policy library, structured obligation extraction, mapping to controls with citations and a review queue for compliance owners.

## Why AI, and why this kind

**Why AI.** Read new regulations and consultations, map them to the bank's policies, processes and systems, and draft an impact assessment for compliance owners. The evidence that separates good from bad outcomes (Obligation extraction precision, Policy mapping recall, Effective date correctness) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "summaries of the whole document" are what teams reach for first, and they fail because summaries lose the 'must by date' that drives work. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: An agent with retrieval over regulator sites and the policy library, structured obligation extraction, mapping to controls with citations and a review queue for compliance owners.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Obligation extraction precision, Policy mapping recall, Effective date correctness and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Compliance team reads and maps changes manually using spreadsheets, because it is the current process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| An agent with retrieval over regulator sites and the policy library, structured obligation extraction, mapping to controls with citations and a review queue for compliance owners | chosen | Meets the 2500 ms envelope at $23.96 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time from publication to impact assessment) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluation on documents seen in prompts.
- Evaluation trap: Gold links biased to common policies.
- Ambiguous drafting: the rule can be read two ways.
- Cross-border overlap: a change affects a firm under two regimes that give conflicting requirements.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
