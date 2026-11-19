# Conversational Ads & Brand Assistant: use-case brief

> Generated from the blueprint `adtech/conversational-ads-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Conversational Ads & Brand Assistant · **Domain:** adtech · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Serve interactive brand assistants inside ad units that answer product questions truthfully and hand off to purchase or lead capture. The system has to run interactively, within a few seconds, inside these limits: Only approved claims, Disclosure as advertising and Child safety.

**Why it is hard.** The obvious approach is open-ended generation, and it fails because unapproved claims create legal liability. The second trap is in "Handoff": the real signal is clear paths to purchase, while teams usually reach for chat for chat's sake.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 104 at peak, at an estimated $149.9K a month. A mistake is expensive in the way cost per conversion vs display ads measures it.

**What success looks like.** Offline: Grounding rate and Policy violation rate. Online: Conversion per session and Cost per conversion vs display ads. The launch is judged on "Conversion per session" while "Cost per conversion vs display ads" must not get worse.

## Objective, loss and constraints

**Business objective.** Serve interactive brand assistants inside ad units that answer product questions truthfully and hand off to purchase or lead capture.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{brand KB})+\lambda\,\mathrm{ClaimViolation}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_\theta | The language model's probability of the next token y_t, given the earlier tokens and the context written after the bar. (one value per time step or token t and forecast step h) |
| y_t | The tokens of the target reply: y_t at position t. |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| y_{<t} | All tokens before position t: the text the model has already read or generated. (one value per time step or token t) |
| \text{brand KB} | The brand knowledge base of approved facts the assistant answers from. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ClaimViolation} | Penalty for statements that break advertising claim rules or contradict the knowledge base. |

**Hard constraints**

- Only approved claims
- Disclosure as advertising
- Child safety
- Cost per session cap

## The approach in one paragraph

Start with fAQ chatbots with decision trees. Then earn the move to retrieval-grounded LLM on an approved brand KB, strict claim checker, cost-capped sessions and lead capture tools, and only if it beats the baseline on Grounding rate and Policy violation rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around KB grounding rate | Answers supported by approved sources. Safety. Guard against: verification. |
| Add Handoff conversion rate | Clicks to purchase. Value. Guard against: funnel. |
| Add Safety filter hits | Blocked outputs. Risk. Guard against: classifier. |
| Run it as one pipeline | Ad unit chat (web SDK), Safety and age gate (filters), Retriever (brand KB), Assistant LLM (constrained), Claim checker (verifier), Handoff tool (CTA) and Transcript analytics (eval). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle user asks about medical or financial advice | Topic classifier with refusal and referral. |

**Deliberately not doing**

- Chat length: not value.
- Response time only: not quality.

**How the approach is proven**

Prove it offline on Grounding rate and Policy violation rate using time-ordered splits, then online on "Conversion per session" with "Cost per conversion vs display ads" as the guardrail. Watch for: Evaluating on friendly prompts and Counting engagement as success.

## Baseline and production design

- **Baseline (build this first):** FAQ chatbots with decision trees.
- **Production design:** Retrieval-grounded LLM on an approved brand KB, strict claim checker, cost-capped sessions and lead capture tools.

## Why AI, and why this kind

**Why AI.** Serve interactive brand assistants inside ad units that answer product questions truthfully and hand off to purchase or lead capture. The evidence that separates good from bad outcomes (KB grounding rate, Handoff conversion rate, Safety filter hits) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "open-ended generation" are what teams reach for first, and they fail because unapproved claims create legal liability. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Retrieval-grounded LLM on an approved brand KB, strict claim checker, cost-capped sessions and lead capture tools.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among KB grounding rate, Handoff conversion rate, Safety filter hits and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: FAQ chatbots with decision trees | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Retrieval-grounded LLM on an approved brand KB, strict claim checker, cost-capped sessions and lead capture tools | chosen | Meets the 2500 ms envelope at $3.33 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Conversion per session) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consent and opt-out (GDPR/ePrivacy, CCPA/CPRA))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating on friendly prompts.
- Evaluation trap: Counting engagement as success.
- User asks about medical or financial advice: assistant gives unapproved guidance.
- Jailbreak attempts: brand-damaging replies.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
