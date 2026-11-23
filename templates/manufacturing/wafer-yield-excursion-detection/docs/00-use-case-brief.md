# Wafer Yield Excursion Detection: use-case brief

> Generated from the blueprint `manufacturing/wafer-yield-excursion-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Wafer Yield Excursion Detection · **Domain:** manufacturing · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect and attribute yield excursions in semiconductor or electronics fabs to a tool, step or lot from inline metrology and fault data, so engineers contain them within hours. The system has to run as a scheduled batch job, inside these limits: Excursion detection within 4 hours of metrology, Tool and step attribution with evidence and Analysts confirm before tool hold.

**Why it is hard.** The obvious approach is correlation with a single metric, and it fails because many steps co-vary and mislead. The second trap is in "Metrology": the real signal is inline and test data tied to the wafer path, while teams usually reach for lot averages.

**Scale and stakes.** At 10 million users this is about 9.0M model-touching events a day, 104 requests per second on average and 104 at peak, at an estimated $6.2K a month. A mistake is expensive in the way time to containment measures it.

**What success looks like.** Offline: Attribution accuracy on past excursions, Detection delay and False hold rate. Online: Wafers affected per excursion, Time to containment and Yield loss. The launch is judged on "Wafers affected per excursion" while "Time to containment" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect and attribute yield excursions in semiconductor or electronics fabs to a tool, step or lot from inline metrology and fault data, so engineers contain them within hours.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ECE} | Expected calibration error: the average gap between predicted probability and observed frequency across probability bins. |

**Hard constraints**

- Excursion detection within 4 hours of metrology
- Tool and step attribution with evidence
- Analysts confirm before tool hold
- Handles 100M data points per day

## The approach in one paragraph

Start with manual commonality analysis by yield engineers with a spreadsheet, because it is the standard practice. Then earn the move to automated commonality and a gradient boosting model on path and metrology features with ranked tools and steps, confidence and evidence charts for the yield engineer, and only if it beats the baseline on Attribution accuracy on past excursions and Detection delay after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Tool commonality score | Share of bad wafers sharing a tool or chamber against the base rate. Primary attribution. Guard against: needs the wafer path. |
| Add Metrology deviation | Deviation of inline measurements from target. Early indicator. Guard against: per step. |
| Add Fault detection summary | FDC alarm counts on the path. Process signals. Guard against: per tool. |
| Run it as one pipeline | Wafer path and metrology ingestion (MES and metrology), Path join (lakehouse), Excursion detector (statistical tests), Attribution model (gradient boosting), Ranked tool and step list (analyst console), Hold decision (engineer) and Outcome tracking (yield system). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle several tools involved | Pairwise commonality and a human review. |

**Deliberately not doing**

- Lot name: an identifier.
- Operator name: not a driver.
- Wafer slot number alone: weak link.

**How the approach is proven**

Prove it offline on Attribution accuracy on past excursions, Detection delay and False hold rate using time-ordered splits, then online on "Wafers affected per excursion" with "Time to containment" as the guardrail. Watch for: Lot-level averages, Single metric correlation and Alarms without a tool and step.

## Baseline and production design

- **Baseline (build this first):** Manual commonality analysis by yield engineers with a spreadsheet, because it is the standard practice.
- **Production design:** Automated commonality and a gradient boosting model on path and metrology features with ranked tools and steps, confidence and evidence charts for the yield engineer.

## Why AI, and why this kind

**Why AI.** Detect and attribute yield excursions in semiconductor or electronics fabs to a tool, step or lot from inline metrology and fault data, so engineers contain them within hours. The evidence that separates good from bad outcomes (Tool commonality score, Metrology deviation, Fault detection summary) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "correlation with a single metric" are what teams reach for first, and they fail because many steps co-vary and mislead. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Automated commonality and a gradient boosting model on path and metrology features with ranked tools and steps, confidence and evidence charts for the yield engineer.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Tool commonality score, Metrology deviation, Fault detection summary and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual commonality analysis by yield engineers with a spreadsheet, because it is the standard practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Automated commonality and a gradient boosting model on path and metrology features with ranked tools and steps, confidence and evidence charts for the yield engineer | chosen | Meets the run-window envelope at $0.023 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Wafers affected per excursion) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Lot-level averages.
- Evaluation trap: Single metric correlation.
- Several tools involved: interaction effects.
- Metrology delay: data arrives late.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
