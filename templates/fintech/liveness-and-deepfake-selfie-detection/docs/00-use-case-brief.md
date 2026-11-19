# Liveness & Deepfake Selfie Detection: use-case brief

> Generated from the blueprint `fintech/liveness-and-deepfake-selfie-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Liveness & Deepfake Selfie Detection · **Domain:** fintech · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Confirm a live human is present and detect injected or generated faces during remote onboarding, defeating presentation and injection attacks. The system has to run interactively, within a few seconds, inside these limits: ISO 30107-3 PAD level 2 target, Works on 5-year-old Android phones and Bias audit across skin tones.

**Why it is hard.** The obvious approach is one binary real-vs-fake classifier, and it fails because binary models overfit one attack and miss the next. The second trap is in "Signal": the real signal is active challenge plus passive texture and rPPG cues, while teams usually reach for face-match score.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $24.7K a month. A mistake is expensive in the way onboarding completion rate measures it.

**What success looks like.** Offline: APCER and BPCER at fixed operating points and Per-skin-tone error parity. Online: Account-opening fraud rate and Onboarding completion rate. The launch is judged on "Account-opening fraud rate" while "Onboarding completion rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Confirm a live human is present and detect injected or generated faces during remote onboarding, defeating presentation and injection attacks.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathcal{L}_{\text{SupCon}}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathcal{L}_{\text{SupCon}} | Supervised contrastive loss: pulls real selfies together and pushes spoof or deepfake selfies away from them. |

**Hard constraints**

- ISO 30107-3 PAD level 2 target
- Works on 5-year-old Android phones
- Bias audit across skin tones
- Under 2.5 s

## The approach in one paragraph

Start with active-challenge liveness with a texture CNN. Then earn the move to multi-head ensemble: temporal ViT for deepfakes, rPPG branch and device attestation; thresholds tuned per attack class, and only if it beats the baseline on APCER and BPCER at fixed operating points and Per-skin-tone error parity after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Challenge response latency | Time between prompt and head movement. Real humans respond in 300-800 ms. Guard against: instrument client-side clocks securely. |
| Add rPPG pulse signal | Blood-flow signal extracted from facial video. Hard to synthesise consistently. Guard against: needs lighting normalisation to avoid skin-tone bias. |
| Add Camera integrity | Virtual-camera and emulator detection. Injection bypasses the lens entirely. Guard against: collect attestation tokens server-verified. |
| Run it as one pipeline | Capture SDK (on-device attestation), Frame sampler (edge preprocessing), PAD ensemble (ViT plus rPPG on GPU), Attack-class aggregator (per-head thresholds), Decision service (risk policy), Fraud ops (manual review) and Attack library (red-team samples). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new generative model release | Continuous red-team ingestion and monthly retrain with new attack families. |

**Deliberately not doing**

- Face-match score: measures identity not liveness.
- Image brightness: environment artefact that correlates with device tier.

**How the approach is proven**

Prove it offline on APCER and BPCER at fixed operating points and Per-skin-tone error parity using time-ordered splits, then online on "Account-opening fraud rate" with "Onboarding completion rate" as the guardrail. Watch for: Test attacks generated by the same tool used in training and Demographic skew in genuine samples masks bias.

## Baseline and production design

- **Baseline (build this first):** Active-challenge liveness with a texture CNN.
- **Production design:** Multi-head ensemble: temporal ViT for deepfakes, rPPG branch and device attestation; thresholds tuned per attack class.

## Why AI, and why this kind

**Why AI.** Confirm a live human is present and detect injected or generated faces during remote onboarding, defeating presentation and injection attacks. The evidence that separates good from bad outcomes (Challenge response latency, rPPG pulse signal, Camera integrity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "one binary real-vs-fake classifier" are what teams reach for first, and they fail because binary models overfit one attack and miss the next. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Multi-head ensemble: temporal ViT for deepfakes, rPPG branch and device attestation; thresholds tuned per attack class.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Challenge response latency, rPPG pulse signal, Camera integrity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Active-challenge liveness with a texture CNN | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Multi-head ensemble: temporal ViT for deepfakes, rPPG branch and device attestation; thresholds tuned per attack class | chosen | Meets the 2500 ms envelope at $1.37 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Account-opening fraud rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Test attacks generated by the same tool used in training.
- Evaluation trap: Demographic skew in genuine samples masks bias.
- New generative model release: detector recall drops overnight.
- Low-end phone camera noise: genuine users fail liveness.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
