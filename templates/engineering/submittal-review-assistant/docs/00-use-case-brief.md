# Submittal Review Assistant: use-case brief

> Generated from the blueprint `engineering/submittal-review-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Submittal Review Assistant · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Check contractor submittals such as product data and shop drawings against specifications and drawings and prepare a review note for the reviewing engineer to approve or reject. The system has to run as a scheduled batch job, inside these limits: Every note cites the specification section, Engineer approves or rejects and Missing items listed.

**Why it is hard.** The obvious approach is an approval recommendation only, and it fails because reviewers need the evidence. The second trap is in "Scope": the real signal is specified properties and drawings, while teams usually reach for everything in the file.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $1.9K a month. A mistake is expensive in the way submittals returned for errors measures it.

**What success looks like.** Offline: Mismatch detection recall, Citation accuracy and Engineer acceptance. Online: Review turnaround, Submittals returned for errors and Late material approvals. The launch is judged on "Review turnaround" while "Submittals returned for errors" must not get worse.

## Objective, loss and constraints

**Business objective.** Check contractor submittals such as product data and shop drawings against specifications and drawings and prepare a review note for the reviewing engineer to approve or reject.

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

- Every note cites the specification section
- Engineer approves or rejects
- Missing items listed
- Review preparation within 1 hour for 20K submittals per year
- Stamps applied only by engineers

## The approach in one paragraph

Start with engineers comparing submittals and specifications by hand, because it is the standard practice. Then earn the move to a comparison assistant that extracts requirements and product values, flags mismatches and gaps and drafts a review note with citations for the engineer, and only if it beats the baseline on Mismatch detection recall and Citation accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Specified requirements | Values and standards required. Core. Guard against: from specifications. |
| Add Submitted product values | Values in the data sheet. Core. Guard against: from extraction. |
| Add Drawing references | Locations the product is used. Context. Guard against: from drawings. |
| Run it as one pipeline | Submittal intake (project platform), Requirement lookup (specification index), Value extraction (NLP and tables), Comparison (rules), Engineer decision (review tool) and Log update (submittal register), with Review note draft off the critical path. |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle equivalent product | Flag for engineer judgement. |

**Deliberately not doing**

- Submitter name: personal data.
- Brand logo: irrelevant.
- Page layout: an artefact.

**How the approach is proven**

Prove it offline on Mismatch detection recall, Citation accuracy and Engineer acceptance using time-ordered splits, then online on "Review turnaround" with "Submittals returned for errors" as the guardrail. Watch for: Approval recommendation without evidence, Automatic stamps and Whole-file review.

## Baseline and production design

- **Baseline (build this first):** Engineers comparing submittals and specifications by hand, because it is the standard practice.
- **Production design:** A comparison assistant that extracts requirements and product values, flags mismatches and gaps and drafts a review note with citations for the engineer.

## Why AI, and why this kind

**Why AI.** Check contractor submittals such as product data and shop drawings against specifications and drawings and prepare a review note for the reviewing engineer to approve or reject. The evidence that separates good from bad outcomes (Specified requirements, Submitted product values, Drawing references) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "an approval recommendation only" are what teams reach for first, and they fail because reviewers need the evidence. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A comparison assistant that extracts requirements and product values, flags mismatches and gaps and drafts a review note with citations for the engineer.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Specified requirements, Submitted product values, Drawing references and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Engineers comparing submittals and specifications by hand, because it is the standard practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A comparison assistant that extracts requirements and product values, flags mismatches and gaps and drafts a review note with citations for the engineer | chosen | Meets the run-window envelope at $0.107 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Review turnaround) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Approval recommendation without evidence.
- Evaluation trap: Automatic stamps.
- Equivalent product: a substitute is proposed.
- Missing data sheet: key values are absent.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
