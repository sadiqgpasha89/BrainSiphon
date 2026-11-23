# Payment Difficulty Early Support: use-case brief

> Generated from the blueprint `energy/payment-difficulty-early-support` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Payment Difficulty Early Support · **Domain:** energy · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Identify customers who may soon struggle to pay so the utility can offer payment plans, advice and support early, never as a basis for automatic collection or disconnection. The system has to run as a scheduled batch job, inside these limits: Outputs trigger support offers only, No automated disconnection or fee decision and Human review for every outreach list.

**Why it is hard.** The obvious approach is collections pressure, and it fails because support reduces harm and debt. The second trap is in "Label": the real signal is customers who later missed payments or sought help, while teams usually reach for disconnection events.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way arrears measures it.

**What success looks like.** Offline: Calibration, Recall of customers who later need help and Fairness gaps in offer rates. Online: Early payment plans taken up, Arrears and Disconnections avoided. The launch is judged on "Early payment plans taken up" while "Arrears" must not get worse.

## Objective, loss and constraints

**Business objective.** Identify customers who may soon struggle to pay so the utility can offer payment plans, advice and support early, never as a basis for automatic collection or disconnection.

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

- Outputs trigger support offers only
- No automated disconnection or fee decision
- Human review for every outreach list
- Audited for fairness across groups
- 3M accounts

## The approach in one paragraph

Start with reminders sent after a bill is overdue, because it is the standard process. Then earn the move to a calibrated model that prioritises support outreach, a rules layer that blocks any use for collection decisions and a fairness audit across customer groups, and only if it beats the baseline on Calibration and Recall of customers who later need help after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Payment pattern change | Shift in payment timing and amounts. Core signal. Guard against: from billing. |
| Add Bill size relative to usual | Unusual bill increases. Trigger. Guard against: from billing. |
| Add Contact history | Calls about payments. Need. Guard against: from CRM. |
| Run it as one pipeline | Billing and payment extraction (CIS), Feature build (time-aware joins), Support need model (gradient boosting), Policy gate (rules), Outreach list (reviewed queue) and Support offer (customer care), with Fairness and outcome audit off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle policy drift | Technical block and governance sign-off. |

**Deliberately not doing**

- Customer name: irrelevant and private.
- Postcode text: a proxy for protected groups.
- Age alone: irrelevant and risky.

**How the approach is proven**

Prove it offline on Calibration, Recall of customers who later need help and Fairness gaps in offer rates using time-ordered splits, then online on "Early payment plans taken up" with "Arrears" as the guardrail. Watch for: Using scores for disconnection, Overdue-only reminders and Postcode proxies.

## Baseline and production design

- **Baseline (build this first):** Reminders sent after a bill is overdue, because it is the standard process.
- **Production design:** A calibrated model that prioritises support outreach, a rules layer that blocks any use for collection decisions and a fairness audit across customer groups.

## Why AI, and why this kind

**Why AI.** Identify customers who may soon struggle to pay so the utility can offer payment plans, advice and support early, never as a basis for automatic collection or disconnection. The evidence that separates good from bad outcomes (Payment pattern change, Bill size relative to usual, Contact history) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "collections pressure" are what teams reach for first, and they fail because support reduces harm and debt. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A calibrated model that prioritises support outreach, a rules layer that blocks any use for collection decisions and a fairness audit across customer groups.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Payment pattern change, Bill size relative to usual, Contact history and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Reminders sent after a bill is overdue, because it is the standard process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A calibrated model that prioritises support outreach, a rules layer that blocks any use for collection decisions and a fairness audit across customer groups | chosen | Meets the run-window envelope at $0.038 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Early payment plans taken up) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Using scores for disconnection.
- Evaluation trap: Overdue-only reminders.
- Policy drift: someone wants to use scores for collections.
- Data gaps: payments arrive through third parties.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
