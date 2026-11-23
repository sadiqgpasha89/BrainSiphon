# Storage Tiering Optimisation: use-case brief

> Generated from the blueprint `it-ops/storage-tiering-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Storage Tiering Optimisation · **Domain:** it-ops · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict data access patterns and move cold data to cheaper tiers with policy rules, keeping retrieval times and retention obligations intact. The system has to run as a scheduled batch job, inside these limits: Retention and legal hold rules always win, Retrieval time targets met and Owners approve tiering policies.

**Why it is hard.** The obvious approach is object age, and it fails because old data can be hot. The second trap is in "Safety": the real signal is legal hold and retention checks, while teams usually reach for cost only.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.7K a month. A mistake is expensive in the way retrieval delays measures it.

**What success looks like.** Offline: Prediction of future access, Retention rule compliance and Cost saved in replay. Online: Storage cost, Retrieval delays and Rule violations. The launch is judged on "Storage cost" while "Retrieval delays" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict data access patterns and move cold data to cheaper tiers with policy rules, keeping retrieval times and retention obligations intact.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Retention and legal hold rules always win
- Retrieval time targets met
- Owners approve tiering policies
- Moves logged
- 50 PB under management

## The approach in one paragraph

Start with age-based lifecycle rules, because they are the standard feature. Then earn the move to an access prediction model feeding lifecycle policies with retention checks, fee-aware moves and owner approval for new rules, and only if it beats the baseline on Prediction of future access and Retention rule compliance after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Access recency and frequency | Last access and counts. Core. Guard against: from storage logs. |
| Add Object type and size | File class. Context. Guard against: from metadata. |
| Add Retention class | Policy and hold state. Constraint. Guard against: from the data catalogue. |
| Run it as one pipeline | Access log ingestion (storage logs), Feature build (batch), Access model (gradient boosting), Retention check (catalogue rules), Lifecycle rule proposal (policy), Owner approval (workflow) and Savings and retrieval tracking (monthly). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle seasonal data | Seasonal features. |

**Deliberately not doing**

- Object name: weak link.
- Bucket name: an identifier.
- Owner name: personal data.

**How the approach is proven**

Prove it offline on Prediction of future access, Retention rule compliance and Cost saved in replay using time-ordered splits, then online on "Storage cost" with "Retrieval delays" as the guardrail. Watch for: Age-only rules, Ignoring retrieval fees and No hold checks.

## Baseline and production design

- **Baseline (build this first):** Age-based lifecycle rules, because they are the standard feature.
- **Production design:** An access prediction model feeding lifecycle policies with retention checks, fee-aware moves and owner approval for new rules.

## Why AI, and why this kind

**Why AI.** Predict data access patterns and move cold data to cheaper tiers with policy rules, keeping retrieval times and retention obligations intact. The evidence that separates good from bad outcomes (Access recency and frequency, Object type and size, Retention class) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "object age" are what teams reach for first, and they fail because old data can be hot. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: An access prediction model feeding lifecycle policies with retention checks, fee-aware moves and owner approval for new rules.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Access recency and frequency, Object type and size, Retention class and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Age-based lifecycle rules, because they are the standard feature | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| An access prediction model feeding lifecycle policies with retention checks, fee-aware moves and owner approval for new rules | chosen | Meets the run-window envelope at $0.019 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Storage cost) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Age-only rules.
- Evaluation trap: Ignoring retrieval fees.
- Seasonal data: data is used once a year.
- Compliance hold: data is under legal hold.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
