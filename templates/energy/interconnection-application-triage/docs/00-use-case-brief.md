# Interconnection Application Triage: use-case brief

> Generated from the blueprint `energy/interconnection-application-triage` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Interconnection Application Triage · **Domain:** energy · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Check, classify and route requests to connect solar, storage and generation so incomplete applications are fixed early and simple ones move quickly. The system has to run interactively, within a few seconds, inside these limits: Completeness check in minutes, Route by study type and Engineers decide on the study outcome.

**Why it is hard.** The obvious approach is applicant category, and it fails because category does not decide the path. The second trap is in "Fairness": the real signal is queue order by rules, while teams usually reach for faster service for large applicants.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $12.2K a month. A mistake is expensive in the way applications returned late measures it.

**What success looks like.** Offline: Route accuracy, Completeness precision and recall and Queue order compliance. Online: Time to a complete application, Applications returned late and Engineer review time. The launch is judged on "Time to a complete application" while "Applications returned late" must not get worse.

## Objective, loss and constraints

**Business objective.** Check, classify and route requests to connect solar, storage and generation so incomplete applications are fixed early and simple ones move quickly.

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

- Completeness check in minutes
- Route by study type
- Engineers decide on the study outcome
- Fair queue order maintained
- 200K applications per year

## The approach in one paragraph

Start with manual completeness checks and routing by a clerk, because it is the current process. Then earn the move to a classifier and rules for completeness and study path with a queue that preserves order, a missing-item message to applicants and engineer review of each route, and only if it beats the baseline on Route accuracy and Completeness precision and recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Document completeness | Required forms and data present. Readiness. Guard against: from the application. |
| Add Technology and size | Generation type and capacity. Study path. Guard against: from the application. |
| Add Location headroom | Hosting capacity at the point. Path hint. Guard against: from the hosting map. |
| Run it as one pipeline | Application intake (portal), Document extraction (OCR and parsing), Completeness check (rules), Study path classifier (model) and Applicant message (templated channel), with Queue assignment and Engineer review off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle wrong document | Document type checks and a request for correction. |

**Deliberately not doing**

- Applicant name: irrelevant.
- Company size: irrelevant to the path.
- Submission channel: irrelevant.

**How the approach is proven**

Prove it offline on Route accuracy, Completeness precision and recall and Queue order compliance using time-ordered splits, then online on "Time to a complete application" with "Applications returned late" as the guardrail. Watch for: Priority for large applicants, Using the model as the decision and Skipping queue rules.

## Baseline and production design

- **Baseline (build this first):** Manual completeness checks and routing by a clerk, because it is the current process.
- **Production design:** A classifier and rules for completeness and study path with a queue that preserves order, a missing-item message to applicants and engineer review of each route.

## Why AI, and why this kind

**Why AI.** Check, classify and route requests to connect solar, storage and generation so incomplete applications are fixed early and simple ones move quickly. The evidence that separates good from bad outcomes (Document completeness, Technology and size, Location headroom) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "applicant category" are what teams reach for first, and they fail because category does not decide the path. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A classifier and rules for completeness and study path with a queue that preserves order, a missing-item message to applicants and engineer review of each route.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Document completeness, Technology and size, Location headroom and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual completeness checks and routing by a clerk, because it is the current process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A classifier and rules for completeness and study path with a queue that preserves order, a missing-item message to applicants and engineer review of each route | chosen | Meets the 2500 ms envelope at $0.680 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to a complete application) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Critical infrastructure security and reliability standards (NERC CIP, NIS2 and local equivalents))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Priority for large applicants.
- Evaluation trap: Using the model as the decision.
- Wrong document: a form is the wrong type.
- Large project: the application is unusual.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
