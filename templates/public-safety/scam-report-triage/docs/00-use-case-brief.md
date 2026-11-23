# Scam Report Triage: use-case brief

> Generated from the blueprint `public-safety/scam-report-triage` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Scam Report Triage · **Domain:** public-safety · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Cluster and prioritise scam reports from the public by type, amount and links between reports so investigators find campaigns and victims get the right support. The system has to run interactively, within a few seconds, inside these limits: Victim support information given at once, Campaign clusters shown to investigators and Names removed from analysis.

**Why it is hard.** The obvious approach is pursue victims, and it fails because victims should get help not blame. The second trap is in "Cluster": the real signal is shared phone numbers, wallets and templates, while teams usually reach for single reports in isolation.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $12.2K a month. A mistake is expensive in the way time to victim support measures it.

**What success looks like.** Offline: Type accuracy, Cluster purity and Time to bank liaison. Online: Funds recovered, Time to victim support and Campaigns identified. The launch is judged on "Funds recovered" while "Time to victim support" must not get worse.

## Objective, loss and constraints

**Business objective.** Cluster and prioritise scam reports from the public by type, amount and links between reports so investigators find campaigns and victims get the right support.

**Training objective.** `\mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{CE} | Cross-entropy for multi-class labels: large when the model gives a low probability to the true class. |
| \hat{y} | The model's prediction of y. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |

**Hard constraints**

- Victim support information given at once
- Campaign clusters shown to investigators
- Names removed from analysis
- Triage within 1 minute
- 1M reports per year

## The approach in one paragraph

Start with reports reviewed one by one by analysts, because it is the current process. Then earn the move to a classifier with indicator extraction and graph clustering, a victim support route with bank liaison for recent losses and an investigator view of campaigns, and only if it beats the baseline on Type accuracy and Cluster purity after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Scam type cues | Romance, investment or impersonation. Routing. Guard against: from text. |
| Add Loss amount and recency | Amount and timing. Urgency. Guard against: from the report. |
| Add Shared indicators | Phone numbers, wallets and domains. Clustering. Guard against: from extraction. |
| Run it as one pipeline | Redaction and extraction (NLP), Type classification (transformer), Indicator graph (graph store), Urgent recovery route (rules) and Investigator view (case tool), with Report intake and Feedback off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle mixed scams | Multi-label routing. |

**Deliberately not doing**

- Victim name: personal data.
- Message tone: weak link.
- Report length: weak link.

**How the approach is proven**

Prove it offline on Type accuracy, Cluster purity and Time to bank liaison using time-ordered splits, then online on "Funds recovered" with "Time to victim support" as the guardrail. Watch for: Reports in isolation, Victim-blaming outputs and Full message copies everywhere.

## Baseline and production design

- **Baseline (build this first):** Reports reviewed one by one by analysts, because it is the current process.
- **Production design:** A classifier with indicator extraction and graph clustering, a victim support route with bank liaison for recent losses and an investigator view of campaigns.

## Why AI, and why this kind

**Why AI.** Cluster and prioritise scam reports from the public by type, amount and links between reports so investigators find campaigns and victims get the right support. The evidence that separates good from bad outcomes (Scam type cues, Loss amount and recency, Shared indicators) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "pursue victims" are what teams reach for first, and they fail because victims should get help not blame. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A classifier with indicator extraction and graph clustering, a victim support route with bank liaison for recent losses and an investigator view of campaigns.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Scam type cues, Loss amount and recency, Shared indicators and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Reports reviewed one by one by analysts, because it is the current process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A classifier with indicator extraction and graph clustering, a victim support route with bank liaison for recent losses and an investigator view of campaigns | chosen | Meets the 2500 ms envelope at $0.681 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Funds recovered) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Reports in isolation.
- Evaluation trap: Victim-blaming outputs.
- Mixed scams: a report has several types.
- Victim in distress: the report shows harm.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
