# Developer Documentation Assistant: use-case brief

> Generated from the blueprint `saas/developer-docs-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Developer Documentation Assistant · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** A developer integrating an API is mid-task with a specific SDK version pinned in their project, and they ask a narrow question: how do I paginate this endpoint, what is the rate limit, why does this call return a 403. A search box returns pages. What they need is the one correct snippet or number for their version, with a link to the authoritative page, in seconds. The assistant sits in the documentation site and the IDE and answers from the docs and OpenAPI specs, and the product succeeds when the developer reaches a working first call faster and files fewer support tickets.

**Why it is hard.** A language model writes fluent code for endpoints that do not exist, and a developer who pastes it spends an hour discovering that. The right answer also depends on state the question never states: the SDK version, the language, whether an API is deprecated. Documentation itself contradicts itself, since a changelog quotes both the old and the new limit and a citation to either is technically valid. Evaluation misleads too: questions written from docs headings are easy to retrieve and hide the failures on real developer phrasing, and fluency scores reward exactly the confident wrong answer that does the damage.

**Scale and stakes.** With 10 million registered and 3 million active developers the assistant handles about 6 million questions a day, 69 per second on average and 417 at peak, with capacity for 625. Generation dominates the cost: roughly 263 H100-class GPUs and an estimated $832K a month, about $4.62 per thousand answers, which is why every avoidable model call and every long answer matters. The stake is trust: one invented endpoint costs a developer an hour, and a handful of them send developers back to searching and to opening tickets.

**What success looks like.** Offline, a high snippet execution pass rate in a sandbox and a hallucinated-API rate near zero on a held-out golden set that includes unanswerable questions. Online, the launch is judged on time to first successful API call, with docs support ticket rate as the guardrail that should fall and must not rise. Latency stays within about 2.5 seconds end to end, and the assistant says it does not know whenever the documentation does not state the fact.

## Objective, loss and constraints

**Business objective.** Answer developer questions about APIs and SDKs with correct, version-specific code snippets and links to authoritative docs.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{docs})+\lambda\,\mathrm{NonExistentAPI}`

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
| \text{docs} | The documentation passages retrieved for the question. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{NonExistentAPI} | Penalty when the answer mentions an endpoint or function that does not exist. |

**Hard constraints**

- Version-aware answers
- Code must compile
- No invented endpoints
- Low latency

## The approach in one paragraph

Treat the model as a writer and the documentation as the only source of truth. Begin with keyword docs search, which cannot invent anything, and replace it with a retrieval-grounded generator only where it improves the snippet execution pass rate without raising the hallucinated-API rate. Everything the model produces is checked after the fact: every symbol against the OpenAPI spec for the user's version, every snippet in a sandbox pinned to that SDK, and every stated value against the passage cited for it. When the documentation does not state the fact, the right answer is a refusal with a pointer, not a fluent guess.

**Moves**

| Move | Detail |
|---|---|
| Resolve the version before retrieving | Read the SDK and language version from the request context, such as the package manifest, the IDE or the docs page, not from the question text, and use it as a hard filter on retrieval so the user never sees another version's behaviour. |
| Retrieve in two ways, by words and by structure | Combine dense and keyword search over docs chunks with a structured lookup into the OpenAPI spec, so a question about an endpoint pulls its exact schema and not just prose about it. Exclude changelog chunks from answer sources unless the question is about changes. |
| Generate with citations the check can read | The model must cite the passage for each stated value, and a verifier checks that the cited passage literally contains the value, because a valid link alone is not proof. |
| Verify before showing | An API-existence validator rejects any symbol not in the spec for the user's version, and a sandbox runs the snippet against the pinned SDK, so only code that compiles and runs reaches the developer. |
| Make abstention a first-class answer | When retrieval finds nothing that states the fact, answer that the docs do not say, give the nearest page, and log the question; review the log weekly and extend the intent vocabulary from real traffic. |
| Measure on questions developers actually ask | Build a golden set from support tickets and forum threads, include unanswerable questions, and score facts and executability, not fluency. |

**Deliberately not doing**

- Optimise for answer length or friendly greetings: verbosity hides the one fact the developer needs, and the extra tokens are a direct cost at this scale.
- Retrieve only the latest docs for every user: a version mismatch is the most common way correct-looking code breaks.
- Trust generated code without running it: language models invent plausible API calls, and a pass in the sandbox is the only evidence that matters.
- Judge by retrieval recall at five alone: it is easy on small corpora and silent about stale or invented answers.

**How the approach is proven**

Offline, run a held-out golden set that includes unanswerable and version-specific questions, and compare the baseline keyword search with the grounded generator on snippet execution pass rate, hallucinated-API rate and abstention precision. Online, run the assistant for a share of docs traffic and measure time to first successful API call and support ticket rate against a control group, with a weekly review of abstentions and any answer a developer rated wrong.

## Baseline and production design

- **Baseline (build this first):** Docs search with keyword matching.
- **Production design:** Version-aware retrieval over docs and OpenAPI specs, code generation with API-existence validators and sandbox execution.

## Why AI, and why this kind

**Why AI.** Answer developer questions about APIs and SDKs with correct, version-specific code snippets and links to authoritative docs. The evidence that separates good from bad outcomes (API existence check, Snippet execution pass, Version match) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "retrieving only the latest docs for every user" are what teams reach for first, and they fail because version mismatch breaks code. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Version-aware retrieval over docs and OpenAPI specs, code generation with API-existence validators and sandbox execution.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among API existence check, Snippet execution pass, Version match and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Docs search with keyword matching | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Version-aware retrieval over docs and OpenAPI specs, code generation with API-existence validators and sandbox execution | chosen | Meets the 2500 ms envelope at $4.62 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to first successful API call) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- A deprecated API still appears in older docs, the assistant recommends it, and the developer's code breaks in production rather than at write time.
- A changelog quotes both the old and the new limit, the reader picks the stale number, and the answer cites a valid passage while being wrong.
- A snippet for one SDK language is adapted for another and does not compile, because the language-specific differences were not in the retrieved context.
- A developer's wording is outside the known vocabulary, such as throttle or size cap for rate limit, so the intent is missed and the system either guesses or abstains pointlessly.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
