# KYC Document Verification (Vision): use-case brief

> Generated from the blueprint `fintech/kyc-document-verification-vision` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** KYC Document Verification (Vision) · **Domain:** fintech · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Verify ID documents in under 3 seconds with tamper, forgery and replay detection to cut manual KYC review by 80%. The system has to run interactively, within a few seconds, inside these limits: Images processed in a regional VPC, Support 200 document types and Under 3 s end-to-end.

**Why it is hard.** The obvious approach is oCR text accuracy alone, and it fails because a good forgery has perfect text and wrong physics. The second trap is in "Recapture": the real signal is moiré, screen glare and re-photograph detection, while teams usually reach for image sharpness.

**Scale and stakes.** At 10 million users this is about 600.0K model-touching events a day, 7 requests per second on average and 42 at peak, at an estimated $19.1K a month. A mistake is expensive in the way document fraud passed to downstream measures it.

**What success looks like.** Offline: Forgery recall at 1% false reject and OCR field accuracy. Online: Manual review rate and Document fraud passed to downstream. The launch is judged on "Manual review rate" while "Document fraud passed to downstream" must not get worse.

## Objective, loss and constraints

**Business objective.** Verify ID documents in under 3 seconds with tamper, forgery and replay detection to cut manual KYC review by 80%.

**Training objective.** `\mathcal{L}=\mathcal{L}_{\text{CE}}^{\text{doc type}}+\mathcal{L}_{\text{BCE}}^{\text{tamper}}+\lambda\,\mathcal{L}_{\text{OCR-CTC}}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathcal{L}_{\text{CE}}^{\text{doc type}} | Cross-entropy for recognising the type of identity document. |
| \mathcal{L}_{\text{BCE}}^{\text{tamper}} | Binary cross-entropy for whether the document has been tampered with. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathcal{L}_{\text{OCR-CTC}} | CTC loss for reading the text on the document. |

**Hard constraints**

- Images processed in a regional VPC
- Support 200 document types
- Under 3 s end-to-end
- Biometric consent logged

## The approach in one paragraph

Start with oCR plus rule checks on MRZ and expiry date. Then earn the move to document classifier, ViT tamper detector and layout-aware OCR in one TensorRT pipeline; low-confidence cases routed to human review, and only if it beats the baseline on Forgery recall at 1% false reject and OCR field accuracy after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around MRZ checksum validity | ICAO 9303 check digits recomputed from parsed fields. Cheap hard check. Guard against: parse the raw MRZ not the cleaned text. |
| Add Template conformity | Layout and font match against issuing-authority templates. Forgeries drift from the template. Guard against: template version must match issue year. |
| Add Screen-recapture score | Frequency-domain artefacts in the image. Screen replays leave moiré. Guard against: compression changes the spectrum so augment with JPEG. |
| Run it as one pipeline | Upload gateway (presigned object storage), Quality gate (blur and glare check), Document classifier (EfficientNet TensorRT), Tamper and OCR models (ViT plus LayoutLM) and Decision aggregator (rules and thresholds), with Human review and Fraud feedback off the critical path. |
| Optimise the right thing | The objective weighs cross-entropy for recognising the type of identity document, so the model is trained on the cost of the decision and not on a generic score. |
| Handle new passport design released | Open-set detection routes unknowns to review and triggers template onboarding. |

**Deliberately not doing**

- Image resolution: varies with phone model not authenticity.
- Background colour: uninformative and easy to alter.

**How the approach is proven**

Prove it offline on Forgery recall at 1% false reject and OCR field accuracy using time-ordered splits, then online on "Manual review rate" with "Document fraud passed to downstream" as the guardrail. Watch for: Synthetic forgeries in training differ from real attacker craft and Test set has the same document templates as train.

## Baseline and production design

- **Baseline (build this first):** OCR plus rule checks on MRZ and expiry date.
- **Production design:** Document classifier, ViT tamper detector and layout-aware OCR in one TensorRT pipeline; low-confidence cases routed to human review.

## Why AI, and why this kind

**Why AI.** Verify ID documents in under 3 seconds with tamper, forgery and replay detection to cut manual KYC review by 80%. The evidence that separates good from bad outcomes (MRZ checksum validity, Template conformity, Screen-recapture score) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "OCR text accuracy alone" are what teams reach for first, and they fail because A good forgery has perfect text and wrong physics. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Document classifier, ViT tamper detector and layout-aware OCR in one TensorRT pipeline; low-confidence cases routed to human review.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among MRZ checksum validity, Template conformity, Screen-recapture score and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: OCR plus rule checks on MRZ and expiry date | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Document classifier, ViT tamper detector and layout-aware OCR in one TensorRT pipeline; low-confidence cases routed to human review | chosen | Meets the 2500 ms envelope at $1.06 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | rejected | The regulator reads this model; a black-box vendor score cannot be validated, replayed or explained. Use vendors for signals, not for the decision. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Manual review rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (RBI payment-data localisation (UPI and card data stored only in India))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Synthetic forgeries in training differ from real attacker craft.
- Evaluation trap: Test set has the same document templates as train.
- New passport design released: classifier sees an unknown template.
- Low-light images from low-end phones: tamper false positives.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
