# Vendor Credential Compliance Risk Scoring: use-case brief

> Generated from the blueprint `healthcare/vendor-credential-compliance-risk-scoring` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Vendor Credential Compliance Risk Scoring · **Domain:** healthcare · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Identify vendor representatives whose required credentials, training, insurance or attestations are missing, expired or inconsistent, and give access staff an evidence-linked risk score and eligibility recommendation. The system has to run as a scheduled batch job, inside these limits: Rules-first validation decides compliance and the model only prioritises risk, Access remains governed by facility policy and authorised staff and Missing evidence is shown as missing and not as ineligible.

**Why it is hard.** The obvious approach is a learned score of compliance, and it fails because facilities must show exactly which requirement fails. The second trap is in "Evidence": the real signal is document and date linked to each requirement, while teams usually reach for self-attestation only.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.9K a month. A mistake is expensive in the way time to remediate a gap measures it.

**What success looks like.** Offline: PR-AUC and precision at the review capacity, Rule-evaluation accuracy on audited records and Calibration by vendor category. Online: Lapsed credentials reaching a facility, Time to remediate a gap and Access desk handling time. The launch is judged on "Lapsed credentials reaching a facility" while "Time to remediate a gap" must not get worse.

## Objective, loss and constraints

**Business objective.** Identify vendor representatives whose required credentials, training, insurance or attestations are missing, expired or inconsistent, and give access staff an evidence-linked risk score and eligibility recommendation.

**Training objective.** `\mathcal{L}=-\sum_i w_i\,[\,y_i\log p_i+(1-y_i)\log(1-p_i)\,]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_i | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| w_i | A weight that scales how much a particular example, class or term counts in the loss. (one value per example i) |
| y_i | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per example i) |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_i | The model's predicted probability that the outcome is positive (between 0 and 1). (one value per example i) |

**Hard constraints**

- Rules-first validation decides compliance and the model only prioritises risk
- Access remains governed by facility policy and authorised staff
- Missing evidence is shown as missing and not as ineligible
- Evidence-linked scores show the missing or expired item
- Handles 200K representative-credential records
- Personal data is minimised and retained per policy

## The approach in one paragraph

Start with spreadsheet of credential expiry dates with a monthly review. Then earn the move to deterministic requirement validation against a versioned catalogue, document extraction for evidence, and a gradient-boosted risk prioritiser that ranks representatives by likelihood of lapse and exposure, each with its supporting evidence attached, and only if it beats the baseline on PR-AUC and precision at the review capacity and Rule-evaluation accuracy on audited records after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Days to nearest expiry | Minimum days to expiry across required items. Imminent lapse risk. Guard against: use document dates. |
| Add Missing requirement count | Requirements with no valid evidence. Direct compliance gap. Guard against: catalogue version. |
| Add Visit frequency and areas | Recent visit frequency and clinical areas visited. Higher exposure needs stricter checks. Guard against: past visits only. |
| Run it as one pipeline | Credential and document intake (vendor portal and document OCR), Requirement validator (versioned requirement rules), Compliance risk model (gradient boosting) and Eligibility recommendation (policy rules), with Access staff and compliance review and Evidence and audit log off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle vendor submits late | Provisional status rules defined in policy. |

**Deliberately not doing**

- Vendor company size: not a compliance cause.
- Representative name: personal and not predictive.
- Visit purpose free text: noisy.

**How the approach is proven**

Prove it offline on PR-AUC and precision at the review capacity, Rule-evaluation accuracy on audited records and Calibration by vendor category using time-ordered splits, then online on "Lapsed credentials reaching a facility" with "Time to remediate a gap" as the guardrail. Watch for: Scoring on records already remediated, Mixing requirement catalogue versions and Treating missing evidence as violation.

## Baseline and production design

- **Baseline (build this first):** Spreadsheet of credential expiry dates with a monthly review.
- **Production design:** Deterministic requirement validation against a versioned catalogue, document extraction for evidence, and a gradient-boosted risk prioritiser that ranks representatives by likelihood of lapse and exposure, each with its supporting evidence attached.

## Why AI, and why this kind

**Why AI.** Identify vendor representatives whose required credentials, training, insurance or attestations are missing, expired or inconsistent, and give access staff an evidence-linked risk score and eligibility recommendation. The evidence that separates good from bad outcomes (Days to nearest expiry, Missing requirement count, Visit frequency and areas) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A learned score of compliance" are what teams reach for first, and they fail because facilities must show exactly which requirement fails. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Deterministic requirement validation against a versioned catalogue, document extraction for evidence, and a gradient-boosted risk prioritiser that ranks representatives by likelihood of lapse and exposure, each with its supporting evidence attached.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Days to nearest expiry, Missing requirement count, Visit frequency and areas and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Spreadsheet of credential expiry dates with a monthly review | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Deterministic requirement validation against a versioned catalogue, document extraction for evidence, and a gradient-boosted risk prioritiser that ranks representatives by likelihood of lapse and exposure, each with its supporting evidence attached | chosen | Meets the run-window envelope at $0.042 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Lapsed credentials reaching a facility) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Scoring on records already remediated.
- Evaluation trap: Mixing requirement catalogue versions.
- Vendor submits late: an eligible person is blocked.
- Requirement catalogue changes: all vendors appear non-compliant.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
