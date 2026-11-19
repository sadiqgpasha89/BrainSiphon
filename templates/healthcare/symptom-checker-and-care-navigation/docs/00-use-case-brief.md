# Symptom Checker & Care Navigation: use-case brief

> Generated from the blueprint `healthcare/symptom-checker-and-care-navigation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Symptom Checker & Care Navigation · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Guide users from symptoms to the right level of care (self-care, GP, urgent, emergency) safely and consistently. The system has to run interactively, within a few seconds, inside these limits: Under-triage minimised, Clinical protocol alignment and No diagnosis claims.

**Why it is hard.** The obvious approach is maximum-likelihood diagnosis, and it fails because the goal is correct urgency not a diagnosis. The second trap is in "Protocol": the real signal is clinically authored decision logic with ML assisting, while teams usually reach for pure LLM reasoning.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 63 at peak, at an estimated $143.5K a month. A mistake is expensive in the way unnecessary ED visits avoided measures it.

**What success looks like.** Offline: Under-triage rate on vignette sets and Agreement with clinician disposition. Online: Appropriate care-level match and Unnecessary ED visits avoided. The launch is judged on "Appropriate care-level match" while "Unnecessary ED visits avoided" must not get worse.

## Objective, loss and constraints

**Business objective.** Guide users from symptoms to the right level of care (self-care, GP, urgent, emergency) safely and consistently.

**Training objective.** `\mathcal{L}=\mathrm{OrdinalCE}(\text{disposition},p)+\lambda\,\mathrm{UnderTriagePenalty}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{OrdinalCE} | Ordinal cross-entropy: cross-entropy that treats classes as ordered, so predicting far from the true grade costs more than predicting next to it. |
| \text{disposition} | The recommended level of care, from self-care up to emergency, treated as ordered grades. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{UnderTriagePenalty} | Extra penalty for recommending a lower level of care than needed. |

**Hard constraints**

- Under-triage minimised
- Clinical protocol alignment
- No diagnosis claims
- Audit of every pathway

## The approach in one paragraph

Start with static questionnaire with branching logic. Then earn the move to dialogue agent that fills protocol slots via LLM, evaluates clinician-authored triage logic deterministically, and learns follow-up question ordering from outcomes, and only if it beats the baseline on Under-triage rate on vignette sets and Agreement with clinician disposition after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Red-flag symptom detection | Rule-based emergency symptom match. Hard escalation. Guard against: clinician-curated list. |
| Add Symptom-slot completeness | Required questions answered. Reliability. Guard against: dialogue state. |
| Add Demographic and history risk | Age, pregnancy, chronic disease. Modifies urgency. Guard against: self-reported. |
| Run it as one pipeline | Chat or voice front end (app), Symptom extractor (LLM structured), Protocol engine (deterministic logic), Red-flag overrides (rules), Disposition explainer (LLM constrained) and Outcome follow-up (surveys), with Clinician review of edge cases off the critical path. |
| Optimise the right thing | The objective weighs ordinal cross-entropy: cross-entropy that treats classes as ordered, so predicting far from the true grade costs more than predicting next to it, so the model is trained on the cost of the decision and not on a generic score. |
| Handle user downplays symptoms | Conservative defaults and red-flag question insertion. |

**Deliberately not doing**

- Chat length: none.
- Device: none.

**How the approach is proven**

Prove it offline on Under-triage rate on vignette sets and Agreement with clinician disposition using time-ordered splits, then online on "Appropriate care-level match" with "Unnecessary ED visits avoided" as the guardrail. Watch for: Vignettes simpler than real patients and Outcome data biased to those who followed advice.

## Baseline and production design

- **Baseline (build this first):** Static questionnaire with branching logic.
- **Production design:** Dialogue agent that fills protocol slots via LLM, evaluates clinician-authored triage logic deterministically, and learns follow-up question ordering from outcomes.

## Why AI, and why this kind

**Why AI.** Guide users from symptoms to the right level of care (self-care, GP, urgent, emergency) safely and consistently. The evidence that separates good from bad outcomes (Red-flag symptom detection, Symptom-slot completeness, Demographic and history risk) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "maximum-likelihood diagnosis" are what teams reach for first, and they fail because the goal is correct urgency not a diagnosis. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: Dialogue agent that fills protocol slots via LLM, evaluates clinician-authored triage logic deterministically, and learns follow-up question ordering from outcomes.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Red-flag symptom detection, Symptom-slot completeness, Demographic and history risk and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Static questionnaire with branching logic | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Dialogue agent that fills protocol slots via LLM, evaluates clinician-authored triage logic deterministically, and learns follow-up question ordering from outcomes | chosen | Meets the 2500 ms envelope at $5.32 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Appropriate care-level match) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Vignettes simpler than real patients.
- Evaluation trap: Outcome data biased to those who followed advice.
- User downplays symptoms: minimised symptom reports lead to a lower urgency disposition than the situation warrants.
- Language and literacy variation: misunderstood questions.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
