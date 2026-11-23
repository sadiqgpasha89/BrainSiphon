# Online Harm Report Triage: use-case brief

> Generated from the blueprint `public-safety/online-harm-report-triage` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Online Harm Report Triage · **Domain:** public-safety · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Classify reports of online abuse and harassment by type and urgency so people at risk reach a human fast and referral partners get the right cases, with no automatic decisions on content or users. The system has to run interactively, within a few seconds, inside these limits: Possible risk to life goes to a person at once, Reviewer wellbeing protections for hard content and No automatic account or content action.

**Why it is hard.** The obvious approach is content volume, and it fails because volume does not show danger. The second trap is in "Role": the real signal is triage and routing, while teams usually reach for takedown or sanction decisions.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 63 at peak, at an estimated $12.3K a month. A mistake is expensive in the way reviewer exposure hours measures it.

**What success looks like.** Offline: Urgent recall, Routing accuracy and Error parity by language. Online: Time to a human for urgent reports, Reviewer exposure hours and Cases referred to the right partner. The launch is judged on "Time to a human for urgent reports" while "Reviewer exposure hours" must not get worse.

## Objective, loss and constraints

**Business objective.** Classify reports of online abuse and harassment by type and urgency so people at risk reach a human fast and referral partners get the right cases, with no automatic decisions on content or users.

**Training objective.** `\mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{ECE} | Expected calibration error: the average gap between predicted probability and observed frequency across probability bins. |

**Hard constraints**

- Possible risk to life goes to a person at once
- Reviewer wellbeing protections for hard content
- No automatic account or content action
- Equal handling across languages
- 300K reports per year

## The approach in one paragraph

Start with a human reading reports in arrival order, because it is the current process. Then earn the move to a classifier with an urgent-first rule layer, blurring of graphic content, routing to specialist teams and a sample audit for fairness by language, and only if it beats the baseline on Urgent recall and Routing accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Threat and self-harm cues | Words indicating danger. Escalation. Guard against: from text. |
| Add Harm type | Harassment, hate, grooming or other. Routing. Guard against: classified. |
| Add Reporter vulnerability flags | Minors or at-risk reporters. Priority. Guard against: from the report form. |
| Run it as one pipeline | Redaction and blurring (pattern and vision), Urgency gate (rules and model), Harm classifier (transformer) and Specialist routing (workflow), with Report intake, Reviewer queue and Audit sample off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle coded language | Human sampling and lexicon updates. |

**Deliberately not doing**

- Reporter name: personal data.
- Platform name alone: weak link.
- Report length: weak link.

**How the approach is proven**

Prove it offline on Urgent recall, Routing accuracy and Error parity by language using time-ordered splits, then online on "Time to a human for urgent reports" with "Reviewer exposure hours" as the guardrail. Watch for: Automatic sanctions, Volume as urgency and Unlimited reviewer exposure.

## Baseline and production design

- **Baseline (build this first):** A human reading reports in arrival order, because it is the current process.
- **Production design:** A classifier with an urgent-first rule layer, blurring of graphic content, routing to specialist teams and a sample audit for fairness by language.

## Why AI, and why this kind

**Why AI.** Classify reports of online abuse and harassment by type and urgency so people at risk reach a human fast and referral partners get the right cases, with no automatic decisions on content or users. The evidence that separates good from bad outcomes (Threat and self-harm cues, Harm type, Reporter vulnerability flags) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "content volume" are what teams reach for first, and they fail because volume does not show danger. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A classifier with an urgent-first rule layer, blurring of graphic content, routing to specialist teams and a sample audit for fairness by language.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Threat and self-harm cues, Harm type, Reporter vulnerability flags and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: A human reading reports in arrival order, because it is the current process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A classifier with an urgent-first rule layer, blurring of graphic content, routing to specialist teams and a sample audit for fairness by language | chosen | Meets the 2500 ms envelope at $0.455 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to a human for urgent reports) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Automatic sanctions.
- Evaluation trap: Volume as urgency.
- Coded language: threats are hidden.
- Multiple languages: one report mixes languages.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
