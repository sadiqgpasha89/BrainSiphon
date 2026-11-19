# Listing Description Generation with Fair-Housing Checks: use-case brief

> Generated from the blueprint `real-estate/listing-description-generation-with-fair-housing-checks` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Listing Description Generation with Fair-Housing Checks · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Draft accurate listing descriptions from structured facts and photos and block language that could breach fair-housing rules. The system has to run interactively, within a few seconds, inside these limits: Every factual claim must come from the verified property record and nowhere else, Phrases that could steer buyers by protected characteristics are blocked and logged and A licensed agent approves each description before it is published.

**Why it is hard.** The obvious approach is features the model thinks are likely for this kind of home, and it fails because a false pool, view or school claim is a legal issue and a broken promise to a buyer. The second trap is in "Compliance": the real signal is a classifier for steering and discriminatory phrasing, backed by phrase lists, while teams usually reach for general style or toxicity filters.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $52.1K a month. A mistake is expensive in the way complaints measures it.

**What success looks like.** Offline: Fact accuracy and Prohibited phrase recall. Online: Listing quality and Complaints. The launch is judged on "Listing quality" while "Complaints" must not get worse.

## Objective, loss and constraints

**Business objective.** Draft accurate listing descriptions from structured facts and photos and block language that could breach fair-housing rules.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)`

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
| x | The input features describing one example (what the model sees). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |

**Hard constraints**

- Every factual claim must come from the verified property record and nowhere else
- Phrases that could steer buyers by protected characteristics are blocked and logged
- A licensed agent approves each description before it is published
- Rule sets are applied per jurisdiction and versioned with the law

## The approach in one paragraph

Start with agent-written text from a template, because it is how listings are made. Then earn the move to structured-to-text generation, a fact verifier and a fair-housing classifier before agent review, and only if it beats the baseline on Fact accuracy and Prohibited phrase recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Fact match rate | Share of claims in the description that equal a field in the record. The direct measure of invented content. Guard against: match on meaning and not on string, because the same fact is worded many ways. |
| Add Prohibited phrase score | Classifier probability that a sentence steers by a protected characteristic. Catches coded language that phrase lists miss. Guard against: needs labelled examples from complaints and must be reviewed by counsel. |
| Add Agent edit rate | Share of generated words that the agent changed before publishing. A quality signal from the people who know the property. Guard against: edits reflect habit as well as quality, so read it by agent. |
| Run it as one pipeline | Listing facts (listing system), Photo tags (vision model), Description drafter (LLM), Fact verifier (rules), Fair-housing checker (classifier) and Publish (portal), with Agent review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle missing facts | Ask the agent for missing facts and refuse to describe features that are not in the record. |

**Deliberately not doing**

- Length: A style choice that does not indicate accuracy or compliance.
- Emoji count: Style preference of the portal and not a quality signal.
- Neighbourhood adjectives: Words such as quiet, exclusive or family-friendly are subjective and the main route to steering.

**How the approach is proven**

Prove it offline on Fact accuracy and Prohibited phrase recall using time-ordered splits, then online on "Listing quality" with "Complaints" as the guardrail. Watch for: Training on past listings copies the biased language those listings contain and Rules and enforcement change, so a checker that passed last year can fail now.

## Baseline and production design

- **Baseline (build this first):** Agent-written text from a template, because it is how listings are made.
- **Production design:** Structured-to-text generation, a fact verifier and a fair-housing classifier before agent review.

## Why AI, and why this kind

**Why AI.** Draft accurate listing descriptions from structured facts and photos and block language that could breach fair-housing rules. The evidence that separates good from bad outcomes (Fact match rate, Prohibited phrase score, Agent edit rate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "features the model thinks are likely for this kind of home" are what teams reach for first, and they fail because A false pool, view or school claim is a legal issue and a broken promise to a buyer. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: Structured-to-text generation, a fact verifier and a fair-housing classifier before agent review.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Fact match rate, Prohibited phrase score, Agent edit rate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Agent-written text from a template, because it is how listings are made | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Structured-to-text generation, a fact verifier and a fair-housing classifier before agent review | chosen | Meets the 2500 ms envelope at $5.79 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Listing quality) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on past listings copies the biased language those listings contain.
- Evaluation trap: Rules and enforcement change, so a checker that passed last year can fail now.
- Missing facts: the property record is sparse and the model fills the gaps with invented features.
- Local terms: fair-housing rules and terms differ by jurisdiction and a phrase is fine in one place and not another.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
