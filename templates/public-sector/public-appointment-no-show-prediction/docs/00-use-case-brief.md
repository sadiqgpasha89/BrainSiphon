# Public Service Appointment No-Show Prediction: use-case brief

> Generated from the blueprint `public-sector/public-appointment-no-show-prediction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Public Service Appointment No-Show Prediction · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Predict missed appointments at licensing, registry and advice offices so reminders and slots are managed, and never to deny or penalise anyone. The system has to run as a scheduled batch job, inside these limits: Used for reminders and overbooking limits only, No penalties or service denial and Reminders in the person's language and channel.

**Why it is hard.** The obvious approach is penalising likely no-shows, and it fails because people miss appointments for reasons such as work or transport. The second trap is in "Label": the real signal is appointments missed without rebooking, while teams usually reach for cancellations.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 10 at peak, at an estimated $1.7K a month. A mistake is expensive in the way slot utilisation measures it.

**What success looks like.** Offline: Calibration, Lift of extra reminders and Reminder quality parity. Online: No-show rate, Slot utilisation and Complaints about overbooking. The launch is judged on "No-show rate" while "Slot utilisation" must not get worse.

## Objective, loss and constraints

**Business objective.** Predict missed appointments at licensing, registry and advice offices so reminders and slots are managed, and never to deny or penalise anyone.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Used for reminders and overbooking limits only
- No penalties or service denial
- Reminders in the person's language and channel
- Calibrated probabilities
- 3M appointments per year

## The approach in one paragraph

Start with uniform reminders a few days before the appointment, because it is common practice. Then earn the move to a calibrated no-show model that selects who gets extra reminders or easy rebooking, with limited overbooking and a fairness check by language and area, and only if it beats the baseline on Calibration and Lift of extra reminders after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Lead time | Days between booking and the appointment. Risk. Guard against: from booking. |
| Add Reminder response | Confirmation of reminders. Intent. Guard against: from messaging. |
| Add Appointment type | Service and slot type. Base rate. Guard against: from booking. |
| Run it as one pipeline | Booking and attendance data (appointment system), Feature build (aggregated history), No-show model (gradient boosting), Reminder policy (rules), Message sending (messaging), Rebooking links (portal) and Parity check (monthly). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle public transport strike | Event flags and rebooking drives. |

**Deliberately not doing**

- Person name: irrelevant and private.
- Address: irrelevant and private.
- Device type: weak link.

**How the approach is proven**

Prove it offline on Calibration, Lift of extra reminders and Reminder quality parity using time-ordered splits, then online on "No-show rate" with "Slot utilisation" as the guardrail. Watch for: Penalising predicted no-shows, Cancellations as no-shows and Neighbourhood targeting.

## Baseline and production design

- **Baseline (build this first):** Uniform reminders a few days before the appointment, because it is common practice.
- **Production design:** A calibrated no-show model that selects who gets extra reminders or easy rebooking, with limited overbooking and a fairness check by language and area.

## Why AI, and why this kind

**Why AI.** Predict missed appointments at licensing, registry and advice offices so reminders and slots are managed, and never to deny or penalise anyone. The evidence that separates good from bad outcomes (Lead time, Reminder response, Appointment type) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "penalising likely no-shows" are what teams reach for first, and they fail because people miss appointments for reasons such as work or transport. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A calibrated no-show model that selects who gets extra reminders or easy rebooking, with limited overbooking and a fairness check by language and area.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Lead time, Reminder response, Appointment type and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Uniform reminders a few days before the appointment, because it is common practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A calibrated no-show model that selects who gets extra reminders or easy rebooking, with limited overbooking and a fairness check by language and area | chosen | Meets the run-window envelope at $0.062 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (No-show rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Penalising predicted no-shows.
- Evaluation trap: Cancellations as no-shows.
- Public transport strike: many miss at once.
- New service: there is no history.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
