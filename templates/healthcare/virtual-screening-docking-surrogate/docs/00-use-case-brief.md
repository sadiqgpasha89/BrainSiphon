# Virtual Screening with Docking Surrogates: use-case brief

> Generated from the blueprint `healthcare/virtual-screening-docking-surrogate` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Virtual Screening with Docking Surrogates · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Screen billion-molecule libraries by training fast surrogate models on docking scores, then dock only the top fraction. The system has to run as a scheduled batch job, inside these limits: Compute budget, Target-specific models and Enrichment at top 0.1%.

**Why it is hard.** The obvious approach is global RMSE of docking scores, and it fails because only the top tail matters for screening. The second trap is in "Ground truth": the real signal is experimental confirmation of top picks, while teams usually reach for docking as truth.

**Scale and stakes.** At 10 million users this is about 1.5K model-touching events a day, 0 requests per second on average and 0 at peak, at an estimated $1.9K a month. A mistake is expensive in the way experimental hit rate measures it.

**What success looks like.** Offline: Enrichment factor at 0.1% and Hit-rate in docking top-k. Online: Compounds docked per hit and Experimental hit rate. The launch is judged on "Compounds docked per hit" while "Experimental hit rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Screen billion-molecule libraries by training fast surrogate models on docking scores, then dock only the top fraction.

**Training objective.** `\mathcal{L}=\mathrm{MSE}(f(m),\text{dock}(m))+\lambda\,\mathrm{RankLoss}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{MSE} | Mean squared error: the average of squared differences between prediction and truth. |
| f | The surrogate model that predicts a docking score quickly. |
| m | A candidate molecule. |
| \text{dock} | The expensive physics-based docking score the surrogate learns to imitate. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{RankLoss} | Ranking loss: penalises placing a less relevant item above a more relevant one. |

**Hard constraints**

- Compute budget
- Target-specific models
- Enrichment at top 0.1%
- Reproducible docking

## The approach in one paragraph

Start with dock a random subset and a fixed filter cascade. Then earn the move to iterative active-learning loop: GNN surrogate, dock top predictions, retrain, with diversity selection and experimental validation, and only if it beats the baseline on Enrichment factor at 0.1% and Hit-rate in docking top-k after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Surrogate rank score | Model predicted docking rank. Prioritisation. Guard against: calibrate on top tail. |
| Add Pocket descriptors | Binding-site features. Target conditioning. Guard against: structure version. |
| Add Library diversity coverage | Cluster coverage among selected. Avoid redundancy. Guard against: clustering. |
| Run it as one pipeline | Library ingest (enumerated molecules), Surrogate model (GNN on GPU), Selection (acquisition function), Docking (GPU docking cluster), Rescoring (physics or ML), Chemist triage (human) and Assay results (validation). |
| Optimise the right thing | The objective weighs mean squared error: the average of squared differences between prediction and truth, so the model is trained on the cost of the decision and not on a generic score. |
| Handle receptor conformation changes | Ensemble of receptor conformers. |

**Deliberately not doing**

- Molecular weight alone: confounds docking scores.
- Compound supplier: none.

**How the approach is proven**

Prove it offline on Enrichment factor at 0.1% and Hit-rate in docking top-k using time-ordered splits, then online on "Compounds docked per hit" with "Experimental hit rate" as the guardrail. Watch for: Training and test molecules share scaffolds and Equating docking score with binding affinity.

## Baseline and production design

- **Baseline (build this first):** Dock a random subset and a fixed filter cascade.
- **Production design:** Iterative active-learning loop: GNN surrogate, dock top predictions, retrain, with diversity selection and experimental validation.

## Why AI, and why this kind

**Why AI.** Screen billion-molecule libraries by training fast surrogate models on docking scores, then dock only the top fraction. The evidence that separates good from bad outcomes (Surrogate rank score, Pocket descriptors, Library diversity coverage) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "global RMSE of docking scores" are what teams reach for first, and they fail because only the top tail matters for screening. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Iterative active-learning loop: GNN surrogate, dock top predictions, retrain, with diversity selection and experimental validation.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Surrogate rank score, Pocket descriptors, Library diversity coverage and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Dock a random subset and a fixed filter cascade | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Iterative active-learning loop: GNN surrogate, dock top predictions, retrain, with diversity selection and experimental validation | chosen | Meets the run-window envelope at $41.16 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Compounds docked per hit) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training and test molecules share scaffolds.
- Evaluation trap: Equating docking score with binding affinity.
- Receptor conformation changes: surrogate trained on wrong pocket.
- Docking failures on some molecules: failed docking runs leave missing labels that bias the surrogate toward easy molecules.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
