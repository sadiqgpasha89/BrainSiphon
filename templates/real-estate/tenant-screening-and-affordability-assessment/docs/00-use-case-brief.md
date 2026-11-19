# Tenant Screening & Affordability Assessment: use-case brief

> Generated from the blueprint `real-estate/tenant-screening-and-affordability-assessment` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Tenant Screening & Affordability Assessment · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Assess whether a rental applicant can afford a unit and is likely to pay and care for it, using verified income and history, in a fair and explainable way. The system has to run interactively, within a few seconds, inside these limits: Complies with fair-housing and credit-reporting law in each jurisdiction, Every decline or adverse action comes with specific, accurate reasons and No protected attributes or close proxies in features.

**Why it is hard.** The obvious approach is a credit score on its own, and it fails because a thin file belongs to many reliable tenants, and a score alone rejects them. The second trap is in "Fairness": the real signal is error rates monitored for each protected group, while teams usually reach for overall accuracy.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $12.3K a month. A mistake is expensive in the way approval equity measures it.

**What success looks like.** Offline: AUC and Group error rates. Online: Delinquency rate and Approval equity. The launch is judged on "Delinquency rate" while "Approval equity" must not get worse.

## Objective, loss and constraints

**Business objective.** Assess whether a rental applicant can afford a unit and is likely to pay and care for it, using verified income and history, in a fair and explainable way.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{EqualisedOdds}(\hat{p})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{EqualisedOdds} | Equalised odds penalty: grows when true-positive and false-positive rates differ between groups. |

**Hard constraints**

- Complies with fair-housing and credit-reporting law in each jurisdiction
- Every decline or adverse action comes with specific, accurate reasons
- No protected attributes or close proxies in features
- Applicants can see their data, dispute it and have a human re-review

## The approach in one paragraph

Start with income at least three times the rent plus a credit threshold, because landlords use it. Then earn the move to calibrated model with verified-income features, fairness constraints, reasons and a human review for borderline cases, and only if it beats the baseline on AUC and Group error rates after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Rent-to-income ratio | Monthly rent divided by verified monthly gross income. The core affordability measure that landlords and regulators accept. Guard against: only count income verified from a payroll or bank source. |
| Add Rental payment history | Months of on-time rent payments from reporting agencies or landlord references. Direct evidence of the behaviour being predicted. Guard against: reporting is patchy, so absence is not evidence of a problem. |
| Add Income stability | Months in the current role and income variance over 12 months. Stable income predicts steady payment. Guard against: gig and seasonal work look unstable without being risky, so model them separately. |
| Run it as one pipeline | Application intake (portal), Document verifier (OCR and checks), Feature builder (rules), Risk model (monotone boosting), Fairness monitor (audit), Landlord decision (workflow) and Dispute handling (case tool). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle no credit history | Accept alternative evidence such as rent history and employer letters and route to human review. |

**Deliberately not doing**

- Name: A protected characteristic in many places and no predictor of payment.
- Postcode of origin: A proxy for race and income that breaches fair-housing rules.
- Social media: Unreliable, unverifiable and intrusive, and it invites discrimination.

**How the approach is proven**

Prove it offline on AUC and Group error rates using time-ordered splits, then online on "Delinquency rate" with "Approval equity" as the guardrail. Watch for: Outcomes are seen only for applicants who were accepted, so the model never learns about the rejected ones and Proxy features that look neutral reproduce group differences in the data.

## Baseline and production design

- **Baseline (build this first):** Income at least three times the rent plus a credit threshold, because landlords use it.
- **Production design:** Calibrated model with verified-income features, fairness constraints, reasons and a human review for borderline cases.

## Why AI, and why this kind

**Why AI.** Assess whether a rental applicant can afford a unit and is likely to pay and care for it, using verified income and history, in a fair and explainable way. The evidence that separates good from bad outcomes (Rent-to-income ratio, Rental payment history, Income stability) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A credit score on its own" are what teams reach for first, and they fail because A thin file belongs to many reliable tenants, and a score alone rejects them. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Calibrated model with verified-income features, fairness constraints, reasons and a human review for borderline cases.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Rent-to-income ratio, Rental payment history, Income stability and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Income at least three times the rent plus a credit threshold, because landlords use it | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Calibrated model with verified-income features, fairness constraints, reasons and a human review for borderline cases | chosen | Meets the 2500 ms envelope at $2.73 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Delinquency rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Outcomes are seen only for applicants who were accepted, so the model never learns about the rejected ones.
- Evaluation trap: Proxy features that look neutral reproduce group differences in the data.
- No credit history: an applicant with no credit history, such as a recent arrival, is scored as high risk.
- Housing subsidy: a housing voucher or subsidy changes how income and rent are counted.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
