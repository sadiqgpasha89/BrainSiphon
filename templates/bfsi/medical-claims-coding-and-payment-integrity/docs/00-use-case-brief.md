# Medical Claims Coding & Payment Integrity: use-case brief

> Generated from the blueprint `bfsi/medical-claims-coding-and-payment-integrity` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Medical Claims Coding & Payment Integrity · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Check submitted health claims for coding errors, unbundling and duplicate billing before payment. The system has to run interactively, within a few seconds, inside these limits: Providers can appeal, Edits follow published rules and Reviewers see rule or evidence.

**Why it is hard.** The obvious approach is model only, and it fails because rules are auditable and widely accepted. The second trap is in "Pattern": the real signal is provider billing pattern against peers, while teams usually reach for single claim view.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 63 at peak, at an estimated $12.4K a month. A mistake is expensive in the way provider abrasion measures it.

**What success looks like.** Offline: Precision of denials and Overturn rate. Online: Savings net of reversals and Provider abrasion. The launch is judged on "Savings net of reversals" while "Provider abrasion" must not get worse.

## Objective, loss and constraints

**Business objective.** Check submitted health claims for coding errors, unbundling and duplicate billing before payment.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{CE}(\hat{y},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \hat{y} | The model's prediction of y. |

**Hard constraints**

- Providers can appeal
- Edits follow published rules
- Reviewers see rule or evidence
- Payment within statutory time

## The approach in one paragraph

Start with standard edit rules from a vendor, because payers use them. Then earn the move to rule engine plus a model on provider and claim features that scores likely overpayment, with evidence for the reviewer, and only if it beats the baseline on Precision of denials and Overturn rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Code pair conflict | Procedure pairs that should not bill together. Unbundling. Guard against: rule version. |
| Add Provider peer deviation | Share of high-level codes versus peers. Upcoding. Guard against: peer set. |
| Add Duplicate key | Same member, provider, date, code. Duplicates. Guard against: near duplicates. |
| Run it as one pipeline | Claim intake (clearinghouse), Rule edits (coding rules engine), Overpayment model (boosting), Provider notice (document service), Appeal tracker (case tool) and Outcome log (warehouse), with Review queue off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new code set | Track rule updates by effective date and re-test the model on the new code set before go-live. |

**Deliberately not doing**

- Provider name: irrelevant.
- Claim form layout: cosmetic.
- Submission time: weak.

**How the approach is proven**

Prove it offline on Precision of denials and Overturn rate using time-ordered splits, then online on "Savings net of reversals" with "Provider abrasion" as the guardrail. Watch for: Reviewed claims only and Rule leakage.

## Baseline and production design

- **Baseline (build this first):** Standard edit rules from a vendor, because payers use them.
- **Production design:** Rule engine plus a model on provider and claim features that scores likely overpayment, with evidence for the reviewer.

## Why AI, and why this kind

**Why AI.** Check submitted health claims for coding errors, unbundling and duplicate billing before payment. The evidence that separates good from bad outcomes (Code pair conflict, Provider peer deviation, Duplicate key) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "model only" are what teams reach for first, and they fail because rules are auditable and widely accepted. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Rule engine plus a model on provider and claim features that scores likely overpayment, with evidence for the reviewer.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Code pair conflict, Provider peer deviation, Duplicate key and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Standard edit rules from a vendor, because payers use them | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Rule engine plus a model on provider and claim features that scores likely overpayment, with evidence for the reviewer | chosen | Meets the 2500 ms envelope at $0.458 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Savings net of reversals) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Reviewed claims only.
- Evaluation trap: Rule leakage.
- New code set: a new code set year changes procedure and diagnosis codes and old rules misfire.
- Legitimate complex case: an unusual but valid claim is flagged as a coding error.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
