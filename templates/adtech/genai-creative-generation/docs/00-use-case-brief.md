# GenAI Ad Creative Generation: use-case brief

> Generated from the blueprint `adtech/genai-creative-generation` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** GenAI Ad Creative Generation · **Domain:** adtech · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Generate on-brand headlines, copy and image variants at scale and filter them by predicted performance and policy. The system has to run interactively, within a few seconds, inside these limits: Brand voice consistency, Ad policy compliance and IP safety.

**Why it is hard.** The obvious approach is ship the first generation, and it fails because quality varies widely between samples. The second trap is in "Brand": the real signal is brand guidelines as retrieval context and checks, while teams usually reach for generic prompts.

**Scale and stakes.** At 10 million users this is about 150.0K model-touching events a day, 2 requests per second on average and 10 at peak, at an estimated $21.4K a month. A mistake is expensive in the way cTR vs human baseline measures it.

**What success looks like.** Offline: Policy pass rate and Predicted CTR rank correlation with realised. Online: Creative production time and CTR vs human baseline. The launch is judged on "Creative production time" while "CTR vs human baseline" must not get worse.

## Objective, loss and constraints

**Business objective.** Generate on-brand headlines, copy and image variants at scale and filter them by predicted performance and policy.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{brief})+\lambda\,\mathrm{PolicyViolation}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_\theta | The language model's probability of the next token y_t, given the earlier tokens and the context written after the bar. (one value per time step or token t and forecast step h) |
| y_t | The tokens of the target ad copy: y_t is the token at position t. |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| y_{<t} | All tokens before position t: the text the model has already read or generated. (one value per time step or token t) |
| \text{brief} | The creative brief: the instructions and brand guidelines the model is conditioned on. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{PolicyViolation} | Penalty when generated copy breaks advertising or brand policies. |

**Hard constraints**

- Brand voice consistency
- Ad policy compliance
- IP safety
- Human approval for new brand templates

## The approach in one paragraph

Start with human copywriters with templates. Then earn the move to retrieval-augmented generation with brand guidelines, many candidates scored by a performance and policy ranker, human approval workflow, and only if it beats the baseline on Policy pass rate and Predicted CTR rank correlation with realised after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Predicted CTR of creative | Performance model score. Ranking. Guard against: calibration. |
| Add Policy classifier score | Policy violation probability. Safety. Guard against: taxonomy. |
| Add Brand-similarity score | Embedding similarity to brand corpus. Consistency. Guard against: corpus. |
| Run it as one pipeline | Campaign brief (marketing UI), Brand context retriever (vector store), Generator LLM and image model (GPU), Policy and brand filter (classifiers), Performance ranker (CTR model), Marketer approval (human) and Live performance (feedback). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle generated claims are legally unsupported | Claim verification against approved claims library. |

**Deliberately not doing**

- Output length: not a performance driver.
- Model temperature: tuning.

**How the approach is proven**

Prove it offline on Policy pass rate and Predicted CTR rank correlation with realised using time-ordered splits, then online on "Creative production time" with "CTR vs human baseline" as the guardrail. Watch for: Predicted CTR trained on human-made creatives and Measuring volume instead of lift.

## Baseline and production design

- **Baseline (build this first):** Human copywriters with templates.
- **Production design:** Retrieval-augmented generation with brand guidelines, many candidates scored by a performance and policy ranker, human approval workflow.

## Why AI, and why this kind

**Why AI.** Generate on-brand headlines, copy and image variants at scale and filter them by predicted performance and policy. The evidence that separates good from bad outcomes (Predicted CTR of creative, Policy classifier score, Brand-similarity score) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "ship the first generation" are what teams reach for first, and they fail because quality varies widely between samples. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Retrieval-augmented generation with brand guidelines, many candidates scored by a performance and policy ranker, human approval workflow.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Predicted CTR of creative, Policy classifier score, Brand-similarity score and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Human copywriters with templates | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Retrieval-augmented generation with brand guidelines, many candidates scored by a performance and policy ranker, human approval workflow | chosen | Meets the 2500 ms envelope at $4.77 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Creative production time) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Predicted CTR trained on human-made creatives.
- Evaluation trap: Measuring volume instead of lift.
- Generated claims are legally unsupported: regulatory violations.
- Generated image with trademarked element: a generated image contains a trademarked element, creating intellectual-property risk.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
