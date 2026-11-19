# Scholarship & Financial Aid Matching: use-case brief

> Generated from the blueprint `edtech/scholarship-matching` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Scholarship & Financial Aid Matching · **Domain:** edtech · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Match students to scholarships they are eligible for and likely to win, improving access and application quality. The system has to run as a scheduled batch job, inside these limits: Hard eligibility rules, Fairness and Deadline-aware.

**Why it is hard.** The obvious approach is pure similarity, and it fails because ineligible matches waste time. The second trap is in "Win": the real signal is rank by win probability and effort, while teams usually reach for maximum award.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 2 at peak, at an estimated $1.6K a month. A mistake is expensive in the way application completion measures it.

**What success looks like.** Offline: NDCG on awarded scholarships and Eligibility precision. Online: Funds awarded per student and Application completion. The launch is judged on "Funds awarded per student" while "Application completion" must not get worse.

## Objective, loss and constraints

**Business objective.** Match students to scholarships they are eligible for and likely to win, improving access and application quality.

**Training objective.** `\mathcal{L}=\mathrm{BPR}+\lambda\,\mathrm{EligibilityPenalty}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BPR} | Bayesian personalised ranking loss: trains the model to score items a user chose above items they did not. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{EligibilityPenalty} | Penalty for recommending scholarships the student is not eligible for. |

**Hard constraints**

- Hard eligibility rules
- Fairness
- Deadline-aware
- Privacy of financial data

## The approach in one paragraph

Start with search filters for scholarships. Then earn the move to eligibility engine plus ranker of win probability and effort, with LLM extraction of criteria from scholarship text, and only if it beats the baseline on NDCG on awarded scholarships and Eligibility precision after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Eligibility rule satisfaction | Structured criteria match. Gate. Guard against: parsing. |
| Add Historical win likelihood | Past winners profile. Win probability. Guard against: bias. |
| Add Deadline proximity | Days to deadline. Urgency. Guard against: calendar. |
| Run it as one pipeline | Scholarship ingestion (crawlers and partner feeds), Criteria extractor (LLM), Eligibility engine (rules), Win-probability ranker (GBDT), Matching API (app), Student application (human) and Outcomes (labels). |
| Optimise the right thing | The objective weighs bayesian personalised ranking loss: trains the model to score items a user chose above items they did not, so the model is trained on the cost of the decision and not on a generic score. |
| Handle criteria changed after listing | Criteria versioning and re-checks. |

**Deliberately not doing**

- Student name: none.
- Application length: weak.

**How the approach is proven**

Prove it offline on NDCG on awarded scholarships and Eligibility precision using time-ordered splits, then online on "Funds awarded per student" with "Application completion" as the guardrail. Watch for: Training on historical winners with bias and Ignoring eligibility errors.

## Baseline and production design

- **Baseline (build this first):** Search filters for scholarships.
- **Production design:** Eligibility engine plus ranker of win probability and effort, with LLM extraction of criteria from scholarship text.

## Why AI, and why this kind

**Why AI.** Match students to scholarships they are eligible for and likely to win, improving access and application quality. The evidence that separates good from bad outcomes (Eligibility rule satisfaction, Historical win likelihood, Deadline proximity) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "pure similarity" are what teams reach for first, and they fail because ineligible matches waste time. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Ranking over a large catalogue from implicit feedback needs candidate retrieval plus a learned ranker; neither rules nor a single classifier scales to the catalogue and context. Here the production design is: Eligibility engine plus ranker of win probability and effort, with LLM extraction of criteria from scholarship text.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Eligibility rule satisfaction, Historical win likelihood, Deadline proximity and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Search filters for scholarships | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Eligibility engine plus ranker of win probability and effort, with LLM extraction of criteria from scholarship text | chosen | Meets the run-window envelope at $0.361 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Sequence transformer ranker | later | Strong on rich histories but expensive to serve; adopt for the head tier once the cascade has an A/B-verified lift |
| LLM or agent as the decision maker | rejected | An LLM ranking every request costs far too much; use it for query understanding and offline catalogue enrichment |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a sequence transformer ranker beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Funds awarded per student) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Training on historical winners with bias.
- Evaluation trap: Ignoring eligibility errors.
- Criteria changed after listing: students apply to ineligible awards.
- Historical winner bias favours privileged profiles: past winners skew toward privileged profiles so rankings reproduce that unfairness.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
