# Sepsis Early-Warning System: use-case brief

> Generated from the blueprint `healthcare/sepsis-early-warning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Sepsis Early-Warning System · **Domain:** healthcare · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Sepsis kills quickly and is treatable when caught early: each hour of delay before antibiotics measurably raises mortality. On a ward, the signs are scattered across vitals charted by different nurses at different times, lab results that arrive later than they were drawn, and a clinician's gut feeling that is never written down. The system reads that stream continuously and asks a charge nurse to look at one patient hours before the textbook criteria are met. It is only useful if the nurse believes the alert, because the whole value is a person acting earlier.

**Why it is hard.** The label itself is contested: billing codes lag and misplace onset by hours, so the ground truth has to be Sepsis-3 criteria with clinician-adjudicated onset times. The data are irregular, with vitals every few hours on a ward and every few minutes in intensive care, and the pattern of missing readings is itself informative because clinicians measure more when they are worried, which leaks suspicion into the features. Treatment interrupts the outcome, since a patient flagged and treated early never reaches the onset the label records. And alert fatigue is the real constraint: a model that fires each shift is switched off within a week, however good its AUROC.

**Scale and stakes.** With 10 million registered users and 3 million active, the system consumes about 72 million vital, lab and charting events a day, 833 per second on average and 5,000 at peak, and is provisioned for 7,500. The run cost is about $6.3K a month, or $0.003 per thousand decisions, trivial next to the stakes. The cost of a missed case is a death or an intensive-care admission, and the cost of a noisy system is that nurses stop reading alerts, including the true ones. Because it influences care, it is a medical device with change control, not just a service.

**What success looks like.** Offline, the model delivers useful lead time, measured in hours before onset, at the agreed alert burden of 0.5 alerts per 100 patient-days, with positive predictive value at the fixed sensitivity that clinical leadership accepts. Online, the launch is judged on time to antibiotics after an alert, while sepsis mortality and the alert override rate are the guardrails: if nurses override more than a set share of alerts, the system is losing trust and the rollout stops. The hard ceiling on burden is under one alert per ten patient-days, and the evaluation point sits well inside it.

## Objective, loss and constraints

**Business objective.** Alert clinicians hours before sepsis onset from streaming vitals and labs, with alert burden low enough that nurses keep trusting it.

**Training objective.** `\mathcal{L}=\sum_t w_t\,\mathrm{BCE}(y_t,p_t)\quad w_t\ \text{emphasises the 6h pre-onset window}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| w_t | A weight per time step that is larger in the 6 hours before sepsis onset, so early warnings count most. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y_t | The label at hour t: 1 if sepsis begins within the next 6 hours. |
| p_t | The predicted probability of sepsis onset within 6 hours. |

**Hard constraints**

- Alert fatigue budget under 1 alert per 10 patient-days
- Works on EHR data with irregular sampling
- Clinical explainability
- FDA SaMD change control
- Evaluated per patient episode, never per isolated window
- Per-site thresholds and calibration because each hospital is its own tenant

## The approach in one paragraph

Start from the modified early warning score with fixed thresholds, because it is what clinicians already trust and it is the number any new system must beat on lead time. Then move to a gradient-boosted model on irregularly sampled features with a GRU-D branch that handles missing readings explicitly, but only after it gives longer lead time at the same alert burden on patient-level held-out stays, and ship it with per-unit thresholds calibrated to what each ward's nurses will tolerate. The aim is an alert that arrives early, rarely and with a reason.

**Moves**

| Move | Detail |
|---|---|
| Settle the label with clinicians before modelling | Define onset by Sepsis-3 with adjudicated times, have two clinicians re-adjudicate a sample of a few hundred stays to measure agreement, and write down how treated-early patients are handled so the label does not punish success. |
| Make every feature true at the time it was known | Use result time rather than draw time for labs, charted time rather than clinical time for vitals, and carry values forward only from past readings with an age stamp. Lactate level and six-hour trend, three-hour vital slopes and SIRS or qSOFA drift all follow this rule. |
| Use the missingness carefully | The number of vitals charted in the last four hours is a real signal of clinician concern, so include it, but test its stability across wards and hospitals and drop it where charting habits differ. |
| Split by patient, not by row | Hold out whole stays, and later whole hospitals, so hours from one patient never sit in both training and test, and report lead time at fixed alert burden rather than AUROC over all hours. |
| Set thresholds per unit with nurse leaders | Calibrate the alert threshold for each ward to a burden its nursing lead has agreed, cap alerts per shift, and change thresholds in stages with a burden dashboard rather than in one release. |
| Treat it as a regulated device | Version the model and its thresholds, record which version scored each alert, and run every change through the change-control process that a software-as-a-medical-device product requires. |

**Deliberately not doing**

- Admission diagnosis text: it encodes the admitting clinician's suspicion, which already knows the label, so the model would look good by repeating what a human thought.
- Antibiotic orders as input: an order placed after suspicion leaks the label and would make the system useless in the exact case it exists for.
- Length of stay so far: longer stays correlate with sepsis only because sicker patients stay longer, and it would make the model drift as discharge practices change.
- Optimising AUROC and shipping whatever threshold falls out: late alerts carry no clinical value yet inflate AUROC, and the threshold is the product.

**How the approach is proven**

Offline, show longer lead time than the early warning score at the same 0.5 alerts per 100 patient-days, on stays held out at the patient level and then at a second hospital, with positive predictive value at the agreed sensitivity. Online, run silently for weeks so alerts are logged but not shown, compare against clinician-recognised cases, then switch on ward by ward with time to antibiotics as the benefit and the override rate and sepsis mortality as stop conditions.

## Baseline and production design

- **Baseline (build this first):** Modified early warning score with fixed thresholds.
- **Production design:** Gradient-boosted model on irregularly sampled features with a GRU-D sequence branch, per-unit thresholds calibrated for alert burden.

## Why AI, and why this kind

**Why AI.** Alert clinicians hours before sepsis onset from streaming vitals and labs, with alert burden low enough that nurses keep trusting it. The evidence that separates good from bad outcomes (Lactate and trend, Missingness pattern, SIRS and qSOFA drift) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "billing-code sepsis labels" are what teams reach for first, and they fail because billing codes lag and misplace onset by hours. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Gradient-boosted model on irregularly sampled features with a GRU-D sequence branch, per-unit thresholds calibrated for alert burden.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Lactate and trend, Missingness pattern, SIRS and qSOFA drift and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Modified early warning score with fixed thresholds | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient-boosted model on irregularly sampled features with a GRU-D sequence branch, per-unit thresholds calibrated for alert burden | chosen | Meets the 80 ms envelope at $0.0029 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to antibiotics after alert) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- A new laboratory analyser reports lactate in different units for some wards, shifting values tenfold, and the model reads a healthy ward as critical or the reverse.
- A threshold change after retraining raises the number of alerts, and clinicians quietly start ignoring them, which is a safety failure that no accuracy metric reports.
- Retrospective validation on one hospital: charting habits, case mix and lab turnaround differ across sites, so a model that looks excellent at the first hospital can be miscalibrated at the second.
- Labels set after clinicians intervened are partly caused by the intervention, which makes the retrospective data look kinder to the model than live use will be.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
