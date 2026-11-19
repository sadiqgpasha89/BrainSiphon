# Commercial Insurance Submission Intake & Risk Extraction: use-case brief

> Generated from the blueprint `bfsi/commercial-submission-intake-and-risk-extraction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Commercial Insurance Submission Intake & Risk Extraction · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Read broker submissions (emails, ACORD forms, spreadsheets, loss runs) and extract structured risk data so underwriters can quote faster. The system has to run interactively, within a few seconds, inside these limits: Every extracted field links to its source page or cell, An underwriter confirms the data before any quote is issued and Broker data kept confidential and separated by broker.

**Why it is hard.** The obvious approach is guessing the missing fields, and it fails because wrong inputs lead to a wrong price, and the error surfaces at claim time. The second trap is in "Loss runs": the real signal is the parsed claims history by year and cause, while teams usually reach for a summary total.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $47.6K a month. A mistake is expensive in the way underwriter keying time measures it.

**What success looks like.** Offline: Field accuracy and Triage precision. Online: Time to first quote and Underwriter keying time. The launch is judged on "Time to first quote" while "Underwriter keying time" must not get worse.

## Objective, loss and constraints

**Business objective.** Read broker submissions (emails, ACORD forms, spreadsheets, loss runs) and extract structured risk data so underwriters can quote faster.

**Training objective.** `\mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \hat{y} | The model's prediction of y. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |

**Hard constraints**

- Every extracted field links to its source page or cell
- An underwriter confirms the data before any quote is issued
- Broker data kept confidential and separated by broker
- Initial response to the broker within 4 hours

## The approach in one paragraph

Start with manual re-keying by underwriting assistants, because it is the current process. Then earn the move to document classification and extraction with schema, appetite triage, missing-info agent and underwriter confirmation, and only if it beats the baseline on Field accuracy and Triage precision after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Field confidence | Calibrated probability that each extracted field is correct. Routes uncertain fields to review. Guard against: calibrate per field type, as amounts and dates differ. |
| Add Appetite match | Match of class, size and geography to the underwriting appetite rules. Fast triage. Guard against: appetite rules change often, so version them. |
| Add Loss run totals | Sum of paid and incurred losses parsed from the loss runs. A key underwriting input. Guard against: parsing errors change the total, so compare with the printed total. |
| Run it as one pipeline | Submission mailbox (email gateway), Document classifier (layout model), Extractor (LLM with schema), Appetite triage (rules plus boosting), Missing info drafter (LLM), Underwriter desk (workbench) and Quote system (rating engine). |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle scanned loss runs | Gate on image quality, compare parsed totals with printed totals and request a clean copy when they differ. |

**Deliberately not doing**

- Email signature: Cosmetic text that is not risk data.
- Broker font: Cosmetic and has no meaning for the risk.
- Attachment names: Unreliable as brokers name files in different ways.

**How the approach is proven**

Prove it offline on Field accuracy and Triage precision using time-ordered splits, then online on "Time to first quote" with "Underwriter keying time" as the guardrail. Watch for: Clean test submissions are better formatted than live ones and Broker overlap, since the same brokers appear in training and in test and the model learns their templates.

## Baseline and production design

- **Baseline (build this first):** Manual re-keying by underwriting assistants, because it is the current process.
- **Production design:** Document classification and extraction with schema, appetite triage, missing-info agent and underwriter confirmation.

## Why AI, and why this kind

**Why AI.** Read broker submissions (emails, ACORD forms, spreadsheets, loss runs) and extract structured risk data so underwriters can quote faster. The evidence that separates good from bad outcomes (Field confidence, Appetite match, Loss run totals) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "guessing the missing fields" are what teams reach for first, and they fail because wrong inputs lead to a wrong price, and the error surfaces at claim time. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: Document classification and extraction with schema, appetite triage, missing-info agent and underwriter confirmation.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Field confidence, Appetite match, Loss run totals and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual re-keying by underwriting assistants, because it is the current process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Document classification and extraction with schema, appetite triage, missing-info agent and underwriter confirmation | chosen | Meets the 2500 ms envelope at $5.29 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to first quote) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Clean test submissions are better formatted than live ones.
- Evaluation trap: Broker overlap, since the same brokers appear in training and in test and the model learns their templates.
- Scanned loss runs: scanned loss runs have poor OCR and the claim totals come out wrong.
- Multiple locations: a schedule of locations arrives as a spreadsheet and is read as one risk.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
