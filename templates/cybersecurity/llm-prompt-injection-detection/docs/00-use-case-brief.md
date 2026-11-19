# LLM Prompt-Injection & Jailbreak Detection: use-case brief

> Generated from the blueprint `cybersecurity/llm-prompt-injection-detection` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** LLM Prompt-Injection & Jailbreak Detection · **Domain:** cybersecurity · **Latency tier:** sub-100ms · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Detect direct and indirect prompt injection and jailbreaks in LLM application inputs and retrieved content before they reach the model or tools. The system has to run in under 100 milliseconds, inside these limits: Added latency under 30 ms, Multilingual and encoded attacks and Low false positives on legitimate prompts.

**Why it is hard.** The obvious approach is prompt-only defences, and it fails because classifiers alone are routinely bypassed. The second trap is in "Indirect": the real signal is treat retrieved and tool content as untrusted, while teams usually reach for filtering user input only.

**Scale and stakes.** At 10 million users this is about 30.0M model-touching events a day, 347 requests per second on average and 2.1K at peak, at an estimated $4.14M a month. A mistake is expensive in the way false block rate measures it.

**What success looks like.** Offline: Attack detection rate at 0.1% FPR and Robustness to encoded variants. Online: Successful injection incidents and False block rate. The launch is judged on "Successful injection incidents" while "False block rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Detect direct and indirect prompt injection and jailbreaks in LLM application inputs and retrieved content before they reach the model or tools.

**Training objective.** `\mathcal{L}=\mathrm{FL}(y,p)+\lambda\,\mathrm{Calibration}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathrm{FL} | Focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning. |
| y | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. |
| p | The model's predicted probability that the outcome is positive (between 0 and 1). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{Calibration} | Calibration penalty: grows when predicted probabilities disagree with observed frequencies, for example predictions of 30% that come true 20% of the time. |

**Hard constraints**

- Added latency under 30 ms
- Multilingual and encoded attacks
- Low false positives on legitimate prompts
- Defence in depth
- Covers indirect injection in retrieved documents, emails, web pages and MCP tool responses
- Classifier paired with structural isolation because no single layer is trusted

## The approach in one paragraph

Start with keyword and regex filters for known jailbreak phrases. Then earn the move to small fine-tuned encoder classifier on user and retrieved text, with privilege separation, output validators and canary tokens for exfiltration. Quantised DeBERTa-v3 or Llama-Guard class model on the ingress path, spotlighting of untrusted context with random delimiters or datamarking, and a deterministic policy engine on every outbound tool call, and only if it beats the baseline on Attack detection rate at 0.1% FPR and Robustness to encoded variants after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Instruction-likeness of untrusted content | Classifier on imperative text in data. Indirect injection. Guard against: segmentation. |
| Add Policy violation attempt score | Jailbreak taxonomy classifier. Direct attack. Guard against: red-team data. |
| Add Tool-call privilege anomaly | Call outside user's intent. Exploitation. Guard against: intent model. |
| Run it as one pipeline | Input and retrieved content (app), Normaliser (decode and strip), Injection classifier (small encoder), Privilege-separation layer (tool permissions), Output validator (policy check) and Security logging (SIEM), with Red-team feedback off the critical path. |
| Optimise the right thing | The objective weighs focal loss: cross-entropy that down-weights easy examples so that rare, hard positives drive learning, so the model is trained on the cost of the decision and not on a generic score. |
| Handle attack encoded in base64 or another language | Decode and translate pipeline with multilingual training data. |

**Deliberately not doing**

- Prompt length: weak.
- Language: weak.

**How the approach is proven**

Prove it offline on Attack detection rate at 0.1% FPR and Robustness to encoded variants using time-ordered splits, then online on "Successful injection incidents" with "False block rate" as the guardrail. Watch for: Static public jailbreak datasets and Ignoring indirect injection.

## Baseline and production design

- **Baseline (build this first):** Keyword and regex filters for known jailbreak phrases.
- **Production design:** Small fine-tuned encoder classifier on user and retrieved text, with privilege separation, output validators and canary tokens for exfiltration. Quantised DeBERTa-v3 or Llama-Guard class model on the ingress path, spotlighting of untrusted context with random delimiters or datamarking, and a deterministic policy engine on every outbound tool call.

## Why AI, and why this kind

**Why AI.** Detect direct and indirect prompt injection and jailbreaks in LLM application inputs and retrieved content before they reach the model or tools. The evidence that separates good from bad outcomes (Instruction-likeness of untrusted content, Policy violation attempt score, Tool-call privilege anomaly) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "prompt-only defences" are what teams reach for first, and they fail because classifiers alone are routinely bypassed. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** Answers must be grounded in a changing private corpus with citations and permissions, which retrieval-augmented generation handles and a static model cannot. Here the production design is: Small fine-tuned encoder classifier on user and retrieved text, with privilege separation, output validators and canary tokens for exfiltration. Quantised DeBERTa-v3 or Llama-Guard class model on the ingress path, spotlighting of untrusted context with random delimiters or datamarking, and a deterministic policy engine on every outbound tool call.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Instruction-likeness of untrusted content, Policy violation attempt score, Tool-call privilege anomaly and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword and regex filters for known jailbreak phrases | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Small fine-tuned encoder classifier on user and retrieved text, with privilege separation, output validators and canary tokens for exfiltration. Quantised DeBERTa-v3 or Llama-Guard class model on the ingress path, spotlighting of untrusted context with random delimiters or datamarking, and a deterministic policy engine on every outbound tool call | chosen | Meets the 80 ms envelope at $4.60 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fine-tune a model on the corpus | later | Bakes in stale facts and bypasses document permissions; try retrieval and better chunking first |
| LLM or agent as the decision maker | rejected | A bigger model alone does not fix grounding; retrieval quality and permissions do |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fine-tune a model on the corpus beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Successful injection incidents) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Breach notification timelines)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Static public jailbreak datasets.
- Evaluation trap: Ignoring indirect injection.
- Attack encoded in base64 or another language: classifier misses.
- Benign prompts that discuss security flagged: harmless prompts discussing security topics are flagged and legitimate users get blocked.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
