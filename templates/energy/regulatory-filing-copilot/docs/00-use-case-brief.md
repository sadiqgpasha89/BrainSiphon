# Regulatory Filing Copilot: use-case brief

> Generated from the blueprint `energy/regulatory-filing-copilot` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Regulatory Filing Copilot · **Domain:** energy · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Help regulatory teams assemble rate case and reliability filings by retrieving prior filings, regulator rules and source data, with every number computed by tools and linked to its source. The system has to run interactively, within a few seconds, inside these limits: Every number links to a source record and a calculation, Figures computed by tools not by the model and Human approval before any submission.

**Why it is hard.** The obvious approach is model arithmetic, and it fails because models make unit and arithmetic errors. The second trap is in "Evidence": the real signal is a source link per statement, while teams usually reach for narrative without references.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $23.8K a month. A mistake is expensive in the way regulator follow-up questions measures it.

**What success looks like.** Offline: Figure accuracy against recalculated values, Citation coverage and Consistency check recall. Online: Drafting time, Regulator follow-up questions and Corrections after submission. The launch is judged on "Drafting time" while "Regulator follow-up questions" must not get worse.

## Objective, loss and constraints

**Business objective.** Help regulatory teams assemble rate case and reliability filings by retrieving prior filings, regulator rules and source data, with every number computed by tools and linked to its source.

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

- Every number links to a source record and a calculation
- Figures computed by tools not by the model
- Human approval before any submission
- Version control of drafts
- Drafts for 200 data requests within a week

## The approach in one paragraph

Start with analysts copying from prior filings into new documents with manual checks, because it is the current process. Then earn the move to a drafting copilot with retrieval and calculation tools, consistency checks across filings and an approval workflow for regulatory leads, and only if it beats the baseline on Figure accuracy against recalculated values and Citation coverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Data request match | Which request a passage answers. Routing. Guard against: from the request list. |
| Add Calculation lineage | Whether a figure traces to inputs. Audit readiness. Guard against: from the lineage store. |
| Add Prior filing consistency | Agreement with earlier answers. Consistency. Guard against: from prior filings. |
| Run it as one pipeline | Data request intake (regulatory tracker), Retrieval of prior answers (document index), Calculation tools (governed APIs), Draft answer (LLM with citations), Consistency check (rules and model) and Submission pack (document store), with Lead review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle conflicting prior answers | Flag and request an owner decision. |

**Deliberately not doing**

- Author name: irrelevant.
- Draft length: not quality.
- Template colour: irrelevant.

**How the approach is proven**

Prove it offline on Figure accuracy against recalculated values, Citation coverage and Consistency check recall using time-ordered splits, then online on "Drafting time" with "Regulator follow-up questions" as the guardrail. Watch for: Model-computed figures, Statements with no sources and Inconsistent answers across filings.

## Baseline and production design

- **Baseline (build this first):** Analysts copying from prior filings into new documents with manual checks, because it is the current process.
- **Production design:** A drafting copilot with retrieval and calculation tools, consistency checks across filings and an approval workflow for regulatory leads.

## Why AI, and why this kind

**Why AI.** Help regulatory teams assemble rate case and reliability filings by retrieving prior filings, regulator rules and source data, with every number computed by tools and linked to its source. The evidence that separates good from bad outcomes (Data request match, Calculation lineage, Prior filing consistency) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model arithmetic" are what teams reach for first, and they fail because models make unit and arithmetic errors. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A drafting copilot with retrieval and calculation tools, consistency checks across filings and an approval workflow for regulatory leads.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Data request match, Calculation lineage, Prior filing consistency and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Analysts copying from prior filings into new documents with manual checks, because it is the current process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A drafting copilot with retrieval and calculation tools, consistency checks across filings and an approval workflow for regulatory leads | chosen | Meets the 2500 ms envelope at $5.28 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Drafting time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Model-computed figures.
- Evaluation trap: Statements with no sources.
- Conflicting prior answers: two filings disagree.
- Rule change: a rule is updated.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
