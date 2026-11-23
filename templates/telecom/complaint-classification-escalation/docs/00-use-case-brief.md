# Complaint Classification & Escalation: use-case brief

> Generated from the blueprint `telecom/complaint-classification-escalation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Complaint Classification & Escalation · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Classify complaints by type and severity and route those with regulatory or vulnerability risk to specialist teams within the required time. The system has to run interactively, within a few seconds, inside these limits: Regulated complaint categories never auto-closed, Vulnerable customer indicators routed to a person and Classification explained to the handler.

**Why it is hard.** The obvious approach is a custom set, and it fails because reports need to match the regulator's definitions. The second trap is in "Severity": the real signal is impact on the customer and legal exposure, while teams usually reach for words such as angry.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $12.2K a month. A mistake is expensive in the way time to first response measures it.

**What success looks like.** Offline: Recall at the severe class at fixed precision, Category accuracy by language and Time to correct queue. Online: Regulator breaches, Time to first response and Complaint reopen rate. The launch is judged on "Regulator breaches" while "Time to first response" must not get worse.

## Objective, loss and constraints

**Business objective.** Classify complaints by type and severity and route those with regulatory or vulnerability risk to specialist teams within the required time.

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

- Regulated complaint categories never auto-closed
- Vulnerable customer indicators routed to a person
- Classification explained to the handler
- Routing within 60 s of receipt

## The approach in one paragraph

Start with keyword rules for the regulated categories and a queue by product, because they guarantee the mandatory cases are routed. Then earn the move to rules for mandatory cases first, then a multilingual classifier for category and severity with calibrated probabilities and an explanation, with every routing decision logged, and only if it beats the baseline on Recall at the severe class at fixed precision and Category accuracy by language after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Complaint text cues | Phrases signalling service loss, billing error, mis-selling or threat. Category and severity. Guard against: needs multilingual coverage. |
| Add Customer history | Prior complaints and open cases. Escalation cue. Guard against: as at receipt time. |
| Add Declared vulnerability | Consented vulnerability flags. Specialist routing. Guard against: use only declared flags. |
| Run it as one pipeline | Complaint intake (channels), Rule layer (mandatory keywords and flags), Classifier (multilingual transformer) and Severity and routing (rules and thresholds), with Handler queue, Handler feedback and Regulator report off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle mixed language | Per-language evaluation and abstain to a person. |

**Deliberately not doing**

- Customer tone alone: not severity.
- Message length: not importance.
- Time of day: no link.

**How the approach is proven**

Prove it offline on Recall at the severe class at fixed precision, Category accuracy by language and Time to correct queue using time-ordered splits, then online on "Regulator breaches" with "Time to first response" as the guardrail. Watch for: Optimising accuracy not recall, No rule layer for mandatory cases and Ignoring language coverage.

## Baseline and production design

- **Baseline (build this first):** Keyword rules for the regulated categories and a queue by product, because they guarantee the mandatory cases are routed.
- **Production design:** Rules for mandatory cases first, then a multilingual classifier for category and severity with calibrated probabilities and an explanation, with every routing decision logged.

## Why AI, and why this kind

**Why AI.** Classify complaints by type and severity and route those with regulatory or vulnerability risk to specialist teams within the required time. The evidence that separates good from bad outcomes (Complaint text cues, Customer history, Declared vulnerability) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "A custom set" are what teams reach for first, and they fail because reports need to match the regulator's definitions. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Rules for mandatory cases first, then a multilingual classifier for category and severity with calibrated probabilities and an explanation, with every routing decision logged.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Complaint text cues, Customer history, Declared vulnerability and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword rules for the regulated categories and a queue by product, because they guarantee the mandatory cases are routed | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Rules for mandatory cases first, then a multilingual classifier for category and severity with calibrated probabilities and an explanation, with every routing decision logged | chosen | Meets the 2500 ms envelope at $1.36 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Regulator breaches) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Optimising accuracy not recall.
- Evaluation trap: No rule layer for mandatory cases.
- Mixed language: classifier confusion.
- Complaint hidden in a query: the customer does not call it a complaint.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
