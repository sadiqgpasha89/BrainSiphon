# Knowledge Tracing & Student Modelling: use-case brief

> Generated from the blueprint `edtech/knowledge-tracing-student-modeling` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Knowledge Tracing & Student Modelling · **Domain:** edtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** A learning app asks a student one question at a time, and after every answer it has to decide what the student now knows, per skill, and what to ask next. Mastery is not observable. All the system sees is a stream of right and wrong answers, with timestamps, against questions tagged to skills. From that stream it must keep a running estimate of mastery for each skill for each learner, update it within 30 milliseconds of an answer, explain it to a teacher and a parent as a progress report, and feed it to the practice selector so a learner is not given work that is too easy, too hard or already mastered.

**Why it is hard.** The thing being estimated is never labelled; the next answer is only a proxy, and predicting it well does not mean the mastery number is right. Practice is not random: the tutor gives weak skills more practice, so comparing accuracy across skills confuses what the learner knows with what the model chose to ask. Random train-test splits leak a student's own future answers into training, which makes every metric look excellent. Guessing on multiple choice makes correct answers overstate mastery, long breaks make old estimates stale, and a calibration error is not cosmetic: an overconfident 95 percent that is really 70 stops practice too early and the learner leaves the skill unlearned.

**Scale and stakes.** With 10 million registered and 3 million daily active learners the system processes about 75 million answers a day, 868 per second on average and 5,200 at peak, with capacity for 7,800, all inside an 80 ms path that leaves 27 ms for the model. Cost is small, roughly $4.5K a month or $0.002 per thousand updates, because the heavy attention model is distilled and its state cached per learner. The stakes are educational and human: a wrong mastery estimate wastes a child's time or tells a parent their child is ready when they are not.

**What success looks like.** Offline, AUC and RMSE on next-response prediction with a student-level split, and calibration by skill that holds across the probability range, since calibrated mastery is the product. Online, the launch is judged on learning gain per hour, with practice efficiency, the amount of practice needed to reach a stable skill, as the guardrail. An update finishes in under 30 ms, the progress report gives a teacher a number they can interpret per skill, and a new skill gets a sensible estimate on day one.

## Objective, loss and constraints

**Business objective.** Estimate each learner's evolving mastery per skill from their answer history to drive practice selection and progress reports.

**Training objective.** `\mathcal{L}=-\sum_t\left[y_t\log \hat p_t+(1-y_t)\log(1-\hat p_t)\right]`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| \hat{p}_t | The model's estimated probability, after calibration where one is applied. (one value per time step or token t) |

**Hard constraints**

- Update after every answer in under 30 ms
- Millions of learners
- Interpretable mastery per skill
- Cold-start for new skills

## The approach in one paragraph

Begin with Bayesian knowledge tracing per skill, with fitted guess and slip, because it is interpretable, runs in microseconds and gives teachers a number they understand. Then move to an attentive model with item-difficulty embeddings and forgetting only if it improves student-level held-out AUC and per-skill calibration, and serve it as a distilled small model with the learner's state cached, so each answer costs one cache read, one inference and one calibration. The learner-facing mastery is the calibrated output, never the raw model score.

**Moves**

| Move | Detail |
|---|---|
| Fix the unit of mastery and the skill map first | Agree with curriculum designers on skills and on the mapping from every question to its skills, version that map, and write down what mastered means in terms of a probability and a run of consistent successes. |
| Build the sequence the model will see | Order interactions by server-side timestamp, never by insertion or device clock, and create recency-weighted correctness, time since last practice and prior failures on the skill using only answers given before the current one. |
| Use difficulty from other learners | Question difficulty comes from a smoothed correct rate among training students, never including the learner being scored, so a hard question does not look like a weak learner. |
| Model the way learners forget and guess | Decay mastery with time since practice, and model guess and slip rates per item type so a multiple-choice success counts for less than a free-response one. |
| Distil for the 30 ms path | Train the attentive model offline, distil it into a small online model, keep the learner's recent sequence and skill state in a cache keyed by learner, and update it after every answer. |
| Calibrate per skill before showing anything | Fit an isotonic calibrator per skill on held-out students, check reliability by skill, and show learners and teachers only the calibrated mastery. |

**Deliberately not doing**

- Use the student identifier as an embedding: it memorises individuals and fails for every new student, which is the main growth case.
- Use total questions answered or session length: both measure engagement and login timing, not knowledge.
- Split interactions randomly: a student's own future answers would sit in training and every metric would look better than it is.
- Compare accuracy across skills as if practice were random: the tutor assigns more practice to weak skills, so the comparison reflects the tutor's choices.

**How the approach is proven**

Offline, split by student and by time and report AUC and RMSE on next response against the Bayesian baseline, plus reliability curves per skill. Online, run an experiment on learners where the practice selector uses the new mastery against one using the baseline, and measure learning gain per hour with practice efficiency as a guardrail, because the only evidence that mastery is right is that learners who are told they have mastered a skill retain it.

## Baseline and production design

- **Baseline (build this first):** Bayesian Knowledge Tracing per skill with fitted guess and slip.
- **Production design:** Attentive knowledge tracing (SAKT/AKT) with IRT-style item embeddings and forgetting, distilled to a small online model with state cached per learner.

## Why AI, and why this kind

**Why AI.** Estimate each learner's evolving mastery per skill from their answer history to drive practice selection and progress reports. The evidence that separates good from bad outcomes (Recent correctness with recency weighting, Item difficulty parameter, Time-since-last-practice) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "deep model without skill structure" are what teams reach for first, and they fail because opaque models predict next answers but can't explain mastery. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Many related series with calendar, price and event effects and a hierarchy to reconcile: global models with exogenous features beat per-series statistics at scale and give calibrated intervals. Here the production design is: Attentive knowledge tracing (SAKT/AKT) with IRT-style item embeddings and forgetting, distilled to a small online model with state cached per learner.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Recent correctness with recency weighting, Item difficulty parameter, Time-since-last-practice and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Bayesian Knowledge Tracing per skill with fitted guess and slip | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Attentive knowledge tracing (SAKT/AKT) with IRT-style item embeddings and forgetting, distilled to a small online model with state cached per learner | chosen | Meets the 80 ms envelope at $0.0020 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep global forecaster (transformer or N-BEATS class) | later | Needs far more data per series than most hierarchies have; adopt when a benchmark shows a gain on the long tail |
| LLM or agent as the decision maker | rejected | A language model cannot replace numeric forecasting; use one to explain forecast changes and run what-if scenarios |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep global forecaster (transformer or N-BEATS class) beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Learning gain per hour) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- A curriculum change remaps skills, and years of history become mislabelled against the new skill identifiers.
- Siblings share a device, and one learner's answers pollute another's mastery, which the model would otherwise interpret as erratic learning.
- A learner returns after a long break and the cached estimate is stale and overconfident, so the tutor skips the review the learner needs.
- Correct guesses on multiple-choice items overstate mastery unless guess and slip rates are modelled per item type.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
