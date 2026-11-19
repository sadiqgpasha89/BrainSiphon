# Privileged Access Session Anomaly Detection: use-case brief

> Generated from the blueprint `cybersecurity/privileged-access-session-anomaly` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Privileged Access Session Anomaly Detection · **Domain:** cybersecurity · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Monitor privileged sessions (SSH, RDP, DB consoles) for risky commands and behaviour changes and terminate or alert in real time. The system has to run in under 100 milliseconds, inside these limits: Real-time command analysis, Admin productivity and Session recording privacy.

**Why it is hard.** The obvious approach is keyword blocklists, and it fails because attackers rename tools and chain benign commands. The second trap is in "Context": the real signal is ticket and change linkage, while teams usually reach for anomaly alone.

**Scale and stakes.** At 10 million users this is about 15.0M model-touching events a day, 174 requests per second on average and 1.0K at peak, at an estimated $13.2K a month. A mistake is expensive in the way admin friction hours measures it.

**What success looks like.** Offline: Recall of simulated attack sessions and Alert rate per admin-hour. Online: Risky command terminations and Admin friction hours. The launch is judged on "Risky command terminations" while "Admin friction hours" must not get worse.

## Objective, loss and constraints

**Business objective.** Monitor privileged sessions (SSH, RDP, DB consoles) for risky commands and behaviour changes and terminate or alert in real time.

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

- Real-time command analysis
- Admin productivity
- Session recording privacy
- Break-glass handling

## The approach in one paragraph

Start with command blocklists and session recording. Then earn the move to sequence model on commands enriched with ticket/change context and asset criticality, with graded responses (alert, step-up, terminate), and only if it beats the baseline on Recall of simulated attack sessions and Alert rate per admin-hour after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Command risk embedding | Embedding of command and arguments. Risk. Guard against: tokenisation. |
| Add Ticket linkage | Session tied to approved ticket. Legitimacy. Guard against: iTSM. |
| Add Target criticality | Critical server tier. Impact. Guard against: cMDB. |
| Run it as one pipeline | Session proxy (PAM), Command parser (shell AST), Sequence risk model (transformer), Context join (ticket and CMDB) and Response policy (graded actions), with Security approver and Review outcomes off the critical path. |
| Optimise the right thing | The objective weighs binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened, so the model is trained on the cost of the decision and not on a generic score. |
| Handle incident response changes admin behaviour dramatically | Break-glass mode with heightened logging not blocking. |

**Deliberately not doing**

- Session duration: weak.
- Admin username: personal.

**How the approach is proven**

Prove it offline on Recall of simulated attack sessions and Alert rate per admin-hour using time-ordered splits, then online on "Risky command terminations" with "Admin friction hours" as the guardrail. Watch for: Lab attack sessions are too clean and Context not included in evaluation.

## Baseline and production design

- **Baseline (build this first):** Command blocklists and session recording.
- **Production design:** Sequence model on commands enriched with ticket/change context and asset criticality, with graded responses (alert, step-up, terminate).

## Why AI, and why this kind

**Why AI.** Monitor privileged sessions (SSH, RDP, DB consoles) for risky commands and behaviour changes and terminate or alert in real time. The evidence that separates good from bad outcomes (Command risk embedding, Ticket linkage, Target criticality) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "keyword blocklists" are what teams reach for first, and they fail because attackers rename tools and chain benign commands. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Few reliable labels and a normal that keeps moving: robust baselines with seasonality plus a learned detector, with alert hysteresis, find real change without an alert storm. Here the production design is: Sequence model on commands enriched with ticket/change context and asset criticality, with graded responses (alert, step-up, terminate).

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Command risk embedding, Ticket linkage, Target criticality and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Command blocklists and session recording | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Sequence model on commands enriched with ticket/change context and asset criticality, with graded responses (alert, step-up, terminate) | chosen | Meets the 80 ms envelope at $0.029 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Deep sequence autoencoder | later | Harder to explain and tune, with little evidence it beats seasonal baselines on this signal |
| LLM or agent as the decision maker | rejected | Use an LLM for triage and root-cause narration of alerts, not for detection |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a deep sequence autoencoder beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Risky command terminations) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Lab attack sessions are too clean.
- Evaluation trap: Context not included in evaluation.
- Incident response changes admin behaviour dramatically: false alerts during emergencies.
- Command obfuscation via encoded payloads: base64 or encoded payloads hide the real command so the risk is missed.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
