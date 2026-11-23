# Legal Aid Eligibility Screening: use-case brief

> Generated from the blueprint `public-safety/legal-aid-eligibility-screening` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Legal Aid Eligibility Screening · **Domain:** public-safety · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Help people check whether they may qualify for legal aid and prepare their documents, with the formal decision made by an officer. The system has to run interactively, within a few seconds, inside these limits: Rules from the legal text with the rule shown, The assistant never decides and Result says may qualify.

**Why it is hard.** The obvious approach is a learned predictor, and it fails because eligibility is set by law. The second trap is in "Role": the real signal is explaining and preparing, while teams usually reach for deciding.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $86.9K a month. A mistake is expensive in the way incomplete applications measures it.

**What success looks like.** Offline: Rule engine accuracy, Explanation faithfulness and Urgent routing recall. Online: Eligible people reached, Incomplete applications and Officer time per case. The launch is judged on "Eligible people reached" while "Incomplete applications" must not get worse.

## Objective, loss and constraints

**Business objective.** Help people check whether they may qualify for legal aid and prepare their documents, with the formal decision made by an officer.

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

- Rules from the legal text with the rule shown
- The assistant never decides
- Result says may qualify
- Officer decides and the applicant can appeal
- 1M screenings per year

## The approach in one paragraph

Start with a static eligibility page and phone appointment with intake staff, because it is the current process. Then earn the move to a rules engine with a conversational layer that asks missing questions, lists documents and books officer review, with urgent cases routed to a person, and only if it beats the baseline on Rule engine accuracy and Explanation faithfulness after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Income and asset rule match | Tests against thresholds. Core. Guard against: from rules. |
| Add Case type match | Matter types covered. Core. Guard against: from rules. |
| Add Missing documents | Documents still needed. Next step. Guard against: from the checklist. |
| Run it as one pipeline | User answers (web or phone assisted), Rules engine (legal rules as code), Missing information check (rules), Explanation (LLM with controlled text) and Rule update process (policy team), with Urgent case routing and Officer review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle rule change | Versioned rules and tests. |

**Deliberately not doing**

- Applicant name: personal data.
- Device: irrelevant.
- Time of day: irrelevant.

**How the approach is proven**

Prove it offline on Rule engine accuracy, Explanation faithfulness and Urgent routing recall using time-ordered splits, then online on "Eligible people reached" with "Incomplete applications" as the guardrail. Watch for: Learned eligibility, Decisions by the assistant and One-language service.

## Baseline and production design

- **Baseline (build this first):** A static eligibility page and phone appointment with intake staff, because it is the current process.
- **Production design:** A rules engine with a conversational layer that asks missing questions, lists documents and books officer review, with urgent cases routed to a person.

## Why AI, and why this kind

**Why AI.** Help people check whether they may qualify for legal aid and prepare their documents, with the formal decision made by an officer. The evidence that separates good from bad outcomes (Income and asset rule match, Case type match, Missing documents) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A learned predictor" are what teams reach for first, and they fail because eligibility is set by law. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: A rules engine with a conversational layer that asks missing questions, lists documents and books officer review, with urgent cases routed to a person.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Income and asset rule match, Case type match, Missing documents and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A static eligibility page and phone appointment with intake staff, because it is the current process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A rules engine with a conversational layer that asks missing questions, lists documents and books officer review, with urgent cases routed to a person | chosen | Meets the 2500 ms envelope at $4.83 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Eligible people reached) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Learned eligibility.
- Evaluation trap: Decisions by the assistant.
- Rule change: thresholds change.
- Complex family: assets are shared.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
