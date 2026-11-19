# Life Insurance Accelerated Underwriting: use-case brief

> Generated from the blueprint `bfsi/life-accelerated-underwriting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Life Insurance Accelerated Underwriting · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Approve eligible life insurance applicants instantly using data already available, referring the rest to full underwriting. The system has to run interactively, within a few seconds, inside these limits: Mortality-slippage budget set by the actuary, Fair-treatment rules and Explainable declines.

**Why it is hard.** The obvious approach is approval rate, and it fails because approving more is easy and can leak claims. The second trap is in "Selection": the real signal is referral band for uncertain risk, while teams usually reach for binary approve or decline.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 4 at peak, at an estimated $3.6K a month. A mistake is expensive in the way mortality slippage measures it.

**What success looks like.** Offline: AUC and referral rate and Mortality ratio by decile. Online: Instant decision share and Mortality slippage. The launch is judged on "Instant decision share" while "Mortality slippage" must not get worse.

## Objective, loss and constraints

**Business objective.** Approve eligible life insurance applicants instantly using data already available, referring the rest to full underwriting.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Brier}(\hat{p},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Brier} | Brier score: the mean squared difference between predicted probability and the 0/1 outcome. |

**Hard constraints**

- Mortality-slippage budget set by the actuary
- Fair-treatment rules
- Explainable declines
- Regulatory data restrictions

## The approach in one paragraph

Start with questionnaire rules with full underwriting for flagged cases, because it is the baseline. Then earn the move to gradient boosting trained against underwriting outcomes and claims, with a referral band and actuarial monitoring of mortality slippage, and only if it beats the baseline on AUC and referral rate and Mortality ratio by decile after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Disclosure consistency | Answers versus prescription and records. Misstatement. Guard against: data coverage. |
| Add Prescription history flags | Chronic medication categories. Health proxies. Guard against: fairness review. |
| Add Motor record | Driving violations. Risk correlate. Guard against: jurisdiction limits. |
| Run it as one pipeline | Application API (gateway), Data enrichment (consented data providers), Risk model (monotone boosting), Eligibility rules (rules engine), Referral to underwriter (workflow), Decision letter (document service) and Mortality monitor (actuarial dashboard). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle data provider outage | Refer the application to full underwriting instead of imputing, and log the outage for monitoring. |

**Deliberately not doing**

- Application time: irrelevant.
- Marketing source: cohort.
- Email provider: proxy.

**How the approach is proven**

Prove it offline on AUC and referral rate and Mortality ratio by decile using time-ordered splits, then online on "Instant decision share" with "Mortality slippage" as the guardrail. Watch for: Labels only for accepted applicants and Long claim delay.

## Baseline and production design

- **Baseline (build this first):** Questionnaire rules with full underwriting for flagged cases, because it is the baseline.
- **Production design:** Gradient boosting trained against underwriting outcomes and claims, with a referral band and actuarial monitoring of mortality slippage.

## Why AI, and why this kind

**Why AI.** Approve eligible life insurance applicants instantly using data already available, referring the rest to full underwriting. The evidence that separates good from bad outcomes (Disclosure consistency, Prescription history flags, Motor record) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "approval rate" are what teams reach for first, and they fail because approving more is easy and can leak claims. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The evidence is mostly structured, with sharp non-linear interactions among hundreds of features and many labelled outcomes: gradient-boosted trees fit that data shape, stay fast on CPU and give reason codes cheaply. Here the production design is: Gradient boosting trained against underwriting outcomes and claims, with a referral band and actuarial monitoring of mortality slippage.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Disclosure consistency, Prescription history flags, Motor record and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Questionnaire rules with full underwriting for flagged cases, because it is the baseline | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Gradient boosting trained against underwriting outcomes and claims, with a referral band and actuarial monitoring of mortality slippage | chosen | Meets the 2500 ms envelope at $2.00 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep tabular or sequence transformer | later | Adds serving cost and latency for little lift on this feature set; revisit when long event sequences carry more signal than aggregates |
| LLM or agent as the decision maker | rejected | An LLM in the decision path breaks the latency and cost envelope and is not calibrated; use it around the model for investigation and explanation |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep tabular or sequence transformer beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Instant decision share) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Labels only for accepted applicants.
- Evaluation trap: Long claim delay.
- Data provider outage: a data provider outage leaves key inputs missing for an applicant.
- Late-disclosed condition: a claim shows that a condition was not disclosed and the fast decision was wrong.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
