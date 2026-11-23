# Sustainability Reporting Copilot: use-case brief

> Generated from the blueprint `manufacturing/sustainability-reporting-copilot` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Sustainability Reporting Copilot · **Domain:** manufacturing · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Help sustainability teams collect, check and draft disclosure content from plant, supplier and finance data, with every figure linked to its source and calculation. The system has to run interactively, within a few seconds, inside these limits: Every number links to a source record and a calculation, Figures computed by tools not by the model and Human approval before any disclosure.

**Why it is hard.** The obvious approach is model arithmetic, and it fails because models make arithmetic and unit errors. The second trap is in "Evidence": the real signal is a source link per statement, while teams usually reach for narrative without references.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 4 at peak, at an estimated $20.5K a month. A mistake is expensive in the way audit findings measures it.

**What success looks like.** Offline: Figure accuracy against recalculated values, Citation coverage and Gap detection recall. Online: Days to produce the report, Audit findings and Manual corrections. The launch is judged on "Days to produce the report" while "Audit findings" must not get worse.

## Objective, loss and constraints

**Business objective.** Help sustainability teams collect, check and draft disclosure content from plant, supplier and finance data, with every figure linked to its source and calculation.

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
- Human approval before any disclosure
- Version control of drafts
- Report draft for 200 sites within a day

## The approach in one paragraph

Start with manual data collection in spreadsheets with email reminders, because it is the standard process. Then earn the move to a copilot with tools for data retrieval and calculation, gap and anomaly checks, drafted narratives with citations and an approval workflow for sustainability leads, and only if it beats the baseline on Figure accuracy against recalculated values and Citation coverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Data completeness by site | Share of required metrics present. Gap finder. Guard against: from the data catalogue. |
| Add Calculation lineage | Whether each figure traces to inputs. Audit readiness. Guard against: from the lineage store. |
| Add Period and boundary match | Whether data fits the reporting scope. Consistency. Guard against: from the config. |
| Run it as one pipeline | Data request and intake (data catalogue), Retrieval and calculation tools (governed APIs), Gap and anomaly checks (rules and model), Draft narrative (LLM with citations) and Disclosure export (report tool), with Lead review and Audit pack off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle missing site data | Mark the gap and show the effect on totals. |

**Deliberately not doing**

- Writing style of site contacts: not evidence.
- Report length: not quality.
- Template colour: irrelevant.

**How the approach is proven**

Prove it offline on Figure accuracy against recalculated values, Citation coverage and Gap detection recall using time-ordered splits, then online on "Days to produce the report" with "Audit findings" as the guardrail. Watch for: Model-computed figures, Statements with no sources and Unclear reporting boundaries.

## Baseline and production design

- **Baseline (build this first):** Manual data collection in spreadsheets with email reminders, because it is the standard process.
- **Production design:** A copilot with tools for data retrieval and calculation, gap and anomaly checks, drafted narratives with citations and an approval workflow for sustainability leads.

## Why AI, and why this kind

**Why AI.** Help sustainability teams collect, check and draft disclosure content from plant, supplier and finance data, with every figure linked to its source and calculation. The evidence that separates good from bad outcomes (Data completeness by site, Calculation lineage, Period and boundary match) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model arithmetic" are what teams reach for first, and they fail because models make arithmetic and unit errors. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A copilot with tools for data retrieval and calculation, gap and anomaly checks, drafted narratives with citations and an approval workflow for sustainability leads.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Data completeness by site, Calculation lineage, Period and boundary match and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual data collection in spreadsheets with email reminders, because it is the standard process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A copilot with tools for data retrieval and calculation, gap and anomaly checks, drafted narratives with citations and an approval workflow for sustainability leads | chosen | Meets the 2500 ms envelope at $11.40 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Days to produce the report) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Model-computed figures.
- Evaluation trap: Statements with no sources.
- Missing site data: a site does not respond.
- Unit mismatch: data arrives in different units.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
