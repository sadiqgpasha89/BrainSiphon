# Vocabulary Size & Level Estimation: use-case brief

> Generated from the blueprint `edtech/vocabulary-level-estimation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Vocabulary Size & Level Estimation · **Domain:** edtech · **Latency tier:** sub-100ms · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Estimate a learner's vocabulary size and unknown words quickly to select appropriate texts and drills. The system has to run in under 100 milliseconds, inside these limits: Few test items, Word frequency bias and L1 transfer.

**Why it is hard.** The obvious approach is self-reported knowledge, and it fails because self-assessment is inflated. The second trap is in "Transfer": the real signal is account for first-language cognates, while teams usually reach for frequency only.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $12.2K a month. A mistake is expensive in the way learning gain measures it.

**What success looks like.** Offline: Prediction of held-out word knowledge and Correlation with proficiency tests. Online: Text-difficulty match and Learning gain. The launch is judged on "Text-difficulty match" while "Learning gain" must not get worse.

## Objective, loss and constraints

**Business objective.** Estimate a learner's vocabulary size and unknown words quickly to select appropriate texts and drills.

**Training objective.** `\mathcal{L}=\sum_w\mathrm{BCE}(k_w,\hat p_w)\quad\hat p_w=\sigma(\theta-b_w)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_w | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| k_w | Whether the learner knows word w: 1 if known. |
| \hat{p}_w | The predicted probability that the learner knows word w. |
| \sigma | Sigmoid function: squashes the difference of ability and difficulty into a probability. |
| \theta | The learner's vocabulary ability. |
| b_w | The difficulty of word w. |

**Hard constraints**

- Few test items
- Word frequency bias
- L1 transfer
- Quick onboarding

## The approach in one paragraph

Start with standard vocabulary level tests (fixed words). Then earn the move to adaptive yes/no and meaning-recall tasks with a Bayesian word-knowledge model per learner, L1-aware priors and pseudo-word correction, and only if it beats the baseline on Prediction of held-out word knowledge and Correlation with proficiency tests after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Word frequency band | Log frequency. Difficulty. Guard against: corpus. |
| Add Cognate indicator | L1-L2 similarity. Transfer. Guard against: dictionaries. |
| Add Response time | Time to respond. Knowledge confidence. Guard against: timing. |
| Run it as one pipeline | Test items (adaptive selector), Response collector (app), Word-knowledge model (Bayesian IRT), Pseudo-word correction (guess adjustment), Text recommender (downstream) and Longitudinal updates (learner model), with Level report off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle learners overclaim knowledge | Pseudo-word penalties. |

**Deliberately not doing**

- Word length: weak.
- Part of speech: weak.

**How the approach is proven**

Prove it offline on Prediction of held-out word knowledge and Correlation with proficiency tests using time-ordered splits, then online on "Text-difficulty match" with "Learning gain" as the guardrail. Watch for: Frequency bands only and No L1 variation.

## Baseline and production design

- **Baseline (build this first):** Standard vocabulary level tests (fixed words).
- **Production design:** Adaptive yes/no and meaning-recall tasks with a Bayesian word-knowledge model per learner, L1-aware priors and pseudo-word correction.

## Why AI, and why this kind

**Why AI.** Estimate a learner's vocabulary size and unknown words quickly to select appropriate texts and drills. The evidence that separates good from bad outcomes (Word frequency band, Cognate indicator, Response time) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "self-reported knowledge" are what teams reach for first, and they fail because self-assessment is inflated. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Adaptive yes/no and meaning-recall tasks with a Bayesian word-knowledge model per learner, L1-aware priors and pseudo-word correction.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Word frequency band, Cognate indicator, Response time and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Standard vocabulary level tests (fixed words) | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Adaptive yes/no and meaning-recall tasks with a Bayesian word-knowledge model per learner, L1-aware priors and pseudo-word correction | chosen | Meets the 80 ms envelope at $0.679 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Text-difficulty match) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Frequency bands only.
- Evaluation trap: No L1 variation.
- Learners overclaim knowledge: learners claim to know words they do not, inflating the estimated vocabulary size.
- L1 with no data: a first language with no data gives poor priors and wrong estimates at the start.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
