# Voice Shopping (ASR + NLU): worked example

> Run on synthetic data with `audio` engine, seed 42400, knobs {"n_train": 1280, "test_snr": 0.047}, in 1.4 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Understand spoken shopping requests, resolve products and handle reorders reliably across accents and noisy environments.

**Constraints that shape the design.** Under 1.5 s response; 12 languages and accents; Privacy of audio

**Label in this use case.** For "Voice Shopping (ASR + NLU)": Understand spoken shopping requests, resolve products and handle reorders reliably across accents and noisy environments. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Test audio recorded in quiet rooms.

## 2. Choose the signals

Your strongest signal is **Contextual biasing list** (user history and catalogue entity prior). Its rule: Updated frequently. In the starter, the closest executable idea is **log filterbank energies**: band energies, normalised per clip. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The test channel is noisier and band-limited. A model that looks perfect on the training channel (100%) falls to 19.7% on the shifted one, because a band it relied on is gone.

## 4. Baseline against the stronger design

Normalised log filterbank features lose 80% of accuracy on the shifted channel; the raw spectrum, which is gain-sensitive, scores 59.5%. Training on clips with channel effects gives 100.0%.

| Result | Value |
|---|---|
| Accuracy on the training channel, filterbank | 100.0% |
| Accuracy on the shifted channel, raw spectrum | 59.5% |
| Accuracy on the shifted channel, filterbank | 19.7% |
| Accuracy on the shifted channel, with channel augmentation | 100.0% |
| Simulated word error rate, clean versus noisy | 3.6% vs 18.8% |

## 5. An edge case from the blueprint

**Background noise from kitchen.** ASR errors on product names lead to wrong or empty search results. Planned response: Noise-robust training and clarification prompts. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

Record test audio on the real devices and rooms, train with the channel effects you will meet, and track word error rate by acoustic condition, not overall.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `train_clips` | 1280 |
| `test_clips` | 600 |
| `sample_rate_hz` | 8000 |
| `raw_spectrum_baseline.same_channel.accuracy` | 1 |
| `raw_spectrum_baseline.same_channel.macro_f1` | 1 |
| `raw_spectrum_baseline.shifted_channel.accuracy` | 0.595 |
| `raw_spectrum_baseline.shifted_channel.macro_f1` | 0.49736 |
| `log_filterbank_challenger.same_channel.accuracy` | 1 |
| `log_filterbank_challenger.same_channel.macro_f1` | 1 |
| `log_filterbank_challenger.shifted_channel.accuracy` | 0.19667 |
| `log_filterbank_challenger.shifted_channel.macro_f1` | 0.065738 |
| `log_filterbank_with_channel_augmentation.same_channel.accuracy` | 1 |
| `log_filterbank_with_channel_augmentation.same_channel.macro_f1` | 1 |
| `log_filterbank_with_channel_augmentation.shifted_channel.accuracy` | 1 |
| `log_filterbank_with_channel_augmentation.shifted_channel.macro_f1` | 1 |
| `channel_shift_drop_challenger` | 0.80333 |
| `augmentation_gain_on_shifted_channel` | 0.80333 |
| `wer_simulated.clean` | 0.03625 |
| `wer_simulated.noisy` | 0.18792 |

</details>
