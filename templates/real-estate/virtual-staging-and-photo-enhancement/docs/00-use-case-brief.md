# Virtual Staging & Photo Enhancement: use-case brief

> Generated from the blueprint `real-estate/virtual-staging-and-photo-enhancement` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Virtual Staging & Photo Enhancement · **Domain:** real-estate · **Latency tier:** seconds · **Difficulty:** advanced

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Furnish empty rooms and enhance photos with generative models, clearly labelled, to help buyers imagine the space. The system has to run interactively, within a few seconds, inside these limits: Every staged image carries a visible label and the original is always one click away, Walls, windows, fixtures and views are never altered and Disclosure text shown to buyers wherever the image appears.

**Why it is hard.** The obvious approach is edits that move walls, enlarge windows or improve views, and it fails because a misleading image is a misrepresentation and a legal risk, however attractive it looks. The second trap is in "Fidelity": the real signal is geometry-preserving edits driven by depth and edge maps, while teams usually reach for free-form generation from a text prompt.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $24.7K a month. A mistake is expensive in the way buyer complaints about staging measures it.

**What success looks like.** Offline: Structure similarity and Human realism ratings. Online: Listing views and Buyer complaints about staging. The launch is judged on "Listing views" while "Buyer complaints about staging" must not get worse.

## Objective, loss and constraints

**Business objective.** Furnish empty rooms and enhance photos with generative models, clearly labelled, to help buyers imagine the space.

**Training objective.** `\mathcal{L}=\mathcal{L}_{\text{recon}}+\lambda\,\mathcal{L}_{\text{perceptual}}+\mu\,\mathcal{L}_{\text{adv}}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathcal{L}_{\text{recon}} | Reconstruction loss: how well the model rebuilds a normal image, so defects show up as large errors. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathcal{L}_{\text{perceptual}} | Perceptual loss: how different the output looks to a vision network compared with the target image. |
| \mu | The model's predicted mean (expected value) of the outcome. |
| \mathcal{L}_{\text{adv}} | Adversarial loss: trains the generator to produce images a discriminator cannot tell from real ones. |

**Hard constraints**

- Every staged image carries a visible label and the original is always one click away
- Walls, windows, fixtures and views are never altered
- Disclosure text shown to buyers wherever the image appears
- Written seller consent recorded before any edit

## The approach in one paragraph

Start with manual staging by a service, because it is the current practice. Then earn the move to controlled diffusion with depth and edge conditioning, an automated structure check and a staged label, and only if it beats the baseline on Structure similarity and Human realism ratings after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Structure preservation | Edge-map similarity between the original and staged image outside the furniture mask. A direct test that walls, windows and openings did not change. Guard against: mask the furniture region, otherwise added furniture lowers the score. |
| Add Lighting consistency | Angle between the dominant shadow direction in the room and on the added furniture. Mismatched shadows make the image look fake. Guard against: estimate light from fixed features, because windows and lamps vary. |
| Add Style fit | Style classifier score against the chosen target style such as modern or traditional. Consistent style helps buyers imagine the space. Guard against: taste differs by market, so validate with local raters. |
| Run it as one pipeline | Photo upload (portal), Depth and edge extraction (vision model), Staging generator (conditioned diffusion), Structure checker (similarity), Label stamper (image service) and Agent approval (app), with Audit log off the critical path. |
| Optimise the right thing | The objective weighs reconstruction loss: how well the model rebuilds a normal image, so defects show up as large errors, so the model is trained on the cost of the decision and not on a generic score. |
| Handle wrong scale furniture | Derive scale from the depth map and reject images where furniture sizes are implausible. |

**Deliberately not doing**

- Prompt wording: Changes output from run to run without a link to image honesty or appeal.
- Seed: Random variation between renders that should not drive a decision.
- Render time: Reflects server load, not the quality of the image.

**How the approach is proven**

Prove it offline on Structure similarity and Human realism ratings using time-ordered splits, then online on "Listing views" with "Buyer complaints about staging" as the guardrail. Watch for: Evaluating only on easy, simple rooms hides failures in cluttered or oddly shaped ones and Taste differs by market, so raters from one region approve images that buyers elsewhere dislike.

## Baseline and production design

- **Baseline (build this first):** Manual staging by a service, because it is the current practice.
- **Production design:** Controlled diffusion with depth and edge conditioning, an automated structure check and a staged label.

## Why AI, and why this kind

**Why AI.** Furnish empty rooms and enhance photos with generative models, clearly labelled, to help buyers imagine the space. The evidence that separates good from bad outcomes (Structure preservation, Lighting consistency, Style fit) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "edits that move walls, enlarge windows or improve views" are what teams reach for first, and they fail because A misleading image is a misrepresentation and a legal risk, however attractive it looks. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Controlled diffusion with depth and edge conditioning, an automated structure check and a staged label.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Structure preservation, Lighting consistency, Style fit and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: Manual staging by a service, because it is the current practice | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Controlled diffusion with depth and edge conditioning, an automated structure check and a staged label | chosen | Meets the 2500 ms envelope at $2.74 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Listing views) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Fair housing and anti-discrimination law)
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluating only on easy, simple rooms hides failures in cluttered or oddly shaped ones.
- Evaluation trap: Taste differs by market, so raters from one region approve images that buyers elsewhere dislike.
- Wrong scale furniture: furniture generated at the wrong scale makes the room look unreal or misleading.
- Reflective surfaces: mirrors and glass produce artefacts in the generated image.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
