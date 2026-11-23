# Crash Hotspot Network Screening: use-case brief

> Generated from the blueprint `public-safety/crash-hotspot-network-screening` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Crash Hotspot Network Screening · **Domain:** public-safety · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Rank road segments and junctions for safety treatment by expected crash frequency and severity beyond what is normal for similar sites, so engineers fix the sites with the greatest safety potential. The system has to run as a scheduled batch job, inside these limits: Empirical Bayes adjustment for random variation, Severity-weighted ranking and Engineers review each site.

**Why it is hard.** The obvious approach is raw crash counts, and it fails because raw counts chase random spikes. The second trap is in "Severity": the real signal is weighted by injury severity, while teams usually reach for counts of all crashes.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.7K a month. A mistake is expensive in the way cost per crash avoided measures it.

**What success looks like.** Offline: Stability of ranking across years, Calibration of expected crashes and Treatment effect in follow-up. Online: Killed and seriously injured counts, Cost per crash avoided and Sites treated at the highest potential. The launch is judged on "Killed and seriously injured counts" while "Cost per crash avoided" must not get worse.

## Objective, loss and constraints

**Business objective.** Rank road segments and junctions for safety treatment by expected crash frequency and severity beyond what is normal for similar sites, so engineers fix the sites with the greatest safety potential.

**Training objective.** `\mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ECE} | Expected calibration error: the average gap between predicted probability and observed frequency across probability bins. |

**Hard constraints**

- Empirical Bayes adjustment for random variation
- Severity-weighted ranking
- Engineers review each site
- Annual run for 200K sites

## The approach in one paragraph

Start with sites with the highest crash counts over three years, because it is the simple screening rule. Then earn the move to a safety performance model with empirical Bayes ranking, severity weights and treatment cost-effectiveness views, reviewed by road safety engineers, and only if it beats the baseline on Stability of ranking across years and Calibration of expected crashes after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Crash history by severity | Observed crashes over years. Anchor. Guard against: from crash records. |
| Add Traffic exposure | Vehicle and pedestrian volumes. Exposure. Guard against: from counts. |
| Add Road geometry and speed | Curvature, lanes and speed limit. Expected risk. Guard against: from road data. |
| Run it as one pipeline | Crash and exposure data (road safety records), Reference group setup (GIS), Safety performance model (negative binomial regression), Empirical Bayes ranking (statistics), Treatment matching (rules) and Outcome evaluation (before after studies), with Engineer review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle underreporting | Severity-focused ranking. |

**Deliberately not doing**

- Reporting officer: irrelevant.
- Driver demographic details: not a site property.
- Crash number: an identifier.

**How the approach is proven**

Prove it offline on Stability of ranking across years, Calibration of expected crashes and Treatment effect in follow-up using time-ordered splits, then online on "Killed and seriously injured counts" with "Cost per crash avoided" as the guardrail. Watch for: Raw crash counts, Ignoring exposure and Mapping without actions.

## Baseline and production design

- **Baseline (build this first):** Sites with the highest crash counts over three years, because it is the simple screening rule.
- **Production design:** A safety performance model with empirical Bayes ranking, severity weights and treatment cost-effectiveness views, reviewed by road safety engineers.

## Why AI, and why this kind

**Why AI.** Rank road segments and junctions for safety treatment by expected crash frequency and severity beyond what is normal for similar sites, so engineers fix the sites with the greatest safety potential. The evidence that separates good from bad outcomes (Crash history by severity, Traffic exposure, Road geometry and speed) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "raw crash counts" are what teams reach for first, and they fail because raw counts chase random spikes. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A safety performance model with empirical Bayes ranking, severity weights and treatment cost-effectiveness views, reviewed by road safety engineers.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Crash history by severity, Traffic exposure, Road geometry and speed and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Sites with the highest crash counts over three years, because it is the simple screening rule | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A safety performance model with empirical Bayes ranking, severity weights and treatment cost-effectiveness views, reviewed by road safety engineers | chosen | Meets the run-window envelope at $0.092 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Killed and seriously injured counts) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Raw crash counts.
- Evaluation trap: Ignoring exposure.
- Underreporting: minor crashes are missed.
- Changes at a site: the layout changed recently.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
