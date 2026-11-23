# Phishing Email Detection: use-case brief

> Generated from the blueprint `it-ops/phishing-email-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Phishing Email Detection · **Domain:** it-ops · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect phishing and business email compromise in inbound mail from content, sender behaviour and link analysis, quarantining high-confidence cases and reporting the rest to the security team. The system has to run interactively, within a few seconds, inside these limits: Quarantine only at high confidence with user release, Verdict within 2 s of arrival and False quarantines under 1 per 10,000 messages.

**Why it is hard.** The obvious approach is spam filter scores, and it fails because spam is not phishing. The second trap is in "Cost": the real signal is a missed phish is costly and a false block is recoverable, while teams usually reach for equal weights.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $12.4K a month. A mistake is expensive in the way time to remove campaigns measures it.

**What success looks like.** Offline: Detection of seeded phishing, False quarantine rate and Calibration. Online: Phishing reaching inboxes, Time to remove campaigns and User reports handled. The launch is judged on "Phishing reaching inboxes" while "Time to remove campaigns" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect phishing and business email compromise in inbound mail from content, sender behaviour and link analysis, quarantining high-confidence cases and reporting the rest to the security team.

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

- Quarantine only at high confidence with user release
- Verdict within 2 s of arrival
- False quarantines under 1 per 10,000 messages
- Message content access limited to the scanner
- 5M messages per day

## The approach in one paragraph

Start with signature and reputation filters with user reporting, because they are the standard controls. Then earn the move to a layered detector using sender graph, link analysis and language models with confidence tiers, user release for quarantine and a reporting feedback loop, and only if it beats the baseline on Detection of seeded phishing and False quarantine rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Link and domain reputation | Age and reputation of destinations. Core. Guard against: from threat feeds. |
| Add Sender behaviour | First contact and display name mismatch. Core. Guard against: from mail logs. |
| Add Language and intent cues | Urgency and payment requests. Support. Guard against: from NLP. |
| Run it as one pipeline | Message intake (mail gateway), Authentication and link checks (scanner), Content and sender model (transformer and graph), Verdict tier (rules) and Quarantine or deliver (gateway), with User report feedback and Analyst review off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle compromised trusted sender | Behaviour change signals. |

**Deliberately not doing**

- Recipient name: personal data.
- Message id: an identifier.
- Mail client: weak link.

**How the approach is proven**

Prove it offline on Detection of seeded phishing, False quarantine rate and Calibration using time-ordered splits, then online on "Phishing reaching inboxes" with "Time to remove campaigns" as the guardrail. Watch for: Spam score as phishing label, Equal error costs and Content kept in analyst tools.

## Baseline and production design

- **Baseline (build this first):** Signature and reputation filters with user reporting, because they are the standard controls.
- **Production design:** A layered detector using sender graph, link analysis and language models with confidence tiers, user release for quarantine and a reporting feedback loop.

## Why AI, and why this kind

**Why AI.** Detect phishing and business email compromise in inbound mail from content, sender behaviour and link analysis, quarantining high-confidence cases and reporting the rest to the security team. The evidence that separates good from bad outcomes (Link and domain reputation, Sender behaviour, Language and intent cues) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "spam filter scores" are what teams reach for first, and they fail because spam is not phishing. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: A layered detector using sender graph, link analysis and language models with confidence tiers, user release for quarantine and a reporting feedback loop.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Link and domain reputation, Sender behaviour, Language and intent cues and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Signature and reputation filters with user reporting, because they are the standard controls | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A layered detector using sender graph, link analysis and language models with confidence tiers, user release for quarantine and a reporting feedback loop | chosen | Meets the 2500 ms envelope at $0.138 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Phishing reaching inboxes) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Spam score as phishing label.
- Evaluation trap: Equal error costs.
- Compromised trusted sender: a known partner account is hijacked.
- New campaign: content is novel.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
