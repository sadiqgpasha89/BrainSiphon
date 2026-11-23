# Recovered Property Matching: use-case brief

> Generated from the blueprint `public-safety/recovered-property-matching` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Recovered Property Matching · **Domain:** public-safety · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Match found and recovered items with stolen property reports using descriptions, serial numbers and photos so owners get their property back sooner. The system has to run as a scheduled batch job, inside these limits: Matches proposed to a property officer, Return only after owner verification and Serial numbers matched exactly where present.

**Why it is hard.** The obvious approach is text descriptions alone, and it fails because descriptions are vague. The second trap is in "Action": the real signal is a match for an officer to verify, while teams usually reach for an automatic release.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.9K a month. A mistake is expensive in the way days to return measures it.

**What success looks like.** Offline: Rank accuracy on confirmed matches, Precision at the officer review size and Time to match. Online: Items returned, Days to return and Wrong releases. The launch is judged on "Items returned" while "Days to return" must not get worse.

## Objective, loss and constraints

**Business objective.** Match found and recovered items with stolen property reports using descriptions, serial numbers and photos so owners get their property back sooner.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{RankLoss}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{RankLoss} | Ranking loss: penalises placing a less relevant item above a more relevant one. |

**Hard constraints**

- Matches proposed to a property officer
- Return only after owner verification
- Serial numbers matched exactly where present
- Photos used only for item matching
- 300K items

## The approach in one paragraph

Start with manual comparison of found property logs with theft reports, because it is the current process. Then earn the move to a matching service with exact serial match, image and text similarity ranking and an officer verification step before any return, and only if it beats the baseline on Rank accuracy on confirmed matches and Precision at the officer review size after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Serial number match | Exact or near match. Strong evidence. Guard against: from records. |
| Add Image similarity | Similarity of item photos. Support. Guard against: from the vision model. |
| Add Description similarity | Text similarity. Support. Guard against: from NLP. |
| Run it as one pipeline | Normalisation (text and image processing), Matching (similarity ranker), Candidate list (property officer tool), Owner verification (workflow), Return and logging (records) and Outcome tracking (monthly), with Report and found item intake off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle common items | Serial and mark requirements. |

**Deliberately not doing**

- Owner name: personal data.
- Reporter name: personal data.
- Report channel: weak link.

**How the approach is proven**

Prove it offline on Rank accuracy on confirmed matches, Precision at the officer review size and Time to match using time-ordered splits, then online on "Items returned" with "Days to return" as the guardrail. Watch for: Automatic release, Description-only matching and Owner profiling.

## Baseline and production design

- **Baseline (build this first):** Manual comparison of found property logs with theft reports, because it is the current process.
- **Production design:** A matching service with exact serial match, image and text similarity ranking and an officer verification step before any return.

## Why AI, and why this kind

**Why AI.** Match found and recovered items with stolen property reports using descriptions, serial numbers and photos so owners get their property back sooner. The evidence that separates good from bad outcomes (Serial number match, Image similarity, Description similarity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "text descriptions alone" are what teams reach for first, and they fail because descriptions are vague. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A matching service with exact serial match, image and text similarity ranking and an officer verification step before any return.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Serial number match, Image similarity, Description similarity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual comparison of found property logs with theft reports, because it is the current process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A matching service with exact serial match, image and text similarity ranking and an officer verification step before any return | chosen | Meets the run-window envelope at $0.107 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Items returned) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Automatic release.
- Evaluation trap: Description-only matching.
- Common items: many phones look the same.
- Poor photos: images cannot be compared.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
