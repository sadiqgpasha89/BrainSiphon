# Tax Compliance Outreach Prioritisation: use-case brief

> Generated from the blueprint `public-sector/tax-compliance-outreach-prioritisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Tax Compliance Outreach Prioritisation · **Domain:** public-sector · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Choose who receives reminders, letters or help with late filing and payment so outreach improves compliance at the lowest cost, with support first and enforcement only through officers. The system has to run as a scheduled batch job, inside these limits: Outreach is a nudge or an offer of help, Enforcement decisions by officers and Experiments to confirm what works.

**Why it is hard.** The obvious approach is predicted non-compliance, and it fails because a prediction does not show who responds. The second trap is in "Method": the real signal is randomised tests of letters and timing, while teams usually reach for targeting by risk alone.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.7K a month. A mistake is expensive in the way cost per collected unit measures it.

**What success looks like.** Offline: Uplift on randomised holdouts, Calibration and Parity of message tone. Online: Compliance after outreach, Cost per collected unit and Complaints about letters. The launch is judged on "Compliance after outreach" while "Cost per collected unit" must not get worse.

## Objective, loss and constraints

**Business objective.** Choose who receives reminders, letters or help with late filing and payment so outreach improves compliance at the lowest cost, with support first and enforcement only through officers.

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

- Outreach is a nudge or an offer of help
- Enforcement decisions by officers
- Experiments to confirm what works
- Message language matches the taxpayer
- 10M taxpayers

## The approach in one paragraph

Start with a single reminder letter to every late filer, because it is the common process. Then earn the move to an uplift model from randomised outreach tests that selects message and timing, with a support offer for people in difficulty and fairness monitoring, and only if it beats the baseline on Uplift on randomised holdouts and Calibration after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Past filing and payment behaviour | Timeliness of filings and payments. Base rate. Guard against: from tax records. |
| Add Notice response history | Response to earlier reminders. Uplift. Guard against: from outreach tests. |
| Add Debt size and age | Amount and age of debt. Value. Guard against: from accounts. |
| Run it as one pipeline | Account and notice data (tax system), Uplift model (causal model), Message selection (rules), Outreach send (messaging), Randomised holdout (experiment platform), Officer follow-up (case system) and Impact evaluation (quarterly). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle message fatigue | Frequency limits and rotation. |

**Deliberately not doing**

- Taxpayer name: irrelevant and private.
- Occupation text: weak link.
- Postcode text: a proxy.

**How the approach is proven**

Prove it offline on Uplift on randomised holdouts, Calibration and Parity of message tone using time-ordered splits, then online on "Compliance after outreach" with "Cost per collected unit" as the guardrail. Watch for: Risk scores without tests, Enforcement tone by group and One-size reminders.

## Baseline and production design

- **Baseline (build this first):** A single reminder letter to every late filer, because it is the common process.
- **Production design:** An uplift model from randomised outreach tests that selects message and timing, with a support offer for people in difficulty and fairness monitoring.

## Why AI, and why this kind

**Why AI.** Choose who receives reminders, letters or help with late filing and payment so outreach improves compliance at the lowest cost, with support first and enforcement only through officers. The evidence that separates good from bad outcomes (Past filing and payment behaviour, Notice response history, Debt size and age) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "predicted non-compliance" are what teams reach for first, and they fail because A prediction does not show who responds. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: An uplift model from randomised outreach tests that selects message and timing, with a support offer for people in difficulty and fairness monitoring.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Past filing and payment behaviour, Notice response history, Debt size and age and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A single reminder letter to every late filer, because it is the common process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| An uplift model from randomised outreach tests that selects message and timing, with a support offer for people in difficulty and fairness monitoring | chosen | Meets the run-window envelope at $0.092 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Compliance after outreach) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Risk scores without tests.
- Evaluation trap: Enforcement tone by group.
- Message fatigue: the response rate falls over time.
- Hardship case: payment is not possible.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
