# Voice Deepfake & Vishing Detection

**BrainSiphon worked template** · Cybersecurity · latency tier seconds · staff-principal

Detect synthetic or cloned voices and social-engineering call patterns in contact-centre and enterprise calls in near real time.

> Licensed under the MIT licence (see `LICENSE.md` at the repository root). Generated from the blueprint `cybersecurity/voice-deepfake-and-vishing-detection`, last verified 2026-11-07. The starter runs on synthetic data; the documents contain modelled figures. Neither is production evidence.

## What is in this folder

| Path | What it is |
|---|---|
| `WORKED_EXAMPLE.md` | A walk-through of the starter's real results, step by step |
| `FIT.md` | How well the starter fits this use case, and what to change |
| `docs/00` to `docs/08` | Brief, discovery workbook, delivery plan, data spec, evaluation plan, risk register, runbook, model and data cards, capacity and cost |
| `contracts/` | OpenAPI, AsyncAPI, data contract and reference SQL |
| `deployment/` | Serving configuration, Helm overrides sized from the capacity model, and a compose file for the starter |
| `starter/` | Runnable code on synthetic data, its tests and gates, and `results.json` from the last run |

## Run it in two minutes

```bash
cd starter
make setup      # a virtualenv with the pinned libraries
make demo       # runs the worked example and writes results.json
make test       # reproduces results.json and checks every gate
```

## Headline results from the last run

| Result | Value |
|---|---|
| Accuracy on the training channel, filterbank | 100.0% |
| Accuracy on the shifted channel, raw spectrum | 61.8% |
| Accuracy on the shifted channel, filterbank | 20.3% |
| Accuracy on the shifted channel, with channel augmentation | 100.0% |
| Simulated word error rate, clean versus noisy | 3.3% vs 20.0% |

## Fit

Exact: the `audio` engine implements this problem type. Engine: **Speech and audio classification under channel shift, plus word error rate**. Raw spectrum against a log filterbank with per-clip normalisation, with and without channel augmentation, on synthetic 8 kHz clips whose test channel is noisier and band-limited; includes a tested word-error-rate implementation.

## Map your signals

The blueprint's strongest signals, and the features the starter implements. Map one onto the other in `starter/` before changing anything else.

| Blueprint signal | Definition |
|---|---|
| Spectral artefact score | model on spectral and phase features |
| Social-engineering intent | urgency, secrecy and payment requests |
| Caller-ID and call-path anomaly | spoofing indicators |

| Starter feature | What it does |
|---|---|
| log filterbank energies | band energies, normalised per clip |
| raw magnitude spectrum | gain-sensitive baseline |
| channel augmentation | low-pass and noise added at training time |
| word error rate | edit distance over reference words |

## Honest limits

- The data is synthetic. It plants the traps the blueprint names; it does not contain your population.
- Figures in the documents marked *modelled* come from a capacity and cost model at on-demand list prices.
- Compliance is established by your own controls, evidence and assessment, not by this template.
- Nothing here was deployed to a cloud account.
