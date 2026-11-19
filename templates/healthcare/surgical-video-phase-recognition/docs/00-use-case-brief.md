# Surgical Video Phase Recognition: use-case brief

> Generated from the blueprint `healthcare/surgical-video-phase-recognition` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Surgical Video Phase Recognition · **Domain:** healthcare · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Recognise surgical phases and critical-view events in laparoscopic video for documentation, training and safety checklists. The system has to run interactively, within a few seconds, inside these limits: Video privacy, Real-time overlay under 1 s and Multi-hospital variation.

**Why it is hard.** The obvious approach is frame-wise classifiers, and it fails because phases are defined by context over minutes. The second trap is in "Variation": the real signal is cross-hospital technique variation handled, while teams usually reach for single-site data.

**Scale and stakes.** At 10 million users this is about 30.0K model-touching events a day, 0 requests per second on average and 2 at peak, at an estimated $219.4K a month. A mistake is expensive in the way checklist adherence measures it.

**What success looks like.** Offline: Phase F1 and boundary tolerance and Critical-view detection recall. Online: Documentation time saved and Checklist adherence. The launch is judged on "Documentation time saved" while "Checklist adherence" must not get worse.

## Objective, loss and constraints

**Business objective.** Recognise surgical phases and critical-view events in laparoscopic video for documentation, training and safety checklists.

**Training objective.** `\mathcal{L}=\mathrm{CE}_{\text{phase}}+\lambda\,\mathrm{TemporalSmoothness}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE}_{\text{phase}} | Cross-entropy for labelling each video frame with the surgical phase. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{TemporalSmoothness} | Penalty for phase labels that flip back and forth between neighbouring frames. |

**Hard constraints**

- Video privacy
- Real-time overlay under 1 s
- Multi-hospital variation
- Surgeon trust

## The approach in one paragraph

Start with frame-wise CNN with smoothing. Then earn the move to video transformer with instrument/anatomy auxiliary heads, online smoothing and surgeon-facing timeline, and only if it beats the baseline on Phase F1 and boundary tolerance and Critical-view detection recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Instrument presence and state | Detected instruments per frame. Phase cue. Guard against: detector quality. |
| Add Temporal context embedding | Transformer over 5-minute window. Phase. Guard against: window length. |
| Add Anatomy segmentation | Organ masks. Critical view. Guard against: annotation consistency. |
| Run it as one pipeline | Video capture (OR recorder), De-identification (face and audio removal), Frame encoder (ViT), Temporal model (video transformer) and Event detector (critical view rules), with Surgeon review UI and Annotation feedback off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for labelling each video frame with the surgical phase, so the model is trained on the cost of the decision and not on a generic score. |
| Handle smoke and blood obscure view | Visibility-aware smoothing. |

**Deliberately not doing**

- Camera brand: domain.
- Operating-room lighting: environment.

**How the approach is proven**

Prove it offline on Phase F1 and boundary tolerance and Critical-view detection recall using time-ordered splits, then online on "Documentation time saved" with "Checklist adherence" as the guardrail. Watch for: Frames from the same surgery in train and test and Annotation inconsistency between surgeons.

## Baseline and production design

- **Baseline (build this first):** Frame-wise CNN with smoothing.
- **Production design:** Video transformer with instrument/anatomy auxiliary heads, online smoothing and surgeon-facing timeline.

## Why AI, and why this kind

**Why AI.** Recognise surgical phases and critical-view events in laparoscopic video for documentation, training and safety checklists. The evidence that separates good from bad outcomes (Instrument presence and state, Temporal context embedding, Anatomy segmentation) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "frame-wise classifiers" are what teams reach for first, and they fail because phases are defined by context over minutes. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Video transformer with instrument/anatomy auxiliary heads, online smoothing and surgeon-facing timeline.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Instrument presence and state, Temporal context embedding, Anatomy segmentation and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Frame-wise CNN with smoothing | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Video transformer with instrument/anatomy auxiliary heads, online smoothing and surgeon-facing timeline | chosen | Meets the 2500 ms envelope at $243.76 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Documentation time saved) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (ABDM)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Frames from the same surgery in train and test.
- Evaluation trap: Annotation inconsistency between surgeons.
- Smoke and blood obscure view: visibility loss makes the predicted phase flicker between classes.
- Unexpected complication changes procedure flow: out-of-distribution phases.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
