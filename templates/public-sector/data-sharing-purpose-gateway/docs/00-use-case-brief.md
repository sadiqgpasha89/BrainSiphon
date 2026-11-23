# Cross-Agency Data Sharing Purpose Gateway: use-case brief

> Generated from the blueprint `public-sector/data-sharing-purpose-gateway` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Cross-Agency Data Sharing Purpose Gateway · **Domain:** public-sector · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Check each cross-agency data request against its legal basis, purpose and consent before data is released, and log every share so people can see who used their data and why. The system has to run in under 100 milliseconds, inside these limits: Policy enforced outside the model in a gateway, Requests without a legal basis are denied and Fields minimised to the stated purpose.

**Why it is hard.** The obvious approach is prompt instructions, and it fails because prompts can be bypassed. The second trap is in "Minimisation": the real signal is only fields needed for the purpose, while teams usually reach for whole records.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $86.9K a month. A mistake is expensive in the way time to approve valid requests measures it.

**What success looks like.** Offline: Policy decision correctness on test cases, Minimisation compliance and Latency at p99. Online: Requests denied for no basis, Time to approve valid requests and Subject log queries. The launch is judged on "Requests denied for no basis" while "Time to approve valid requests" must not get worse.

## Objective, loss and constraints

**Business objective.** Check each cross-agency data request against its legal basis, purpose and consent before data is released, and log every share so people can see who used their data and why.

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

- Policy enforced outside the model in a gateway
- Requests without a legal basis are denied
- Fields minimised to the stated purpose
- Immutable log available to the data subject on request
- Decision within 100 ms

## The approach in one paragraph

Start with bilateral agreements and manual approval of each request, because it is the current process. Then earn the move to a policy gateway evaluating requests against purpose-tagged agreements and consent with field-level minimisation, anomaly detection and a subject-facing access log, and only if it beats the baseline on Policy decision correctness on test cases and Minimisation compliance after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Requester and purpose code | Agency and declared purpose. Policy input. Guard against: from the request. |
| Add Legal basis and consent state | Statute, agreement and consent. Decision. Guard against: from the policy store. |
| Add Field sensitivity class | Sensitivity of requested fields. Minimisation. Guard against: from the catalogue. |
| Run it as one pipeline | Purpose code intake (API front end), Legal basis evaluation (policy engine), Field minimisation (sensitivity catalogue), Release or denial (gateway), Immutable log (append-only store), Anomaly detection (time-series model) and Subject access portal (self-service). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle purpose creep | Deny until the purpose is approved. |

**Deliberately not doing**

- Requester name: irrelevant.
- Request wording: not policy.
- Agency size: irrelevant.

**How the approach is proven**

Prove it offline on Policy decision correctness on test cases, Minimisation compliance and Latency at p99 using time-ordered splits, then online on "Requests denied for no basis" with "Time to approve valid requests" as the guardrail. Watch for: Prompt-based enforcement, Whole-record releases and Internal-only logs.

## Baseline and production design

- **Baseline (build this first):** Bilateral agreements and manual approval of each request, because it is the current process.
- **Production design:** A policy gateway evaluating requests against purpose-tagged agreements and consent with field-level minimisation, anomaly detection and a subject-facing access log.

## Why AI, and why this kind

**Why AI.** Check each cross-agency data request against its legal basis, purpose and consent before data is released, and log every share so people can see who used their data and why. The evidence that separates good from bad outcomes (Requester and purpose code, Legal basis and consent state, Field sensitivity class) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "prompt instructions" are what teams reach for first, and they fail because prompts can be bypassed. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: A policy gateway evaluating requests against purpose-tagged agreements and consent with field-level minimisation, anomaly detection and a subject-facing access log.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Requester and purpose code, Legal basis and consent state, Field sensitivity class and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Bilateral agreements and manual approval of each request, because it is the current process | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A policy gateway evaluating requests against purpose-tagged agreements and consent with field-level minimisation, anomaly detection and a subject-facing access log | chosen | Meets the 80 ms envelope at $4.83 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Requests denied for no basis) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Administrative law, due process and right to explanation for decisions about individuals)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Prompt-based enforcement.
- Evaluation trap: Whole-record releases.
- Purpose creep: a new use is proposed for old data.
- Consent withdrawal: a person withdraws consent.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
