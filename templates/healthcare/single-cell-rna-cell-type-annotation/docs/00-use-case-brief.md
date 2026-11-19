# Single-Cell RNA Cell-Type Annotation: use-case brief

> Generated from the blueprint `healthcare/single-cell-rna-cell-type-annotation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Single-Cell RNA Cell-Type Annotation · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Annotate millions of cells with cell types automatically, flagging novel populations for biologists. The system has to run as a scheduled batch job, inside these limits: Batch effects across labs, Novel cell types and Reference atlas versions.

**Why it is hard.** The obvious approach is raw expression PCA, and it fails because batch effects dominate raw PCA clusters. The second trap is in "Novelty": the real signal is open-set annotation with abstention, while teams usually reach for forced classification into known types.

**Scale and stakes.** At 10 million users this is about 30 model-touching events a day, 0 requests per second on average and 0 at peak, at an estimated $1.6K a month. A mistake is expensive in the way curator corrections measures it.

**What success looks like.** Offline: Macro-F1 across cell types and Novelty detection AUROC. Online: Annotation time per dataset and Curator corrections. The launch is judged on "Annotation time per dataset" while "Curator corrections" must not get worse.

## Objective, loss and constraints

**Business objective.** Annotate millions of cells with cell types automatically, flagging novel populations for biologists.

**Training objective.** `\mathcal{L}=\mathrm{CE}(y,p)+\lambda\,\mathrm{MMD}(Z_{\text{batch}_a},Z_{\text{batch}_b})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{MMD} | Penalty for differences between the representations of two batches, which removes batch effects. |
| Z_{\text{batch}_a} | The learned representation of cells from one experimental batch: Z_batch_a and Z_batch_b. |

**Hard constraints**

- Batch effects across labs
- Novel cell types
- Reference atlas versions
- Reproducibility

## The approach in one paragraph

Start with marker-gene rule annotation with clustering. Then earn the move to probabilistic VAE with reference mapping, kNN label transfer, uncertainty-based novelty detection and curator review, and only if it beats the baseline on Macro-F1 across cell types and Novelty detection AUROC after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Highly variable gene set | Selected by dispersion across batches. Signal genes. Guard against: fix set at training. |
| Add Latent embedding from scVI-like model | Batch-corrected embedding. Annotation space. Guard against: seed variance. |
| Add Marker gene scores | Known marker panel scores. Interpretability. Guard against: curated list version. |
| Run it as one pipeline | Count matrices (sequencing core), QC and filtering (pipeline), Batch-corrected embedding (scVI), Reference mapping (label transfer), Novelty detector (uncertainty) and Atlas update (curation), with Biologist review off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new tissue not in reference | Out-of-reference detection and refusal. |

**Deliberately not doing**

- Total UMI count: technical depth.
- Mitochondrial fraction alone: quality not type.

**How the approach is proven**

Prove it offline on Macro-F1 across cell types and Novelty detection AUROC using time-ordered splits, then online on "Annotation time per dataset" with "Curator corrections" as the guardrail. Watch for: Test batches seen in training and Cell-type labels derived from same clustering.

## Baseline and production design

- **Baseline (build this first):** Marker-gene rule annotation with clustering.
- **Production design:** Probabilistic VAE with reference mapping, kNN label transfer, uncertainty-based novelty detection and curator review.

## Why AI, and why this kind

**Why AI.** Annotate millions of cells with cell types automatically, flagging novel populations for biologists. The evidence that separates good from bad outcomes (Highly variable gene set, Latent embedding from scVI-like model, Marker gene scores) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "raw expression PCA" are what teams reach for first, and they fail because batch effects dominate raw PCA clusters. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Probabilistic VAE with reference mapping, kNN label transfer, uncertainty-based novelty detection and curator review.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Highly variable gene set, Latent embedding from scVI-like model, Marker gene scores and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Marker-gene rule annotation with clustering | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Probabilistic VAE with reference mapping, kNN label transfer, uncertainty-based novelty detection and curator review | chosen | Meets the run-window envelope at $1.8K per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Annotation time per dataset) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Test batches seen in training.
- Evaluation trap: Cell-type labels derived from same clustering.
- New tissue not in reference: annotations wrong with confidence.
- Doublets mis-annotated: spurious hybrid types.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
