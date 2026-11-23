# Investigator Case File Search and Summary Assistant: use-case brief

> Generated from the blueprint `public-safety/investigator-case-file-assistant` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Investigator Case File Search and Summary Assistant · **Domain:** public-safety · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Let investigators search and summarise large case files, reports and statements with links to the original text, without ranking suspects or suggesting guilt. The system has to run interactively, within a few seconds, inside these limits: Every summary line links to the source passage, No suspect ranking or guilt language and Access follows case permissions and is logged.

**Why it is hard.** The obvious approach is judgement of suspects, and it fails because prejudging people harms justice. The second trap is in "Evidence": the real signal is links to the exact passage, while teams usually reach for a free summary.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $45.9K a month. A mistake is expensive in the way missed documents measures it.

**What success looks like.** Offline: Retrieval accuracy on judged queries, Faithfulness of summaries and Entity extraction accuracy. Online: Time to review a case file, Missed documents and Disclosure errors. The launch is judged on "Time to review a case file" while "Missed documents" must not get worse.

## Objective, loss and constraints

**Business objective.** Let investigators search and summarise large case files, reports and statements with links to the original text, without ranking suspects or suggesting guilt.

**Training objective.** `\mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \sum_t | Sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on). |
| \log | Natural logarithm. It turns probabilities into log-likelihood terms that add up and punish confident mistakes heavily. |
| p_\theta | The language model's probability of the next token y_t, given the earlier tokens and the context written after the bar. (one value per time step or token t and forecast step h) |
| y_t | The true outcome the model is trained to predict: a label such as 1 for positive and 0 for negative, or a measured value. (one value per time step or token t) |
| \mid | 'Given': what follows is the information the probability or prediction is conditioned on. |
| y_{<t} | All tokens before position t: the text the model has already read or generated. (one value per time step or token t) |
| x | The input features describing one example (what the model sees). |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathrm{BCE} | Binary cross-entropy: the standard loss for yes/no predictions. It is large when the model gives a low probability to what actually happened. |
| \hat{p} | The model's estimated probability, after calibration where one is applied. |

**Hard constraints**

- Every summary line links to the source passage
- No suspect ranking or guilt language
- Access follows case permissions and is logged
- Investigator verifies before use
- Search over 5M pages within 5 s

## The approach in one paragraph

Start with keyword search over scanned PDFs and manual indexing, because it is the current approach. Then earn the move to a retrieval and summarisation assistant with a timeline and entity view, contradiction flags shown neutrally and a full access log, with disclosure support for the defence process, and only if it beats the baseline on Retrieval accuracy on judged queries and Faithfulness of summaries after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Document type and date | Statement, report or lab result. Filter. Guard against: from the records system. |
| Add Entity mentions | People, places and objects named. Navigation. Guard against: from NER. |
| Add Timeline events | Events with dates. Orientation. Guard against: from extraction. |
| Run it as one pipeline | Document ingestion (records and evidence systems), OCR and parsing (document model), Entity and timeline extraction (NLP), Index (vector and keyword), Answer with links (LLM with citations), Access logging (audit store) and Disclosure export (case workflow). |
| Optimise the right thing | The objective weighs sum: add up the term for every value of the index written under it (all examples, time steps, classes and so on), so the model is trained on the cost of the decision and not on a generic score. |
| Handle poor scan | Quality flags and original viewing. |

**Deliberately not doing**

- Officer name: irrelevant.
- Page count: weak link.
- File name: an artefact.

**How the approach is proven**

Prove it offline on Retrieval accuracy on judged queries, Faithfulness of summaries and Entity extraction accuracy using time-ordered splits, then online on "Time to review a case file" with "Missed documents" as the guardrail. Watch for: Suspect ranking, Summaries without links and Wide access to case files.

## Baseline and production design

- **Baseline (build this first):** Keyword search over scanned PDFs and manual indexing, because it is the current approach.
- **Production design:** A retrieval and summarisation assistant with a timeline and entity view, contradiction flags shown neutrally and a full access log, with disclosure support for the defence process.

## Why AI, and why this kind

**Why AI.** Let investigators search and summarise large case files, reports and statements with links to the original text, without ranking suspects or suggesting guilt. The evidence that separates good from bad outcomes (Document type and date, Entity mentions, Timeline events) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "judgement of suspects" are what teams reach for first, and they fail because prejudging people harms justice. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The task is multi-step with variable paths and tool use that a fixed workflow cannot express, provided tools are typed, permissioned and verified. Here the production design is: A retrieval and summarisation assistant with a timeline and entity view, contradiction flags shown neutrally and a full access log, with disclosure support for the defence process.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Document type and date, Entity mentions, Timeline events and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Keyword search over scanned PDFs and manual indexing, because it is the current approach | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| A retrieval and summarisation assistant with a timeline and entity view, contradiction flags shown neutrally and a full access log, with disclosure support for the defence process | chosen | Meets the 2500 ms envelope at $5.10 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Fully autonomous agent with broad tools | later | Unsafe without earned autonomy; start at read-only and promote by evidence |
| LLM or agent as the decision maker | rejected | This is already an LLM system; the question is how much autonomy to grant, which the autonomy ladder answers |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a fully autonomous agent with broad tools beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Time to review a case file) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Constitutional and civil rights protections, due process and discovery duties)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Suspect ranking.
- Evaluation trap: Summaries without links.
- Poor scan: oCR errors hide key text.
- Missing documents: the case file is incomplete.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
