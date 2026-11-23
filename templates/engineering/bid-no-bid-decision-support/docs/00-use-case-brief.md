# Bid and No-Bid Decision Support: use-case brief

> Generated from the blueprint `engineering/bid-no-bid-decision-support` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Bid and No-Bid Decision Support · **Domain:** engineering · **Latency tier:** batch · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Score tender opportunities on win probability, margin, risk and fit with capacity and strategy so bid committees choose which tenders to pursue, with the evidence shown. The system has to run as a scheduled batch job, inside these limits: Committee decides, Scores show drivers and Client and bid data kept in segregated workspaces.

**Why it is hard.** The obvious approach is bid count, and it fails because many bids are sunk cost. The second trap is in "Value": the real signal is expected margin after risk, while teams usually reach for win rate alone.

**Scale and stakes.** At 10 million users this is about 1.5M model-touching events a day, 17 requests per second on average and 17 at peak, at an estimated $1.9K a month. A mistake is expensive in the way margin on won work measures it.

**What success looks like.** Offline: Calibration of win probability, Margin forecast error and Committee agreement. Online: Win rate on pursued bids, Margin on won work and Bid cost. The launch is judged on "Win rate on pursued bids" while "Margin on won work" must not get worse.

## Objective, loss and constraints

**Business objective.** Score tender opportunities on win probability, margin, risk and fit with capacity and strategy so bid committees choose which tenders to pursue, with the evidence shown.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Committee decides
- Scores show drivers
- Client and bid data kept in segregated workspaces
- Calibrated win probabilities
- 3K tenders per year

## The approach in one paragraph

Start with committee discussion using experience and a checklist, because it is the common practice. Then earn the move to a scoring model that combines win probability, risk and capacity with transparent drivers and a summary pack for the committee, and only if it beats the baseline on Calibration of win probability and Margin forecast error after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Client and competition | Repeat client and competitor set. Core. Guard against: from records. |
| Add Contract risk profile | Payment and liability terms. Risk. Guard against: from tender documents. |
| Add Capacity and fit | Available teams and experience. Fit. Guard against: from resource plans. |
| Run it as one pipeline | Tender intake (bid portal), Document extraction (NLP), Feature build (batch), Win and margin model (gradient boosting), Risk and capacity check (rules), Committee pack (report) and Outcome tracking (quarterly). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new market | Qualitative review. |

**Deliberately not doing**

- Bid manager name: personal data.
- Tender number: an identifier.
- Document format: an artefact.

**How the approach is proven**

Prove it offline on Calibration of win probability, Margin forecast error and Committee agreement using time-ordered splits, then online on "Win rate on pursued bids" with "Margin on won work" as the guardrail. Watch for: Win rate as value, Model-made bid decisions and Bid count as success.

## Baseline and production design

- **Baseline (build this first):** Committee discussion using experience and a checklist, because it is the common practice.
- **Production design:** A scoring model that combines win probability, risk and capacity with transparent drivers and a summary pack for the committee.

## Why AI, and why this kind

**Why AI.** Score tender opportunities on win probability, margin, risk and fit with capacity and strategy so bid committees choose which tenders to pursue, with the evidence shown. The evidence that separates good from bad outcomes (Client and competition, Contract risk profile, Capacity and fit) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "bid count" are what teams reach for first, and they fail because many bids are sunk cost. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The input is unstructured language, where a fine-tuned encoder captures meaning that keywords and templates miss. Here the production design is: A scoring model that combines win probability, risk and capacity with transparent drivers and a summary pack for the committee.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Client and competition, Contract risk profile, Capacity and fit and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Committee discussion using experience and a checklist, because it is the common practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A scoring model that combines win probability, risk and capacity with transparent drivers and a summary pack for the committee | chosen | Meets the run-window envelope at $0.043 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Large decoder model for every item | later | Cost per item is prohibitive at this volume; use a distilled encoder first and escalate the uncertain band |
| LLM or agent as the decision maker | rejected | Reserve a large model for the low-confidence tail and for generating explanations |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a large decoder model for every item beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Win rate on pursued bids) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Professional engineering accountability and building and design codes)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Win rate as value.
- Evaluation trap: Model-made bid decisions.
- New market: there is no history.
- Strategic bid: the bid has non-financial value.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
