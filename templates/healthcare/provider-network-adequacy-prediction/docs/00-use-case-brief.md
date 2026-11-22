# Provider Network Adequacy Prediction: use-case brief

> Generated from the blueprint `healthcare/provider-network-adequacy-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Provider Network Adequacy Prediction · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Evaluate whether a provider network can meet geographic, specialty, capacity and appointment-access requirements, separating a provider's presence in the directory from actual appointment capacity, and show underserved areas with uncertainty and an evidence trail. The system has to run as a scheduled batch job, inside these limits: Network and compliance experts validate the standards and the results and the tool makes no filing, Standards are versioned by jurisdiction and effective date and Directory presence and appointment capacity are modelled separately.

**Why it is hard.** The obvious approach is single national rule, and it fails because standards differ and change. The second trap is in "Capacity": the real signal is appointment capacity separate from directory presence, while teams usually reach for directory counts.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way time to prepare adequacy reports measures it.

**What success looks like.** Offline: Agreement of adequacy results with manual network audits, Capacity-estimate error against observed slots and Interval coverage. Online: Adequacy gaps found before filing, Time to prepare adequacy reports and Underserved areas addressed. The launch is judged on "Adequacy gaps found before filing" while "Time to prepare adequacy reports" must not get worse.

## Objective, loss and constraints

**Business objective.** Evaluate whether a provider network can meet geographic, specialty, capacity and appointment-access requirements, separating a provider's presence in the directory from actual appointment capacity, and show underserved areas with uncertainty and an evidence trail.

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

- Network and compliance experts validate the standards and the results and the tool makes no filing
- Standards are versioned by jurisdiction and effective date
- Directory presence and appointment capacity are modelled separately
- Every area shows the evidence and the uncertainty
- Evaluates 25K providers and 3K geographic units quarterly
- Member data is aggregated to geographic units

## The approach in one paragraph

Start with a quarterly spreadsheet check of provider counts against the standard. Then earn the move to a geospatial adequacy engine with road-network travel times, a capacity forecaster that separates directory presence from appointment availability, a versioned standards register and an interval-based evidence report, and only if it beats the baseline on Agreement of adequacy results with manual network audits and Capacity-estimate error against observed slots after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Travel time to the nearest qualified provider | Drive or transit time from member areas. Core adequacy measure. Guard against: road network version. |
| Add Accepting status and appointment capacity | Observed slots and accepting flags. Real capacity. Guard against: data freshness shown. |
| Add Provider-to-member ratio | Qualified providers per member by area and specialty. Standard test. Guard against: member counts at the date. |
| Run it as one pipeline | Directory and capacity intake (warehouse extracts), Geospatial travel model (road-network routing), Capacity estimator (time-series and rules), Adequacy evaluator (versioned standards rules) and Uncertainty and evidence builder (interval estimation), with Network and compliance review and Report and audit log off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle stale directory | Freshness discount and a verification list. |

**Deliberately not doing**

- Provider marketing text: not capacity.
- Directory sort order: artefact.
- Practice name: label.

**How the approach is proven**

Prove it offline on Agreement of adequacy results with manual network audits, Capacity-estimate error against observed slots and Interval coverage using time-ordered splits, then online on "Adequacy gaps found before filing" with "Time to prepare adequacy reports" as the guardrail. Watch for: Counting directory presence as capacity, Using straight-line distance and Applying an outdated standard.

## Baseline and production design

- **Baseline (build this first):** A quarterly spreadsheet check of provider counts against the standard.
- **Production design:** A geospatial adequacy engine with road-network travel times, a capacity forecaster that separates directory presence from appointment availability, a versioned standards register and an interval-based evidence report.

## Why AI, and why this kind

**Why AI.** Evaluate whether a provider network can meet geographic, specialty, capacity and appointment-access requirements, separating a provider's presence in the directory from actual appointment capacity, and show underserved areas with uncertainty and an evidence trail. The evidence that separates good from bad outcomes (Travel time to the nearest qualified provider, Accepting status and appointment capacity, Provider-to-member ratio) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "single national rule" are what teams reach for first, and they fail because standards differ and change. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A geospatial adequacy engine with road-network travel times, a capacity forecaster that separates directory presence from appointment availability, a versioned standards register and an interval-based evidence report.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Travel time to the nearest qualified provider, Accepting status and appointment capacity, Provider-to-member ratio and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A quarterly spreadsheet check of provider counts against the standard | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A geospatial adequacy engine with road-network travel times, a capacity forecaster that separates directory presence from appointment availability, a versioned standards register and an interval-based evidence report | chosen | Meets the run-window envelope at $0.037 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Adequacy gaps found before filing) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Counting directory presence as capacity.
- Evaluation trap: Using straight-line distance.
- Stale directory: adequacy is overstated.
- Telehealth providers: travel rules do not apply.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
