# Investment Property Screening & Underwriting: use-case brief

> Generated from the blueprint `real-estate/investment-property-screening-and-underwriting` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Investment Property Screening & Underwriting · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Screen listed investment properties against the fund's criteria and draft an underwriting summary with cash-flow assumptions. The system has to run interactively, within a few seconds, inside these limits: Every assumption such as rent growth, vacancy and exit yield is stated and editable, An analyst approves every underwriting before it leaves the team and Each figure in the summary cites its source document.

**Why it is hard.** The obvious approach is analysing every property in full, and it fails because analyst time is limited and most listings fail the mandate on the first page. The second trap is in "Cash flow": the real signal is net operating income rebuilt from the lease and cost documents, while teams usually reach for the asking figures in the offering memorandum.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $46.1K a month. A mistake is expensive in the way hit rate measures it.

**What success looks like.** Offline: Screen precision and NOI error. Online: Deals screened per analyst and Hit rate. The launch is judged on "Deals screened per analyst" while "Hit rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Screen listed investment properties against the fund's criteria and draft an underwriting summary with cash-flow assumptions.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Huber}(\hat{r}-r)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Huber} | Huber loss: squared error for small mistakes and absolute error for large ones, so outliers do not dominate training. |
| \hat{r} | The model's predicted value of the quantity r. |
| r | The realised return of an acquired property, with \hat{r} the underwriting estimate. |

**Hard constraints**

- Every assumption such as rent growth, vacancy and exit yield is stated and editable
- An analyst approves every underwriting before it leaves the team
- Each figure in the summary cites its source document
- Deal information stays confidential and is never shared across clients

## The approach in one paragraph

Start with spreadsheet screening by analysts, because it is the norm. Then earn the move to criteria classifier, NOI estimator and an LLM that drafts the underwriting with cited sources and sensitivities, and only if it beats the baseline on Screen precision and NOI error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Yield vs target | Going-in cap rate minus the fund's target cap rate. A direct test of mandate fit. Guard against: cap rates are computed on estimated income, so mark the income source. |
| Add Rent gap | Passing rent minus market rent as a share of market rent. Shows upside from marking rents to market. Guard against: market rents are estimates, so use an interval. |
| Add Capex need | Estimated capital spend per square metre from condition, age and survey notes. Capital needs reduce returns and are often hidden. Guard against: estimates are rough, so keep a contingency band. |
| Run it as one pipeline | Offering memorandum intake (deal inbox), Extractor (LLM), Criteria screen (rules), NOI model (boosting), Underwriting drafter (LLM) and Deal log (CRM), with Analyst review off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle missing rent roll | Ask for it, and mark any returns that depend on assumed income as provisional. |

**Deliberately not doing**

- Broker enthusiasm: Marketing language that does not tell the analyst about the property.
- Photo count: Reflects the brochure and not the investment.
- Deal name: A label chosen by the seller or broker with no link to returns.

**How the approach is proven**

Prove it offline on Screen precision and NOI error using time-ordered splits, then online on "Deals screened per analyst" with "Hit rate" as the guardrail. Watch for: Past deals are those the team chose to pursue, so the data is biased toward what they already liked and Optimistic seller data in the memorandum distorts any model trained on its figures.

## Baseline and production design

- **Baseline (build this first):** Spreadsheet screening by analysts, because it is the norm.
- **Production design:** Criteria classifier, NOI estimator and an LLM that drafts the underwriting with cited sources and sensitivities.

## Why AI, and why this kind

**Why AI.** Screen listed investment properties against the fund's criteria and draft an underwriting summary with cash-flow assumptions. The evidence that separates good from bad outcomes (Yield vs target, Rent gap, Capex need) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "analysing every property in full" are what teams reach for first, and they fail because analyst time is limited and most listings fail the mandate on the first page. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Criteria classifier, NOI estimator and an LLM that drafts the underwriting with cited sources and sensitivities.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Yield vs target, Rent gap, Capex need and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Spreadsheet screening by analysts, because it is the norm | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Criteria classifier, NOI estimator and an LLM that drafts the underwriting with cited sources and sensitivities | chosen | Meets the 2500 ms envelope at $5.12 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Deals screened per analyst) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Past deals are those the team chose to pursue, so the data is biased toward what they already liked.
- Evaluation trap: Optimistic seller data in the memorandum distorts any model trained on its figures.
- Missing rent roll: the rent roll is missing, so income cannot be checked.
- Seller errors: seller figures are inconsistent between documents.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
