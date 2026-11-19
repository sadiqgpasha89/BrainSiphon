# Oral Exam & Viva Assessment with LLMs: use-case brief

> Generated from the blueprint `edtech/oral-exam-viva-llm` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Oral Exam & Viva Assessment with LLMs · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Conduct structured oral assessments where an AI asks follow-up questions to probe understanding, with transcripts graded by rubric and reviewed by instructors. The system has to run interactively, within a few seconds, inside these limits: Fairness across accents, Consent for recording and Instructor review of scores.

**Why it is hard.** The obvious approach is static question list, and it fails because adaptive questioning is harder to prepare for or fake. The second trap is in "Fairness": the real signal is score content not accent or fluency, while teams usually reach for holistic impressions.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 4 at peak, at an estimated $20.7K a month. A mistake is expensive in the way student fairness perception measures it.

**What success looks like.** Offline: Agreement with instructor scores and Accent-group score parity. Online: Instructor hours saved and Student fairness perception. The launch is judged on "Instructor hours saved" while "Student fairness perception" must not get worse.

## Objective, loss and constraints

**Business objective.** Conduct structured oral assessments where an AI asks follow-up questions to probe understanding, with transcripts graded by rubric and reviewed by instructors.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{rubric,dialogue})+\lambda\,\mathrm{RubricMisalign}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_\theta | The language model's probability of the next token y_t, given the earlier tokens and the context written after the bar. (one value per time step or token t and forecast step h) |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| y_{<t} | All tokens before position t: the text the model has already read or generated. (one value per time step or token t) |
| \text{rubric,dialogue} | The marking rubric and the conversation so far. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{RubricMisalign} | Penalty when questions or judgements stray from the rubric. |

**Hard constraints**

- Fairness across accents
- Consent for recording
- Instructor review of scores
- Anti-cheating

## The approach in one paragraph

Start with instructors conduct oral exams individually. Then earn the move to voice dialogue agent with rubric-driven adaptive probing, accent-robust ASR, transcript-based scoring and instructor review, and only if it beats the baseline on Agreement with instructor scores and Accent-group score parity after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Rubric criterion evidence | Transcript spans per criterion. Scoring. Guard against: transcript quality. |
| Add Follow-up depth reached | Levels of probing. Understanding. Guard against: dialogue. |
| Add ASR confidence | Word-level confidence. Reliability. Guard against: calibration. |
| Run it as one pipeline | Student audio (exam client), Streaming ASR (accent-robust), Dialogue agent (LLM with rubric), Follow-up policy (depth controller), Transcript scorer (rubric model) and Appeals (human), with Instructor review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle aSR errors on technical terms | Show transcript to instructors with low-confidence highlights. |

**Deliberately not doing**

- Speaking speed: not understanding.
- Filler words: not understanding.

**How the approach is proven**

Prove it offline on Agreement with instructor scores and Accent-group score parity using time-ordered splits, then online on "Instructor hours saved" with "Student fairness perception" as the guardrail. Watch for: Calibrated on a few instructors and ASR errors ignored in evaluation.

## Baseline and production design

- **Baseline (build this first):** Instructors conduct oral exams individually.
- **Production design:** Voice dialogue agent with rubric-driven adaptive probing, accent-robust ASR, transcript-based scoring and instructor review.

## Why AI, and why this kind

**Why AI.** Conduct structured oral assessments where an AI asks follow-up questions to probe understanding, with transcripts graded by rubric and reviewed by instructors. The evidence that separates good from bad outcomes (Rubric criterion evidence, Follow-up depth reached, ASR confidence) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "static question list" are what teams reach for first, and they fail because adaptive questioning is harder to prepare for or fake. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: Voice dialogue agent with rubric-driven adaptive probing, accent-robust ASR, transcript-based scoring and instructor review.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Rubric criterion evidence, Follow-up depth reached, ASR confidence and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Instructors conduct oral exams individually | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Voice dialogue agent with rubric-driven adaptive probing, accent-robust ASR, transcript-based scoring and instructor review | chosen | Meets the 2500 ms envelope at $11.51 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Instructor hours saved) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Calibrated on a few instructors.
- Evaluation trap: ASR errors ignored in evaluation.
- ASR errors on technical terms: student penalised for transcription errors.
- Student attempts to manipulate the agent: inflated scoring.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
