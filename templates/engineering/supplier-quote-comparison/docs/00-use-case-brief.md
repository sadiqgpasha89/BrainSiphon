# Supplier Quote Comparison: use-case brief

> Generated from the blueprint `engineering/supplier-quote-comparison` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Supplier Quote Comparison · **Domain:** engineering · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Normalise supplier quotes on scope, exclusions, units and terms and show a like-for-like comparison with gaps highlighted for buyers to negotiate and decide. The system has to run interactively, within a few seconds, inside these limits: Each normalised line cites the quote page, Buyers decide awards and Exclusions and assumptions listed.

**Why it is hard.** The obvious approach is total price, and it fails because totals hide scope differences. The second trap is in "Risk": the real signal is exclusions and conditions listed, while teams usually reach for price only.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 63 at peak, at an estimated $12.3K a month. A mistake is expensive in the way scope gaps found after award measures it.

**What success looks like.** Offline: Extraction accuracy, Gap detection recall and Buyer correction rate. Online: Time to compare quotes, Scope gaps found after award and Procurement cost. The launch is judged on "Time to compare quotes" while "Scope gaps found after award" must not get worse.

## Objective, loss and constraints

**Business objective.** Normalise supplier quotes on scope, exclusions, units and terms and show a like-for-like comparison with gaps highlighted for buyers to negotiate and decide.

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

- Each normalised line cites the quote page
- Buyers decide awards
- Exclusions and assumptions listed
- Comparison within 5 minutes for 50 quotes
- Supplier data kept confidential

## The approach in one paragraph

Start with buyers building comparison spreadsheets from quotes, because it is the usual practice. Then earn the move to a normalisation tool that extracts lines, units and exclusions into a common sheet, finds gaps against the enquiry and highlights differences for buyers, and only if it beats the baseline on Extraction accuracy and Gap detection recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Line items and units | Quoted scope and quantities. Core. Guard against: from extraction. |
| Add Exclusions and assumptions | What is not included. Risk. Guard against: from text. |
| Add Commercial terms | Payment, warranty and validity. Comparison. Guard against: from text. |
| Run it as one pipeline | Quote intake (procurement portal), Line and term extraction (NLP and tables), Unit normalisation (rules), Scope gap check (comparison to the enquiry), Comparison view (buyer tool), Buyer decision (procurement) and Award record (ERP). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle alternative offers | Flag as an alternative. |

**Deliberately not doing**

- Sales contact name: personal data.
- Quote layout: an artefact.
- Supplier logo: irrelevant.

**How the approach is proven**

Prove it offline on Extraction accuracy, Gap detection recall and Buyer correction rate using time-ordered splits, then online on "Time to compare quotes" with "Scope gaps found after award" as the guardrail. Watch for: Totals as comparison, Price-only ranking and Automatic award.

## Baseline and production design

- **Baseline (build this first):** Buyers building comparison spreadsheets from quotes, because it is the usual practice.
- **Production design:** A normalisation tool that extracts lines, units and exclusions into a common sheet, finds gaps against the enquiry and highlights differences for buyers.

## Why AI, and why this kind

**Why AI.** Normalise supplier quotes on scope, exclusions, units and terms and show a like-for-like comparison with gaps highlighted for buyers to negotiate and decide. The evidence that separates good from bad outcomes (Line items and units, Exclusions and assumptions, Commercial terms) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "total price" are what teams reach for first, and they fail because totals hide scope differences. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A normalisation tool that extracts lines, units and exclusions into a common sheet, finds gaps against the enquiry and highlights differences for buyers.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Line items and units, Exclusions and assumptions, Commercial terms and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Buyers building comparison spreadsheets from quotes, because it is the usual practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A normalisation tool that extracts lines, units and exclusions into a common sheet, finds gaps against the enquiry and highlights differences for buyers | chosen | Meets the 2500 ms envelope at $0.456 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to compare quotes) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Totals as comparison.
- Evaluation trap: Price-only ranking.
- Alternative offers: a supplier offers a different solution.
- Unit confusion: units are mixed.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
