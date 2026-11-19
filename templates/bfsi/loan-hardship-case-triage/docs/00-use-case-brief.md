# Loan Hardship Case Triage: use-case brief

> Generated from the blueprint `bfsi/loan-hardship-case-triage` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Loan Hardship Case Triage · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Route incoming hardship requests to the right treatment and priority, quickly and fairly, while spotting customers in vulnerable circumstances. The system has to run interactively, within a few seconds, inside these limits: Vulnerability flags reviewed by a trained human, No automated refusal of hardship assistance and Response within regulatory time limits.

**Why it is hard.** The obvious approach is sentiment of the message, and it fails because calm messages can describe severe distress. The second trap is in "Urgency": the real signal is days to the next missed payment and size of the arrears, while teams usually reach for message length or tone.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $12.3K a month. A mistake is expensive in the way share of vulnerable customers reached by a specialist measures it.

**What success looks like.** Offline: Macro-F1 per category and language and Recall of vulnerability cues. Online: Time to first response and Share of vulnerable customers reached by a specialist. The launch is judged on "Time to first response" while "Share of vulnerable customers reached by a specialist" must not get worse.

## Objective, loss and constraints

**Business objective.** Route incoming hardship requests to the right treatment and priority, quickly and fairly, while spotting customers in vulnerable circumstances.

**Training objective.** `\mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y_{\text{vulnerable}})`

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

- Vulnerability flags reviewed by a trained human
- No automated refusal of hardship assistance
- Response within regulatory time limits
- Free-text stays inside the bank

## The approach in one paragraph

Start with keyword routing with a form dropdown and a manual queue, because it is the current practice. Then earn the move to multilingual encoder for hardship category and vulnerability cues combined with tabular urgency features, a human-in-the-loop queue with service-level timers and explanation snippets for the agent, and only if it beats the baseline on Macro-F1 per category and language and Recall of vulnerability cues after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Days to next due date | Next scheduled payment minus today. Urgency depends on time left. Guard against: dates must be contractual. |
| Add Arrears and history | Current arrears, prior arrangements and recent contact. Predicts the appropriate treatment. Guard against: prior arrangements may have been miscoded. |
| Add Hardship category | Classifier over the message and attachments. Chooses the treatment pathway. Guard against: categories overlap in real messages. |
| Run it as one pipeline | Intake channel gateway (web form and email parser), Language and PII processor (redaction service), Hardship classifier (multilingual encoder), Urgency scorer (gradient boosting) and Treatment router (rules with queue limits), with Specialist case queue and Outcome feedback off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle third-party request | Capture authority status and route to identity verification. |

**Deliberately not doing**

- Time of day sent: no relationship to need.
- Device type: proxy for income, unfair as a signal.
- Spelling errors: proxy for education or language, not for hardship.

**How the approach is proven**

Prove it offline on Macro-F1 per category and language and Recall of vulnerability cues using time-ordered splits, then online on "Time to first response" with "Share of vulnerable customers reached by a specialist" as the guardrail. Watch for: Offline labels come from past routing, which carries its own bias and Language mix in tests differs from live traffic.

## Baseline and production design

- **Baseline (build this first):** Keyword routing with a form dropdown and a manual queue, because it is the current practice.
- **Production design:** Multilingual encoder for hardship category and vulnerability cues combined with tabular urgency features, a human-in-the-loop queue with service-level timers and explanation snippets for the agent.

## Why AI, and why this kind

**Why AI.** Route incoming hardship requests to the right treatment and priority, quickly and fairly, while spotting customers in vulnerable circumstances. The evidence that separates good from bad outcomes (Days to next due date, Arrears and history, Hardship category) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "sentiment of the message" are what teams reach for first, and they fail because calm messages can describe severe distress. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Multilingual encoder for hardship category and vulnerability cues combined with tabular urgency features, a human-in-the-loop queue with service-level timers and explanation snippets for the agent.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Days to next due date, Arrears and history, Hardship category and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword routing with a form dropdown and a manual queue, because it is the current practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Multilingual encoder for hardship category and vulnerability cues combined with tabular urgency features, a human-in-the-loop queue with service-level timers and explanation snippets for the agent | chosen | Meets the 2500 ms envelope at $0.683 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to first response) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Offline labels come from past routing, which carries its own bias.
- Evaluation trap: Language mix in tests differs from live traffic.
- Third-party request: a family member writes on behalf of the customer.
- Mixed topics: hardship is mentioned inside a complaint.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
