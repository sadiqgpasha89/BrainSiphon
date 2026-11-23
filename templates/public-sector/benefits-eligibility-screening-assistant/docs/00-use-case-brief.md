# Benefits Eligibility Screening Assistant: use-case brief

> Generated from the blueprint `public-sector/benefits-eligibility-screening-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Benefits Eligibility Screening Assistant · **Domain:** public-sector · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Help residents and caseworkers see which benefits they may qualify for from a short set of answers, with the rules shown, so eligible people apply and no automated denial occurs. The system has to run interactively, within a few seconds, inside these limits: Rules-based eligibility logic with the rule text shown, The assistant never denies a claim and Result says may qualify not does qualify.

**Why it is hard.** The obvious approach is a learned predictor, and it fails because eligibility is defined by law not by pattern. The second trap is in "Language": the real signal is the assistant explains the result and next steps, while teams usually reach for the assistant deciding.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 63 at peak, at an estimated $127.9K a month. A mistake is expensive in the way incorrect applications measures it.

**What success looks like.** Offline: Rule engine accuracy against legal test cases, Explanation faithfulness and Handoff precision. Online: Take-up of eligible benefits, Incorrect applications and Caseworker time per case. The launch is judged on "Take-up of eligible benefits" while "Incorrect applications" must not get worse.

## Objective, loss and constraints

**Business objective.** Help residents and caseworkers see which benefits they may qualify for from a short set of answers, with the rules shown, so eligible people apply and no automated denial occurs.

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

- Rules-based eligibility logic with the rule text shown
- The assistant never denies a claim
- Result says may qualify not does qualify
- Caseworker handles the formal decision
- 5M screenings per year

## The approach in one paragraph

Start with a static eligibility checklist on the website, because it is the current approach. Then earn the move to a rules engine from the legal text with a conversational layer that asks missing questions, explains each result with its rule and routes to a caseworker for any claim, and only if it beats the baseline on Rule engine accuracy against legal test cases and Explanation faithfulness after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Rule match per programme | Which rules are met and unmet. Core result. Guard against: from the rules engine. |
| Add Missing information | Facts needed to complete the check. Follow-up question. Guard against: from the engine. |
| Add Rule version | The date and version of the rule. Correctness. Guard against: from the rules store. |
| Run it as one pipeline | User answers (web or assisted channel), Rules engine (legal rules as code), Missing information check (rules), Explanation (LLM with controlled text), Caseworker handoff (case system) and Rule update process (policy team), with Accuracy audit off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle rule change | Versioned rules and tests. |

**Deliberately not doing**

- Resident name: irrelevant and private.
- Device type: irrelevant.
- Time of day: irrelevant.

**How the approach is proven**

Prove it offline on Rule engine accuracy against legal test cases, Explanation faithfulness and Handoff precision using time-ordered splits, then online on "Take-up of eligible benefits" with "Incorrect applications" as the guardrail. Watch for: Learned eligibility, Denials by the assistant and Retaining profiles.

## Baseline and production design

- **Baseline (build this first):** A static eligibility checklist on the website, because it is the current approach.
- **Production design:** A rules engine from the legal text with a conversational layer that asks missing questions, explains each result with its rule and routes to a caseworker for any claim.

## Why AI, and why this kind

**Why AI.** Help residents and caseworkers see which benefits they may qualify for from a short set of answers, with the rules shown, so eligible people apply and no automated denial occurs. The evidence that separates good from bad outcomes (Rule match per programme, Missing information, Rule version) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A learned predictor" are what teams reach for first, and they fail because eligibility is defined by law not by pattern. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: A rules engine from the legal text with a conversational layer that asks missing questions, explains each result with its rule and routes to a caseworker for any claim.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Rule match per programme, Missing information, Rule version and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A static eligibility checklist on the website, because it is the current approach | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A rules engine from the legal text with a conversational layer that asks missing questions, explains each result with its rule and routes to a caseworker for any claim | chosen | Meets the 2500 ms envelope at $4.74 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Take-up of eligible benefits) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Learned eligibility.
- Evaluation trap: Denials by the assistant.
- Rule change: a law changes thresholds.
- Contradictory answers: the resident gives inconsistent facts.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
