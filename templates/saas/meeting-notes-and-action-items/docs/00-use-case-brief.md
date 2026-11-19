# Meeting Notes & Action-Item Extraction: use-case brief

> Generated from the blueprint `saas/meeting-notes-and-action-items` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Meeting Notes & Action-Item Extraction · **Domain:** saas · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Turn meeting recordings into accurate notes, decisions and owned action items that sync to task tools. The system has to run interactively, within a few seconds, inside these limits: Consent and recording rules, Speaker attribution and Action item precision.

**Why it is hard.** The obvious approach is generic summary, and it fails because actions with wrong owners are worse than none. The second trap is in "Faithfulness": the real signal is span-grounded notes, while teams usually reach for fluent summaries.

**Scale and stakes.** At 10 million users this is about 3.0M model-touching events a day, 35 requests per second on average and 208 at peak, at an estimated $430.3K a month. A mistake is expensive in the way time to publish notes measures it.

**What success looks like.** Offline: Action-item precision and recall and Faithfulness rate. Online: Action completion rate and Time to publish notes. The launch is judged on "Action completion rate" while "Time to publish notes" must not get worse.

## Objective, loss and constraints

**Business objective.** Turn meeting recordings into accurate notes, decisions and owned action items that sync to task tools.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{transcript})+\lambda\,\mathrm{OwnerError}`

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
| \text{transcript} | The meeting transcript. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{OwnerError} | Penalty for assigning an action item to the wrong person. |

**Hard constraints**

- Consent and recording rules
- Speaker attribution
- Action item precision
- Multilingual

## The approach in one paragraph

Start with manual note-taking. Then earn the move to diarised transcript, structured extraction with span evidence, owner resolution against participant lists and task sync with confirmation, and only if it beats the baseline on Action-item precision and recall and Faithfulness rate after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Owner-resolution accuracy | Correct person for each action. Utility. Guard against: diarisation. |
| Add Decision detection | Decision statements. Notes. Guard against: classifier. |
| Add Span support rate | Notes with transcript support. Faithfulness. Guard against: alignment. |
| Run it as one pipeline | Meeting audio (conferencing), ASR and diarisation (speech model), Extraction LLM (structured), Owner resolver (directory match), Span verifier (alignment), Participants confirm (human) and Task sync (project tool). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle two participants share a first name | Directory-based disambiguation and confirmation. |

**Deliberately not doing**

- Small talk: not content.
- Meeting length: weak.

**How the approach is proven**

Prove it offline on Action-item precision and recall and Faithfulness rate using time-ordered splits, then online on "Action completion rate" with "Time to publish notes" as the guardrail. Watch for: Evaluating summaries not actions and Clean-audio test meetings.

## Baseline and production design

- **Baseline (build this first):** Manual note-taking.
- **Production design:** Diarised transcript, structured extraction with span evidence, owner resolution against participant lists and task sync with confirmation.

## Why AI, and why this kind

**Why AI.** Turn meeting recordings into accurate notes, decisions and owned action items that sync to task tools. The evidence that separates good from bad outcomes (Owner-resolution accuracy, Decision detection, Span support rate) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "generic summary" are what teams reach for first, and they fail because actions with wrong owners are worse than none. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Diarised transcript, structured extraction with span evidence, owner resolution against participant lists and task sync with confirmation.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Owner-resolution accuracy, Decision detection, Span support rate and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual note-taking | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Diarised transcript, structured extraction with span evidence, owner resolution against participant lists and task sync with confirmation | chosen | Meets the 2500 ms envelope at $4.78 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Action completion rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Security attestations (SOC 2, ISO 27001))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating summaries not actions.
- Evaluation trap: Clean-audio test meetings.
- Two participants share a first name: action assigned to the wrong person.
- Cross-talk and poor audio: missed decisions.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
