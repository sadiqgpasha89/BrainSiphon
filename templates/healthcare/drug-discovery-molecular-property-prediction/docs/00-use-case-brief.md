# Molecular Property Prediction for Drug Discovery: use-case brief

> Generated from the blueprint `healthcare/drug-discovery-molecular-property-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Molecular Property Prediction for Drug Discovery · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict ADMET and activity properties from molecular graphs to prioritise synthesis and cut wet-lab cycles. The system has to run as a scheduled batch job, inside these limits: Scaffold-split generalisation, Uncertainty estimates and Sparse assay data.

**Why it is hard.** The obvious approach is random molecule splits, and it fails because random splits leak near-analogues and inflate results. The second trap is in "Uncertainty": the real signal is calibrated uncertainty and applicability domain, while teams usually reach for point predictions.

**Scale and stakes.** At 10 million users this is about 3.0K model-touching events a day, 0 requests per second on average and 0 at peak, at an estimated $1.6K a month. A mistake is expensive in the way hit rate of selected compounds measures it.

**What success looks like.** Offline: Scaffold-split RMSE and AUROC and Uncertainty calibration. Online: Synthesis cycles to hit and Hit rate of selected compounds. The launch is judged on "Synthesis cycles to hit" while "Hit rate of selected compounds" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict ADMET and activity properties from molecular graphs to prioritise synthesis and cut wet-lab cycles.

**Training objective.** `\mathcal{L}=\sum_{t}m_{it}\left(y_{it}-\hat y_{it}\right)^2\ \text{(masked multitask)}+\lambda\,\mathrm{Evidential}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_{t} | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| m_{it} | A mask: m_{it} is 1 if molecule i has a measured value for property t and 0 if it is missing. |
| y_{it} | The measured value of property t for molecule i; the hat is the prediction. |
| \hat{y}_{it} | The model's prediction of y. (one value per example i and time step or token t) |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Evidential} | Penalty that trains the model to report its own uncertainty about each prediction. |

**Hard constraints**

- Scaffold-split generalisation
- Uncertainty estimates
- Sparse assay data
- Medicinal chemist trust

## The approach in one paragraph

Start with random forest on ECFP fingerprints. Then earn the move to multitask GNN (D-MPNN) with pretraining, ensembling for uncertainty and active-learning loop selecting compounds to test, and only if it beats the baseline on Scaffold-split RMSE and AUROC and Uncertainty calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Pretrained molecular graph embedding | GNN encoder pretrained on millions of molecules. Transfer. Guard against: check overlap with test scaffolds. |
| Add Physicochemical descriptors | LogP, TPSA, MW. Prior knowledge. Guard against: calculation tool version. |
| Add Assay noise estimate | Replicate variance. Label quality. Guard against: use for weighting. |
| Run it as one pipeline | Assay database (ELN export), Standardiser (RDKit), Graph encoder (D-MPNN), Multitask head (ADMET endpoints), Uncertainty and domain check (ensemble) and New assay results (active learning), with Chemist review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle out-of-domain scaffold | Applicability-domain detector and flagged predictions. |

**Deliberately not doing**

- Molecule ID: arbitrary.
- Vendor of compound: batch effect.

**How the approach is proven**

Prove it offline on Scaffold-split RMSE and AUROC and Uncertainty calibration using time-ordered splits, then online on "Synthesis cycles to hit" with "Hit rate of selected compounds" as the guardrail. Watch for: Random split leakage and Averaging across assays with different noise.

## Baseline and production design

- **Baseline (build this first):** Random forest on ECFP fingerprints.
- **Production design:** Multitask GNN (D-MPNN) with pretraining, ensembling for uncertainty and active-learning loop selecting compounds to test.

## Why AI, and why this kind

**Why AI.** Predict ADMET and activity properties from molecular graphs to prioritise synthesis and cut wet-lab cycles. The evidence that separates good from bad outcomes (Pretrained molecular graph embedding, Physicochemical descriptors, Assay noise estimate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "random molecule splits" are what teams reach for first, and they fail because random splits leak near-analogues and inflate results. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: Multitask GNN (D-MPNN) with pretraining, ensembling for uncertainty and active-learning loop selecting compounds to test.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Pretrained molecular graph embedding, Physicochemical descriptors, Assay noise estimate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Random forest on ECFP fingerprints | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Multitask GNN (D-MPNN) with pretraining, ensembling for uncertainty and active-learning loop selecting compounds to test | chosen | Meets the run-window envelope at $17.95 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Synthesis cycles to hit) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Random split leakage.
- Evaluation trap: Averaging across assays with different noise.
- Out-of-domain scaffold: confident wrong predictions.
- Assay protocol change: a changed assay protocol shifts label values so the model learns a moving target.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
