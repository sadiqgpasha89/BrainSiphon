# Error Grouping and Log Clustering: use-case brief

> Generated from the blueprint `devtools/error-grouping-log-clustering` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Error Grouping and Log Clustering · **Domain:** devtools · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Group production errors and log lines into issues by cause so engineers see a few ranked problems instead of millions of events. The system has to run interactively, within a few seconds, inside these limits: Grouping within 10 s of arrival, Group stability across releases and Personal data removed from messages.

**Why it is hard.** The obvious approach is same message text, and it fails because messages contain IDs and vary. The second trap is in "Stability": the real signal is groups persist across releases, while teams usually reach for regrouping every time.

**Scale and stakes.** At 10 million users this is about 30.0M model-touching events a day, 347 requests per second on average and 2.1K at peak, at an estimated $19.5K a month. A mistake is expensive in the way time to find a regression measures it.

**What success looks like.** Offline: Grouping purity, Group stability and Impact ranking accuracy. Online: Distinct issues to review, Time to find a regression and Alert noise. The launch is judged on "Distinct issues to review" while "Time to find a regression" must not get worse.

## Objective, loss and constraints

**Business objective.** Group production errors and log lines into issues by cause so engineers see a few ranked problems instead of millions of events.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{GraphReg}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{GraphReg} | Graph regulariser: a penalty that pushes connected nodes to have similar representations. |

**Hard constraints**

- Grouping within 10 s of arrival
- Group stability across releases
- Personal data removed from messages
- Rank by user impact
- 5B events per day

## The approach in one paragraph

Start with group by exact message and top stack frame, because it is the standard behaviour. Then earn the move to a grouping service using normalised traces, learned message templates and embeddings with release-aware regression flags and impact ranking, and only if it beats the baseline on Grouping purity and Group stability after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Normalised stack trace | Frames without variable parts. Core. Guard against: from parsing. |
| Add Message template | Message with variables masked. Grouping. Guard against: from parsing. |
| Add Release and deployment markers | Version and time. Regression. Guard against: from CD. |
| Run it as one pipeline | Event ingestion (logging and error SDKs), Masking and normalisation (parsers), Grouping (clustering), Group assignment (index), Impact ranking (analytics), Issue creation (tracker) and Regression flag (release data). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle renamed functions | Fuzzy frame matching. |

**Deliberately not doing**

- User identifier: personal data.
- Event id: an identifier.
- Host name: weak link.

**How the approach is proven**

Prove it offline on Grouping purity, Group stability and Impact ranking accuracy using time-ordered splits, then online on "Distinct issues to review" with "Time to find a regression" as the guardrail. Watch for: Exact message grouping, Event counts as rank and Unmasked personal data.

## Baseline and production design

- **Baseline (build this first):** Group by exact message and top stack frame, because it is the standard behaviour.
- **Production design:** A grouping service using normalised traces, learned message templates and embeddings with release-aware regression flags and impact ranking.

## Why AI, and why this kind

**Why AI.** Group production errors and log lines into issues by cause so engineers see a few ranked problems instead of millions of events. The evidence that separates good from bad outcomes (Normalised stack trace, Message template, Release and deployment markers) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "same message text" are what teams reach for first, and they fail because messages contain IDs and vary. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A grouping service using normalised traces, learned message templates and embeddings with release-aware regression flags and impact ranking.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Normalised stack trace, Message template, Release and deployment markers and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Group by exact message and top stack frame, because it is the standard behaviour | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A grouping service using normalised traces, learned message templates and embeddings with release-aware regression flags and impact ranking | chosen | Meets the 2500 ms envelope at $0.022 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Distinct issues to review) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Exact message grouping.
- Evaluation trap: Event counts as rank.
- Renamed functions: traces change after refactors.
- Very noisy errors: one error floods.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
