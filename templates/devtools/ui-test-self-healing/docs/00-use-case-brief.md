# UI Test Self-Healing: use-case brief

> Generated from the blueprint `devtools/ui-test-self-healing` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** UI Test Self-Healing · **Domain:** devtools · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Repair broken UI test locators after interface changes by finding the matching element and proposing an update, while engineers approve each change and real bugs still fail. The system has to run interactively, within a few seconds, inside these limits: Proposed fixes are reviewed, Tests that fail because behaviour changed are never auto-healed and Healing events logged.

**Why it is hard.** The obvious approach is any failure repaired, and it fails because healing a real bug hides it. The second trap is in "Control": the real signal is engineer approval for each fix, while teams usually reach for silent updates.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $418.6K a month. A mistake is expensive in the way escaped regressions measures it.

**What success looks like.** Offline: Correct repair rate, Healing of real bugs and Time to repair. Online: Test maintenance hours, Escaped regressions and Healed failures later found to be bugs. The launch is judged on "Test maintenance hours" while "Escaped regressions" must not get worse.

## Objective, loss and constraints

**Business objective.** Repair broken UI test locators after interface changes by finding the matching element and proposing an update, while engineers approve each change and real bugs still fail.

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

- Proposed fixes are reviewed
- Tests that fail because behaviour changed are never auto-healed
- Healing events logged
- Locator repair within 30 s
- 50K UI tests

## The approach in one paragraph

Start with manual locator updates by test engineers, because it is the typical practice. Then earn the move to a locator repair service that proposes new selectors with screenshots, requires approval, never touches assertions and reports healing rates, and only if it beats the baseline on Correct repair rate and Healing of real bugs after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Candidate element similarity | Similarity of the old and new element. Match. Guard against: from the DOM and vision. |
| Add Layout and text context | Nearby labels and structure. Match. Guard against: from the page. |
| Add Behaviour assertion result | Whether the outcome is still correct. Guard. Guard against: from the test. |
| Run it as one pipeline | Test failure intake (CI), Failure type check (rules), Candidate search (DOM and vision model), Proposed fix (pull request), Engineer approval (review platform) and Re-run (CI), with Healing audit off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle redesign | Block and request manual update. |

**Deliberately not doing**

- Developer name: personal data.
- Test name wording: weak link.
- Browser version alone: weak link.

**How the approach is proven**

Prove it offline on Correct repair rate, Healing of real bugs and Time to repair using time-ordered splits, then online on "Test maintenance hours" with "Escaped regressions" as the guardrail. Watch for: Silent healing, Healing assertion failures and No screenshots as evidence.

## Baseline and production design

- **Baseline (build this first):** Manual locator updates by test engineers, because it is the typical practice.
- **Production design:** A locator repair service that proposes new selectors with screenshots, requires approval, never touches assertions and reports healing rates.

## Why AI, and why this kind

**Why AI.** Repair broken UI test locators after interface changes by finding the matching element and proposing an update, while engineers approve each change and real bugs still fail. The evidence that separates good from bad outcomes (Candidate element similarity, Layout and text context, Behaviour assertion result) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "any failure repaired" are what teams reach for first, and they fail because healing a real bug hides it. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: A locator repair service that proposes new selectors with screenshots, requires approval, never touches assertions and reports healing rates.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Candidate element similarity, Layout and text context, Behaviour assertion result and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual locator updates by test engineers, because it is the typical practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A locator repair service that proposes new selectors with screenshots, requires approval, never touches assertions and reports healing rates | chosen | Meets the 2500 ms envelope at $4.65 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Test maintenance hours) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Software supply chain security (SLSA, secure development frameworks and sector rules))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Silent healing.
- Evaluation trap: Healing assertion failures.
- Redesign: many elements change at once.
- Duplicate elements: several candidates match.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
