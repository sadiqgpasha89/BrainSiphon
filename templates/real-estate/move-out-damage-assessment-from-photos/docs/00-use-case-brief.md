# Move-Out Damage Assessment from Photos: use-case brief

> Generated from the blueprint `real-estate/move-out-damage-assessment-from-photos` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Move-Out Damage Assessment from Photos · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Compare move-in and move-out photos to identify damage beyond normal wear and estimate repair cost for deposit decisions. The system has to run interactively, within a few seconds, inside these limits: A tenant can dispute any deduction with the same evidence the manager sees, Normal wear is separated from damage using a documented rule and Move-in and move-out photos are matched by room and view.

**Why it is hard.** The obvious approach is any change between photos, and it fails because deposits cannot cover fair wear and tear, and a model that flags all change overcharges tenants. The second trap is in "Alignment": the real signal is comparing the same view taken from the same place, while teams usually reach for photos from different angles.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $19.9K a month. A mistake is expensive in the way deposit return time measures it.

**What success looks like.** Offline: Detection F1 and Cost error. Online: Disputes and Deposit return time. The launch is judged on "Disputes" while "Deposit return time" must not get worse.

## Objective, loss and constraints

**Business objective.** Compare move-in and move-out photos to identify damage beyond normal wear and estimate repair cost for deposit decisions.

**Training objective.** `\mathcal{L}=\mathcal{L}_{\text{det}}+\lambda\,\mathrm{Ordinal}(\hat{s},s)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathcal{L}_{\text{det}} | Detection loss: how well objects are found and their boxes placed. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Ordinal} | An ordinal loss: penalises predictions by how far they fall from the true ordered grade. |
| \hat{s} | The predicted damage severity grade. |
| s | The damage severity grade assigned by a reviewer. |

**Hard constraints**

- A tenant can dispute any deduction with the same evidence the manager sees
- Normal wear is separated from damage using a documented rule
- Move-in and move-out photos are matched by room and view
- A person signs off every deduction before it is applied

## The approach in one paragraph

Start with manager walk-through with a checklist, because it is the norm. Then earn the move to alignment, change detection and damage grading with wear rules, cost estimates and a reviewer, and only if it beats the baseline on Detection F1 and Cost error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Change detection | Pixel-level difference between aligned move-in and move-out photos after exposure normalisation. Finds what has changed. Guard against: lighting changes look like damage, so normalise first. |
| Add Damage class | Classifier probability for stain, hole, scratch, crack or burn. Gives a type that links to a repair. Guard against: rare classes have few examples, so check per class. |
| Add Age of fixture | Years since the fixture, flooring or paint was installed or last renewed. Older items wear more, so the allowance is larger. Guard against: records are incomplete, so use building age as a fallback. |
| Run it as one pipeline | Photo capture (inspection app), Aligner (geometry), Damage detector (vision model), Wear rules (rules) and Cost estimator (table and boosting), with Reviewer and Report off the critical path. |
| Optimise the right thing | The objective weighs detection loss: how well objects are found and their boxes placed, so the model is trained on the cost of the decision and not on a generic score. |
| Handle different lighting | Normalise exposure and compare structure instead of raw colour. |

**Deliberately not doing**

- Furniture: Removed or moved between photos and should not be read as damage.
- Lighting: Varies by time of day and window and should be normalised.
- Camera: Different phones change colour and sharpness and not the condition.

**How the approach is proven**

Prove it offline on Detection F1 and Cost error using time-ordered splits, then online on "Disputes" with "Deposit return time" as the guardrail. Watch for: Posed photos taken by a careful inspector are cleaner than tenants' own pictures and Rare damage types give too few test cases to estimate recall.

## Baseline and production design

- **Baseline (build this first):** Manager walk-through with a checklist, because it is the norm.
- **Production design:** Alignment, change detection and damage grading with wear rules, cost estimates and a reviewer.

## Why AI, and why this kind

**Why AI.** Compare move-in and move-out photos to identify damage beyond normal wear and estimate repair cost for deposit decisions. The evidence that separates good from bad outcomes (Change detection, Damage class, Age of fixture) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "any change between photos" are what teams reach for first, and they fail because deposits cannot cover fair wear and tear, and a model that flags all change overcharges tenants. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Alignment, change detection and damage grading with wear rules, cost estimates and a reviewer.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Change detection, Damage class, Age of fixture and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manager walk-through with a checklist, because it is the norm | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Alignment, change detection and damage grading with wear rules, cost estimates and a reviewer | chosen | Meets the 2500 ms envelope at $4.43 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Disputes) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Posed photos taken by a careful inspector are cleaner than tenants' own pictures.
- Evaluation trap: Rare damage types give too few test cases to estimate recall.
- Different lighting: different lighting between move-in and move-out photos looks like damage.
- Missing photos: some rooms are missing from the move-out photos.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
