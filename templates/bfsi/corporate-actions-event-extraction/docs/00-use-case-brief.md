# Corporate Actions Event Extraction: use-case brief

> Generated from the blueprint `bfsi/corporate-actions-event-extraction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Corporate Actions Event Extraction · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Extract corporate action events (dividends, splits, mergers, rights issues) and their terms from notices and vendor feeds into a golden source for downstream processing. The system has to run interactively, within a few seconds, inside these limits: Accuracy above 99.5% on mandatory events, Dual source verification for mandatory events and Every field traces to a source.

**Why it is hard.** The obvious approach is free-text description, and it fails because dates and rates drive entitlements. The second trap is in "Verification": the real signal is agreement between two independent sources, while teams usually reach for trusting the first notice.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $12.5K a month. A mistake is expensive in the way entitlement errors measures it.

**What success looks like.** Offline: Field-level accuracy and Event-level exact match. Online: Manual touches per event and Entitlement errors. The launch is judged on "Manual touches per event" while "Entitlement errors" must not get worse.

## Objective, loss and constraints

**Business objective.** Extract corporate action events (dividends, splits, mergers, rights issues) and their terms from notices and vendor feeds into a golden source for downstream processing.

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

- Accuracy above 99.5% on mandatory events
- Dual source verification for mandatory events
- Every field traces to a source
- Notices handled in 12 languages

## The approach in one paragraph

Start with vendor feed with manual comparison to the issuer notice, because it is the current process. Then earn the move to document-understanding model with a constrained schema, cross-source reconciliation rules and a reviewer queue for mandatory event discrepancies, and only if it beats the baseline on Field-level accuracy and Event-level exact match after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Field confidence | Calibrated confidence per extracted field. Routes to review. Guard against: calibration drifts by language. |
| Add Source agreement | Whether vendor and issuer notices agree. Flags errors. Guard against: different timing across sources. |
| Add Date consistency | Order check: announcement, ex, record, payment. Catches misreads. Guard against: market conventions differ. |
| Run it as one pipeline | Notice intake (SWIFT and vendor feeds), Document parser (layout model), Event extractor (LLM with schema), Reconciler (rules engine), Golden source (reference database) and Downstream publish (message bus), with Reviewer queue off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle late amendment | Versioned events with change alerts. |

**Deliberately not doing**

- Notice formatting: varies across issuers.
- Letterhead: irrelevant.
- Notice length: style.

**How the approach is proven**

Prove it offline on Field-level accuracy and Event-level exact match using time-ordered splits, then online on "Manual touches per event" with "Entitlement errors" as the guardrail. Watch for: Evaluating on a single vendor format and Test set excludes late amendments.

## Baseline and production design

- **Baseline (build this first):** Vendor feed with manual comparison to the issuer notice, because it is the current process.
- **Production design:** Document-understanding model with a constrained schema, cross-source reconciliation rules and a reviewer queue for mandatory event discrepancies.

## Why AI, and why this kind

**Why AI.** Extract corporate action events (dividends, splits, mergers, rights issues) and their terms from notices and vendor feeds into a golden source for downstream processing. The evidence that separates good from bad outcomes (Field confidence, Source agreement, Date consistency) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "free-text description" are what teams reach for first, and they fail because dates and rates drive entitlements. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Document-understanding model with a constrained schema, cross-source reconciliation rules and a reviewer queue for mandatory event discrepancies.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Field confidence, Source agreement, Date consistency and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Vendor feed with manual comparison to the issuer notice, because it is the current process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Document-understanding model with a constrained schema, cross-source reconciliation rules and a reviewer queue for mandatory event discrepancies | chosen | Meets the 2500 ms envelope at $0.695 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Manual touches per event) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating on a single vendor format.
- Evaluation trap: Test set excludes late amendments.
- Late amendment: terms change after the first notice.
- Complex multi-leg event: a merger paid in cash and shares has several legs and a flat extraction loses the structure.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
