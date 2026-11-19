# Merchant Risk Scoring at Onboarding: use-case brief

> Generated from the blueprint `fintech/merchant-risk-scoring-onboarding` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Merchant Risk Scoring at Onboarding · **Domain:** fintech · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Score new merchants for fraud, regulatory and credit risk during onboarding, auto-approving the safe majority within a minute. The system has to run interactively, within a few seconds, inside these limits: Prohibited-business screening, Beneficial-owner verification and Decision in under 60 s for 80%.

**Why it is hard.** The obvious approach is declared business description, and it fails because fraudulent merchants declare benign categories. The second trap is in "Network": the real signal is ownership and director links to previously terminated merchants, while teams usually reach for single-entity KYB checks.

**Scale and stakes.** At 10 million users this is about 30.0K model-touching events a day, 0 requests per second on average and 2 at peak, at an estimated $12.2K a month. A mistake is expensive in the way merchant fraud rate at 90 days measures it.

**What success looks like.** Offline: PR-AUC on later fraud or chargeback and Auto-approval precision. Online: Time to onboard and Merchant fraud rate at 90 days. The launch is judged on "Time to onboard" while "Merchant fraud rate at 90 days" must not get worse.

## Objective, loss and constraints

**Business objective.** Score new merchants for fraud, regulatory and credit risk during onboarding, auto-approving the safe majority within a minute.

**Training objective.** `\mathcal{L}=\mathrm{CE}(y,p)+\lambda\,\mathrm{ExpectedCostGap}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ExpectedCostGap} | Penalty for the difference between the expected cost of the model's decisions and the best achievable cost. |

**Hard constraints**

- Prohibited-business screening
- Beneficial-owner verification
- Decision in under 60 s for 80%
- Explainable declines

## The approach in one paragraph

Start with kYB checklist rules with sanctions screening. Then earn the move to multi-signal model combining website text classifier, graph features and GBDT, with LLM-extracted business summary for analysts, and only if it beats the baseline on PR-AUC on later fraud or chargeback and Auto-approval precision after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around MCC-site mismatch | Classifier probability that the site belongs to the declared MCC. Misdeclaration is a risk marker. Guard against: crawl at onboarding time and freeze. |
| Add Shared-director risk | Max risk score among entities sharing directors or addresses. Re-registration pattern. Guard against: graph snapshot as-of application. |
| Add Projected volume anomaly | Declared monthly volume versus category quantiles. Overstated or understated volume. Guard against: declared value not observed future volume. |
| Run it as one pipeline | Onboarding form (web API), Website crawler and classifier (transformer), Entity graph lookup (graph DB), Merchant risk model (GBDT), Policy decision (prohibited-list rules) and Portfolio outcomes (chargeback and fraud feed), with Risk analyst review off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle website behind login | Request demo credentials and treat missing content as risk feature. |

**Deliberately not doing**

- Company name length: no signal.
- Incorporation month: spurious seasonality.

**How the approach is proven**

Prove it offline on PR-AUC on later fraud or chargeback and Auto-approval precision using time-ordered splits, then online on "Time to onboard" with "Merchant fraud rate at 90 days" as the guardrail. Watch for: Outcomes only observed for approved merchants and Crawl snapshot differs from what the merchant showed at onboarding.

## Baseline and production design

- **Baseline (build this first):** KYB checklist rules with sanctions screening.
- **Production design:** Multi-signal model combining website text classifier, graph features and GBDT, with LLM-extracted business summary for analysts.

## Why AI, and why this kind

**Why AI.** Score new merchants for fraud, regulatory and credit risk during onboarding, auto-approving the safe majority within a minute. The evidence that separates good from bad outcomes (MCC-site mismatch, Shared-director risk, Projected volume anomaly) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "declared business description" are what teams reach for first, and they fail because fraudulent merchants declare benign categories. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Multi-signal model combining website text classifier, graph features and GBDT, with LLM-extracted business summary for analysts.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among MCC-site mismatch, Shared-director risk, Projected volume anomaly and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: KYB checklist rules with sanctions screening | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Multi-signal model combining website text classifier, graph features and GBDT, with LLM-extracted business summary for analysts | chosen | Meets the 2500 ms envelope at $13.59 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to onboard) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Outcomes only observed for approved merchants.
- Evaluation trap: Crawl snapshot differs from what the merchant showed at onboarding.
- Website behind login: crawler sees nothing.
- Reseller platform onboarding sub-merchants: concentration risk hidden.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
