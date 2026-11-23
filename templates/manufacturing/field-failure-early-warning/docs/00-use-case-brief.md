# Field Failure Early Warning: use-case brief

> Generated from the blueprint `manufacturing/field-failure-early-warning` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Field Failure Early Warning · **Domain:** manufacturing · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect emerging field failure patterns for a product from service, telemetry and return data weeks before warranty claims show them. The system has to run as a scheduled batch job, inside these limits: Alert when a failure mode exceeds the expected rate with a confidence level, Evidence pack for engineering and Privacy rules for customer data.

**Why it is hard.** The obvious approach is raw counts, and it fails because counts grow with the installed base. The second trap is in "Source": the real signal is service, telemetry and returns together, while teams usually reach for claims only.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 35 at peak, at an estimated $1.8K a month. A mistake is expensive in the way field failures prevented measures it.

**What success looks like.** Offline: Detection lead time on past issues, False alert rate and Attribution accuracy. Online: Time from first failure to action, Field failures prevented and Recall scope accuracy. The launch is judged on "Time from first failure to action" while "Field failures prevented" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect emerging field failure patterns for a product from service, telemetry and return data weeks before warranty claims show them.

**Training objective.** `\mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ECE} | Expected calibration error: the average gap between predicted probability and observed frequency across probability bins. |

**Hard constraints**

- Alert when a failure mode exceeds the expected rate with a confidence level
- Evidence pack for engineering
- Privacy rules for customer data
- Daily run for 3M connected products

## The approach in one paragraph

Start with a weekly review of claim counts by product, because it is the standard monitoring. Then earn the move to a sequential monitoring model of observed against expected rates across telemetry and returns with lot-level attribution and a ranked early-warning list, and only if it beats the baseline on Detection lead time on past issues and False alert rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Failure rate versus expected | Observed to expected ratio by variant and age. Primary signal. Guard against: exposure adjusted. |
| Add Telemetry fault codes | Fault code rates in the field. Early signal. Guard against: per firmware. |
| Add Return reason mix | Returns by reason code. Confirms the mode. Guard against: coded reasons. |
| Run it as one pipeline | Field and return data (service and telemetry feeds), Expected rate model (survival model), Sequential monitor (change detection), Lot attribution (genealogy join), Early warning list (engineering console), Containment decision (quality board) and Outcome tracking (monthly). |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle firmware release | Firmware-aware code maps. |

**Deliberately not doing**

- Customer name: irrelevant and private.
- Dealer name: an identifier.
- Complaint wording: not a cause.

**How the approach is proven**

Prove it offline on Detection lead time on past issues, False alert rate and Attribution accuracy using time-ordered splits, then online on "Time from first failure to action" with "Field failures prevented" as the guardrail. Watch for: Raw counts, Claims-only monitoring and Alerts without affected builds.

## Baseline and production design

- **Baseline (build this first):** A weekly review of claim counts by product, because it is the standard monitoring.
- **Production design:** A sequential monitoring model of observed against expected rates across telemetry and returns with lot-level attribution and a ranked early-warning list.

## Why AI, and why this kind

**Why AI.** Detect emerging field failure patterns for a product from service, telemetry and return data weeks before warranty claims show them. The evidence that separates good from bad outcomes (Failure rate versus expected, Telemetry fault codes, Return reason mix) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "raw counts" are what teams reach for first, and they fail because counts grow with the installed base. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: A sequential monitoring model of observed against expected rates across telemetry and returns with lot-level attribution and a ranked early-warning list.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Failure rate versus expected, Telemetry fault codes, Return reason mix and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A weekly review of claim counts by product, because it is the standard monitoring | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A sequential monitoring model of observed against expected rates across telemetry and returns with lot-level attribution and a ranked early-warning list | chosen | Meets the run-window envelope at $0.021 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time from first failure to action) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Machine and functional safety (ISO 13849, IEC 61508, OSHA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Raw counts.
- Evaluation trap: Claims-only monitoring.
- Firmware release: fault codes change meaning.
- Small variant: few units give noisy rates.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
