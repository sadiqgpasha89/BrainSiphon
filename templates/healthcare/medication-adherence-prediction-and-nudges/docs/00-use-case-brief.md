# Medication Adherence Prediction & Nudges: use-case brief

> Generated from the blueprint `healthcare/medication-adherence-prediction-and-nudges` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Medication Adherence Prediction & Nudges · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Identify patients likely to stop therapy and choose the supportive nudge that most improves adherence within a contact budget. The system has to run as a scheduled batch job, inside these limits: Consent for outreach, Equity in nudges and Contact fatigue.

**Why it is hard.** The obvious approach is predicting non-adherence only, and it fails because prediction without action design wastes budget. The second trap is in "Measure": the real signal is proportion of days covered with refill gaps, while teams usually reach for single refill event.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.7K a month. A mistake is expensive in the way outreach cost per adherent patient measures it.

**What success looks like.** Offline: PDC prediction error and Off-policy value of nudge policy. Online: Proportion of days covered and Outreach cost per adherent patient. The launch is judged on "Proportion of days covered" while "Outreach cost per adherent patient" must not get worse.

## Objective, loss and constraints

**Business objective.** Identify patients likely to stop therapy and choose the supportive nudge that most improves adherence within a contact budget.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)\;\text{and}\;\max_\pi\mathbb{E}[\text{adherence}]\ \text{s.t. contacts}\le B`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy for predicting adherence. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \max_\pi | Maximum: pick the value of the variable written under it that gives the largest result (or, written alone, the larger of the listed values). |
| \mathbb{E} | Expectation: the average over everything that could happen, weighted by how likely it is. |
| \text{adherence} | Whether the patient takes the medication as prescribed. |
| B | The maximum number of nudges (contacts) allowed per patient or period. |

**Hard constraints**

- Consent for outreach
- Equity in nudges
- Contact fatigue
- Evidence-based messages

## The approach in one paragraph

Start with automated refill reminders for everyone. Then earn the move to adherence hazard model with contextual bandit over nudge types (SMS, call, pharmacist), budgeted by contacts per week, and only if it beats the baseline on PDC prediction error and Off-policy value of nudge policy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Refill gap pattern | Days late on past refills. Early disengagement. Guard against: matured fills only. |
| Add Cost-sharing change | Copay change at fill. Financial barrier. Guard against: plan year. |
| Add Side-effect reports | Patient-reported or call-centre notes. Reason to stop. Guard against: consent. |
| Run it as one pipeline | Pharmacy fill data (claims), Adherence features (Spark), Hazard model (GBDT survival), Nudge bandit (Thompson sampling), Outreach platform (SMS and call), Pharmacist follow-up (human) and Refill outcomes (pharmacy feed). |
| Optimise the right thing | The objective weighs binary cross-entropy for predicting adherence, so the model is trained on the cost of the decision and not on a generic score. |
| Handle patient switches pharmacies | Cross-pharmacy fill linkage. |

**Deliberately not doing**

- Pharmacy ID: channel.
- Message send time: confounded.

**How the approach is proven**

Prove it offline on PDC prediction error and Off-policy value of nudge policy using time-ordered splits, then online on "Proportion of days covered" with "Outreach cost per adherent patient" as the guardrail. Watch for: Missing fills at other pharmacies counted as non-adherence and Non-random past outreach.

## Baseline and production design

- **Baseline (build this first):** Automated refill reminders for everyone.
- **Production design:** Adherence hazard model with contextual bandit over nudge types (SMS, call, pharmacist), budgeted by contacts per week.

## Why AI, and why this kind

**Why AI.** Identify patients likely to stop therapy and choose the supportive nudge that most improves adherence within a contact budget. The evidence that separates good from bad outcomes (Refill gap pattern, Cost-sharing change, Side-effect reports) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "predicting non-adherence only" are what teams reach for first, and they fail because prediction without action design wastes budget. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: Adherence hazard model with contextual bandit over nudge types (SMS, call, pharmacist), budgeted by contacts per week.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Refill gap pattern, Cost-sharing change, Side-effect reports and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Automated refill reminders for everyone | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Adherence hazard model with contextual bandit over nudge types (SMS, call, pharmacist), budgeted by contacts per week | chosen | Meets the run-window envelope at $0.037 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Proportion of days covered) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Missing fills at other pharmacies counted as non-adherence.
- Evaluation trap: Non-random past outreach.
- Patient switches pharmacies: appears non-adherent.
- Therapy intentionally stopped by clinician: wasted outreach.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
