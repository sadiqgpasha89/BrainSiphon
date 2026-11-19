# Model Extraction & Abuse Detection for ML APIs: use-case brief

> Generated from the blueprint `cybersecurity/model-extraction-and-abuse-detection-api` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Model Extraction & Abuse Detection for ML APIs · **Domain:** cybersecurity · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect model-extraction, scraping and membership-inference attempts on prediction APIs from query patterns while preserving customer experience. The system has to run in under 100 milliseconds, inside these limits: Query-pattern analysis in real time, Legitimate bulk users and Low false positives.

**Why it is hard.** The obvious approach is per-request anomaly, and it fails because each extraction query looks like a normal request. The second trap is in "Defence": the real signal is response perturbation and rate shaping, while teams usually reach for hard bans only.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 417 at peak, at an estimated $3.7K a month. A mistake is expensive in the way customer friction measures it.

**What success looks like.** Offline: Detection rate of simulated extraction at fixed FPR and Extraction fidelity under defences. Online: Extraction attempts blocked and Customer friction. The launch is judged on "Extraction attempts blocked" while "Customer friction" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect model-extraction, scraping and membership-inference attempts on prediction APIs from query patterns while preserving customer experience.

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

- Query-pattern analysis in real time
- Legitimate bulk users
- Low false positives
- Privacy

## The approach in one paragraph

Start with rate limits and API-key quotas. Then earn the move to streaming behavioural model on query embeddings with account-graph clustering and adaptive response shaping (rounding, noise), and only if it beats the baseline on Detection rate of simulated extraction at fixed FPR and Extraction fidelity under defences after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Query-space coverage | Diversity and boundary-probing queries. Extraction. Guard against: embeddings. |
| Add Account cluster similarity | Related accounts' query overlap. Distributed attack. Guard against: graph. |
| Add Confidence-score request pattern | Repeated requests for probabilities. Distillation. Guard against: aPI usage. |
| Run it as one pipeline | API gateway (prediction service), Query embedding logger (stream), Behaviour model (GBDT), Account-graph clustering (graph), Response shaper (rounding or noise), Abuse team (human) and Confirmed incidents (labels). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle legitimate research customer runs bulk queries | Customer tiers, contracts and explicit approval. |

**Deliberately not doing**

- Request size: weak.
- Client library version: weak.

**How the approach is proven**

Prove it offline on Detection rate of simulated extraction at fixed FPR and Extraction fidelity under defences using time-ordered splits, then online on "Extraction attempts blocked" with "Customer friction" as the guardrail. Watch for: Simulated extraction attacks too naive and Ignoring distributed attacks.

## Baseline and production design

- **Baseline (build this first):** Rate limits and API-key quotas.
- **Production design:** Streaming behavioural model on query embeddings with account-graph clustering and adaptive response shaping (rounding, noise).

## Why AI, and why this kind

**Why AI.** Detect model-extraction, scraping and membership-inference attempts on prediction APIs from query patterns while preserving customer experience. The evidence that separates good from bad outcomes (Query-space coverage, Account cluster similarity, Confidence-score request pattern) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "per-request anomaly" are what teams reach for first, and they fail because each extraction query looks like a normal request. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Streaming behavioural model on query embeddings with account-graph clustering and adaptive response shaping (rounding, noise).

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Query-space coverage, Account cluster similarity, Confidence-score request pattern and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rate limits and API-key quotas | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Streaming behavioural model on query embeddings with account-graph clustering and adaptive response shaping (rounding, noise) | chosen | Meets the 80 ms envelope at $0.021 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Extraction attempts blocked) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Simulated extraction attacks too naive.
- Evaluation trap: Ignoring distributed attacks.
- Legitimate research customer runs bulk queries: flagged as extraction.
- Attackers spread queries across thousands of accounts: per-account detection fails.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
