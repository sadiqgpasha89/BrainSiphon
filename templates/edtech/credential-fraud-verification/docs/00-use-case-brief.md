# Credential & Certificate Fraud Detection: use-case brief

> Generated from the blueprint `edtech/credential-fraud-verification` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Credential & Certificate Fraud Detection · **Domain:** edtech · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect forged diplomas, transcripts and certificates in admissions and hiring flows by combining document forensics, issuer verification and network signals. The system has to run interactively, within a few seconds, inside these limits: Issuer database coverage, Privacy and Cross-border documents.

**Why it is hard.** The obvious approach is visual forensics alone, and it fails because a perfect forgery passes visual checks. The second trap is in "Network": the real signal is diploma-mill and repeated-template detection, while teams usually reach for single-document view.

**Scale and stakes.** At 10 million users this is about 60.0K model-touching events a day, 1 requests per second on average and 4 at peak, at an estimated $12.9K a month. A mistake is expensive in the way verification turnaround measures it.

**What success looks like.** Offline: Forgery detection recall at low FP and Verification coverage. Online: Fraudulent credentials caught and Verification turnaround. The launch is judged on "Fraudulent credentials caught" while "Verification turnaround" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect forged diplomas, transcripts and certificates in admissions and hiring flows by combining document forensics, issuer verification and network signals.

**Training objective.** `\mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{GraphReg}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{GraphReg} | Graph regulariser: a penalty that pushes connected nodes to have similar representations. |

**Hard constraints**

- Issuer database coverage
- Privacy
- Cross-border documents
- Low false positives for genuine applicants

## The approach in one paragraph

Start with manual verification by calling institutions. Then earn the move to document forensics, issuer API and digital-signature checks, institution graph for mills, and human review of uncertain cases, and only if it beats the baseline on Forgery detection recall at low FP and Verification coverage after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Issuer verification result | Direct verification status. Strongest evidence. Guard against: aPI availability. |
| Add Template conformity | Font and layout vs issuer template. Forgery. Guard against: template library. |
| Add Diploma-mill match | Institution accreditation and mill list. Risk. Guard against: data freshness. |
| Run it as one pipeline | Document upload (applicant portal), Forensics model (tamper detector), Issuer verification (API and signatures), Institution graph check (accreditation data), Risk scorer (GBDT), Verification specialist (human) and Outcomes (labels). |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle institution closed or merged | Historical registry and alternative verification channels. |

**Deliberately not doing**

- Document colour: scan.
- Paper texture photo: scan.

**How the approach is proven**

Prove it offline on Forgery detection recall at low FP and Verification coverage using time-ordered splits, then online on "Fraudulent credentials caught" with "Verification turnaround" as the guardrail. Watch for: Synthetic forgeries differ from real ones and Bias toward institutions with APIs.

## Baseline and production design

- **Baseline (build this first):** Manual verification by calling institutions.
- **Production design:** Document forensics, issuer API and digital-signature checks, institution graph for mills, and human review of uncertain cases.

## Why AI, and why this kind

**Why AI.** Detect forged diplomas, transcripts and certificates in admissions and hiring flows by combining document forensics, issuer verification and network signals. The evidence that separates good from bad outcomes (Issuer verification result, Template conformity, Diploma-mill match) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "visual forensics alone" are what teams reach for first, and they fail because A perfect forgery passes visual checks. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Document forensics, issuer API and digital-signature checks, institution graph for mills, and human review of uncertain cases.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Issuer verification result, Template conformity, Diploma-mill match and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual verification by calling institutions | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Document forensics, issuer API and digital-signature checks, institution graph for mills, and human review of uncertain cases | chosen | Meets the 2500 ms envelope at $7.17 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Fraudulent credentials caught) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Student and child data protection (FERPA, COPPA, GDPR-K))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Synthetic forgeries differ from real ones.
- Evaluation trap: Bias toward institutions with APIs.
- Institution closed or merged: genuine document cannot be verified.
- New digital credential formats: new digital credential formats have no templates and verification coverage drops.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
