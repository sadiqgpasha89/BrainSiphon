# Fake Review & Review-Manipulation Detection: use-case brief

> Generated from the blueprint `retail/fake-review-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Fake Review & Review-Manipulation Detection · **Domain:** retail · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect fake, incentivised and coordinated reviews that distort ratings, protecting buyers and honest sellers. The system has to run as a scheduled batch job, inside these limits: Fast takedown within 24 hours, Fair treatment of genuine reviewers and Legal evidence trail.

**Why it is hard.** The obvious approach is review text sentiment, and it fails because fake reviews are fluent and positive by design. The second trap is in "Labels": the real signal is mix of platform takedowns and manual audits with noise modelling, while teams usually reach for treating takedowns as ground truth.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 10 at peak, at an estimated $1.9K a month. A mistake is expensive in the way seller appeal overturn rate measures it.

**What success looks like.** Offline: Precision at moderator capacity and Ring recall. Online: Fake review prevalence from audits and Seller appeal overturn rate. The launch is judged on "Fake review prevalence from audits" while "Seller appeal overturn rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect fake, incentivised and coordinated reviews that distort ratings, protecting buyers and honest sellers.

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

- Fast takedown within 24 hours
- Fair treatment of genuine reviewers
- Legal evidence trail
- Adversarial adaptation

## The approach in one paragraph

Start with rule-based filters on burst and duplicate text. Then earn the move to heterogeneous graph model plus text-style classifier and temporal burst detector, with ring-level reviewing and adversarial retraining, and only if it beats the baseline on Precision at moderator capacity and Ring recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Review burst score | Z-score of review volume for the product vs baseline. Campaign marker. Guard against: product-specific baseline. |
| Add Reviewer co-review overlap | Jaccard overlap of reviewed products between reviewers. Ring signal. Guard against: exclude popular products. |
| Add Verified-purchase gap | Share of reviews without matched orders. Authenticity. Guard against: order match timestamp. |
| Run it as one pipeline | Text features (transformer embeddings), Graph builder (reviewer-product graph), Fraud scorer (GNN plus GBDT), Takedown policy (thresholds) and Appeals and labels (feedback), with Review stream and Trust and safety review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle genuine product launch with real review surge | Verified-purchase conditioning. |

**Deliberately not doing**

- Review length: varies with genuine style.
- Star rating alone: whole rating distribution matters not a single star.

**How the approach is proven**

Prove it offline on Precision at moderator capacity and Ring recall using time-ordered splits, then online on "Fake review prevalence from audits" with "Seller appeal overturn rate" as the guardrail. Watch for: Known fake rings are easiest to detect and Time leakage when graph built with later takedowns.

## Baseline and production design

- **Baseline (build this first):** Rule-based filters on burst and duplicate text.
- **Production design:** Heterogeneous graph model plus text-style classifier and temporal burst detector, with ring-level reviewing and adversarial retraining.

## Why AI, and why this kind

**Why AI.** Detect fake, incentivised and coordinated reviews that distort ratings, protecting buyers and honest sellers. The evidence that separates good from bad outcomes (Review burst score, Reviewer co-review overlap, Verified-purchase gap) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "review text sentiment" are what teams reach for first, and they fail because fake reviews are fluent and positive by design. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Heterogeneous graph model plus text-style classifier and temporal burst detector, with ring-level reviewing and adversarial retraining.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Review burst score, Reviewer co-review overlap, Verified-purchase gap and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rule-based filters on burst and duplicate text | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Heterogeneous graph model plus text-style classifier and temporal burst detector, with ring-level reviewing and adversarial retraining | chosen | Meets the run-window envelope at $0.070 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Fake review prevalence from audits) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Known fake rings are easiest to detect.
- Evaluation trap: Time leakage when graph built with later takedowns.
- Genuine product launch with real review surge: burst false positives.
- LLM-generated reviews become fluent: text classifier fails.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
