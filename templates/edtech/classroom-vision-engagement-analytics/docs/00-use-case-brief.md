# Classroom Engagement Analytics (Vision): use-case brief

> Generated from the blueprint `edtech/classroom-vision-engagement-analytics` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Classroom Engagement Analytics (Vision) · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Provide teachers with class-level engagement and participation insights from privacy-preserving, on-device video analysis. The system has to run interactively, within a few seconds, inside these limits: Strict privacy (no individual identification), Consent from parents and On-device processing.

**Why it is hard.** The obvious approach is cloud video analysis of individuals, and it fails because individual surveillance harms trust and wellbeing. The second trap is in "Validity": the real signal is validate against learning outcomes, while teams usually reach for engagement scores as truth.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $21.8K a month. A mistake is expensive in the way correlation with learning outcomes measures it.

**What success looks like.** Offline: Activity-classification accuracy and Privacy audit (no re-identification). Online: Teacher reflection usage and Correlation with learning outcomes. The launch is judged on "Teacher reflection usage" while "Correlation with learning outcomes" must not get worse.

## Objective, loss and constraints

**Business objective.** Provide teachers with class-level engagement and participation insights from privacy-preserving, on-device video analysis.

**Training objective.** `\mathcal{L}=\mathrm{CE}(\text{activity},p)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \text{activity} | The classroom activity label, such as writing, listening or group work. |
| p | The predicted probability of each activity. |

**Hard constraints**

- Strict privacy (no individual identification)
- Consent from parents
- On-device processing
- No student ranking

## The approach in one paragraph

Start with teacher self-observation and occasional peer observation. Then earn the move to on-device activity recognition producing only aggregate, anonymised class-level metrics with strict retention and teacher-controlled usage, and only if it beats the baseline on Activity-classification accuracy and Privacy audit (no re-identification) after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Class-level activity mix | Proportion in discussion/work/lecture. Context. Guard against: classifier. |
| Add Teacher-student interaction rate | Interaction events. Participation. Guard against: detection. |
| Add Aggregate head-orientation distribution | Class-level only. Attention proxy. Guard against: aggregation. |
| Run it as one pipeline | Classroom camera (edge device), On-device detector (pose model), Aggregate computation (privacy layer), Class-level metrics (dashboard) and Outcome correlation (research), with Teacher reflection and Governance review off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle parents object to cameras | Opt-in consent and non-camera alternatives. |

**Deliberately not doing**

- Individual facial expressions: invalid and invasive.
- Seating position: weak.

**How the approach is proven**

Prove it offline on Activity-classification accuracy and Privacy audit (no re-identification) using time-ordered splits, then online on "Teacher reflection usage" with "Correlation with learning outcomes" as the guardrail. Watch for: Engagement proxies unvalidated and Evaluating on staged classes.

## Baseline and production design

- **Baseline (build this first):** Teacher self-observation and occasional peer observation.
- **Production design:** On-device activity recognition producing only aggregate, anonymised class-level metrics with strict retention and teacher-controlled usage.

## Why AI, and why this kind

**Why AI.** Provide teachers with class-level engagement and participation insights from privacy-preserving, on-device video analysis. The evidence that separates good from bad outcomes (Class-level activity mix, Teacher-student interaction rate, Aggregate head-orientation distribution) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "cloud video analysis of individuals" are what teams reach for first, and they fail because individual surveillance harms trust and wellbeing. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: On-device activity recognition producing only aggregate, anonymised class-level metrics with strict retention and teacher-controlled usage.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Class-level activity mix, Teacher-student interaction rate, Aggregate head-orientation distribution and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Teacher self-observation and occasional peer observation | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| On-device activity recognition producing only aggregate, anonymised class-level metrics with strict retention and teacher-controlled usage | chosen | Meets the 2500 ms envelope at $4.85 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Teacher reflection usage) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Engagement proxies unvalidated.
- Evaluation trap: Evaluating on staged classes.
- Parents object to cameras: programme must stop.
- Metrics misused to evaluate teachers: harmful incentives.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
