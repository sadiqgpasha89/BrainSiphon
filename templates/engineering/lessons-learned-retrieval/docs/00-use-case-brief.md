# Lessons Learned Retrieval: use-case brief

> Generated from the blueprint `engineering/lessons-learned-retrieval` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Lessons Learned Retrieval · **Domain:** engineering · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Capture lessons from project closeouts and incident reports and surface relevant ones at design, bid and planning stages with source links. The system has to run interactively, within a few seconds, inside these limits: Lessons cite the source project and date, Client-confidential details removed before reuse and Owners confirm lessons.

**Why it is hard.** The obvious approach is raw closeout text, and it fails because raw text is noisy. The second trap is in "Privacy": the real signal is redacted client details, while teams usually reach for full project names across clients.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $86.9K a month. A mistake is expensive in the way lessons used at decisions measures it.

**What success looks like.** Offline: Retrieval relevance, Redaction recall and Owner acceptance. Online: Repeated mistakes, Lessons used at decisions and Time to find lessons. The launch is judged on "Repeated mistakes" while "Lessons used at decisions" must not get worse.

## Objective, loss and constraints

**Business objective.** Capture lessons from project closeouts and incident reports and surface relevant ones at design, bid and planning stages with source links.

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

- Lessons cite the source project and date
- Client-confidential details removed before reuse
- Owners confirm lessons
- Retrieval within 3 s
- 200K lessons

## The approach in one paragraph

Start with lessons registers rarely consulted after closeout, because they are the usual practice. Then earn the move to a retrieval service that structures and redacts lessons, links them to project phases and pushes the most relevant ones into design, estimating and planning tools, and only if it beats the baseline on Retrieval relevance and Redaction recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Lesson text and tags | Issue, cause and action. Core. Guard against: from closeouts. |
| Add Project type and phase | Context match. Relevance. Guard against: from project data. |
| Add Outcome evidence | Cost or time effect. Weight. Guard against: from records. |
| Run it as one pipeline | Closeout intake (project systems), Structuring and redaction (LLM and rules), Owner confirmation (workflow), Index with tags (search) and Context push (planning tools), with Usage feedback and Review of lessons off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle outdated lesson | Validity dates. |

**Deliberately not doing**

- Author name: personal data.
- Client name: confidential.
- Document template: an artefact.

**How the approach is proven**

Prove it offline on Retrieval relevance, Redaction recall and Owner acceptance using time-ordered splits, then online on "Repeated mistakes" with "Lessons used at decisions" as the guardrail. Watch for: Raw closeout text, Cross-client names and Archives nobody reads.

## Baseline and production design

- **Baseline (build this first):** Lessons registers rarely consulted after closeout, because they are the usual practice.
- **Production design:** A retrieval service that structures and redacts lessons, links them to project phases and pushes the most relevant ones into design, estimating and planning tools.

## Why AI, and why this kind

**Why AI.** Capture lessons from project closeouts and incident reports and surface relevant ones at design, bid and planning stages with source links. The evidence that separates good from bad outcomes (Lesson text and tags, Project type and phase, Outcome evidence) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "raw closeout text" are what teams reach for first, and they fail because raw text is noisy. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: A retrieval service that structures and redacts lessons, links them to project phases and pushes the most relevant ones into design, estimating and planning tools.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Lesson text and tags, Project type and phase, Outcome evidence and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Lessons registers rarely consulted after closeout, because they are the usual practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A retrieval service that structures and redacts lessons, links them to project phases and pushes the most relevant ones into design, estimating and planning tools | chosen | Meets the 2500 ms envelope at $4.83 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Repeated mistakes) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Raw closeout text.
- Evaluation trap: Cross-client names.
- Outdated lesson: practice has changed.
- Cross-client leak risk: details identify a client.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
