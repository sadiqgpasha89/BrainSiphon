# Business Email Compromise Detection: use-case brief

> Generated from the blueprint `cybersecurity/business-email-compromise-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Business Email Compromise Detection · **Domain:** cybersecurity · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect payment-redirect and executive-impersonation emails that contain no malware or links, using relationship and intent signals. The system has to run in under 100 milliseconds, inside these limits: Very few positives, Plain-text attacks and Low false positives on finance mail.

**Why it is hard.** The obvious approach is content-only classifiers, and it fails because bEC mails are well-written and benign-looking. The second trap is in "Intent": the real signal is detect intent (payment change, urgency) with LLM features, while teams usually reach for link and attachment scanning.

**Scale and stakes.** At 10 million users this is about 30.0M model-touching events a day, 347 requests per second on average and 2.1K at peak, at an estimated $23.3K a month. A mistake is expensive in the way verification calls triggered measures it.

**What success looks like.** Offline: Recall at fixed FP per million and Amount-weighted recall. Online: Dollar loss from BEC and Verification calls triggered. The launch is judged on "Dollar loss from BEC" while "Verification calls triggered" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect payment-redirect and executive-impersonation emails that contain no malware or links, using relationship and intent signals.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)\cdot w(\text{amount at risk})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| w | A weight that scales how much a particular example, class or term counts in the loss. |
| \text{amount at risk} | The money that would be lost if the email were fraudulent; w makes high-value cases count more. |

**Hard constraints**

- Very few positives
- Plain-text attacks
- Low false positives on finance mail
- Real-time before delivery

## The approach in one paragraph

Start with rules for display-name spoofing and external executive mimicry. Then earn the move to graph-and-intent model: sender-recipient relationship features plus transformer intent classifier, gated by amount-at-risk context, and only if it beats the baseline on Recall at fixed FP per million and Amount-weighted recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around First-contact flag with finance role | Sender never emailed this recipient. Impersonation. Guard against: graph snapshot. |
| Add Display-name vs address mismatch | Name of an exec with external address. Spoofing. Guard against: directory. |
| Add Payment-change intent score | NLP intent classifier. Payload. Guard against: calibration. |
| Run it as one pipeline | Mail gateway (SMTP), Relationship graph lookup (graph store), Intent classifier (transformer), BEC scorer (GBDT), Policy and banner (action), Finance verification (out-of-band call) and Confirmed cases (labels). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle compromised real vendor account sends the fraud email | Behaviour-change features on the vendor and invoice anomalies. |

**Deliberately not doing**

- Message length: weak.
- Time of day: weak.

**How the approach is proven**

Prove it offline on Recall at fixed FP per million and Amount-weighted recall using time-ordered splits, then online on "Dollar loss from BEC" with "Verification calls triggered" as the guardrail. Watch for: Few labelled positives from known incidents and Evaluating on spoofing only.

## Baseline and production design

- **Baseline (build this first):** Rules for display-name spoofing and external executive mimicry.
- **Production design:** Graph-and-intent model: sender-recipient relationship features plus transformer intent classifier, gated by amount-at-risk context.

## Why AI, and why this kind

**Why AI.** Detect payment-redirect and executive-impersonation emails that contain no malware or links, using relationship and intent signals. The evidence that separates good from bad outcomes (First-contact flag with finance role, Display-name vs address mismatch, Payment-change intent score) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "content-only classifiers" are what teams reach for first, and they fail because BEC mails are well-written and benign-looking. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Graph-and-intent model: sender-recipient relationship features plus transformer intent classifier, gated by amount-at-risk context.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among First-contact flag with finance role, Display-name vs address mismatch, Payment-change intent score and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Rules for display-name spoofing and external executive mimicry | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Graph-and-intent model: sender-recipient relationship features plus transformer intent classifier, gated by amount-at-risk context | chosen | Meets the 80 ms envelope at $0.026 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Dollar loss from BEC) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Few labelled positives from known incidents.
- Evaluation trap: Evaluating on spoofing only.
- Compromised real vendor account sends the fraud email: relationship features look legitimate.
- Executive travels and emails from a personal address: legitimate mail flagged.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
