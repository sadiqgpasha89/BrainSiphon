# Software Licence Optimisation: use-case brief

> Generated from the blueprint `it-ops/software-licence-optimisation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Software Licence Optimisation · **Domain:** it-ops · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Match software licences to actual use, reclaim unused seats and forecast renewals so the company pays for what it needs while staying compliant with vendor terms. The system has to run as a scheduled batch job, inside these limits: Reclaim only after notice to the user, Compliance position checked before changes and Licence managers approve.

**Why it is hard.** The obvious approach is install count, and it fails because installed software may be unused. The second trap is in "Risk": the real signal is audit exposure and true-up costs, while teams usually reach for savings only.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way audit true-up costs measures it.

**What success looks like.** Offline: Position accuracy against vendor audit, Reclaim acceptance and Savings realised. Online: Licence spend, Audit true-up costs and Unused seats. The launch is judged on "Licence spend" while "Audit true-up costs" must not get worse.

## Objective, loss and constraints

**Business objective.** Match software licences to actual use, reclaim unused seats and forecast renewals so the company pays for what it needs while staying compliant with vendor terms.

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

- Reclaim only after notice to the user
- Compliance position checked before changes
- Licence managers approve
- Use data kept at product level
- 5K products and 1M seats

## The approach in one paragraph

Start with annual licence true-up exercises, because they are the usual process. Then earn the move to a licence analytics service that computes entitlement position, finds unused seats, issues reclaim notices and plans renewals with licence managers, and only if it beats the baseline on Position accuracy against vendor audit and Reclaim acceptance after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Last use and frequency | Recent usage. Core. Guard against: from usage tools. |
| Add Entitlement count | Licences owned. Position. Guard against: from contracts. |
| Add Renewal date and terms | Contract timing. Planning. Guard against: from the licence register. |
| Run it as one pipeline | Usage and install data (management tools), Entitlement join (licence register), Position calculation (rules), Reclaim candidates (model), Notice and approval (workflow), Reclaim (vendor portal) and Savings tracking (monthly). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle seasonal products | Longer windows. |

**Deliberately not doing**

- Employee name: personal data.
- Vendor sales contact: irrelevant.
- Invoice number: an identifier.

**How the approach is proven**

Prove it offline on Position accuracy against vendor audit, Reclaim acceptance and Savings realised using time-ordered splits, then online on "Licence spend" with "Audit true-up costs" as the guardrail. Watch for: Install count as use, Individual monitoring and Savings without compliance checks.

## Baseline and production design

- **Baseline (build this first):** Annual licence true-up exercises, because they are the usual process.
- **Production design:** A licence analytics service that computes entitlement position, finds unused seats, issues reclaim notices and plans renewals with licence managers.

## Why AI, and why this kind

**Why AI.** Match software licences to actual use, reclaim unused seats and forecast renewals so the company pays for what it needs while staying compliant with vendor terms. The evidence that separates good from bad outcomes (Last use and frequency, Entitlement count, Renewal date and terms) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "install count" are what teams reach for first, and they fail because installed software may be unused. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: A licence analytics service that computes entitlement position, finds unused seats, issues reclaim notices and plans renewals with licence managers.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Last use and frequency, Entitlement count, Renewal date and terms and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Annual licence true-up exercises, because they are the usual process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A licence analytics service that computes entitlement position, finds unused seats, issues reclaim notices and plans renewals with licence managers | chosen | Meets the run-window envelope at $0.037 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Licence spend) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Install count as use.
- Evaluation trap: Individual monitoring.
- Seasonal products: use happens once per quarter.
- Shared accounts: usage maps to one login.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
