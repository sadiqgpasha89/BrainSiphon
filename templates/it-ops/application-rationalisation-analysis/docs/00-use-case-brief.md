# Application Rationalisation Analysis: use-case brief

> Generated from the blueprint `it-ops/application-rationalisation-analysis` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Application Rationalisation Analysis · **Domain:** it-ops · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Group applications by function, use, cost and technical health and recommend retire, consolidate or invest options with the evidence, for business and IT owners to decide. The system has to run as a scheduled batch job, inside these limits: Owners decide every retirement, Each recommendation shows use, cost and dependencies and Data protection and retention checked.

**Why it is hard.** The obvious approach is application age, and it fails because old applications can be critical. The second trap is in "Scope": the real signal is function-based clusters, while teams usually reach for name matching.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.9K a month. A mistake is expensive in the way run cost measures it.

**What success looks like.** Offline: Cluster quality, Savings estimate error and Owner agreement. Online: Application count, Run cost and Security exposure from unsupported applications. The launch is judged on "Application count" while "Run cost" must not get worse.

## Objective, loss and constraints

**Business objective.** Group applications by function, use, cost and technical health and recommend retire, consolidate or invest options with the evidence, for business and IT owners to decide.

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

- Owners decide every retirement
- Each recommendation shows use, cost and dependencies
- Data protection and retention checked
- Quarterly analysis of 5,000 applications
- No retirement without a migration plan

## The approach in one paragraph

Start with annual portfolio reviews by enterprise architects, because they are the usual practice. Then earn the move to an analytics pipeline that clusters applications by function, scores overlap, cost and health and presents consolidation options with evidence to owners, and only if it beats the baseline on Cluster quality and Savings estimate error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Usage trend | Active users and transactions. Core. Guard against: from usage data. |
| Add Total cost | Licence, hosting and support. Core. Guard against: from finance. |
| Add Functional similarity | Descriptions and features compared. Overlap. Guard against: from text models. |
| Run it as one pipeline | Inventory and usage (CMDB and tools), Cost join (finance), Functional clustering (embeddings), Option scoring (rules), Migration plan (project tool) and Savings tracking (quarterly), with Owner review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle shadow IT | Discovery from network and expense data. |

**Deliberately not doing**

- Application owner name: personal data.
- Vendor brand: weak link.
- Application age alone: weak link.

**How the approach is proven**

Prove it offline on Cluster quality, Savings estimate error and Owner agreement using time-ordered splits, then online on "Application count" with "Run cost" as the guardrail. Watch for: Age as the criterion, Name matching and Model-made retirement decisions.

## Baseline and production design

- **Baseline (build this first):** Annual portfolio reviews by enterprise architects, because they are the usual practice.
- **Production design:** An analytics pipeline that clusters applications by function, scores overlap, cost and health and presents consolidation options with evidence to owners.

## Why AI, and why this kind

**Why AI.** Group applications by function, use, cost and technical health and recommend retire, consolidate or invest options with the evidence, for business and IT owners to decide. The evidence that separates good from bad outcomes (Usage trend, Total cost, Functional similarity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "application age" are what teams reach for first, and they fail because old applications can be critical. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: An analytics pipeline that clusters applications by function, scores overlap, cost and health and presents consolidation options with evidence to owners.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Usage trend, Total cost, Functional similarity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Annual portfolio reviews by enterprise architects, because they are the usual practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| An analytics pipeline that clusters applications by function, scores overlap, cost and health and presents consolidation options with evidence to owners | chosen | Meets the run-window envelope at $0.043 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Application count) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Age as the criterion.
- Evaluation trap: Name matching.
- Shadow IT: unregistered applications exist.
- Hidden dependency: a legacy app feeds another.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
