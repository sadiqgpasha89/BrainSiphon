# Multi-Touch Attribution: use-case brief

> Generated from the blueprint `adtech/multi-touch-attribution` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Multi-Touch Attribution · **Domain:** adtech · **Latency tier:** batch · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate each marketing touchpoint's causal contribution to conversion for budget decisions, beyond last-click bias. The system has to run as a scheduled batch job, inside these limits: Privacy-limited user paths, Cross-device gaps and Causal validity.

**Why it is hard.** The obvious approach is take model credits as truth, and it fails because correlational credit overweights retargeting. The second trap is in "Paths": the real signal is sequence-aware credit allocation, while teams usually reach for rule-based last-click.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way agreement with experiments measures it.

**What success looks like.** Offline: Calibration against holdout lift and Conversion AUC. Online: ROAS from reallocated budget and Agreement with experiments. The launch is judged on "ROAS from reallocated budget" while "Agreement with experiments" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate each marketing touchpoint's causal contribution to conversion for budget decisions, beyond last-click bias.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\text{conversion}\mid\text{path})+\lambda\,\mathrm{ShapleyConsistency}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \text{conversion} | The label: 1 if the user converted after the sequence of ad touches, 0 if not. |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| \text{path} | The sequence of ad touchpoints the user saw before converting or not. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ShapleyConsistency} | Penalty when the credit given to each touchpoint disagrees with its Shapley value, its fair marginal contribution across all orderings. |

**Hard constraints**

- Privacy-limited user paths
- Cross-device gaps
- Causal validity
- Decision-ready within a day

## The approach in one paragraph

Start with last-click and linear attribution. Then earn the move to sequence model for conversion probability with Shapley credit, calibrated by incrementality holdouts and constrained to match experiment lifts, and only if it beats the baseline on Calibration against holdout lift and Conversion AUC after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Path sequence embedding | RNN or transformer over touchpoints. Influence. Guard against: windows. |
| Add Channel time-decay | Recency weighting. Credit. Guard against: fit. |
| Add Experiment-calibrated lift | Geo or user holdout results. Anchors credit. Guard against: experiments. |
| Run it as one pipeline | Touchpoint logs (lake), Path builder (identity graph), Conversion model (transformer), Credit allocation (Shapley sampling), Experiment calibrator (lift matching), Marketer dashboard (BI) and Budget decisions (human). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle retargeting touches gets credit for already-converting users | Incrementality calibration and holdout cells. |

**Deliberately not doing**

- Click IDs: none.
- Number of ad impressions raw: exposure artefact.

**How the approach is proven**

Prove it offline on Calibration against holdout lift and Conversion AUC using time-ordered splits, then online on "ROAS from reallocated budget" with "Agreement with experiments" as the guardrail. Watch for: Evaluating attribution by conversion prediction alone and No incrementality anchor.

## Baseline and production design

- **Baseline (build this first):** Last-click and linear attribution.
- **Production design:** Sequence model for conversion probability with Shapley credit, calibrated by incrementality holdouts and constrained to match experiment lifts.

## Why AI, and why this kind

**Why AI.** Estimate each marketing touchpoint's causal contribution to conversion for budget decisions, beyond last-click bias. The evidence that separates good from bad outcomes (Path sequence embedding, Channel time-decay, Experiment-calibrated lift) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "take model credits as truth" are what teams reach for first, and they fail because correlational credit overweights retargeting. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Sequence model for conversion probability with Shapley credit, calibrated by incrementality holdouts and constrained to match experiment lifts.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Path sequence embedding, Channel time-decay, Experiment-calibrated lift and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Last-click and linear attribution | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Sequence model for conversion probability with Shapley credit, calibrated by incrementality holdouts and constrained to match experiment lifts | chosen | Meets the run-window envelope at $0.037 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (ROAS from reallocated budget) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating attribution by conversion prediction alone.
- Evaluation trap: No incrementality anchor.
- Retargeting touches gets credit for already-converting users: channel overvalued.
- Privacy changes remove user-level paths: user-level paths disappear under privacy changes so the sequence model is starved of input.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
