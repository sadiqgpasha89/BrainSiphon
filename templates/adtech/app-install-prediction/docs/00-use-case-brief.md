# Mobile App Install & Post-Install Prediction: use-case brief

> Generated from the blueprint `adtech/app-install-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Mobile App Install & Post-Install Prediction · **Domain:** adtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict install probability and early post-install value for mobile campaigns to bid efficiently under privacy limits. The system has to run in under 100 milliseconds, inside these limits: Limited identifiers, Delayed postbacks and Fraudulent installs.

**Why it is hard.** The obvious approach is install volume, and it fails because installs from low-quality sources never monetise. The second trap is in "Privacy": the real signal is aggregated postbacks and modelled signals, while teams usually reach for user-level joins.

**Scale and stakes.** At 10 million users this is about 60.0M model-touching events a day, 694 requests per second on average and 4.2K at peak, at an estimated $4.3K a month. A mistake is expensive in the way day-7 ROAS measures it.

**What success looks like.** Offline: AUC and calibration of installs and D1 value and Source ranking accuracy. Online: Cost per retained user and Day-7 ROAS. The launch is judged on "Cost per retained user" while "Day-7 ROAS" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict install probability and early post-install value for mobile campaigns to bid efficiently under privacy limits.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\text{install})+\lambda\,\mathrm{BCE}(\text{day-1 purchase})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \text{install} | Label: 1 if the user installs the app after the ad. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \text{day-1 purchase} | Label: 1 if the user buys within the first day of installing. |

**Hard constraints**

- Limited identifiers
- Delayed postbacks
- Fraudulent installs
- Cold-start apps

## The approach in one paragraph

Start with bid by source-level CPI targets. Then earn the move to multi-task GBDT or DCN predicting install and early value with aggregate-signal calibration and fraud filters, and only if it beats the baseline on AUC and calibration of installs and D1 value and Source ranking accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Contextual app category match | App and publisher categories. Fit. Guard against: taxonomy. |
| Add Historic source quality | Day-7 retention by source. Source value. Guard against: matured. |
| Add Device and OS context | Version, locale. Fit. Guard against: allowed fields. |
| Run it as one pipeline | Bid request (SDK or exchange), Context features (cache), Install and value model (multi-task), Fraud filter (IVT score), Bidder (DSP), Attribution postbacks (MMP) and Calibration job (batch). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle install-attribution partner changes postback schema | Schema validation and monitoring. |

**Deliberately not doing**

- Ad ID: none.
- Click timestamp second: none.

**How the approach is proven**

Prove it offline on AUC and calibration of installs and D1 value and Source ranking accuracy using time-ordered splits, then online on "Cost per retained user" with "Day-7 ROAS" as the guardrail. Watch for: Training on installs from fraudulent sources and Delayed postbacks excluded.

## Baseline and production design

- **Baseline (build this first):** Bid by source-level CPI targets.
- **Production design:** Multi-task GBDT or DCN predicting install and early value with aggregate-signal calibration and fraud filters.

## Why AI, and why this kind

**Why AI.** Predict install probability and early post-install value for mobile campaigns to bid efficiently under privacy limits. The evidence that separates good from bad outcomes (Contextual app category match, Historic source quality, Device and OS context) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "install volume" are what teams reach for first, and they fail because installs from low-quality sources never monetise. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Multi-task GBDT or DCN predicting install and early value with aggregate-signal calibration and fraud filters.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Contextual app category match, Historic source quality, Device and OS context and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Bid by source-level CPI targets | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Multi-task GBDT or DCN predicting install and early value with aggregate-signal calibration and fraud filters | chosen | Meets the 80 ms envelope at $0.0024 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Cost per retained user) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on installs from fraudulent sources.
- Evaluation trap: Delayed postbacks excluded.
- Install-attribution partner changes postback schema: a schema change in postbacks silently breaks label joins and corrupts training data.
- Click-injection fraud inflates installs: wrong sources look great.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
