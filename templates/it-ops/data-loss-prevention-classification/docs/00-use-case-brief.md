# Data Loss Prevention Classification: use-case brief

> Generated from the blueprint `it-ops/data-loss-prevention-classification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Data Loss Prevention Classification · **Domain:** it-ops · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Classify documents and messages by sensitivity to improve data loss prevention rules, blocking or warning on risky sharing with the content analysed in the control and not in analyst tools. The system has to run interactively, within a few seconds, inside these limits: Block only at high confidence with a user override path, Content stays inside the control and Policy owners approve rule changes.

**Why it is hard.** The obvious approach is pattern hits, and it fails because patterns include false matches. The second trap is in "Action": the real signal is warn, block or encrypt by sensitivity, while teams usually reach for block everything risky.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $12.4K a month. A mistake is expensive in the way false blocks measures it.

**What success looks like.** Offline: Classification accuracy on audited samples, Block precision and Override rate. Online: Sensitive data leaving the company, False blocks and Policy exceptions. The launch is judged on "Sensitive data leaving the company" while "False blocks" must not get worse.

## Objective, loss and constraints

**Business objective.** Classify documents and messages by sensitivity to improve data loss prevention rules, blocking or warning on risky sharing with the content analysed in the control and not in analyst tools.

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

- Block only at high confidence with a user override path
- Content stays inside the control
- Policy owners approve rule changes
- Decision within 500 ms
- 20M events per day

## The approach in one paragraph

Start with pattern and keyword rules for card and ID numbers, because they are the standard configuration. Then earn the move to a classifier that adds learned sensitivity classes to rules with confidence tiers, user override with justification and policy owner review of outcomes, and only if it beats the baseline on Classification accuracy on audited samples and Block precision after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Content classifier output | Predicted sensitivity class. Core. Guard against: from the classifier. |
| Add Destination type | Internal, partner or personal. Risk. Guard against: from the event. |
| Add Sender role and data access | Role-based access level. Context. Guard against: from identity. |
| Run it as one pipeline | Event and content capture (DLP control), Classification (transformer), Policy decision (rules), Warn, block or allow (control), User justification (prompt) and Metadata alert (SIEM), with Rule review off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle encrypted files | Metadata and destination rules. |

**Deliberately not doing**

- Employee name: personal data.
- File name: weak link.
- Message id: an identifier.

**How the approach is proven**

Prove it offline on Classification accuracy on audited samples, Block precision and Override rate using time-ordered splits, then online on "Sensitive data leaving the company" with "False blocks" as the guardrail. Watch for: Pattern-only rules, Blocking everything risky and Content copies in analyst tools.

## Baseline and production design

- **Baseline (build this first):** Pattern and keyword rules for card and ID numbers, because they are the standard configuration.
- **Production design:** A classifier that adds learned sensitivity classes to rules with confidence tiers, user override with justification and policy owner review of outcomes.

## Why AI, and why this kind

**Why AI.** Classify documents and messages by sensitivity to improve data loss prevention rules, blocking or warning on risky sharing with the content analysed in the control and not in analyst tools. The evidence that separates good from bad outcomes (Content classifier output, Destination type, Sender role and data access) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "pattern hits" are what teams reach for first, and they fail because patterns include false matches. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A classifier that adds learned sensitivity classes to rules with confidence tiers, user override with justification and policy owner review of outcomes.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Content classifier output, Destination type, Sender role and data access and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Pattern and keyword rules for card and ID numbers, because they are the standard configuration | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A classifier that adds learned sensitivity classes to rules with confidence tiers, user override with justification and policy owner review of outcomes | chosen | Meets the 2500 ms envelope at $0.138 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Sensitive data leaving the company) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Pattern-only rules.
- Evaluation trap: Blocking everything risky.
- Encrypted files: content cannot be read.
- Legitimate partner sharing: external sharing is required.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
