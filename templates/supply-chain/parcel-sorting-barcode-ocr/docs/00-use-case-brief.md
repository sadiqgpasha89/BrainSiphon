# Parcel Sorting: Label Reading & Address OCR: use-case brief

> Generated from the blueprint `supply-chain/parcel-sorting-barcode-ocr` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Parcel Sorting: Label Reading & Address OCR · **Domain:** supply-chain · **Latency tier:** sub-100ms · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Read barcodes and address text from parcels on fast conveyors with high first-pass read rate to reduce manual coding. The system has to run in under 100 milliseconds, inside these limits: 99.5% read rate, 100 ms per parcel and Damaged and curved labels.

**Why it is hard.** The obvious approach is oCR on everything, and it fails because barcode is faster and more reliable. The second trap is in "Validation": the real signal is address validation against postal database, while teams usually reach for raw OCR text.

**Scale and stakes.** At 10 million users this is about 6.0M model-touching events a day, 69 requests per second on average and 417 at peak, at an estimated $81.9K a month. A mistake is expensive in the way misroute rate measures it.

**What success looks like.** Offline: First-pass read rate and Address validation precision. Online: Manual keying rate and Misroute rate. The launch is judged on "Manual keying rate" while "Misroute rate" must not get worse.

## Objective, loss and constraints

**Business objective.** Read barcodes and address text from parcels on fast conveyors with high first-pass read rate to reduce manual coding.

**Training objective.** `\mathcal{L}=\mathcal{L}_{\text{det}}+\mathcal{L}_{\text{CTC}}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathcal{L}_{\text{det}} | Detection loss: how well objects are found and their boxes placed. |
| \mathcal{L}_{\text{CTC}} | Connectionist temporal classification loss: aligns a signal such as audio or a line image with its text without frame-by-frame labels. |

**Hard constraints**

- 99.5% read rate
- 100 ms per parcel
- Damaged and curved labels
- Multi-language addresses

## The approach in one paragraph

Start with fixed-mount barcode scanners with manual keying fallback. Then earn the move to multi-camera capture, detection plus barcode decoder, scene-text OCR with address parser and postal validation, human keying for low confidence, and only if it beats the baseline on First-pass read rate and Address validation precision after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Barcode decode confidence | Decoder checksum success. Reliability. Guard against: hardware. |
| Add OCR confidence by field | Per-field probabilities. Routing. Guard against: calibrated. |
| Add Address validity score | Fuzzy match to postal database. Correctness. Guard against: database version. |
| Run it as one pipeline | Camera array (sorter), Label detector (detector), Barcode and OCR (decoders and CTC), Address parser and validator (postal rules), Sort-code assignment (routing table) and Manual keying (human), with Misroute feedback off the critical path. |
| Optimise the right thing | The objective weighs detection loss: how well objects are found and their boxes placed, so the model is trained on the cost of the decision and not on a generic score. |
| Handle handwritten addresses | Handwriting-specific model and keying route. |

**Deliberately not doing**

- Parcel colour: none.
- Belt ID: none.

**How the approach is proven**

Prove it offline on First-pass read rate and Address validation precision using time-ordered splits, then online on "Manual keying rate" with "Misroute rate" as the guardrail. Watch for: Test images with clean labels and Not measuring misroutes downstream.

## Baseline and production design

- **Baseline (build this first):** Fixed-mount barcode scanners with manual keying fallback.
- **Production design:** Multi-camera capture, detection plus barcode decoder, scene-text OCR with address parser and postal validation, human keying for low confidence.

## Why AI, and why this kind

**Why AI.** Read barcodes and address text from parcels on fast conveyors with high first-pass read rate to reduce manual coding. The evidence that separates good from bad outcomes (Barcode decode confidence, OCR confidence by field, Address validity score) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "OCR on everything" are what teams reach for first, and they fail because barcode is faster and more reliable. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Multi-camera capture, detection plus barcode decoder, scene-text OCR with address parser and postal validation, human keying for low confidence.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Barcode decode confidence, OCR confidence by field, Address validity score and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Fixed-mount barcode scanners with manual keying fallback | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Multi-camera capture, detection plus barcode decoder, scene-text OCR with address parser and postal validation, human keying for low confidence | chosen | Meets the 80 ms envelope at $0.455 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Manual keying rate) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Partner data-sharing agreements)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Test images with clean labels.
- Evaluation trap: Not measuring misroutes downstream.
- Handwritten addresses: oCR misreads and misroutes.
- Label under tape reflection: glare hides the barcode so the parcel is missed by the scanner and sent to manual coding.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
