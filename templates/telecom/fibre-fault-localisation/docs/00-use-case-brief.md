# Fibre Fault Localisation from OTDR & Telemetry: use-case brief

> Generated from the blueprint `telecom/fibre-fault-localisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Fibre Fault Localisation from OTDR & Telemetry · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Locate the position of a fibre cut or degradation from OTDR traces and optical telemetry so repair crews go to the right place the first time. The system has to run interactively, within a few seconds, inside these limits: Position estimate with an error range in metres, Combine OTDR with route records and Crew guidance within 10 minutes of the fault.

**Why it is hard.** The obvious approach is oTDR distance alone, and it fails because optical distance differs from route distance. The second trap is in "Fault type": the real signal is break, bend or connector loss classified, while teams usually reach for a single fault flag.

**Scale and stakes.** At 10 million users this is about 12.0M model-touching events a day, 139 requests per second on average and 833 at peak, at an estimated $8.2K a month. A mistake is expensive in the way wasted crew travel measures it.

**What success looks like.** Offline: Location error against repair records, Fault type accuracy and Share within 50 m. Online: Time to locate the fault, Wasted crew travel and Repeat visits to the same fault. The launch is judged on "Time to locate the fault" while "Wasted crew travel" must not get worse.

## Objective, loss and constraints

**Business objective.** Locate the position of a fibre cut or degradation from OTDR traces and optical telemetry so repair crews go to the right place the first time.

**Training objective.** `\mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \hat{y}_t | The model's prediction of y. (one value per time step or token t) |

**Hard constraints**

- Position estimate with an error range in metres
- Combine OTDR with route records
- Crew guidance within 10 minutes of the fault
- No replacement of engineer judgement on safety

## The approach in one paragraph

Start with convert optical distance to ground distance with a fixed slack factor and send a crew, because it is the standard method. Then earn the move to a model that corrects OTDR distance with route slack and past repair corrections to give a ground location range, plus a classifier for the fault type and a map for crew guidance, and only if it beats the baseline on Location error against repair records and Fault type accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around OTDR event distance | Optical distance to the first major loss event. Raw location. Guard against: needs refractive index calibration. |
| Add Route length slack | Route length versus cable length factors. Converts to the ground. Guard against: from the route records. |
| Add Power drop pattern | Change in received power at the endpoints. Fault type. Guard against: from telemetry. |
| Run it as one pipeline | OTDR trace capture (monitoring system), Event detection (signal processing), Route join (GIS and cable records), Location model (gradient boosting), Fault classifier (model) and Crew guidance (field app), with Repair feedback off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle multiple events | Rank events using telemetry and past traces. |

**Deliberately not doing**

- Technician name: irrelevant.
- Trace file name: an artefact.
- Region alone: weak link.

**How the approach is proven**

Prove it offline on Location error against repair records, Fault type accuracy and Share within 50 m using time-ordered splits, then online on "Time to locate the fault" with "Wasted crew travel" as the guardrail. Watch for: Using estimated locations as labels, Ignoring route slack and Single event assumption.

## Baseline and production design

- **Baseline (build this first):** Convert optical distance to ground distance with a fixed slack factor and send a crew, because it is the standard method.
- **Production design:** A model that corrects OTDR distance with route slack and past repair corrections to give a ground location range, plus a classifier for the fault type and a map for crew guidance.

## Why AI, and why this kind

**Why AI.** Locate the position of a fibre cut or degradation from OTDR traces and optical telemetry so repair crews go to the right place the first time. The evidence that separates good from bad outcomes (OTDR event distance, Route length slack, Power drop pattern) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "OTDR distance alone" are what teams reach for first, and they fail because optical distance differs from route distance. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: A model that corrects OTDR distance with route slack and past repair corrections to give a ground location range, plus a classifier for the fault type and a map for crew guidance.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among OTDR event distance, Route length slack, Power drop pattern and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Convert optical distance to ground distance with a fixed slack factor and send a crew, because it is the standard method | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A model that corrects OTDR distance with route slack and past repair corrections to give a ground location range, plus a classifier for the fault type and a map for crew guidance | chosen | Meets the 2500 ms envelope at $0.023 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to locate the fault) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using estimated locations as labels.
- Evaluation trap: Ignoring route slack.
- Multiple events: the first event is not the cut.
- Wrong route record: the location is off.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
