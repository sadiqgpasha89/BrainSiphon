# Federated Learning Across Hospitals: use-case brief

> Generated from the blueprint `healthcare/federated-learning-multi-hospital` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Federated Learning Across Hospitals · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Train shared clinical models across hospitals without centralising patient data, handling heterogeneity and governance. The system has to run as a scheduled batch job, inside these limits: Data stays on site, Differential privacy budgets and Non-IID data.

**Why it is hard.** The obvious approach is plain FedAvg, and it fails because non-IID sites make FedAvg diverge. The second trap is in "Privacy": the real signal is secure aggregation and DP accounting, while teams usually reach for assuming federated means private.

**Scale and stakes.** At 10 million users this is about 3.0K model-touching events a day, 0 requests per second on average and 0 at peak, at an estimated $2.2K a month. A mistake is expensive in the way model uplift at small hospitals measures it.

**What success looks like.** Offline: Per-site AUROC vs local-only and Privacy epsilon spent. Online: Sites onboarded and Model uplift at small hospitals. The launch is judged on "Sites onboarded" while "Model uplift at small hospitals" must not get worse.

## Objective, loss and constraints

**Business objective.** Train shared clinical models across hospitals without centralising patient data, handling heterogeneity and governance.

**Training objective.** `\min_w\sum_k\frac{n_k}{n}F_k(w)+\frac{\mu}{2}\|w-w_t\|^2\ \text{(FedProx)}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \min_w | Minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values). |
| \sum_k | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \frac{a}{b} | Fraction: the top part divided by the bottom part. |
| n_k | The number of patients at hospital k, with n the total. |
| F_k | The local loss at hospital k. |
| w | The shared model weights being learned. |
| \mu | Strength of the proximal term that stops local models drifting too far from the global one. |
| \\|x\\| | Norm: the length of a vector. The squared norm of a difference is the sum of squared errors. |

**Hard constraints**

- Data stays on site
- Differential privacy budgets
- Non-IID data
- Heterogeneous compute

## The approach in one paragraph

Start with local models trained per hospital. Then earn the move to federated training with FedProx, secure aggregation, DP-SGD where required and site-specific fine-tuning heads, with orchestrated governance, and only if it beats the baseline on Per-site AUROC vs local-only and Privacy epsilon spent after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Per-site data distribution summaries | Label and feature statistics. Drift diagnosis. Guard against: privacy-safe summaries. |
| Add Update norm clipping stats | Gradient norms per site. Privacy and stability. Guard against: dP clipping. |
| Add Personalised head performance | Per-site fine-tuned head. Local utility. Guard against: hold-out. |
| Run it as one pipeline | Site data prep (local harmonisation), Local trainer (on-site GPU), Secure aggregation (cryptographic protocol), Global model server (aggregator), Privacy accountant (DP budget), Governance board (approvals) and Site evaluation (local validation). |
| Optimise the right thing | The objective weighs minimum: pick the value of the variable written under it that gives the smallest result (or, written alone, the smaller of the listed values), so the model is trained on the cost of the decision and not on a generic score. |
| Handle one site has label shift | Site weighting and personalisation. |

**Deliberately not doing**

- Hospital name: none.
- Number of local epochs: tuning.

**How the approach is proven**

Prove it offline on Per-site AUROC vs local-only and Privacy epsilon spent using time-ordered splits, then online on "Sites onboarded" with "Model uplift at small hospitals" as the guardrail. Watch for: Evaluating on pooled data only and No membership inference test.

## Baseline and production design

- **Baseline (build this first):** Local models trained per hospital.
- **Production design:** Federated training with FedProx, secure aggregation, DP-SGD where required and site-specific fine-tuning heads, with orchestrated governance.

## Why AI, and why this kind

**Why AI.** Train shared clinical models across hospitals without centralising patient data, handling heterogeneity and governance. The evidence that separates good from bad outcomes (Per-site data distribution summaries, Update norm clipping stats, Personalised head performance) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "plain FedAvg" are what teams reach for first, and they fail because non-IID sites make FedAvg diverge. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Federated training with FedProx, secure aggregation, DP-SGD where required and site-specific fine-tuning heads, with orchestrated governance.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Per-site data distribution summaries, Update norm clipping stats, Personalised head performance and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Local models trained per hospital | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Federated training with FedProx, secure aggregation, DP-SGD where required and site-specific fine-tuning heads, with orchestrated governance | chosen | Meets the run-window envelope at $24.86 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Sites onboarded) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating on pooled data only.
- Evaluation trap: No membership inference test.
- One site has label shift: global model biased.
- Site drops out mid-round: stalled training.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
