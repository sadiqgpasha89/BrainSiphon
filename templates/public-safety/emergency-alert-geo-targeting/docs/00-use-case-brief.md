# Emergency Alert Geo-Targeting: use-case brief

> Generated from the blueprint `public-safety/emergency-alert-geo-targeting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Emergency Alert Geo-Targeting · **Domain:** public-safety · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Help alert authors draw alert areas that cover the hazard and people at risk without over-alerting, using hazard forecasts and population data. The system has to run interactively, within a few seconds, inside these limits: The authorised officer approves every alert, Areas shown with the share of people covered and over-alerted and Alert text from approved templates.

**Why it is hard.** The obvious approach is the largest area, and it fails because over-alerting causes alert fatigue. The second trap is in "Control": the real signal is an authorised officer sends, while teams usually reach for an automatic alert.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $3.6K a month. A mistake is expensive in the way time to send measures it.

**What success looks like.** Offline: Coverage of true at-risk areas, Over-alert rate and Time to build an alert. Online: Alert area precision, Time to send and Complaints about missed alerts. The launch is judged on "Alert area precision" while "Time to send" must not get worse.

## Objective, loss and constraints

**Business objective.** Help alert authors draw alert areas that cover the hazard and people at risk without over-alerting, using hazard forecasts and population data.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- The authorised officer approves every alert
- Areas shown with the share of people covered and over-alerted
- Alert text from approved templates
- Languages and accessible formats supported
- 100 alerts per year

## The approach in one paragraph

Start with alert areas drawn by hand on a map, because it is the usual process. Then earn the move to a planning tool that proposes polygons from the hazard forecast with coverage and over-alert estimates, then routes the officer's approved alert through every channel and language, and only if it beats the baseline on Coverage of true at-risk areas and Over-alert rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Hazard extent forecast | Forecast footprint with uncertainty. Area. Guard against: from hazard models. |
| Add Population by cell | Residents per area. Coverage. Guard against: aggregated. |
| Add Cell tower coverage | Service areas of towers. Delivery. Guard against: from operators. |
| Run it as one pipeline | Hazard forecast intake (hazard models), Polygon proposal (geospatial model), Coverage estimate (population data), Officer approval (alerting system), Template and translation (approved library) and Channel dispatch (alert gateway), with Post-alert review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle moving hazard | Update prompts and revised alerts. |

**Deliberately not doing**

- Officer name: irrelevant.
- Alert id: an identifier.
- Map colour: an artefact.

**How the approach is proven**

Prove it offline on Coverage of true at-risk areas, Over-alert rate and Time to build an alert using time-ordered splits, then online on "Alert area precision" with "Time to send" as the guardrail. Watch for: Largest-area alerts, Automatic sending and Text-only alerts.

## Baseline and production design

- **Baseline (build this first):** Alert areas drawn by hand on a map, because it is the usual process.
- **Production design:** A planning tool that proposes polygons from the hazard forecast with coverage and over-alert estimates, then routes the officer's approved alert through every channel and language.

## Why AI, and why this kind

**Why AI.** Help alert authors draw alert areas that cover the hazard and people at risk without over-alerting, using hazard forecasts and population data. The evidence that separates good from bad outcomes (Hazard extent forecast, Population by cell, Cell tower coverage) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "the largest area" are what teams reach for first, and they fail because over-alerting causes alert fatigue. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A planning tool that proposes polygons from the hazard forecast with coverage and over-alert estimates, then routes the officer's approved alert through every channel and language.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Hazard extent forecast, Population by cell, Cell tower coverage and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Alert areas drawn by hand on a map, because it is the usual process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A planning tool that proposes polygons from the hazard forecast with coverage and over-alert estimates, then routes the officer's approved alert through every channel and language | chosen | Meets the 2500 ms envelope at $0.081 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Alert area precision) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Largest-area alerts.
- Evaluation trap: Automatic sending.
- Moving hazard: the extent changes.
- Cell tower gaps: some areas are not reached.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
