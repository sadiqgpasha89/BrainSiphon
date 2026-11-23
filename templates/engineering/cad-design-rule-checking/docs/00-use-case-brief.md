# CAD Design Rule Checking: use-case brief

> Generated from the blueprint `engineering/cad-design-rule-checking` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** CAD Design Rule Checking · **Domain:** engineering · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Check CAD models against company rules and manufacturability limits, such as minimum wall thickness and hole spacing, and explain violations in the design tool. The system has to run interactively, within a few seconds, inside these limits: Rule checks run in the design tool within 30 s, Violations show the rule and the geometry and Rule owners manage the rule library.

**Why it is hard.** The obvious approach is learned guesses, and it fails because rules need authority and traceability. The second trap is in "Role": the real signal is check and explain, while teams usually reach for auto-fix silently.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $3.6K a month. A mistake is expensive in the way late design changes measures it.

**What success looks like.** Offline: Rule matching accuracy, False violation rate and Rule coverage. Online: Violations found in review, Late design changes and Review time. The launch is judged on "Violations found in review" while "Late design changes" must not get worse.

## Objective, loss and constraints

**Business objective.** Check CAD models against company rules and manufacturability limits, such as minimum wall thickness and hole spacing, and explain violations in the design tool.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{GraphReg}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{GraphReg} | Graph regulariser: a penalty that pushes connected nodes to have similar representations. |

**Hard constraints**

- Rule checks run in the design tool within 30 s
- Violations show the rule and the geometry
- Rule owners manage the rule library
- Designers can request exceptions
- 20K models per year

## The approach in one paragraph

Start with manual design reviews with checklists, because they are the usual control. Then earn the move to a rule engine on CAD geometry with a managed rule library, clear violation explanations and an exception workflow, with optional learned suggestions flagged as advisory, and only if it beats the baseline on Rule matching accuracy and False violation rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Feature geometry | Walls, holes and radii. Core. Guard against: from the CAD model. |
| Add Rule thresholds | Limits by process and material. Core. Guard against: from the rule library. |
| Add Process selected | Casting, machining or printing. Rule set. Guard against: from the design. |
| Run it as one pipeline | Model export (CAD tool), Feature extraction (geometry kernel), Rule evaluation (rule engine), Exception request (workflow) and Rule maintenance (library owners), with Violation report and Quality review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle complex freeform surface | Manual review flag. |

**Deliberately not doing**

- Designer name: personal data.
- Part number: an identifier.
- Model colour: irrelevant.

**How the approach is proven**

Prove it offline on Rule matching accuracy, False violation rate and Rule coverage using time-ordered splits, then online on "Violations found in review" with "Late design changes" as the guardrail. Watch for: Learned rules without authority, Silent auto-fixes and Ignored warnings.

## Baseline and production design

- **Baseline (build this first):** Manual design reviews with checklists, because they are the usual control.
- **Production design:** A rule engine on CAD geometry with a managed rule library, clear violation explanations and an exception workflow, with optional learned suggestions flagged as advisory.

## Why AI, and why this kind

**Why AI.** Check CAD models against company rules and manufacturability limits, such as minimum wall thickness and hole spacing, and explain violations in the design tool. The evidence that separates good from bad outcomes (Feature geometry, Rule thresholds, Process selected) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "learned guesses" are what teams reach for first, and they fail because rules need authority and traceability. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal lives in relationships between entities (shared devices, counterparties, addresses) that per-row models cannot see. Here the production design is: A rule engine on CAD geometry with a managed rule library, clear violation explanations and an exception workflow, with optional learned suggestions flagged as advisory.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Feature geometry, Rule thresholds, Process selected and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual design reviews with checklists, because they are the usual control | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A rule engine on CAD geometry with a managed rule library, clear violation explanations and an exception workflow, with optional learned suggestions flagged as advisory | chosen | Meets the 2500 ms envelope at $0.200 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full GNN inference per request | later | Traversal does not fit the latency budget; precompute embeddings or risk scalars asynchronously |
| LLM or agent as the decision maker | rejected | An LLM can summarise a flagged neighbourhood for an investigator but cannot find the ring |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full GNN inference per request beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Violations found in review) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Learned rules without authority.
- Evaluation trap: Silent auto-fixes.
- Complex freeform surface: features are hard to extract.
- Conflicting rules: two standards disagree.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
