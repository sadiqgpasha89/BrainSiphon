# Query Understanding & Spell Correction: use-case brief

> Generated from the blueprint `retail/query-understanding-and-spell-correction` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Query Understanding & Spell Correction · **Domain:** retail · **Latency tier:** sub-10ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Normalise, correct and classify user queries into intents and attributes within a few milliseconds before retrieval. The system has to run in under 10 milliseconds, inside these limits: Under 5 ms, 20 languages and code-mixed text and Safe against over-correction of brand names.

**Why it is hard.** The obvious approach is dictionary edit distance, and it fails because brand names like Xiaomi or Levi’s look like typos. The second trap is in "Intent": the real signal is attribute extraction (brand, size, colour) with ontology IDs, while teams usually reach for free-text matching.

**Scale and stakes.** At 10 million users this is about 30.0M model-touching events a day, 347 requests per second on average and 2.8K at peak, at an estimated $23.2K a month. A mistake is expensive in the way search conversion measures it.

**What success looks like.** Offline: Correction accuracy at 99% precision and NER F1. Online: Zero-result rate and Search conversion. The launch is judged on "Zero-result rate" while "Search conversion" must not get worse.

## Objective, loss and constraints

**Business objective.** Normalise, correct and classify user queries into intents and attributes within a few milliseconds before retrieval.

**Training objective.** `\mathcal{L}=\mathrm{CE}_{\text{intent}}+\lambda\,\mathrm{CE}_{\text{NER}}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE}_{\text{intent}} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |

**Hard constraints**

- Under 5 ms
- 20 languages and code-mixed text
- Safe against over-correction of brand names
- Updates daily

## The approach in one paragraph

Start with symmetric-delete spell checker with a static dictionary. Then earn the move to distilled transformer tagger and intent classifier (INT8) plus a noisy-channel corrector with learned reformulation priors, cached by query hash, and only if it beats the baseline on Correction accuracy at 99% precision and NER F1 after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Catalogue token frequency | Frequency of the token in titles and past successful queries. Prior for valid tokens. Guard against: update daily and exclude spam titles. |
| Add Reformulation graph | Queries users rewrote to and then purchased. Learned corrections. Guard against: only completed sessions with purchases. |
| Add Intent distribution | Softmax over category intents. Routing to the right index. Guard against: calibrate on production queries. |
| Run it as one pipeline | Query intake (edge service), Normaliser (unicode and tokenisation), Spell corrector (noisy-channel service), Intent and NER model (distilled BERT INT8), Attribute resolver (ontology map), Query cache (in-memory LRU) and Reformulation logger (Kafka). |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle viral trending term not in vocabulary | Trend detector adds terms within an hour. |

**Deliberately not doing**

- Query length alone: weak and language dependent.
- Typed device keyboard layout: handled by spelling model.

**How the approach is proven**

Prove it offline on Correction accuracy at 99% precision and NER F1 using time-ordered splits, then online on "Zero-result rate" with "Search conversion" as the guardrail. Watch for: Test queries are clean while production is noisy and Reformulation labels include accidental clicks.

## Baseline and production design

- **Baseline (build this first):** Symmetric-delete spell checker with a static dictionary.
- **Production design:** Distilled transformer tagger and intent classifier (INT8) plus a noisy-channel corrector with learned reformulation priors, cached by query hash.

## Why AI, and why this kind

**Why AI.** Normalise, correct and classify user queries into intents and attributes within a few milliseconds before retrieval. The evidence that separates good from bad outcomes (Catalogue token frequency, Reformulation graph, Intent distribution) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "dictionary edit distance" are what teams reach for first, and they fail because brand names like Xiaomi or Levi’s look like typos. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Distilled transformer tagger and intent classifier (INT8) plus a noisy-channel corrector with learned reformulation priors, cached by query hash.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Catalogue token frequency, Reformulation graph, Intent distribution and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Symmetric-delete spell checker with a static dictionary | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Distilled transformer tagger and intent classifier (INT8) plus a noisy-channel corrector with learned reformulation priors, cached by query hash | chosen | Meets the 8 ms envelope at $0.026 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Zero-result rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Test queries are clean while production is noisy.
- Evaluation trap: Reformulation labels include accidental clicks.
- Viral trending term not in vocabulary: corrected into nonsense.
- Code-mixed queries (Hinglish): wrong language pipeline.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
