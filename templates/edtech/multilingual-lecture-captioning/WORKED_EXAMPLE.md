# Multilingual Lecture Captioning & Translation: worked example

> Run on synthetic data with `audio` engine, seed 30145, knobs {"n_train": 1260, "test_snr": 3.318}, in 1.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Provide accurate live and recorded captions and translations for lectures in many languages with technical vocabulary.

**Constraints that shape the design.** Live latency under 3 s; Accessibility standards; Code-switching

**Label in this use case.** For "Multilingual Lecture Captioning & Translation": Provide accurate live and recorded captions and translations for lectures in many languages with technical vocabulary. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Test set lacks code-switching.

## 2. Choose the signals

Your strongest signal is **Contextual biasing list** (slide text and glossary). Its rule: Extraction. In the starter, the closest executable idea is **log filterbank energies**: band energies, normalised per clip. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

The test channel is noisier and band-limited. A model that looks perfect on the training channel (100%) falls to 23.2% on the shifted one, because a band it relied on is gone.

## 4. Baseline against the stronger design

Normalised log filterbank features lose 77% of accuracy on the shifted channel; the raw spectrum, which is gain-sensitive, scores 61.8%. Training on clips with channel effects gives 100.0%.

| Result | Value |
|---|---|
| Accuracy on the training channel, filterbank | 100.0% |
| Accuracy on the shifted channel, raw spectrum | 61.8% |
| Accuracy on the shifted channel, filterbank | 23.2% |
| Accuracy on the shifted channel, with channel augmentation | 100.0% |
| Simulated word error rate, clean versus noisy | 3.9% vs 18.2% |

## 5. An edge case from the blueprint

**Code-switching between two languages.** transcription breaks. Planned response: Multilingual models with language ID per segment. Write the test that replays this case through your pipeline before you tune anything.

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
| `train_clips` | 1260 |
| `test_clips` | 600 |
| `sample_rate_hz` | 8000 |
| `raw_spectrum_baseline.same_channel.accuracy` | 1 |
| `raw_spectrum_baseline.same_channel.macro_f1` | 1 |
| `raw_spectrum_baseline.shifted_channel.accuracy` | 0.61833 |
| `raw_spectrum_baseline.shifted_channel.macro_f1` | 0.50966 |
| `log_filterbank_challenger.same_channel.accuracy` | 1 |
| `log_filterbank_challenger.same_channel.macro_f1` | 1 |
| `log_filterbank_challenger.shifted_channel.accuracy` | 0.23167 |
| `log_filterbank_challenger.shifted_channel.macro_f1` | 0.075237 |
| `log_filterbank_with_channel_augmentation.same_channel.accuracy` | 1 |
| `log_filterbank_with_channel_augmentation.same_channel.macro_f1` | 1 |
| `log_filterbank_with_channel_augmentation.shifted_channel.accuracy` | 1 |
| `log_filterbank_with_channel_augmentation.shifted_channel.macro_f1` | 1 |
| `channel_shift_drop_challenger` | 0.76833 |
| `augmentation_gain_on_shifted_channel` | 0.76833 |
| `wer_simulated.clean` | 0.03875 |
| `wer_simulated.noisy` | 0.18208 |

</details>
