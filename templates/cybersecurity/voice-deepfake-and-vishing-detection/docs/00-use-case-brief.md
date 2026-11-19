# Voice Deepfake & Vishing Detection: use-case brief

> Generated from the blueprint `cybersecurity/voice-deepfake-and-vishing-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Voice Deepfake & Vishing Detection · **Domain:** cybersecurity · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect synthetic or cloned voices and social-engineering call patterns in contact-centre and enterprise calls in near real time. The system has to run interactively, within a few seconds, inside these limits: Telephony codecs and 8 kHz audio, Real-time during the call and Consent and recording laws.

**Why it is hard.** The obvious approach is studio-quality datasets, and it fails because models trained on clean audio fail on phone lines. The second trap is in "Behaviour": the real signal is combine voice artefacts with conversation intent signals, while teams usually reach for voice-only classifier.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 63 at peak, at an estimated $15.7K a month. A mistake is expensive in the way step-up rate for genuine callers measures it.

**What success looks like.** Offline: EER on telephony test sets and Fraud-call recall at fixed FP. Online: Vishing losses and Step-up rate for genuine callers. The launch is judged on "Vishing losses" while "Step-up rate for genuine callers" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect synthetic or cloned voices and social-engineering call patterns in contact-centre and enterprise calls in near real time.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{SupCon}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{SupCon} | Supervised contrastive loss: pulls together all items that share a label and pushes apart the rest. |

**Hard constraints**

- Telephony codecs and 8 kHz audio
- Real-time during the call
- Consent and recording laws
- Low false positives for customers

## The approach in one paragraph

Start with voice biometrics and caller-ID verification. Then earn the move to codec-robust anti-spoofing model (AASIST-style) fused with real-time transcript intent classifier and call-metadata risk, with agent prompts, and only if it beats the baseline on EER on telephony test sets and Fraud-call recall at fixed FP after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Spectral artefact score | Model on spectral and phase features. Synthesis traces. Guard against: codec simulation. |
| Add Social-engineering intent | Urgency, secrecy and payment requests. Fraud script. Guard against: transcript. |
| Add Caller-ID and call-path anomaly | Spoofing indicators. Spoofing. Guard against: sTIR/SHAKEN data. |
| Run it as one pipeline | Call audio stream (telephony), Anti-spoofing model (AASIST on GPU), Streaming ASR and intent (NLP), Call-metadata risk (GBDT), Risk fusion (ensemble), Agent alert and step-up (human) and Confirmed fraud (labels). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new TTS model release | Continuous synthetic-data refresh and red-team feeds. |

**Deliberately not doing**

- Call duration: weak.
- Background noise level: channel.

**How the approach is proven**

Prove it offline on EER on telephony test sets and Fraud-call recall at fixed FP using time-ordered splits, then online on "Vishing losses" with "Step-up rate for genuine callers" as the guardrail. Watch for: Test deepfakes from the same generators as training and Clean audio evaluation.

## Baseline and production design

- **Baseline (build this first):** Voice biometrics and caller-ID verification.
- **Production design:** Codec-robust anti-spoofing model (AASIST-style) fused with real-time transcript intent classifier and call-metadata risk, with agent prompts.

## Why AI, and why this kind

**Why AI.** Detect synthetic or cloned voices and social-engineering call patterns in contact-centre and enterprise calls in near real time. The evidence that separates good from bad outcomes (Spectral artefact score, Social-engineering intent, Caller-ID and call-path anomaly) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "studio-quality datasets" are what teams reach for first, and they fail because models trained on clean audio fail on phone lines. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Codec-robust anti-spoofing model (AASIST-style) fused with real-time transcript intent classifier and call-metadata risk, with agent prompts.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Spectral artefact score, Social-engineering intent, Caller-ID and call-path anomaly and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Voice biometrics and caller-ID verification | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Codec-robust anti-spoofing model (AASIST-style) fused with real-time transcript intent classifier and call-metadata risk, with agent prompts | chosen | Meets the 2500 ms envelope at $0.581 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Vishing losses) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Test deepfakes from the same generators as training.
- Evaluation trap: Clean audio evaluation.
- New TTS model release: detector recall drops overnight.
- Poor mobile connection degrades audio: genuine callers flagged.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
