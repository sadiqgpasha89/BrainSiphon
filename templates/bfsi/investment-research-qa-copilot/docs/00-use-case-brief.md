# Investment Research Q&A Copilot: use-case brief

> Generated from the blueprint `bfsi/investment-research-qa-copilot` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Investment Research Q&A Copilot · **Domain:** bfsi · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Answer analysts' questions from the firm's research notes, filings and data with citations and clear abstention. The system has to run interactively, within a few seconds, inside these limits: Every claim cites a document and its publication date, An analyst sees only the research they are entitled to, enforced at retrieval and Restricted-list and information-barrier rules are applied before any text is retrieved.

**Why it is hard.** The obvious approach is any passage that matches the question, and it fails because an old earnings estimate can be the closest text match and still be wrong. The second trap is in "Entitlement": the real signal is access rights applied when documents are retrieved, while teams usually reach for a filter applied after the answer is written.

**Scale and stakes.** At 10 million users this is about 9.0M model-touching events a day, 104 requests per second on average and 625 at peak, at an estimated $4.15M a month. A mistake is expensive in the way thumbs-down rate measures it.

**What success looks like.** Offline: Citation validity and Retrieval recall at 10. Online: Analyst time saved per question and Thumbs-down rate. The launch is judged on "Analyst time saved per question" while "Thumbs-down rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Answer analysts' questions from the firm's research notes, filings and data with citations and clear abstention.

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

- Every claim cites a document and its publication date
- An analyst sees only the research they are entitled to, enforced at retrieval
- Restricted-list and information-barrier rules are applied before any text is retrieved
- No document or question leaves the firm's environment

## The approach in one paragraph

Start with keyword search across the research portal, because analysts use it today. Then earn the move to hybrid retrieval with entitlements, structured data tools for figures, a verifier for claims and abstention when evidence is thin, and only if it beats the baseline on Citation validity and Retrieval recall at 10 after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Citation validity | Share of claims whose cited passage entails the claim. The core quality measure. Guard against: a passage may exist and not support the claim, so test entailment. |
| Add Retrieval recall | Share of questions where the gold passage is in the top k. Everything depends on retrieval. Guard against: gold sets are costly to build, so sample across sectors. |
| Add Abstention precision | Share of refusals that were correct because the evidence was missing. Limits confident wrong answers. Guard against: over-refusal lowers usefulness, so track both. |
| Run it as one pipeline | Research and filings index (hybrid search), Entitlement filter (policy service), Figure tools (market data APIs), Answer composer (LLM with citations) and Claim verifier (entailment model), with Analyst UI and Feedback log off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle restricted-list company | Block restricted-list documents at retrieval and tell the analyst the topic is restricted. |

**Deliberately not doing**

- Note length: A style of the author and not a mark of relevance.
- Author: Weak signal once the content is matched, and it invites bias to star analysts.
- Rating word frequency: Counts of words like buy reflect the author's tone and not the facts.

**How the approach is proven**

Prove it offline on Citation validity and Retrieval recall at 10 using time-ordered splits, then online on "Analyst time saved per question" with "Thumbs-down rate" as the guardrail. Watch for: Evaluating on questions where the relevant notes are known flatters retrieval and Entitlements differ by tester, so a test run by a senior user hides access failures.

## Baseline and production design

- **Baseline (build this first):** Keyword search across the research portal, because analysts use it today.
- **Production design:** Hybrid retrieval with entitlements, structured data tools for figures, a verifier for claims and abstention when evidence is thin.

## Why AI, and why this kind

**Why AI.** Answer analysts' questions from the firm's research notes, filings and data with citations and clear abstention. The evidence that separates good from bad outcomes (Citation validity, Retrieval recall, Abstention precision) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "any passage that matches the question" are what teams reach for first, and they fail because an old earnings estimate can be the closest text match and still be wrong. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: Hybrid retrieval with entitlements, structured data tools for figures, a verifier for claims and abstention when evidence is thin.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Citation validity, Retrieval recall, Abstention precision and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword search across the research portal, because analysts use it today | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Hybrid retrieval with entitlements, structured data tools for figures, a verifier for claims and abstention when evidence is thin | chosen | Meets the 2500 ms envelope at $15.37 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Analyst time saved per question) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating on questions where the relevant notes are known flatters retrieval.
- Evaluation trap: Entitlements differ by tester, so a test run by a senior user hides access failures.
- Restricted-list company: a question concerns a company on the restricted list and an answer could breach an information barrier.
- Conflicting estimates: two analysts publish different estimates for the same item.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
