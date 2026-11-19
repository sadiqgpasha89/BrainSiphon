# Contractor Bid Evaluation: worked example

> Run on synthetic data with `regression` engine, seed 63399, knobs {"n": 25370, "outlier_share": 0.038, "drift": 0.365}, in 3.9 s on Python 3.13.13. Every number below is read from `starter/results.json`, which `make test` regenerates and checks. Synthetic results are easier than production: they show the mechanics and the traps, not what you will measure on your data.

## 1. Frame the case

**Objective.** Compare contractor bids on price, scope coverage, risk and track record to recommend a shortlist.

**Constraints that shape the design.** Evaluation follows procurement rules and published criteria; The scoring method is transparent to bidders on request; A person makes the award decision

**Label in this use case.** For "Contractor Bid Evaluation": Compare contractor bids on price, scope coverage, risk and track record to recommend a shortlist. Define the label exactly as in milestone M1: what counts as a positive or a correct outcome, and when it becomes known. Design around this trap first: Data only on winners, since the performance of unsuccessful bidders is never observed.

## 2. Choose the signals

Your strongest signal is **Scope gap** (number of bill-of-quantities items missing or priced at zero). Its rule: Parsing errors in the bid documents, so check by hand. In the starter, the closest executable idea is **main driver (x1)**: the strongest continuous driver; interacts with x2 and shifts in the last quarter. Map your columns in `starter/` before you change anything else; the full list of signals and engine features is in `starter/usecase.json`.

## 3. Meet the first trap

A column recorded after the outcome would cut RMSE from 12.86 to 1.52, which looks like a breakthrough and is leakage. A random split reports MAE 5.19 against 6.04 on the honest chronological split.

## 4. Baseline against the stronger design

The ridge baseline has MAE 8.27; the boosted model 6.04, a gain of 27.0%. Its 80% interval covers 64.6% of outcomes. The hardest segment has an error 1.35 times the overall error.

| Result | Value |
|---|---|
| MAE, ridge baseline | 8.27 |
| MAE, boosted challenger | 6.04 |
| MAE gain over the baseline | 27.0% |
| 80% interval coverage | 64.6% |
| Worst segment versus overall MAE | 1.35x |
| RMSE with a leaky column versus honest | 1.52 vs 12.86 |

## 5. An edge case from the blueprint

**Abnormally low bid.** An abnormally low bid omits part of the scope. Planned response: Query the bidder on omitted items and compare scope coverage before price. Write the test that replays this case through your pipeline before you tune anything.

## 6. What to expect on your own data

Report error by segment and by time, never one global number, and keep the interval honest. Replace the synthetic table with your extract and keep the chronological split and the leakage test.

## 7. Do this next

1. `cd starter && make setup && make demo` to reproduce the table above.
2. Replace the synthetic generator with an extract of your data and keep the split, the leakage tests and the gates.
3. Run through `docs/02-delivery-plan.md` milestone by milestone; each exit gate is a number you can check.

<details>
<summary>Every number from this run</summary>

| Metric | Value |
|---|---|
| `rows` | 25370 |
| `train_rows` | 17759 |
| `test_rows` | 7611 |
| `baseline_ridge.mae` | 8.272 |
| `baseline_ridge.rmse` | 14.499 |
| `baseline_ridge.wape` | 0.15522 |
| `baseline_ridge.r2` | 0.38875 |
| `challenger_gbm.mae` | 6.0418 |
| `challenger_gbm.rmse` | 12.859 |
| `challenger_gbm.wape` | 0.11337 |
| `challenger_gbm.r2` | 0.51917 |
| `mae_gain_vs_baseline` | 0.26961 |
| `interval_80_coverage` | 0.64591 |
| `interval_80_mean_width` | 9.9348 |
| `segment_mae.0` | 6.0144 |
| `segment_mae.1` | 6.0785 |
| `segment_mae.2` | 5.3216 |
| `segment_mae.3` | 8.133 |
| `worst_segment_vs_overall` | 1.3461 |
| `leaky_feature_rmse` | 1.5197 |
| `honest_rmse` | 12.859 |
| `random_split_mae` | 5.1917 |
| `chronological_mae` | 6.0418 |

</details>
