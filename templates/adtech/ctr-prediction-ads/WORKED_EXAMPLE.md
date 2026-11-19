# Ad Click-Through Rate Prediction: worked example

> Run on synthetic data with Hand-written starter, in 26.5 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Predict click probability for each ad candidate with calibrated outputs at millions of requests per second.

**Constraints that shape the design.** 2 ms inference budget; Sparse categorical features with billions of IDs; Online learning for freshness

**Label in this use case.** For "Ad Click-Through Rate Prediction": Predict click probability for each ad candidate with calibrated outputs at millions of requests per second. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Position bias unmodelled so the model learns the old ranking.

## 2. Choose the signals

Your strongest signal is **Ad-user embedding interaction** (dot product of ad and user embeddings). Its rule: Embedding versions must match between training and serving. In the starter, the closest executable idea is ****: . Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

This pack ships a hand-written starter with its own data generator, written to plant the traps named in the blueprint. Its README lists them one by one, and its tests make each one executable.

## 4. Baseline against the stronger design

The starter runs a baseline and a stronger design under the evaluation discipline the blueprint prescribes. The table at the end of this page lists every number from this run.

| Result | Value |
|---|---|
| impressions | 300000 |
| ctr | 0.0432 |
| explore_rows | 1346 |
| accidental_clicks_in_train | 171 |
| lr_no_position.logloss | 0.1679 |
| lr_no_position.ne | 0.9231 |

## 5. An edge case from the blueprint

**Embedding table updates mid-serving cause version skew.** scores jump for a fraction of traffic. Planned response: Versioned atomic embedding swaps with canary traffic. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

Read starter/README.md for the milestone-by-milestone expectations; then replace the synthetic generator with your data and keep the tests.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `impressions` | 300000 |
| `ctr` | 0.0432 |
| `explore_rows` | 1346 |
| `accidental_clicks_in_train` | 171 |
| `lr_no_position.logloss` | 0.16793 |
| `lr_no_position.ne` | 0.92309 |
| `lr_no_position.ece` | 0.0075114 |
| `lr_no_position.auc_logged` | 0.72837 |
| `lr_no_position.bias_position_1` | 0.74973 |
| `lr_no_position.bias_position_5` | 1.7888 |
| `lr_hashed.logloss` | 0.16569 |
| `lr_hashed.ne` | 0.91078 |
| `lr_hashed.ece` | 0.0077135 |
| `lr_hashed.auc_logged` | 0.74344 |
| `lr_hashed.bias_position_1` | 0.96852 |
| `lr_hashed.bias_position_5` | 1.0263 |
| `lr_hashed.cold_start_ne` | 0.93337 |
| `gbdt.logloss` | 0.1657 |
| `gbdt.ne` | 0.91083 |
| `gbdt.ece` | 0.0040101 |
| `gbdt.auc_logged` | 0.73836 |
| `gbdt.bias_position_1` | 1.0178 |
| `gbdt.bias_position_5` | 1.1382 |
| `gbdt.cold_start_ne` | 0.92942 |
| `cold_start_rows` | 4826 |

</details>
