# Security Incident Report Triage: use-case brief

> Generated from the blueprint `public-safety/security-incident-report-triage` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Security Incident Report Triage · **Domain:** public-safety · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Classify and route facility security incident reports by type and severity so serious reports reach managers quickly and trends are visible across sites. The system has to run interactively, within a few seconds, inside these limits: Serious incidents notify a manager within 5 minutes, Names removed from analytics and Multi-label output.

**Why it is hard.** The obvious approach is officer free-text only, and it fails because free text varies in style. The second trap is in "Severity": the real signal is potential harm, while teams usually reach for outcome only.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $12.2K a month. A mistake is expensive in the way trend detection measures it.

**What success looks like.** Offline: Serious incident recall, Category accuracy and Redaction recall. Online: Time to notify managers, Trend detection and Reports reclassified by managers. The launch is judged on "Time to notify managers" while "Trend detection" must not get worse.

## Objective, loss and constraints

**Business objective.** Classify and route facility security incident reports by type and severity so serious reports reach managers quickly and trends are visible across sites.

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

- Serious incidents notify a manager within 5 minutes
- Names removed from analytics
- Multi-label output
- Monthly audit of classification
- 100K reports per year

## The approach in one paragraph

Start with managers reading every report in the shift summary, because it is the current process. Then earn the move to a multi-label classifier with a rule layer for serious terms, redaction and trend dashboards by site and type, with sampled human review, and only if it beats the baseline on Serious incident recall and Category accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Incident keywords | Words describing theft, assault or damage. Type. Guard against: from text. |
| Add Location type | Entrance, car park or office. Context. Guard against: from the form. |
| Add Severity cues | Injury, weapon or threat terms. Severity. Guard against: from text. |
| Run it as one pipeline | Redaction (pattern and model), Rule layer for serious terms (rules), Classifier (transformer), Routing (workflow) and Trend dashboard (BI tool), with Report intake and Sample audit off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle slang and abbreviations | Lexicon updates. |

**Deliberately not doing**

- Reporter name: personal data.
- Report length: weak link.
- Shift label: weak link.

**How the approach is proven**

Prove it offline on Serious incident recall, Category accuracy and Redaction recall using time-ordered splits, then online on "Time to notify managers" with "Trend detection" as the guardrail. Watch for: Outcome-only severity, Named analytics and No rule layer for serious cases.

## Baseline and production design

- **Baseline (build this first):** Managers reading every report in the shift summary, because it is the current process.
- **Production design:** A multi-label classifier with a rule layer for serious terms, redaction and trend dashboards by site and type, with sampled human review.

## Why AI, and why this kind

**Why AI.** Classify and route facility security incident reports by type and severity so serious reports reach managers quickly and trends are visible across sites. The evidence that separates good from bad outcomes (Incident keywords, Location type, Severity cues) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "officer free-text only" are what teams reach for first, and they fail because free text varies in style. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A multi-label classifier with a rule layer for serious terms, redaction and trend dashboards by site and type, with sampled human review.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Incident keywords, Location type, Severity cues and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Managers reading every report in the shift summary, because it is the current process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A multi-label classifier with a rule layer for serious terms, redaction and trend dashboards by site and type, with sampled human review | chosen | Meets the 2500 ms envelope at $0.681 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to notify managers) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Outcome-only severity.
- Evaluation trap: Named analytics.
- Slang and abbreviations: the classifier misreads text.
- New incident type: the taxonomy lacks it.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
