# Materials Selection Assistant: use-case brief

> Generated from the blueprint `engineering/materials-selection-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Materials Selection Assistant · **Domain:** engineering · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Recommend candidate materials from requirements such as strength, temperature, corrosion, cost and supply, with data sources, for engineers to validate before use. The system has to run interactively, within a few seconds, inside these limits: Each material cites its data source, Safety-critical selections need test data and Engineers decide.

**Why it is hard.** The obvious approach is web snippets, and it fails because unverified data can be wrong. The second trap is in "Constraint": the real signal is requirements and regulations together, while teams usually reach for properties alone.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $12.2K a month. A mistake is expensive in the way late material changes measures it.

**What success looks like.** Offline: Property retrieval accuracy, Regulatory flag recall and Shortlist relevance. Online: Time to shortlist, Late material changes and Test failures. The launch is judged on "Time to shortlist" while "Late material changes" must not get worse.

## Objective, loss and constraints

**Business objective.** Recommend candidate materials from requirements such as strength, temperature, corrosion, cost and supply, with data sources, for engineers to validate before use.

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

- Each material cites its data source
- Safety-critical selections need test data
- Engineers decide
- Supply and restricted substance checks included
- 50K materials

## The approach in one paragraph

Start with handbook look-ups and supplier advice, because they are the common approach. Then earn the move to a retrieval and ranking assistant over verified material data with regulation and supply filters that outputs a cited shortlist and the tests still needed, and only if it beats the baseline on Property retrieval accuracy and Regulatory flag recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Required property ranges | Strength, temperature and corrosion needs. Core. Guard against: from requirements. |
| Add Material property data | Measured properties. Core. Guard against: from the materials database. |
| Add Regulatory flags | Restricted substances. Constraint. Guard against: from compliance data. |
| Run it as one pipeline | Requirement capture (form), Property filter (materials database), Regulatory and supply filter (rules), Ranking (scoring model), Cited shortlist (LLM with sources), Engineer validation (testing) and Selection record (document system). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle conflicting data | Show both and flag. |

**Deliberately not doing**

- Designer name: personal data.
- Supplier brand: weak link.
- Datasheet layout: an artefact.

**How the approach is proven**

Prove it offline on Property retrieval accuracy, Regulatory flag recall and Shortlist relevance using time-ordered splits, then online on "Time to shortlist" with "Late material changes" as the guardrail. Watch for: Unverified web data, Properties without regulation and Final choice by the model.

## Baseline and production design

- **Baseline (build this first):** Handbook look-ups and supplier advice, because they are the common approach.
- **Production design:** A retrieval and ranking assistant over verified material data with regulation and supply filters that outputs a cited shortlist and the tests still needed.

## Why AI, and why this kind

**Why AI.** Recommend candidate materials from requirements such as strength, temperature, corrosion, cost and supply, with data sources, for engineers to validate before use. The evidence that separates good from bad outcomes (Required property ranges, Material property data, Regulatory flags) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "web snippets" are what teams reach for first, and they fail because unverified data can be wrong. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A retrieval and ranking assistant over verified material data with regulation and supply filters that outputs a cited shortlist and the tests still needed.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Required property ranges, Material property data, Regulatory flags and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Handbook look-ups and supplier advice, because they are the common approach | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A retrieval and ranking assistant over verified material data with regulation and supply filters that outputs a cited shortlist and the tests still needed | chosen | Meets the 2500 ms envelope at $0.680 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to shortlist) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Unverified web data.
- Evaluation trap: Properties without regulation.
- Conflicting data: two sources give different values.
- Novel material: little data exists.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
