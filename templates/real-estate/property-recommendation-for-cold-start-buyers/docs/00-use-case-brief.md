# Property Recommendation for Cold-Start Buyers: use-case brief

> Generated from the blueprint `real-estate/property-recommendation-for-cold-start-buyers` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Property Recommendation for Cold-Start Buyers · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Recommend homes to new buyers from a few early actions or a short questionnaire and refine as signals arrive. The system has to run interactively, within a few seconds, inside these limits: Usable recommendations after three actions or a short questionnaire, No inference of sensitive attributes from behaviour and Every recommendation shows a plain reason.

**Why it is hard.** The obvious approach is collaborative filtering from other buyers, and it fails because a new buyer has no history, so similarity to other buyers is empty. The second trap is in "Exploration": the real signal is a deliberate share of diverse options early on, while teams usually reach for showing only the closest matches to the first clicks.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 417 at peak, at an estimated $13.0K a month. A mistake is expensive in the way return visits measures it.

**What success looks like.** Offline: Hit rate@20 and Coverage. Online: Enquiry rate for new users and Return visits. The launch is judged on "Enquiry rate for new users" while "Return visits" must not get worse.

## Objective, loss and constraints

**Business objective.** Recommend homes to new buyers from a few early actions or a short questionnaire and refine as signals arrive.

**Training objective.** `\mathcal{L}=\mathrm{InfoNCE}(u,i)+\lambda\,\mathrm{BPR}(\hat{y},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{InfoNCE} | Contrastive loss that pulls true matching pairs together and pushes non-matching pairs apart. |
| u | The buyer's embedding: a vector summarising early actions and stated preferences. |
| i | Index over examples. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{BPR} | Bayesian personalised ranking loss: trains the model to score items a user chose above items they did not. |
| \hat{y} | The model's prediction of y. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |

**Hard constraints**

- Usable recommendations after three actions or a short questionnaire
- No inference of sensitive attributes from behaviour
- Every recommendation shows a plain reason
- The buyer can opt out and clear their profile at any time

## The approach in one paragraph

Start with popular homes in the searched area, because it is safe. Then earn the move to two-tower model with content features, bandit exploration and reasons for each recommendation, and only if it beats the baseline on Hit rate@20 and Coverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Questionnaire answers | Budget range, bedrooms and preferred area one-hot encoded. The only direct statement of preference a new buyer provides. Guard against: self-report is imprecise, so treat it as a prior and not a rule. |
| Add Early views | Embedding of the first three viewed homes averaged with decaying weights. Reveals taste not captured by a questionnaire. Guard against: curiosity clicks are noisy, so weight saves above views. |
| Add Item embedding | Vector from home attributes, images and text trained on engagement. Allows similarity without any user history. Guard against: needs retraining as the market changes. |
| Run it as one pipeline | Session start (app), Preference capture (questionnaire), Item embeddings (batch), User tower (online encoder), ANN retrieval (vector index) and Bandit re-ranker (contextual bandit), with Feedback off the critical path. |
| Optimise the right thing | The objective weighs contrastive loss that pulls true matching pairs together and pushes non-matching pairs apart, so the model is trained on the cost of the decision and not on a generic score. |
| Handle misleading early clicks | Decay the weight of early actions and weight saves and enquiries above views. |

**Deliberately not doing**

- Device: Mostly a proxy for income and not a preference for a property.
- Referrer: Weakly related to what the buyer wants once their actions are known.
- Time of day: Reflects the buyer's schedule, not their taste.

**How the approach is proven**

Prove it offline on Hit rate@20 and Coverage using time-ordered splits, then online on "Enquiry rate for new users" with "Return visits" as the guardrail. Watch for: Historical logs are dominated by popular homes so offline scores favour popularity and New users behave differently from established ones, so a test on old users overstates cold-start quality.

## Baseline and production design

- **Baseline (build this first):** Popular homes in the searched area, because it is safe.
- **Production design:** Two-tower model with content features, bandit exploration and reasons for each recommendation.

## Why AI, and why this kind

**Why AI.** Recommend homes to new buyers from a few early actions or a short questionnaire and refine as signals arrive. The evidence that separates good from bad outcomes (Questionnaire answers, Early views, Item embedding) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "collaborative filtering from other buyers" are what teams reach for first, and they fail because A new buyer has no history, so similarity to other buyers is empty. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Ranking over a large catalogue from implicit feedback needs candidate retrieval plus a learned ranker; neither rules nor a single classifier scales to the catalogue and context. Here the production design is: Two-tower model with content features, bandit exploration and reasons for each recommendation.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Questionnaire answers, Early views, Item embedding and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Popular homes in the searched area, because it is safe | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Two-tower model with content features, bandit exploration and reasons for each recommendation | chosen | Meets the 2500 ms envelope at $0.072 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Sequence transformer ranker | later | Strong on rich histories but expensive to serve; adopt for the head tier once the cascade has an A/B-verified lift |
| LLM or agent as the decision maker | rejected | An LLM ranking every request costs far too much; use it for query understanding and offline catalogue enrichment |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a sequence transformer ranker beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Enquiry rate for new users) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Historical logs are dominated by popular homes so offline scores favour popularity.
- Evaluation trap: New users behave differently from established ones, so a test on old users overstates cold-start quality.
- Misleading early clicks: early clicks driven by curiosity mislead the profile.
- Shared accounts: a couple or family shares an account with different tastes.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
