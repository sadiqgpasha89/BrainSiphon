# Proactive Outage Notification & Credits: use-case brief

> Generated from the blueprint `telecom/proactive-outage-notification-credits` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Proactive Outage Notification & Credits · **Domain:** telecom · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Notify affected customers of outages in their own channel with accurate restoration estimates and calculate goodwill credits within policy, so contacts during incidents fall. The system has to run interactively, within a few seconds, inside these limits: Customer lists derived from verified service impact, Messages reviewed from templates and never promise unverified times and Credits follow a published policy and a cost cap.

**Why it is hard.** The obvious approach is everyone in the postcode, and it fails because over-notification causes alarm and churn. The second trap is in "Estimate": the real signal is a restoration range with a confidence, while teams usually reach for a single optimistic time.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $12.3K a month. A mistake is expensive in the way complaints about notification measures it.

**What success looks like.** Offline: Impacted-customer precision and recall, Restoration estimate coverage and Credit calculation accuracy. Online: Care contacts during incidents, Complaints about notification and Credit cost per incident. The launch is judged on "Care contacts during incidents" while "Complaints about notification" must not get worse.

## Objective, loss and constraints

**Business objective.** Notify affected customers of outages in their own channel with accurate restoration estimates and calculate goodwill credits within policy, so contacts during incidents fall.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Customer lists derived from verified service impact
- Messages reviewed from templates and never promise unverified times
- Credits follow a published policy and a cost cap
- 5M notifications within 10 minutes of an incident

## The approach in one paragraph

Start with send a generic SMS to every customer served by the affected cells, because it is the current practice and sets the reach baseline. Then earn the move to impact-verified customer lists, a calibrated restoration model, templated multilingual messages and a credit engine following policy, with a dashboard for the incident manager to approve broadcast and credit actions, and only if it beats the baseline on Impacted-customer precision and recall and Restoration estimate coverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Impact membership | Verified link between the customer and the affected elements. Targets the message. Guard against: join to live topology. |
| Add Restoration estimate | Predicted time to restore from the incident type and crew status. Message content. Guard against: calibrated range. |
| Add Contact preference | Channel and quiet hours. Respect and effectiveness. Guard against: from consent records. |
| Run it as one pipeline | Incident impact set (topology join), Restoration estimator (gradient boosting), Message templating (localised templates), Consent and channel gate (policy engine), Notification send (messaging platform), Credit calculation (rules engine) and Contact monitoring (analytics). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle estimate wrong | Update the message with a new range and apologise once. |

**Deliberately not doing**

- Postcode alone: overreach.
- Customer value tier: should not affect who is told.
- Message length: not effectiveness.

**How the approach is proven**

Prove it offline on Impacted-customer precision and recall, Restoration estimate coverage and Credit calculation accuracy using time-ordered splits, then online on "Care contacts during incidents" with "Complaints about notification" as the guardrail. Watch for: Notifying by postcode, Promising a single time and Unbounded credits.

## Baseline and production design

- **Baseline (build this first):** Send a generic SMS to every customer served by the affected cells, because it is the current practice and sets the reach baseline.
- **Production design:** Impact-verified customer lists, a calibrated restoration model, templated multilingual messages and a credit engine following policy, with a dashboard for the incident manager to approve broadcast and credit actions.

## Why AI, and why this kind

**Why AI.** Notify affected customers of outages in their own channel with accurate restoration estimates and calculate goodwill credits within policy, so contacts during incidents fall. The evidence that separates good from bad outcomes (Impact membership, Restoration estimate, Contact preference) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "everyone in the postcode" are what teams reach for first, and they fail because over-notification causes alarm and churn. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: Impact-verified customer lists, a calibrated restoration model, templated multilingual messages and a credit engine following policy, with a dashboard for the incident manager to approve broadcast and credit actions.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Impact membership, Restoration estimate, Contact preference and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Send a generic SMS to every customer served by the affected cells, because it is the current practice and sets the reach baseline | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Impact-verified customer lists, a calibrated restoration model, templated multilingual messages and a credit engine following policy, with a dashboard for the incident manager to approve broadcast and credit actions | chosen | Meets the 2500 ms envelope at $0.681 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Care contacts during incidents) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Telecom licence conditions on availability and outage reporting)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Notifying by postcode.
- Evaluation trap: Promising a single time.
- Estimate wrong: restoration slips.
- Partial restoration: some customers recover earlier.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
