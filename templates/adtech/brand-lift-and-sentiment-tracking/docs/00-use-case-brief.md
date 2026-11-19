# Brand Lift & Sentiment Tracking: use-case brief

> Generated from the blueprint `adtech/brand-lift-and-sentiment-tracking` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Brand Lift & Sentiment Tracking · **Domain:** adtech · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Track brand awareness and sentiment from surveys and social/text data and attribute changes to campaigns. The system has to run as a scheduled batch job, inside these limits: Survey bias, Social data representativeness and Multi-language.

**Why it is hard.** The obvious approach is pre/post social sentiment, and it fails because brand sentiment moves with news not just ads. The second trap is in "Sentiment": the real signal is aspect-level sentiment, while teams usually reach for overall polarity.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.9K a month. A mistake is expensive in the way decision usage measures it.

**What success looks like.** Offline: Sentiment macro-F1 and Lift estimate CI width. Online: Brand lift per spend and Decision usage. The launch is judged on "Brand lift per spend" while "Decision usage" must not get worse.

## Objective, loss and constraints

**Business objective.** Track brand awareness and sentiment from surveys and social/text data and attribute changes to campaigns.

**Training objective.** `\mathcal{L}=\mathrm{CE}_{\text{sentiment}}+\lambda\,\mathrm{CE}_{\text{topic}}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE}_{\text{sentiment}} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |

**Hard constraints**

- Survey bias
- Social data representativeness
- Multi-language
- Weekly reporting

## The approach in one paragraph

Start with daily social sentiment score. Then earn the move to controlled survey lift measurement plus aspect-based sentiment from text, linked to campaign flights with causal adjustment, and only if it beats the baseline on Sentiment macro-F1 and Lift estimate CI width after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Exposed minus control lift | Survey lift. Effect. Guard against: design. |
| Add Aspect sentiment | Attribute-level polarity. Insight. Guard against: model. |
| Add Volume vs baseline | Mention spike z-score. Event. Guard against: window. |
| Run it as one pipeline | Survey responses (panel), Social and web text (ingestion), Sentiment and aspect model (transformer), Lift estimator (causal), Event detector (time series) and Action tracking (human), with Brand team report off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle viral controversy swamps campaign signal | Event detection and separation of baseline. |

**Deliberately not doing**

- Follower count: weak.
- Emoji usage: weak.

**How the approach is proven**

Prove it offline on Sentiment macro-F1 and Lift estimate CI width using time-ordered splits, then online on "Brand lift per spend" with "Decision usage" as the guardrail. Watch for: Social data not representative and Pre/post designs without controls.

## Baseline and production design

- **Baseline (build this first):** Daily social sentiment score.
- **Production design:** Controlled survey lift measurement plus aspect-based sentiment from text, linked to campaign flights with causal adjustment.

## Why AI, and why this kind

**Why AI.** Track brand awareness and sentiment from surveys and social/text data and attribute changes to campaigns. The evidence that separates good from bad outcomes (Exposed minus control lift, Aspect sentiment, Volume vs baseline) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "pre/post social sentiment" are what teams reach for first, and they fail because brand sentiment moves with news not just ads. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Controlled survey lift measurement plus aspect-based sentiment from text, linked to campaign flights with causal adjustment.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Exposed minus control lift, Aspect sentiment, Volume vs baseline and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Daily social sentiment score | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Controlled survey lift measurement plus aspect-based sentiment from text, linked to campaign flights with causal adjustment | chosen | Meets the run-window envelope at $0.207 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Brand lift per spend) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Social data not representative.
- Evaluation trap: Pre/post designs without controls.
- Viral controversy swamps campaign signal: lift attributed wrongly.
- Bot activity inflates mentions: false sentiment moves.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
