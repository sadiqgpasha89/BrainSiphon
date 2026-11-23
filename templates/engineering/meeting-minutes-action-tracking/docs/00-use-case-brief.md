# Meeting Minutes and Action Tracking: use-case brief

> Generated from the blueprint `engineering/meeting-minutes-action-tracking` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Meeting Minutes and Action Tracking · **Domain:** engineering · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Draft minutes and extract decisions and actions from project meeting transcripts and notes, assign owners for confirmation and track completion across projects. The system has to run interactively, within a few seconds, inside these limits: Participants consent to recording, Attendees confirm decisions and actions and Minutes cite transcript timestamps.

**Why it is hard.** The obvious approach is covert recording, and it fails because consent is required. The second trap is in "Output": the real signal is decisions, actions and owners, while teams usually reach for a transcript summary.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $45.7K a month. A mistake is expensive in the way time to publish minutes measures it.

**What success looks like.** Offline: Action extraction recall, Owner accuracy and Faithfulness to transcript. Online: Action completion rate, Time to publish minutes and Missed actions. The launch is judged on "Action completion rate" while "Time to publish minutes" must not get worse.

## Objective, loss and constraints

**Business objective.** Draft minutes and extract decisions and actions from project meeting transcripts and notes, assign owners for confirmation and track completion across projects.

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

- Participants consent to recording
- Attendees confirm decisions and actions
- Minutes cite transcript timestamps
- Draft within 15 minutes of meeting end
- 50K meetings per year

## The approach in one paragraph

Start with a secretary taking notes and emailing minutes, because it is the usual practice. Then earn the move to a drafting assistant that creates cited minutes, extracts actions with proposed owners and dates and tracks open items in the project tool after confirmation, and only if it beats the baseline on Action extraction recall and Owner accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Decision statements | Agreements in the text. Core. Guard against: from the transcript. |
| Add Action items and owners | Tasks with named people. Core. Guard against: from the transcript. |
| Add Due dates | Stated or implied dates. Tracking. Guard against: from the transcript. |
| Run it as one pipeline | Consented transcript (meeting tool), Segmentation (NLP), Decision and action extraction (LLM), Owner and date proposal (rules), Chair confirmation (editor), Action tracking (project tool) and Reminders (chat). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle cross-talk | Low-confidence marks. |

**Deliberately not doing**

- Speaker voice: personal data.
- Meeting room name: irrelevant.
- Platform: weak link.

**How the approach is proven**

Prove it offline on Action extraction recall, Owner accuracy and Faithfulness to transcript using time-ordered splits, then online on "Action completion rate" with "Time to publish minutes" as the guardrail. Watch for: Covert recording, Transcript summaries without actions and Auto-assigned owners.

## Baseline and production design

- **Baseline (build this first):** A secretary taking notes and emailing minutes, because it is the usual practice.
- **Production design:** A drafting assistant that creates cited minutes, extracts actions with proposed owners and dates and tracks open items in the project tool after confirmation.

## Why AI, and why this kind

**Why AI.** Draft minutes and extract decisions and actions from project meeting transcripts and notes, assign owners for confirmation and track completion across projects. The evidence that separates good from bad outcomes (Decision statements, Action items and owners, Due dates) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "covert recording" are what teams reach for first, and they fail because consent is required. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: A drafting assistant that creates cited minutes, extracts actions with proposed owners and dates and tracks open items in the project tool after confirmation.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Decision statements, Action items and owners, Due dates and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A secretary taking notes and emailing minutes, because it is the usual practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A drafting assistant that creates cited minutes, extracts actions with proposed owners and dates and tracks open items in the project tool after confirmation | chosen | Meets the 2500 ms envelope at $5.08 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Action completion rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Covert recording.
- Evaluation trap: Transcript summaries without actions.
- Cross-talk: several people speak at once.
- Implicit action: a task is implied not stated.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
