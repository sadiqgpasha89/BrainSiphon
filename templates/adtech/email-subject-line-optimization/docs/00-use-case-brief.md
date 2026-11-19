# Email Subject Line & Send Optimisation: use-case brief

> Generated from the blueprint `adtech/email-subject-line-optimization` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Email Subject Line & Send Optimisation · **Domain:** adtech · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Choose subject lines that lift real engagement and conversions rather than opens inflated by privacy features. The system has to run interactively, within a few seconds, inside these limits: Brand and compliance, Open-rate measurement distortions and Consent.

**Why it is hard.** The obvious approach is open rate, and it fails because mail privacy features auto-open messages. The second trap is in "Generation": the real signal is generate variants and select via bandit, while teams usually reach for pick by predicted opens.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $12.2K a month. A mistake is expensive in the way unsubscribe rate measures it.

**What success looks like.** Offline: Click-prediction AUC and Off-policy value estimate. Online: Click-through and conversion rate and Unsubscribe rate. The launch is judged on "Click-through and conversion rate" while "Unsubscribe rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Choose subject lines that lift real engagement and conversions rather than opens inflated by privacy features.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\text{click},p)+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \text{click} | The label: 1 if the recipient clicked or opened, 0 if not. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Brand and compliance
- Open-rate measurement distortions
- Consent
- Fast iteration

## The approach in one paragraph

Start with a/B test of two subjects by open rate. Then earn the move to lLM-generated variant pool scored by a click-based response model and chosen via a contextual bandit with brand filters, and only if it beats the baseline on Click-prediction AUC and Off-policy value estimate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Subject embedding features | Semantic embedding of subject. Content. Guard against: encoder. |
| Add Audience segment affinity | Segment response to themes. Personalisation. Guard against: history. |
| Add Send-time context | Local time and weekday. Context. Guard against: time zone. |
| Run it as one pipeline | Campaign brief (marketing tool), Variant generator (LLM), Brand and compliance filter (rules), Response model (GBDT), Bandit selector (Thompson), Send service (ESP) and Click and conversion logs (analytics). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle auto-opens inflate engagement for one segment | Use click-based rewards and bot-open filtering. |

**Deliberately not doing**

- Emoji count alone: spurious.
- Subject length: weak.

**How the approach is proven**

Prove it offline on Click-prediction AUC and Off-policy value estimate using time-ordered splits, then online on "Click-through and conversion rate" with "Unsubscribe rate" as the guardrail. Watch for: Training on opens and Ignoring deliverability effects.

## Baseline and production design

- **Baseline (build this first):** A/B test of two subjects by open rate.
- **Production design:** LLM-generated variant pool scored by a click-based response model and chosen via a contextual bandit with brand filters.

## Why AI, and why this kind

**Why AI.** Choose subject lines that lift real engagement and conversions rather than opens inflated by privacy features. The evidence that separates good from bad outcomes (Subject embedding features, Audience segment affinity, Send-time context) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "open rate" are what teams reach for first, and they fail because mail privacy features auto-open messages. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The decision changes the data you observe, so the system must explore and learn from its own actions with logged propensities. Here the production design is: LLM-generated variant pool scored by a click-based response model and chosen via a contextual bandit with brand filters.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Subject embedding features, Audience segment affinity, Send-time context and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A/B test of two subjects by open rate | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| LLM-generated variant pool scored by a click-based response model and chosen via a contextual bandit with brand filters | chosen | Meets the 2500 ms envelope at $0.678 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Full reinforcement learning | later | Needs a simulator or very large exploration budget; contextual bandits capture most of the value with safe off-policy evaluation |
| LLM or agent as the decision maker | rejected | An LLM can propose candidate actions, but the selection stays with the bandit and its constraints |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a full reinforcement learning beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Click-through and conversion rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on opens.
- Evaluation trap: Ignoring deliverability effects.
- Auto-opens inflate engagement for one segment: bandit favours wrong subjects.
- Spam-trigger phrasing: deliverability drops.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
