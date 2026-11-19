# Out-of-Home Footfall Attribution: use-case brief

> Generated from the blueprint `adtech/ooh-footfall-attribution` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Out-of-Home Footfall Attribution · **Domain:** adtech · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Attribute store visits to out-of-home ad exposure using mobility data and control groups with privacy safeguards. The system has to run as a scheduled batch job, inside these limits: Location privacy, Panel bias and Exposure estimation error.

**Why it is hard.** The obvious approach is proximity radius only, and it fails because proximity includes unexposed people. The second trap is in "Control": the real signal is matched controls on pre-period mobility, while teams usually reach for naive unexposed baseline.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 2 at peak, at an estimated $1.6K a month. A mistake is expensive in the way agreement with sales lift measures it.

**What success looks like.** Offline: Placebo-test lift near zero and CI coverage. Online: Incremental visits per spend and Agreement with sales lift. The launch is judged on "Incremental visits per spend" while "Agreement with sales lift" must not get worse.

## Objective, loss and constraints

**Business objective.** Attribute store visits to out-of-home ad exposure using mobility data and control groups with privacy safeguards.

**Training objective.** `\hat\tau=\bar Y_{\text{exposed}}-\bar Y_{\text{matched control}}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \hat{\tau} | The estimated treatment effect (uplift): how much the treatment changes the outcome for this unit or group. |
| \bar{Y}_{\text{exposed}} | The average outcome of the group named in the subscript. (one value per time step or token t) |

**Hard constraints**

- Location privacy
- Panel bias
- Exposure estimation error
- Control matching

## The approach in one paragraph

Start with count visits within radius after exposure window. Then earn the move to causal matching with synthetic controls on mobility panels, exposure probabilities and uncertainty from bootstrap, and only if it beats the baseline on Placebo-test lift near zero and CI coverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Visibility-weighted exposure | Line-of-sight and dwell. Exposure. Guard against: geometry. |
| Add Pre-period visit propensity | Baseline store visits. Matching. Guard against: window. |
| Add Daypart and weather | Context. Confounders. Guard against: data. |
| Run it as one pipeline | Mobility panel (vendor), Exposure model (visibility geometry), Matched control builder (propensity), Lift estimator (causal inference) and Privacy aggregator (thresholds), with Report and Analyst review off the critical path. |
| Optimise the right thing | The objective weighs the estimated treatment effect (uplift): how much the treatment changes the outcome for this unit or group, so the model is trained on the cost of the decision and not on a generic score. |
| Handle panel under-represents certain groups | Weighting to census. |

**Deliberately not doing**

- Device ID: none.
- Precise coordinates: privacy.

**How the approach is proven**

Prove it offline on Placebo-test lift near zero and CI coverage using time-ordered splits, then online on "Incremental visits per spend" with "Agreement with sales lift" as the guardrail. Watch for: No control group and Exposure defined by radius.

## Baseline and production design

- **Baseline (build this first):** Count visits within radius after exposure window.
- **Production design:** Causal matching with synthetic controls on mobility panels, exposure probabilities and uncertainty from bootstrap.

## Why AI, and why this kind

**Why AI.** Attribute store visits to out-of-home ad exposure using mobility data and control groups with privacy safeguards. The evidence that separates good from bad outcomes (Visibility-weighted exposure, Pre-period visit propensity, Daypart and weather) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "proximity radius only" are what teams reach for first, and they fail because proximity includes unexposed people. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Causal matching with synthetic controls on mobility panels, exposure probabilities and uncertainty from bootstrap.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Visibility-weighted exposure, Pre-period visit propensity, Daypart and weather and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Count visits within radius after exposure window | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Causal matching with synthetic controls on mobility panels, exposure probabilities and uncertainty from bootstrap | chosen | Meets the run-window envelope at $0.360 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Incremental visits per spend) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: No control group.
- Evaluation trap: Exposure defined by radius.
- Panel under-represents certain groups: under-represented groups in the mobility panel bias the measured lift.
- GPS noise in dense cities: exposure misclassified.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
