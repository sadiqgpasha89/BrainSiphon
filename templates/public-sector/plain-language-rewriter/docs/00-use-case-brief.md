# Plain Language and Accessibility Rewriter: use-case brief

> Generated from the blueprint `public-sector/plain-language-rewriter` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Plain Language and Accessibility Rewriter · **Domain:** public-sector · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Rewrite letters, guidance and forms in plain language and accessible formats for review, so residents understand what to do and by when. The system has to run interactively, within a few seconds, inside these limits: Legal meaning preserved and checked by a reviewer, Reading level targets met and Deadlines and amounts unchanged.

**Why it is hard.** The obvious approach is shorter text, and it fails because shortening can drop a condition. The second trap is in "Review": the real signal is policy owner approval, while teams usually reach for automatic publishing.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $45.7K a month. A mistake is expensive in the way time to publish measures it.

**What success looks like.** Offline: Number and date preservation, Reviewer edit rate and Comprehension test results. Online: Contacts caused by unclear letters, Time to publish and Accessibility complaints. The launch is judged on "Contacts caused by unclear letters" while "Time to publish" must not get worse.

## Objective, loss and constraints

**Business objective.** Rewrite letters, guidance and forms in plain language and accessible formats for review, so residents understand what to do and by when.

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

- Legal meaning preserved and checked by a reviewer
- Reading level targets met
- Deadlines and amounts unchanged
- Screen reader and easy-read versions
- 5K documents per year

## The approach in one paragraph

Start with style guides and manual editing by the communications team, because it is the current method. Then earn the move to a rewriting assistant with number and term checks, readability scoring, accessible output formats and an approval workflow with resident testing, and only if it beats the baseline on Number and date preservation and Reviewer edit rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Reading level | Grade and sentence length. Readability. Guard against: from metrics. |
| Add Number and date preservation | Whether dates and amounts match the original. Safety. Guard against: from extraction. |
| Add Terms against glossary | Consistent legal terms. Meaning. Guard against: from the glossary. |
| Run it as one pipeline | Document intake (content system), Rewrite draft (LLM with constraints), Number and term checks (rules), Readability scoring (metrics), Accessible export (formats) and Comprehension test (resident panel), with Reviewer approval off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle legal nuance | Reviewer check and diff highlights. |

**Deliberately not doing**

- Author name: irrelevant.
- Document length alone: weak link.
- Font choice: irrelevant.

**How the approach is proven**

Prove it offline on Number and date preservation, Reviewer edit rate and Comprehension test results using time-ordered splits, then online on "Contacts caused by unclear letters" with "Time to publish" as the guardrail. Watch for: Readability scores alone, Automatic publishing and Shortening without checks.

## Baseline and production design

- **Baseline (build this first):** Style guides and manual editing by the communications team, because it is the current method.
- **Production design:** A rewriting assistant with number and term checks, readability scoring, accessible output formats and an approval workflow with resident testing.

## Why AI, and why this kind

**Why AI.** Rewrite letters, guidance and forms in plain language and accessible formats for review, so residents understand what to do and by when. The evidence that separates good from bad outcomes (Reading level, Number and date preservation, Terms against glossary) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "shorter text" are what teams reach for first, and they fail because shortening can drop a condition. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: A rewriting assistant with number and term checks, readability scoring, accessible output formats and an approval workflow with resident testing.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Reading level, Number and date preservation, Terms against glossary and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Style guides and manual editing by the communications team, because it is the current method | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A rewriting assistant with number and term checks, readability scoring, accessible output formats and an approval workflow with resident testing | chosen | Meets the 2500 ms envelope at $5.08 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Contacts caused by unclear letters) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Readability scores alone.
- Evaluation trap: Automatic publishing.
- Legal nuance: a condition is lost in the rewrite.
- Local terms: the glossary lacks a term.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
