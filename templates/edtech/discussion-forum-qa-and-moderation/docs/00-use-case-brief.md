# Discussion Forum Q&A & Moderation: use-case brief

> Generated from the blueprint `edtech/discussion-forum-qa-and-moderation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Discussion Forum Q&A & Moderation · **Domain:** edtech · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Auto-answer repeated questions with citations, surface expert answers, and moderate toxic or off-topic posts. The system has to run in under 100 milliseconds, inside these limits: Age-appropriate moderation, Accuracy of answers and Instructor control.

**Why it is hard.** The obvious approach is keyword search, and it fails because duplicates phrase the same doubt differently. The second trap is in "Moderation": the real signal is contextual toxicity (not word lists), while teams usually reach for profanity filters.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $418.0K a month. A mistake is expensive in the way instructor workload measures it.

**What success looks like.** Offline: Duplicate retrieval MRR and Moderation F1. Online: Time to first answer and Instructor workload. The launch is judged on "Time to first answer" while "Instructor workload" must not get worse.

## Objective, loss and constraints

**Business objective.** Auto-answer repeated questions with citations, surface expert answers, and moderate toxic or off-topic posts.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\text{toxic},p)+\lambda\,\mathrm{InfoNCE}(\text{question},\text{answer})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \text{toxic} | The label: 1 if a post is toxic or abusive, 0 if not. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{InfoNCE} | Contrastive loss that pulls true matching pairs together and pushes non-matching pairs apart. |
| \text{question} | The embedding of a question post. |
| \text{answer} | The embedding of an answer post that matches the question. |

**Hard constraints**

- Age-appropriate moderation
- Accuracy of answers
- Instructor control
- Low false removals

## The approach in one paragraph

Start with keyword search and manual moderators. Then earn the move to dual-encoder retrieval with answer ranker, grounded LLM answers on course materials with instructor-approved status, and context-aware moderation, and only if it beats the baseline on Duplicate retrieval MRR and Moderation F1 after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Question similarity | Embedding similarity to past questions. Dedup. Guard against: domain tuning. |
| Add Answer quality votes and instructor tags | Endorsements. Trust. Guard against: vote bias. |
| Add Toxicity probability | Classifier score. Moderation. Guard against: calibration. |
| Run it as one pipeline | New post (forum), Moderation classifier (transformer), Duplicate retriever (dual encoder), Answer ranker (cross-encoder), Grounded answer LLM (course materials), Instructor approval (human) and Forum update (posting). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle aI answer contradicts the instructor | Instructor-approved answers take precedence. |

**Deliberately not doing**

- Post length: weak.
- Poster name: none.

**How the approach is proven**

Prove it offline on Duplicate retrieval MRR and Moderation F1 using time-ordered splits, then online on "Time to first answer" with "Instructor workload" as the guardrail. Watch for: Training on toxic data from other domains and No check of AI answer correctness.

## Baseline and production design

- **Baseline (build this first):** Keyword search and manual moderators.
- **Production design:** Dual-encoder retrieval with answer ranker, grounded LLM answers on course materials with instructor-approved status, and context-aware moderation.

## Why AI, and why this kind

**Why AI.** Auto-answer repeated questions with citations, surface expert answers, and moderate toxic or off-topic posts. The evidence that separates good from bad outcomes (Question similarity, Answer quality votes and instructor tags, Toxicity probability) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "keyword search" are what teams reach for first, and they fail because duplicates phrase the same doubt differently. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Dual-encoder retrieval with answer ranker, grounded LLM answers on course materials with instructor-approved status, and context-aware moderation.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Question similarity, Answer quality votes and instructor tags, Toxicity probability and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword search and manual moderators | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Dual-encoder retrieval with answer ranker, grounded LLM answers on course materials with instructor-approved status, and context-aware moderation | chosen | Meets the 80 ms envelope at $4.64 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to first answer) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on toxic data from other domains.
- Evaluation trap: No check of AI answer correctness.
- AI answer contradicts the instructor: an automated answer contradicts the instructor's view and confuses learners.
- Sensitive posts (self-harm) hidden by moderation: missed support need.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
