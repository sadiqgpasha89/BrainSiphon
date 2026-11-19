# Virtual Try-On: use-case brief

> Generated from the blueprint `retail/virtual-try-on` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Use case:** Virtual Try-On · **Domain:** retail · **Latency tier:** seconds · **Difficulty:** staff-principal

One page to align the sponsor, the product owner and the delivery team before anything is designed. Edit it until everyone would sign it.

## The problem

**Situation.** Render garments, glasses or makeup on a user's photo or live camera realistically enough to cut returns. The system has to run interactively, within a few seconds, inside these limits: Under 3 s for photo or 30 fps live, Privacy of user images and Body-inclusive across sizes.

**Why it is hard.** The obvious approach is simple overlay, and it fails because overlays ignore drape and size. The second trap is in "Fit": the real signal is size-aware rendering, while teams usually reach for one-size render.

**Scale and stakes.** At 10 million users this is about 300.0K model-touching events a day, 3 requests per second on average and 21 at peak, at an estimated $21.8K a month. A mistake is expensive in the way conversion lift measures it.

**What success looks like.** Offline: FID and identity similarity and Human preference on fit realism. Online: Return rate of try-on users and Conversion lift. The launch is judged on "Return rate of try-on users" while "Conversion lift" must not get worse.

## Objective, loss and constraints

**Business objective.** Render garments, glasses or makeup on a user's photo or live camera realistically enough to cut returns.

**Training objective.** `\mathcal{L}=\mathcal{L}_{\text{perceptual}}+\mathcal{L}_{\text{adv}}+\lambda\,\mathcal{L}_{\text{identity}}`

**Loss variables**

| Symbol | Meaning |
|---|---|
| \mathcal{L} | The loss: the single number training tries to make as small as possible. Lower means the model fits the data and respects the extra terms better. |
| \mathcal{L}_{\text{perceptual}} | Perceptual loss: how different the output looks to a vision network compared with the target image. |
| \mathcal{L}_{\text{adv}} | Adversarial loss: trains the generator to produce images a discriminator cannot tell from real ones. |
| \lambda | Penalty weight: how strongly the added term counts against the main objective. A larger value enforces that term harder, at some cost in fit. |
| \mathcal{L}_{\text{identity}} | Identity loss: penalty when the generated image changes the person's face or body. |

**Hard constraints**

- Under 3 s for photo or 30 fps live
- Privacy of user images
- Body-inclusive across sizes
- Mobile GPU

## The approach in one paragraph

Start with 2D overlay with scaling. Then earn the move to pose-guided warping network with latent diffusion refinement, distilled for mobile and a cloud path for high quality, and only if it beats the baseline on FID and identity similarity and Human preference on fit realism after variance.

**Moves**

| Move | Detail |
|---|---|
| Build the model around Body keypoints and parsing | Pose and segmentation masks. Alignment. Guard against: robust to clothing. |
| Add Garment geometry features | Measurements and fabric type. Drape. Guard against: catalogue data quality. |
| Add Identity preservation score | Face and body identity similarity. Quality. Guard against: metric gaming risk. |
| Run it as one pipeline | Photo or camera capture (mobile), Pose and parsing (edge model), Garment warping (GAN or diffusion on GPU), Refinement (latent diffusion), Quality gate (artifacts detector), Delivery to app (CDN) and Usage analytics (events). |
| Optimise the right thing | The objective weighs perceptual loss: how different the output looks to a vision network compared with the target image, so the model is trained on the cost of the decision and not on a generic score. |
| Handle diverse body shapes underrepresented | Balanced datasets and fairness audits per body type. |

**Deliberately not doing**

- Photo background: removed.
- Image EXIF: privacy.

**How the approach is proven**

Prove it offline on FID and identity similarity and Human preference on fit realism using time-ordered splits, then online on "Return rate of try-on users" with "Conversion lift" as the guardrail. Watch for: Evaluated on studio models only and Realism rated by internal staff.

## Baseline and production design

- **Baseline (build this first):** 2D overlay with scaling.
- **Production design:** Pose-guided warping network with latent diffusion refinement, distilled for mobile and a cloud path for high quality.

## Why AI, and why this kind

**Why AI.** Render garments, glasses or makeup on a user's photo or live camera realistically enough to cut returns. The evidence that separates good from bad outcomes (Body keypoints and parsing, Garment geometry features, Identity preservation score) is high-dimensional and shifts over time, which a fixed threshold cannot track.

**Why not rules.** Rules of the form "simple overlay" are what teams reach for first, and they fail because overlays ignore drape and size. Rules stay as the policy layer around the model (limits, compliance, safe defaults) but cannot rank the cases inside them.

**Why this paradigm.** The signal is in pixels and layout, which needs a learned vision model and hardware-aware serving. Here the production design is: Pose-guided warping network with latent diffusion refinement, distilled for mobile and a cloud path for high quality.

**Options weighed**

| Option | Verdict | Reason |
|---|---|---|
| Rules and thresholds only (status quo) | rejected | Cannot capture the interactions among Body keypoints and parsing, Garment geometry features, Identity preservation score and decays as behaviour changes; kept as the policy layer and the last rung of the degradation ladder. |
| Baseline: 2D overlay with scaling | fallback | Sets the cost floor, gives the benchmark every challenger must beat and stays deployed as the in-process fallback. |
| Pose-guided warping network with latent diffusion refinement, distilled for mobile and a cloud path for high quality | chosen | Meets the 2500 ms envelope at $2.43 per 1,000 decisions and exposes the signals the baseline cannot use. |
| Larger foundation vision model on every frame | later | GPU cost grows with frames; gate by motion or region and run the heavy model on flagged inputs only |
| LLM or agent as the decision maker | rejected | Use a vision-language model offline for labelling and for explanation, not per-frame inference |
| Buy a vendor model end to end | later | Reasonable for a first release without labels; integrate the vendor score as a feature and keep the policy and ledger in-house. |

**Revisit the decision when**

- Label volume or signal changes enough that a larger foundation vision model on every frame beats the champion by a pre-agreed margin on the frozen holdout and every protected slice
- The latency or cost envelope moves (a looser p99 or cheaper serving makes a heavier tier affordable; a tighter one forces a lighter cascade)
- The guardrail metric (Return rate of try-on users) breaches for two consecutive matured-label windows despite retraining
- A new regulatory or contractual requirement changes what must be explained, localised or approved (Consumer privacy and consent (GDPR, CCPA, DPDP))
- The decision starts to change the data it learns from (selection bias grows), which calls for exploration or counterfactual evaluation

## Risks to name now

- Evaluation trap: Evaluated on studio models only.
- Evaluation trap: Realism rated by internal staff.
- Diverse body shapes underrepresented: renders look unrealistic for under-represented body types, harming trust and fairness.
- User uploads someone else’s photo: processing a third party’s image without consent creates a privacy violation.

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Sponsor | | | |
| Product owner | | | |
| Delivery lead | | | |
| Risk and compliance | | | |
