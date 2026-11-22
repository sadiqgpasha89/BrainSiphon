# CMS Quality Program Penalty Forecasting: use-case brief

> Generated from the blueprint `healthcare/cms-quality-program-penalty-forecasting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** CMS Quality Program Penalty Forecasting · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate potential financial exposure under applicable quality-linked payment programs by combining current program rules with validated performance data, clearly labelled as scenario estimates and never as official determinations. The system has to run as a scheduled batch job, inside these limits: A transparent deterministic policy calculator is the base and predictive uncertainty sits on top of the inputs, Rules are versioned by program year and cite their source and Finance and compliance validate assumptions and every output is labelled as an estimate not an official determination.

**Why it is hard.** The obvious approach is a statistical guess at the penalty, and it fails because the payment adjustment is a calculation and not a prediction. The second trap is in "Uncertainty": the real signal is distributions on pending performance inputs, while teams usually reach for a single exposure number.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way share of exposure explained by the top three measures measures it.

**What success looks like.** Offline: Absolute error of estimated exposure vs the official result by program year, Interval coverage of the exposure range and Rule-replication agreement with published examples. Online: Exposure estimate error at year end, Share of exposure explained by the top three measures and Time to refresh after a rule publication. The launch is judged on "Exposure estimate error at year end" while "Share of exposure explained by the top three measures" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate potential financial exposure under applicable quality-linked payment programs by combining current program rules with validated performance data, clearly labelled as scenario estimates and never as official determinations.

**Training objective.** `\mathcal{L}=-\sum_i w_i\,[\,y_i\log p_i+(1-y_i)\log(1-p_i)\,]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| w_i | A weight that scales how much a particular example, class or term counts in the loss. (one value per example i) |
| y_i | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per example i) |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_i | The model's predicted probability that the outcome is positive (between 0 and 1). (one value per example i) |

**Hard constraints**

- A transparent deterministic policy calculator is the base and predictive uncertainty sits on top of the inputs
- Rules are versioned by program year and cite their source
- Finance and compliance validate assumptions and every output is labelled as an estimate not an official determination
- Data gaps are listed with the exposure they leave unknown
- Scenarios show sensitivity to each measure
- Runs 3K facility-program scenarios on demand and nightly

## The approach in one paragraph

Start with prior-year penalty amount carried forward. Then earn the move to a rules-as-code calculator of the program's scoring methodology by year, Monte Carlo sampling of pending performance inputs from forecast distributions, a sensitivity analyser and a gap report, with every figure stamped with rule version and data snapshot, and only if it beats the baseline on Absolute error of estimated exposure vs the official result by program year and Interval coverage of the exposure range after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Measure score gap to benchmark | Distance from achievement and improvement thresholds. Drives the point scale. Guard against: benchmarks of the right year. |
| Add Payment base | Program payment base for the period. Scales exposure. Guard against: use the declared base. |
| Add Sensitivity per measure | Change in exposure per unit change in the measure. Prioritises work. Guard against: computed by the calculator. |
| Run it as one pipeline | Performance and payment intake (warehouse extracts), Program-year rule loader (versioned rule tables), Exposure scenario calculator (deterministic policy calculator) and Input uncertainty sampler (Monte Carlo from forecast models), with Sensitivity and gap report, Finance and compliance review and Scenario archive and audit off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle program rule change mid-year | Rule version check with a mandatory refresh on publication. |

**Deliberately not doing**

- Prior year penalty amount: does not describe this year's rules.
- Peer penalties reported in the press: unverified.
- Executive expectation: not evidence.

**How the approach is proven**

Prove it offline on Absolute error of estimated exposure vs the official result by program year, Interval coverage of the exposure range and Rule-replication agreement with published examples using time-ordered splits, then online on "Exposure estimate error at year end" with "Share of exposure explained by the top three measures" as the guardrail. Watch for: Calling a statistical estimate the penalty, Applying one year's rules to another and Hiding data gaps behind a single number.

## Baseline and production design

- **Baseline (build this first):** Prior-year penalty amount carried forward.
- **Production design:** A rules-as-code calculator of the program's scoring methodology by year, Monte Carlo sampling of pending performance inputs from forecast distributions, a sensitivity analyser and a gap report, with every figure stamped with rule version and data snapshot.

## Why AI, and why this kind

**Why AI.** Estimate potential financial exposure under applicable quality-linked payment programs by combining current program rules with validated performance data, clearly labelled as scenario estimates and never as official determinations. The evidence that separates good from bad outcomes (Measure score gap to benchmark, Payment base, Sensitivity per measure) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A statistical guess at the penalty" are what teams reach for first, and they fail because the payment adjustment is a calculation and not a prediction. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A rules-as-code calculator of the program's scoring methodology by year, Monte Carlo sampling of pending performance inputs from forecast distributions, a sensitivity analyser and a gap report, with every figure stamped with rule version and data snapshot.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Measure score gap to benchmark, Payment base, Sensitivity per measure and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Prior-year penalty amount carried forward | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A rules-as-code calculator of the program's scoring methodology by year, Monte Carlo sampling of pending performance inputs from forecast distributions, a sensitivity analyser and a gap report, with every figure stamped with rule version and data snapshot | chosen | Meets the run-window envelope at $0.037 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Exposure estimate error at year end) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Calling a statistical estimate the penalty.
- Evaluation trap: Applying one year's rules to another.
- Program rule change mid-year: outputs use stale rules.
- Benchmarks published late: achievement thresholds unknown.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
