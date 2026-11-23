# Policy Microsimulation Assistant: use-case brief

> Generated from the blueprint `public-sector/policy-microsimulation-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Policy Microsimulation Assistant · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Run microsimulation of tax and benefit changes on synthetic or aggregated populations and explain who gains and loses, with the assumptions and uncertainty shown. The system has to run as a scheduled batch job, inside these limits: Models run on synthetic or aggregated populations, Assumptions listed with every result and Results reproducible from a versioned model.

**Why it is hard.** The obvious approach is a single average, and it fails because averages hide who gains and loses. The second trap is in "Trust": the real signal is reproducible runs with versioned assumptions, while teams usually reach for a black box.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $2.0K a month. A mistake is expensive in the way policy surprises after launch measures it.

**What success looks like.** Offline: Reproduction of known policy costs, Distributional accuracy against admin data and Explanation faithfulness. Online: Analysis turnaround, Policy surprises after launch and Corrections to published figures. The launch is judged on "Analysis turnaround" while "Policy surprises after launch" must not get worse.

## Objective, loss and constraints

**Business objective.** Run microsimulation of tax and benefit changes on synthetic or aggregated populations and explain who gains and loses, with the assumptions and uncertainty shown.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Models run on synthetic or aggregated populations
- Assumptions listed with every result
- Results reproducible from a versioned model
- Analysts review before publication
- Simulation within 10 minutes

## The approach in one paragraph

Start with spreadsheet models of a few typical households, because they are the quick estimates. Then earn the move to a versioned microsimulation with scenario ranges and an assistant that explains the results in plain language with the assumptions and a distribution view by group, and only if it beats the baseline on Reproduction of known policy costs and Distributional accuracy against admin data after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Policy parameter change | Thresholds, rates and rules changed. Scenario. Guard against: from the policy team. |
| Add Population weights | Survey weights to the population. Representativeness. Guard against: from statistics. |
| Add Behavioural response assumptions | Elasticities used. Uncertainty. Guard against: from literature and ranges. |
| Run it as one pipeline | Scenario definition (policy workspace), Population data load (synthetic or aggregated data), Rules engine (microsimulation model), Uncertainty ranges (Monte Carlo), Explanation draft (LLM with run metadata) and Publication (policy brief), with Analyst review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle rule complexity | Test cases from legal text. |

**Deliberately not doing**

- Analyst name: irrelevant.
- Run label: an artefact.
- Chart style: an artefact.

**How the approach is proven**

Prove it offline on Reproduction of known policy costs, Distributional accuracy against admin data and Explanation faithfulness using time-ordered splits, then online on "Analysis turnaround" with "Policy surprises after launch" as the guardrail. Watch for: Typical-household averages, Unversioned assumptions and Behavioural certainty.

## Baseline and production design

- **Baseline (build this first):** Spreadsheet models of a few typical households, because they are the quick estimates.
- **Production design:** A versioned microsimulation with scenario ranges and an assistant that explains the results in plain language with the assumptions and a distribution view by group.

## Why AI, and why this kind

**Why AI.** Run microsimulation of tax and benefit changes on synthetic or aggregated populations and explain who gains and loses, with the assumptions and uncertainty shown. The evidence that separates good from bad outcomes (Policy parameter change, Population weights, Behavioural response assumptions) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A single average" are what teams reach for first, and they fail because averages hide who gains and loses. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: A versioned microsimulation with scenario ranges and an assistant that explains the results in plain language with the assumptions and a distribution view by group.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Policy parameter change, Population weights, Behavioural response assumptions and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Spreadsheet models of a few typical households, because they are the quick estimates | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A versioned microsimulation with scenario ranges and an assistant that explains the results in plain language with the assumptions and a distribution view by group | chosen | Meets the run-window envelope at $0.223 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Analysis turnaround) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Typical-household averages.
- Evaluation trap: Unversioned assumptions.
- Rule complexity: interactions between rules are missed.
- Data age: survey data is old.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
