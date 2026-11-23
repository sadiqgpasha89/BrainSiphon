# Postmortem Drafting Assistant: use-case brief

> Generated from the blueprint `it-ops/postmortem-drafting-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Postmortem Drafting Assistant · **Domain:** it-ops · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Draft blameless postmortems from the incident timeline, changes and metrics, with contributing factors and action items for the incident owner to edit and approve. The system has to run as a scheduled batch job, inside these limits: Blameless wording with no individual blame, Each statement links to evidence and Owner approves before publication.

**Why it is hard.** The obvious approach is names of people at fault, and it fails because blame discourages honest reporting. The second trap is in "Evidence": the real signal is timeline and metrics links, while teams usually reach for recollection.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 3 at peak, at an estimated $1.9K a month. A mistake is expensive in the way action item completion measures it.

**What success looks like.** Offline: Evidence link accuracy, Blame language detection and Owner edit rate. Online: Time to publish a postmortem, Action item completion and Repeat incidents. The launch is judged on "Time to publish a postmortem" while "Action item completion" must not get worse.

## Objective, loss and constraints

**Business objective.** Draft blameless postmortems from the incident timeline, changes and metrics, with contributing factors and action items for the incident owner to edit and approve.

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

- Blameless wording with no individual blame
- Each statement links to evidence
- Owner approves before publication
- Action items assigned to teams
- Draft within 1 hour of closing 500 incidents per year

## The approach in one paragraph

Start with engineers writing postmortems by hand from memory and chat logs, because it is the usual practice. Then earn the move to a drafting pipeline that builds the timeline and factors with citations, proposes action items by team, checks for blame language and routes the draft to the owner, and only if it beats the baseline on Evidence link accuracy and Blame language detection after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Timeline of events | Detection, response and recovery steps. Content. Guard against: from the incident record. |
| Add Contributing changes | Changes before the incident. Factors. Guard against: from change records. |
| Add Impact metrics | Duration and affected users. Content. Guard against: from monitoring. |
| Run it as one pipeline | Incident close event (ITSM), Timeline assembly (read-only tools), Factor and action drafting (LLM with citations), Blame language check (rules), Publication (wiki) and Action tracking (issue tracker), with Owner review off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle missing data | Mark the gaps for the owner to fill. |

**Deliberately not doing**

- Responder name: personal data.
- Chat length: weak link.
- Time of day: irrelevant.

**How the approach is proven**

Prove it offline on Evidence link accuracy, Blame language detection and Owner edit rate using time-ordered splits, then online on "Time to publish a postmortem" with "Action item completion" as the guardrail. Watch for: Individual blame, Narrative without actions and Recollection as evidence.

## Baseline and production design

- **Baseline (build this first):** Engineers writing postmortems by hand from memory and chat logs, because it is the usual practice.
- **Production design:** A drafting pipeline that builds the timeline and factors with citations, proposes action items by team, checks for blame language and routes the draft to the owner.

## Why AI, and why this kind

**Why AI.** Draft blameless postmortems from the incident timeline, changes and metrics, with contributing factors and action items for the incident owner to edit and approve. The evidence that separates good from bad outcomes (Timeline of events, Contributing changes, Impact metrics) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "names of people at fault" are what teams reach for first, and they fail because blame discourages honest reporting. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: A drafting pipeline that builds the timeline and factors with citations, proposes action items by team, checks for blame language and routes the draft to the owner.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Timeline of events, Contributing changes, Impact metrics and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Engineers writing postmortems by hand from memory and chat logs, because it is the usual practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A drafting pipeline that builds the timeline and factors with citations, proposes action items by team, checks for blame language and routes the draft to the owner | chosen | Meets the run-window envelope at $0.210 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to publish a postmortem) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (IT service and change management controls (ISO 20000, ITIL practice and SOC 2 change criteria))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Individual blame.
- Evaluation trap: Narrative without actions.
- Missing data: the timeline has gaps.
- Hidden factor: the true cause is not in the data.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
