# Service Request Triage (311): use-case brief

> Generated from the blueprint `public-sector/service-request-triage` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Service Request Triage (311) · **Domain:** public-sector · **Latency tier:** seconds · **Difficulty:** foundational

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Classify and route non-emergency service requests such as potholes, graffiti and noise from text and photos to the right team with a priority, so residents get faster fixes. The system has to run interactively, within a few seconds, inside these limits: Emergency terms route to a person immediately, Category and priority with confidence and Duplicates linked to one job.

**Why it is hard.** The obvious approach is the resident's choice, and it fails because residents often choose the wrong category. The second trap is in "Fairness": the real signal is equal service by neighbourhood, while teams usually reach for faster service where more requests are filed.

**Scale and stakes.** At 10 million users this is about 900.0K model-touching events a day, 10 requests per second on average and 63 at peak, at an estimated $12.3K a month. A mistake is expensive in the way misrouted requests measures it.

**What success looks like.** Offline: Category accuracy, Hazard recall and Response time gap across neighbourhoods. Online: Time to resolve, Misrouted requests and Response-time equity gap. The launch is judged on "Time to resolve" while "Misrouted requests" must not get worse.

## Objective, loss and constraints

**Business objective.** Classify and route non-emergency service requests such as potholes, graffiti and noise from text and photos to the right team with a priority, so residents get faster fixes.

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

- Emergency terms route to a person immediately
- Category and priority with confidence
- Duplicates linked to one job
- Equal response by neighbourhood monitored
- 3M requests per year

## The approach in one paragraph

Start with call centre agents categorising each request by hand, because it is the current process. Then earn the move to a multimodal classifier with duplicate linking, a hazard rule layer, a response-time equity monitor by neighbourhood and a work order link, and only if it beats the baseline on Category accuracy and Hazard recall after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Text and photo content | Description and image evidence. Category. Guard against: from the request. |
| Add Location and nearby requests | Place and clusters of similar requests. Duplicate detection. Guard against: from GIS. |
| Add Hazard terms | Words and visuals indicating danger. Priority. Guard against: from the lexicon and vision. |
| Run it as one pipeline | Request intake (app, web and phone), Classification (multimodal model), Hazard rules (rule engine), Duplicate linking (geospatial match), Work order (asset system), Status update to resident (messaging) and Equity monitoring (monthly). |
| Optimise the right thing | The objective weighs cross-entropy for multi-class labels: large when the model gives a low probability to the true class, so the model is trained on the cost of the decision and not on a generic score. |
| Handle mixed requests | Split into separate jobs. |

**Deliberately not doing**

- Resident name: irrelevant and private.
- Request channel alone: weak link.
- Neighbourhood name alone: a proxy for wealth.

**How the approach is proven**

Prove it offline on Category accuracy, Hazard recall and Response time gap across neighbourhoods using time-ordered splits, then online on "Time to resolve" with "Misrouted requests" as the guardrail. Watch for: Prioritising by request volume, No hazard route and Resident category as the label.

## Baseline and production design

- **Baseline (build this first):** Call centre agents categorising each request by hand, because it is the current process.
- **Production design:** A multimodal classifier with duplicate linking, a hazard rule layer, a response-time equity monitor by neighbourhood and a work order link.

## Why AI, and why this kind

**Why AI.** Classify and route non-emergency service requests such as potholes, graffiti and noise from text and photos to the right team with a priority, so residents get faster fixes. The evidence that separates good from bad outcomes (Text and photo content, Location and nearby requests, Hazard terms) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "the resident's choice" are what teams reach for first, and they fail because residents often choose the wrong category. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: A multimodal classifier with duplicate linking, a hazard rule layer, a response-time equity monitor by neighbourhood and a work order link.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Text and photo content, Location and nearby requests, Hazard terms and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Call centre agents categorising each request by hand, because it is the current process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A multimodal classifier with duplicate linking, a hazard rule layer, a response-time equity monitor by neighbourhood and a work order link | chosen | Meets the 2500 ms envelope at $0.455 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to resolve) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Prioritising by request volume.
- Evaluation trap: No hazard route.
- Mixed requests: one message has several issues.
- Photo of the wrong place: the image does not match the address.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
