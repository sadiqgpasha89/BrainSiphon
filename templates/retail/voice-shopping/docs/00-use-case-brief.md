# Voice Shopping (ASR + NLU): use-case brief

> Generated from the blueprint `retail/voice-shopping` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Voice Shopping (ASR + NLU) · **Domain:** retail · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Understand spoken shopping requests, resolve products and handle reorders reliably across accents and noisy environments. The system has to run interactively, within a few seconds, inside these limits: Under 1.5 s response, 12 languages and accents and Privacy of audio.

**Why it is hard.** The obvious approach is generic ASR text, and it fails because product and brand names are rare words for generic ASR. The second trap is in "Safety": the real signal is explicit confirmation for purchases, while teams usually reach for direct ordering from ASR text.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $13.4K a month. A mistake is expensive in the way correction rate measures it.

**What success looks like.** Offline: WER on entity spans and Intent and slot F1. Online: Voice order success rate and Correction rate. The launch is judged on "Voice order success rate" while "Correction rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Understand spoken shopping requests, resolve products and handle reorders reliably across accents and noisy environments.

**Training objective.** `\mathcal{L}=\mathcal{L}_{\text{CTC}}+\mathrm{CE}_{\text{intent}}+\lambda\,\mathrm{CE}_{\text{slot}}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathcal{L}_{\text{CTC}} | Connectionist temporal classification loss: aligns a signal such as audio or a line image with its text without frame-by-frame labels. |
| \mathrm{CE}_{\text{intent}} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |

**Hard constraints**

- Under 1.5 s response
- 12 languages and accents
- Privacy of audio
- Confirmation before purchase

## The approach in one paragraph

Start with generic ASR plus keyword search. Then earn the move to streaming conformer ASR with contextual biasing, joint NLU for intent and slots, entity linking and confirmation dialogue, and only if it beats the baseline on WER on entity spans and Intent and slot F1 after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Contextual biasing list | User history and catalogue entity prior. Boosts product names. Guard against: updated frequently. |
| Add ASR confidence by span | Token-level confidence. Ambiguity detection. Guard against: calibrated. |
| Add Reorder intent confidence | Likelihood the request is a repeat purchase. Safe automation. Guard against: order history as-of. |
| Run it as one pipeline | Audio stream (device), Streaming ASR (conformer on GPU), Contextual biasing (entity prior), NLU intent and slots (joint model), Entity resolver (catalogue index), Confirmation dialogue (voice UI) and Order service (checkout API). |
| Optimise the right thing | The objective weighs connectionist temporal classification loss: aligns a signal such as audio or a line image with its text without frame-by-frame labels, so the model is trained on the cost of the decision and not on a generic score. |
| Handle background noise from kitchen | Noise-robust training and clarification prompts. |

**Deliberately not doing**

- Speaker gender: unrelated.
- Audio duration: weak.

**How the approach is proven**

Prove it offline on WER on entity spans and Intent and slot F1 using time-ordered splits, then online on "Voice order success rate" with "Correction rate" as the guardrail. Watch for: Test audio recorded in quiet rooms and WER averaged over non-entity words.

## Baseline and production design

- **Baseline (build this first):** Generic ASR plus keyword search.
- **Production design:** Streaming conformer ASR with contextual biasing, joint NLU for intent and slots, entity linking and confirmation dialogue.

## Why AI, and why this kind

**Why AI.** Understand spoken shopping requests, resolve products and handle reorders reliably across accents and noisy environments. The evidence that separates good from bad outcomes (Contextual biasing list, ASR confidence by span, Reorder intent confidence) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "generic ASR text" are what teams reach for first, and they fail because product and brand names are rare words for generic ASR. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Streaming conformer ASR with contextual biasing, joint NLU for intent and slots, entity linking and confirmation dialogue.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Contextual biasing list, ASR confidence by span, Reorder intent confidence and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Generic ASR plus keyword search | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Streaming conformer ASR with contextual biasing, joint NLU for intent and slots, entity linking and confirmation dialogue | chosen | Meets the 2500 ms envelope at $0.297 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Voice order success rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Test audio recorded in quiet rooms.
- Evaluation trap: WER averaged over non-entity words.
- Background noise from kitchen: aSR errors on product names lead to wrong or empty search results.
- Homophone brand names: similar-sounding brands are confused and the wrong product is added.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
