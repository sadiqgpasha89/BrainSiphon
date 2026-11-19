# Suitability & Mis-Selling Detection: use-case brief

> Generated from the blueprint `bfsi/suitability-and-mis-selling-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Suitability & Mis-Selling Detection · **Domain:** bfsi · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Review advised sales and call records to find products that do not fit the client's profile or were sold with misleading statements. The system has to run as a scheduled batch job, inside these limits: Reviewers see evidence for each flag, Review capacity of 400 cases a week and Records retained under conduct rules.

**Why it is hard.** The obvious approach is product category alone, and it fails because complex products suit some clients. The second trap is in "Statement": the real signal is specific misleading claims in the call or note, while teams usually reach for overall tone.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 7 at peak, at an estimated $2.1K a month. A mistake is expensive in the way time to detect measures it.

**What success looks like.** Offline: Precision at review capacity and Recall on confirmed breaches. Online: Confirmed breaches found per 100 reviews and Time to detect. The launch is judged on "Confirmed breaches found per 100 reviews" while "Time to detect" must not get worse.

## Objective, loss and constraints

**Business objective.** Review advised sales and call records to find products that do not fit the client's profile or were sold with misleading statements.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{CE}(\hat{y},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \hat{y} | The model's prediction of y. |

**Hard constraints**

- Reviewers see evidence for each flag
- Review capacity of 400 cases a week
- Records retained under conduct rules
- No automatic customer redress

## The approach in one paragraph

Start with random sampling of sales plus a rule list on product and client risk, because it is the standard control. Then earn the move to a tabular model over fit features with a transcript model for claims, producing a ranked review list with evidence snippets, and only if it beats the baseline on Precision at review capacity and Recall on confirmed breaches after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Risk mismatch | Product risk class minus client risk tolerance. Core suitability signal. Guard against: questionnaires age. |
| Add Concentration after sale | Share of wealth in the product. Over-concentration. Guard against: needs the full balance sheet. |
| Add Claim phrases | Guaranteed, no risk, always, as phrases in transcripts. Misleading statements. Guard against: context matters. |
| Run it as one pipeline | Sales records (advice platform), Call transcripts (speech to text store), Fit feature builder (Spark), Fit model (gradient boosting), Claim detector (encoder classifier) and Compliance workbench (case tool), with Review list builder off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle updated client profile after sale | Use the client profile as it stood on the sale date and keep a history of changes. |

**Deliberately not doing**

- Call duration: weak.
- Client age alone: proxy for vulnerability, handle separately.
- Branch: administrative.

**How the approach is proven**

Prove it offline on Precision at review capacity and Recall on confirmed breaches using time-ordered splits, then online on "Confirmed breaches found per 100 reviews" with "Time to detect" as the guardrail. Watch for: Confirmed breaches are those that complained, a biased label and Same advisor in train and test.

## Baseline and production design

- **Baseline (build this first):** Random sampling of sales plus a rule list on product and client risk, because it is the standard control.
- **Production design:** A tabular model over fit features with a transcript model for claims, producing a ranked review list with evidence snippets.

## Why AI, and why this kind

**Why AI.** Review advised sales and call records to find products that do not fit the client's profile or were sold with misleading statements. The evidence that separates good from bad outcomes (Risk mismatch, Concentration after sale, Claim phrases) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "product category alone" are what teams reach for first, and they fail because complex products suit some clients. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A tabular model over fit features with a transcript model for claims, producing a ranked review list with evidence snippets.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Risk mismatch, Concentration after sale, Claim phrases and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Random sampling of sales plus a rule list on product and client risk, because it is the standard control | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A tabular model over fit features with a transcript model for claims, producing a ranked review list with evidence snippets | chosen | Meets the run-window envelope at $0.116 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Confirmed breaches found per 100 reviews) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI/IRDAI data-localisation and outsourcing rules)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Confirmed breaches are those that complained, a biased label.
- Evaluation trap: Same advisor in train and test.
- Updated client profile after sale: a client's risk profile changes after the sale, so fit at the time cannot be read from today's profile.
- Joint advice: a sale to two clients with different profiles fits one and not the other.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
