# Reading Fluency Assessment for Children: use-case brief

> Generated from the blueprint `edtech/reading-fluency-assessment-asr` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Reading Fluency Assessment for Children · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Measure oral reading fluency (words correct per minute, accuracy) from child audio to identify struggling readers early. The system has to run interactively, within a few seconds, inside these limits: Child speech ASR, Classroom noise and Privacy of minors.

**Why it is hard.** The obvious approach is open-vocabulary ASR, and it fails because alignment captures omissions and substitutions. The second trap is in "Fairness": the real signal is evaluate across dialects and ages, while teams usually reach for overall WER.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 63 at peak, at an estimated $14.5K a month. A mistake is expensive in the way intervention rate measures it.

**What success looks like.** Offline: WCPM correlation with teacher scores and Miscue detection F1. Online: Early identification of reading difficulty and Intervention rate. The launch is judged on "Early identification of reading difficulty" while "Intervention rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Measure oral reading fluency (words correct per minute, accuracy) from child audio to identify struggling readers early.

**Training objective.** `\mathcal{L}=\mathcal{L}_{\text{CTC}}+\lambda\,\mathrm{Alignment}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathcal{L}_{\text{CTC}} | Connectionist temporal classification loss for speech recognition of the child's reading. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Alignment} | Penalty when the recognised words are not aligned correctly with the reference text. |

**Hard constraints**

- Child speech ASR
- Classroom noise
- Privacy of minors
- Teacher-friendly reports

## The approach in one paragraph

Start with teacher stopwatch assessment. Then earn the move to child-tuned speech model with forced alignment to passage text, miscue classification and teacher dashboards, and only if it beats the baseline on WCPM correlation with teacher scores and Miscue detection F1 after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Words correct per minute | Aligned correct words per minute. Fluency. Guard against: timing. |
| Add Miscue types | Omissions, substitutions, repetitions. Diagnostics. Guard against: alignment. |
| Add Self-correction rate | Self-corrections. Metacognition. Guard against: detection. |
| Run it as one pipeline | Audio capture (tablet), Noise suppression (front end), Child ASR (conformer fine-tuned), Passage aligner (forced alignment) and Miscue classifier (model), with Teacher report and Teacher scores off the critical path. |
| Optimise the right thing | The objective weighs connectionist temporal classification loss for speech recognition of the child's reading, so the model is trained on the cost of the decision and not on a generic score. |
| Handle classroom noise from other students | Beam-forming mics and speaker verification. |

**Deliberately not doing**

- Voice pitch: age effect.
- Background chatter: channel.

**How the approach is proven**

Prove it offline on WCPM correlation with teacher scores and Miscue detection F1 using time-ordered splits, then online on "Early identification of reading difficulty" with "Intervention rate" as the guardrail. Watch for: Adult speech used for evaluation and Single dialect test set.

## Baseline and production design

- **Baseline (build this first):** Teacher stopwatch assessment.
- **Production design:** Child-tuned speech model with forced alignment to passage text, miscue classification and teacher dashboards.

## Why AI, and why this kind

**Why AI.** Measure oral reading fluency (words correct per minute, accuracy) from child audio to identify struggling readers early. The evidence that separates good from bad outcomes (Words correct per minute, Miscue types, Self-correction rate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "open-vocabulary ASR" are what teams reach for first, and they fail because alignment captures omissions and substitutions. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Child-tuned speech model with forced alignment to passage text, miscue classification and teacher dashboards.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Words correct per minute, Miscue types, Self-correction rate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Teacher stopwatch assessment | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Child-tuned speech model with forced alignment to passage text, miscue classification and teacher dashboards | chosen | Meets the 2500 ms envelope at $0.538 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Early identification of reading difficulty) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Adult speech used for evaluation.
- Evaluation trap: Single dialect test set.
- Classroom noise from other students: misrecognised words.
- Dialect pronunciation counted as errors: legitimate dialect pronunciations are counted as errors and learners are scored unfairly.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
