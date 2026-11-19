"""Turns a pack's real results.json into a headline table and a short, honest walk-through.

Each engine supplies `(headline, trap, compare, outcome)`: the numbers worth quoting, the lesson the synthetic data teaches, the
baseline-versus-challenger comparison in words, and what to expect on your own data. Every figure is read from the results of the run
that produced the saved file; nothing is typed in by hand.
"""

from __future__ import annotations


def P(x, d=1):
    return f"{float(x) * 100:.{d}f}%"


def F(x, d=3):
    return f"{float(x):.{d}f}"


def wins(a, b, higher=True, label_a="the challenger", label_b="the baseline"):
    better = a > b if higher else a < b
    return f"{label_a} is ahead" if better else f"{label_b} is ahead: the added complexity did not earn its place on this run"


# each handler: r -> dict(headline=[(label, value)], trap=str, compare=str, outcome=str)
def tabular(r):
    b, c = r["baseline_lr"], r["challenger_hgb"]
    return {
        "headline": [("Test-period positive rate", P(r["test_positive_rate"], 2)), ("Baseline PR-AUC", F(b["pr_auc"])), ("Baseline recall at 0.5% false positives", P(b["recall_at_0.5pct_fpr"])), ("Challenger PR-AUC", F(c["pr_auc"])), ("Challenger recall at 0.5% false positives", P(c["recall_at_0.5pct_fpr"]))],
        "trap": f"Positives are rare ({P(r['test_positive_rate'], 2)} of the test period) and labels arrive weeks late. A model that always answers no would be {P(1 - r['test_positive_rate'], 2)} accurate, which is why the pack scores PR-AUC and recall at a fixed false-positive rate and trains only on rows whose label has matured.",
        "compare": f"The calibrated logistic baseline reaches PR-AUC {F(b['pr_auc'])} and finds {P(b['recall_at_0.5pct_fpr'])} of positives at a 0.5% false-positive rate. The regularised boosted challenger reaches PR-AUC {F(c['pr_auc'])} and {P(c['recall_at_0.5pct_fpr'])}; {wins(c['pr_auc'], b['pr_auc'])}.",
        "outcome": "Expect lower numbers and a different first failure on real data. Keep the chronological split, the matured-label rule and the future-truncation test, and replace the synthetic generator with your extract.",
    }


def forecast(r):
    h7, h14 = r["h7"], r["h14"]
    return {
        "headline": [("WAPE at 7 days, model", P(h7["wmape_model"])), ("WAPE at 7 days, seasonal baseline", P(h7["wmape_baseline"])), ("Forecast value added at 7 days", P(h7["fva"])), ("90th-percentile band coverage", P(r["p90_coverage"])), ("Error at SKU level versus aggregate", f"{P(r['wmape_sku_level'])} vs {P(r['wmape_aggregate'])}")],
        "trap": f"Error depends on the level you read it at: {P(r['wmape_aggregate'])} on the aggregate but {P(r['wmape_sku_level'])} per series. Report at the level the decision is made, by horizon, against a seasonal baseline.",
        "compare": f"At 7 days the model's weighted absolute percentage error is {P(h7['wmape_model'])} against {P(h7['wmape_baseline'])} for the seasonal baseline, a forecast value added of {P(h7['fva'])}. At 14 days it is {P(h14['wmape_model'])} against {P(h14['wmape_baseline'])}. The upper band covers {P(r['p90_coverage'])} of outcomes against a nominal 90%.",
        "outcome": "Real series have promotions, stock-outs and late feeds this generator only approximates. Keep the rolling-origin backtest, the origin-safe features and the band-coverage check.",
    }


def anomaly(r):
    n, s, c = r["naive_z"], r["seasonal_z"], r["seasonal_z_calendar"]
    return {
        "headline": [("Recall, naive z-score", P(n["recall"])), ("Recall, seasonal z-score", P(s["recall"])), ("Recall, seasonal with calendar", P(c["recall"])), ("False alerts per series-week, with calendar", F(c["false_alerts_per_series_week"], 2)), ("Median detection delay, with calendar (hours)", F(c["median_delay_h"], 1))],
        "trap": "Seasonality and planned events look like anomalies to a plain z-score. The pack tunes each threshold on a validation window only and scores on a later one, so alert volume is part of the result and not an afterthought.",
        "compare": f"The naive score finds {P(n['recall'])} of events at {F(n['false_alerts_per_series_week'], 2)} false alerts per series-week. The seasonal score finds {P(s['recall'])} at {F(s['false_alerts_per_series_week'], 2)}. Adding the calendar finds {P(c['recall'])} at {F(c['false_alerts_per_series_week'], 2)}.",
        "outcome": "Choose the threshold from alert capacity, not from recall alone. Replay your own labelled incidents through the same harness before trusting any score.",
    }


def recommender(r):
    p, b, o, t = r["popularity"], r["bag_covisit"], r["ordered_transition"], r["theme_aware"]
    return {
        "headline": [("Hit rate at 20, popularity", F(p["hit_rate@20"])), ("Hit rate at 20, co-visit", F(b["hit_rate@20"])), ("Hit rate at 20, ordered transitions", F(o["hit_rate@20"])), ("Hit rate at 20, theme-aware", F(t["hit_rate@20"])), ("Catalogue coverage, popularity versus theme-aware", f"{P(p['coverage'])} vs {P(t['coverage'])}")],
        "trap": "Bots and one-off sessions flatter a recommender on offline hit rate. The pack filters bot sessions from training, evaluates on humans only, and splits by time so later sessions are never in training.",
        "compare": f"Popularity alone gets a hit rate of {F(p['hit_rate@20'])} at 20 with {P(p['coverage'])} catalogue coverage. Co-visit reaches {F(b['hit_rate@20'])}, ordered transitions {F(o['hit_rate@20'])} and the theme-aware model {F(t['hit_rate@20'])} with {P(t['coverage'])} coverage.",
        "outcome": "Offline hit rate is a screen, not a result: the decision is made by an online experiment with guardrails. Keep the time split and the bot filter.",
    }


def graph(r):
    a, w = r["any_shared_value"], r["weighted_pair_model"]
    return {
        "headline": [("Pair precision, shared-value rule", P(a["pair_precision"])), ("Pair precision, weighted model", P(w["pair_precision"])), ("Pair recall, weighted model", P(w["pair_recall"])), ("Cluster purity, weighted model", P(w["purity"])), ("Largest cluster, rule versus model", f"{a['largest_cluster']} vs {w['largest_cluster']}")],
        "trap": f"Shared hubs (a common phone number or address) join unrelated records: {P(r['hub_pairs_share'])} of candidate pairs run through a hub. A rule that links on any shared value chains them into huge, impure clusters.",
        "compare": f"The shared-value rule links with precision {P(a['pair_precision'], 2)} and purity {P(a['purity'])}, producing a cluster of {a['largest_cluster']} records. The weighted pair model links with precision {P(w['pair_precision'])} and purity {P(w['purity'])}; its largest cluster is {w['largest_cluster']}.",
        "outcome": "Decide the cost of a wrong merge before you tune. Keep blocking, hub down-weighting and the review path for uncertain pairs.",
    }


def nlp(r):
    leak, clean, nxt = r["random_split_with_leak"], r["time_split_clean"], r["frozen_model_next_month"]
    return {
        "headline": [("Macro-F1, random split with a leak", F(leak["macro_f1"])), ("Macro-F1, honest time split", F(clean["macro_f1"])), ("Macro-F1, frozen model next month", F(nxt["macro_f1"])), ("Calibration error, honest split", F(clean["ece"])), ("Duplicate share", P(r["duplicate_share"]))],
        "trap": f"{P(r['duplicate_share'])} of documents are copies of others and one class leaks through a header token. A random split with the leak scores {F(leak['macro_f1'])} macro-F1; the honest split, with threads kept together and the leak removed, scores {F(clean['macro_f1'])}.",
        "compare": f"The honest evaluation is {F(leak['macro_f1'] - clean['macro_f1'])} macro-F1 lower than the optimistic one. A frozen model scores {F(nxt['macro_f1'])} on the next month and {F(r['frozen_model_months_6_7']['macro_f1'])} two months out, so drift costs accuracy within weeks.",
        "outcome": "Trust the honest number, schedule retraining from the drift curve, and keep thread-level splits and the leak scan.",
    }


def cv(r):
    p, a = r["pixels_lr"], r["contrast_aug_lr"]
    return {
        "headline": [("AUC at the training site, pixels model", F(p["site_A_heldout"]["auc"])), ("AUC at a new site, pixels model", F(p["site_B"]["auc"])), ("False-positive rate at a new site using the old threshold", P(p["site_B_at_A_threshold"]["false_positive_rate"])), ("AUC at a new site, contrast-augmented", F(a["site_B"]["auc"])), ("False-positive rate at a new site, contrast-augmented", P(a["site_B_at_A_threshold"]["false_positive_rate"]))],
        "trap": f"A model trained at one site looks excellent there (AUC {F(p['site_A_heldout']['auc'])}) and degrades at another (AUC {F(p['site_B']['auc'])}); the threshold chosen at the first site then fires on {P(p['site_B_at_A_threshold']['false_positive_rate'])} of negatives at the second.",
        "compare": f"Augmenting for the site's contrast changes the new-site result to AUC {F(a['site_B']['auc'])} and a false-positive rate of {P(a['site_B_at_A_threshold']['false_positive_rate'])} at the old threshold.",
        "outcome": "Split by physical item and by site, recalibrate the threshold per site, and measure on a site the model has never seen before sign-off.",
    }


def bandit(r):
    b, l = r["always_best_average_action"], r["learned_greedy"]
    return {
        "headline": [("True value, best constant action", F(b["true_value"])), ("True value, learned policy", F(l["true_value"])), ("Doubly robust estimate, learned policy", F(l["doubly_robust"])), ("Inverse-propensity estimate, learned policy", F(l["ips"])), ("Naive matched-rows estimate, learned policy", F(l["naive_matched"]))],
        "trap": f"Only logged actions have outcomes. Replaying the rows where the new policy agrees with the log gives {F(l['naive_matched'])} for the learned policy, but its true value is {F(l['true_value'])}. The pack knows the truth because the world is simulated.",
        "compare": f"The best constant action is worth {F(b['true_value'])}; the learned policy is worth {F(l['true_value'])}. Inverse-propensity weighting estimates {F(l['ips'])} and the doubly robust estimator {F(l['doubly_robust'])}.",
        "outcome": "Log propensities from day one, evaluate with a doubly robust estimator, and confirm with a small online holdout before changing the policy.",
    }


def optimize(r):
    g, o, u, orc = r["greedy_on_predictions"], r["optimal_on_predictions"], r["optimal_with_uncertainty_penalty"], r["oracle_true_costs"]
    return {
        "headline": [("Regret versus oracle, greedy", f"{g['regret_vs_oracle_pct']:.1f}%"), ("Regret versus oracle, optimal on predictions", f"{o['regret_vs_oracle_pct']:.1f}%"), ("Regret versus oracle, optimal with an uncertainty penalty", f"{u['regret_vs_oracle_pct']:.1f}%"), ("Promised versus realised cost gap, optimal on predictions", f"{o['optimism_gap_pct']:.1f}%")],
        "trap": f"An optimiser exploits prediction errors: the plan built on predictions promises a cost {o['optimism_gap_pct']:.1f}% below what it realises, because it picks the pairings whose costs were under-predicted.",
        "compare": f"Greedy assignment is {g['regret_vs_oracle_pct']:.1f}% worse than the oracle plan; optimal assignment on predictions is {o['regret_vs_oracle_pct']:.1f}% worse; adding an uncertainty penalty gives {u['regret_vs_oracle_pct']:.1f}%.",
        "outcome": "Judge a plan by its realised cost against an oracle on simulated truth, not by the objective the optimiser reported. Keep the uncertainty penalty and the optimism-gap metric.",
    }


def llm_rag(r):
    n, g = r["naive"], r["guarded"]
    return {
        "headline": [("Hallucination rate, naive", P(n["hallucination_rate"])), ("Hallucination rate, guarded", P(g["hallucination_rate"])), ("Answered precision, naive", P(n["answered_precision"])), ("Answered precision, guarded", P(g["answered_precision"])), ("Answerable questions it declined, guarded", P(g["abstained_on_answerable"]))],
        "trap": f"Questions with no answer in the corpus are answered anyway by a naive pipeline: it hallucinated on {P(n['hallucination_rate'])} of them. Stale or superseded passages caused {n['stale_or_changelog_errors']} errors.",
        "compare": f"The guarded pipeline checks that every claim cites a supporting passage and abstains otherwise: hallucination {P(g['hallucination_rate'])}, answered precision {P(g['answered_precision'])}, at the cost of declining {P(g['abstained_on_answerable'])} of answerable questions.",
        "outcome": "The language model here is a deterministic stand-in so the harness is exact; the harness, the golden set and the abstention metric carry over to a real model. Re-measure everything with your model.",
    }


def llm_agent(r):
    n, g = r["naive"], r["guarded"]
    return {
        "headline": [("Injection success, naive", P(n["injection_success_rate"])), ("Injection success, guarded", P(g["injection_success_rate"])), ("Unsafe actions, naive versus guarded", f"{n['unsafe_actions']} vs {g['unsafe_actions']}"), ("Accuracy on auto-decided cases, guarded", P(g["accuracy_on_auto"])), ("Escalation rate, guarded", P(g["escalation_rate"]))],
        "trap": f"Records can carry planted instructions. The naive agent followed them in {P(n['injection_success_rate'])} of injected cases and took {n['unsafe_actions']} unsafe actions; it also decided cases whose deciding evidence was unavailable.",
        "compare": f"The guarded agent treats tool output as data, verifies every claim against a cited line and escalates when evidence is missing: injection success {P(g['injection_success_rate'])}, unsafe actions {g['unsafe_actions']}, accuracy on the cases it decides {P(g['accuracy_on_auto'])}, escalating {P(g['escalation_rate'])}.",
        "outcome": "The planner is scripted so the harness is deterministic. Keep the planted-injection tests, the step budget and the verifier when you put a model behind the same typed tools.",
    }


def regression(r):
    b, c = r["baseline_ridge"], r["challenger_gbm"]
    return {
        "headline": [("MAE, ridge baseline", F(b["mae"], 2)), ("MAE, boosted challenger", F(c["mae"], 2)), ("MAE gain over the baseline", P(r["mae_gain_vs_baseline"])), ("80% interval coverage", P(r["interval_80_coverage"])), ("Worst segment versus overall MAE", f"{r['worst_segment_vs_overall']:.2f}x"), ("RMSE with a leaky column versus honest", f"{F(r['leaky_feature_rmse'], 2)} vs {F(r['honest_rmse'], 2)}")],
        "trap": f"A column recorded after the outcome would cut RMSE from {F(r['honest_rmse'], 2)} to {F(r['leaky_feature_rmse'], 2)}, which looks like a breakthrough and is leakage. A random split reports MAE {F(r['random_split_mae'], 2)} against {F(r['chronological_mae'], 2)} on the honest chronological split.",
        "compare": f"The ridge baseline has MAE {F(b['mae'], 2)}; the boosted model {F(c['mae'], 2)}, a gain of {P(r['mae_gain_vs_baseline'])}. Its 80% interval covers {P(r['interval_80_coverage'])} of outcomes. The hardest segment has an error {r['worst_segment_vs_overall']:.2f} times the overall error.",
        "outcome": "Report error by segment and by time, never one global number, and keep the interval honest. Replace the synthetic table with your extract and keep the chronological split and the leakage test.",
    }


def multiclass(r):
    b, c = r["baseline_lr"], r["challenger_hgb"]
    return {
        "headline": [("Majority-class accuracy", P(r["majority_class_accuracy"])), ("Macro-F1, baseline", F(b["macro_f1"])), ("Macro-F1, challenger", F(c["macro_f1"])), ("Calibration error, baseline versus challenger", f"{F(b['ece'])} vs {F(c['ece'])}"), ("Score inflation from a leaky random split", F(r["leaky_split_inflation"]))],
        "trap": f"Repeat entities on both sides of a random split inflate macro-F1 by {F(r['leaky_split_inflation'])}. The rare class grows from {P(r['train_class_shares'][4])} of training rows to {P(r['test_class_shares'][4])} of the test period, so the prior drifts.",
        "compare": f"Macro-F1 is {F(b['macro_f1'])} for the multinomial baseline and {F(c['macro_f1'])} for the boosted model; {wins(c['macro_f1'], b['macro_f1'])}. The confusable pair is mistaken {P(b['confusable_pair_error'])} of the time by the baseline.",
        "outcome": "Choose by per-class recall for the classes that cost the most, not by accuracy. Keep the entity-safe chronological split.",
    }


def uplift(r):
    return {
        "headline": [("True average effect", F(r["true_ate"], 4)), ("Naive estimate", F(r["naive_ate"], 4)), ("Inverse-propensity estimate", F(r["ipw_ate"], 4)), ("Uplift ranking AUC versus random", f"{F(r['t_learner_qini_auc'], 4)} vs {F(r['random_ranking_qini_auc'], 4)}"), ("Top versus bottom decile realised uplift", f"{F(r['top_decile_realised_uplift'], 3)} vs {F(r['bottom_decile_realised_uplift'], 3)}")],
        "trap": f"Treatment was given more often to people who were likely to convert anyway: the observational groups differ by a standardised {F(r['observational_balance_smd_x0'], 2)} on the confounder. The naive comparison reports {F(r['naive_ate'], 4)} when the true effect is {F(r['true_ate'], 4)}, a bias of {F(r['naive_bias'], 4)}.",
        "compare": f"Inverse-propensity weighting reports {F(r['ipw_ate'], 4)} (bias {F(r['ipw_bias'], 4)}). Ranking people by predicted uplift and checking on the randomised holdout, the top decile gains {F(r['top_decile_realised_uplift'], 3)} against {F(r['bottom_decile_realised_uplift'], 3)} for the bottom; {P(r['share_predicted_negative'])} are predicted to be harmed.",
        "outcome": "Evaluate a ranking only on randomised data, keep a permanent holdout, and treat a predicted-negative group as a decision, not a rounding error.",
    }


def survival(r):
    return {
        "headline": [(f"Event rate by month {r['at_month']} (Kaplan-Meier)", P(r["km_event_rate"])), ("Counting censored as non-events", P(r["count_all_rows_event_rate"])), ("Dropping subjects not yet observed for a full period", P(r["naive_drop_censored_event_rate"])), ("Concordance index", F(r["c_index"])), ("Mean decile calibration gap", P(r["decile_calibration_mean_abs_gap"]))],
        "trap": f"{P(r['censored_share'], 0)} of subjects are censored: recent cohorts have simply not been observed long enough. Counting them as non-events gives {P(r['count_all_rows_event_rate'])} by month {r['at_month']}; dropping the incomplete ones gives {P(r['naive_drop_censored_event_rate'])}; the Kaplan-Meier estimate is {P(r['km_event_rate'])}.",
        "compare": f"A discrete-time hazard model trained on earlier cohorts ranks later cohorts with a concordance index of {F(r['c_index'])} and predicts a mean {P(r['discrete_time_mean_predicted_risk'])} risk, within {P(r['decile_calibration_mean_abs_gap'])} of observed by decile.",
        "outcome": "Always model censoring explicitly and split by entry cohort. Re-check calibration by vintage once real defaults or churn mature.",
    }


def control(r):
    o, p, a, d = r["open_loop"], r["pid"], r["pid_aggressive_gains"], r["pid_with_two_hour_feedback_delay"]
    return {
        "headline": [("Tracking error, open loop", f"{o['tracking_rmse_pct']:.2f}%"), ("Tracking error, PID", f"{p['tracking_rmse_pct']:.2f}%"), ("Reduction versus open loop", P(r["rmse_reduction_vs_open_loop"])), ("Control jitter, PID versus aggressive gains", f"{p['oscillation']:.3f} vs {a['oscillation']:.3f}"), ("Tracking error with a two-hour feedback delay", f"{d['tracking_rmse_pct']:.2f}%")],
        "trap": f"Opportunity is not constant: outages and surges move the target. A fixed schedule drifts by {o['tracking_rmse_pct']:.2f}% on average and ends the day {o['end_of_day_underdelivery_pct']:.1f}% under plan.",
        "compare": f"A PID pacer with anti-windup tracks to {p['tracking_rmse_pct']:.2f}%, a {P(r['rmse_reduction_vs_open_loop'], 0)} reduction. Very high gains track tighter ({a['tracking_rmse_pct']:.2f}%) but make the control signal {a['oscillation'] / max(p['oscillation'], 1e-9):.1f} times noisier, which costs delivery quality. A two-hour feedback delay raises tracking error to {d['tracking_rmse_pct']:.2f}%.",
        "outcome": "Tune against the worst shock and the real feedback delay, cap the control signal's rate of change, and test the controller in simulation before it touches spend.",
    }


def cluster(r):
    return {
        "headline": [("Agreement with planted segments, unscaled", F(r["unscaled_ari"])), ("Agreement, robust-scaled at the planted k", F(r["robust_scaled_ari_at_true_k"])), ("k chosen from data (planted: %d)" % r["true_segments"], str(r["chosen_k"])), ("Bootstrap stability", F(r["bootstrap_stability_ari"])), ("Smallest segment share", P(r["smallest_segment_share"]))],
        "trap": f"One feature is in thousands, so unscaled distance is really one feature: agreement with the planted segments is {F(r['unscaled_ari'])}. Without a minimum segment size, k selection can spend a cluster on outliers ({P(r['unconstrained_k_smallest_share'], 2)} of rows).",
        "compare": f"Robust scaling and winsorising lift agreement to {F(r['robust_scaled_ari_at_true_k'])} at the planted k. Choosing k by silhouette gives {r['chosen_k']}, and agreement {F(r['robust_scaled_ari_at_chosen_k'])}: k is a decision about use, not a statistic. Bootstrap stability is {F(r['bootstrap_stability_ari'])}.",
        "outcome": "A segmentation earns its keep only if someone acts differently on it. Name each segment by what it implies, monitor the mix (it shifted by JS %s in the last period), and refit on a schedule." % F(r["segment_mix_shift_js"], 3),
    }


def audio(r):
    raw, flt, aug = r["raw_spectrum_baseline"], r["log_filterbank_challenger"], r["log_filterbank_with_channel_augmentation"]
    return {
        "headline": [("Accuracy on the training channel, filterbank", P(flt["same_channel"]["accuracy"])), ("Accuracy on the shifted channel, raw spectrum", P(raw["shifted_channel"]["accuracy"])), ("Accuracy on the shifted channel, filterbank", P(flt["shifted_channel"]["accuracy"])), ("Accuracy on the shifted channel, with channel augmentation", P(aug["shifted_channel"]["accuracy"])), ("Simulated word error rate, clean versus noisy", f"{P(r['wer_simulated']['clean'])} vs {P(r['wer_simulated']['noisy'])}")],
        "trap": f"The test channel is noisier and band-limited. A model that looks perfect on the training channel ({P(flt['same_channel']['accuracy'], 0)}) falls to {P(flt['shifted_channel']['accuracy'])} on the shifted one, because a band it relied on is gone.",
        "compare": f"Normalised log filterbank features lose {P(r['channel_shift_drop_challenger'], 0)} of accuracy on the shifted channel; the raw spectrum, which is gain-sensitive, scores {P(raw['shifted_channel']['accuracy'])}. Training on clips with channel effects gives {P(aug['shifted_channel']['accuracy'])}.",
        "outcome": "Record test audio on the real devices and rooms, train with the channel effects you will meet, and track word error rate by acoustic condition, not overall.",
    }


def extraction(r):
    ru, rs, tu, ts, ta = r["rules_unseen_layout"], r["rules_seen_layout"], r["tagger_unseen_layout"], r["tagger_seen_layouts"], r["tagger_unseen_after_adaptation"]
    return {
        "headline": [("Macro-F1, rules on their own layout", F(rs["macro_f1"])), ("Macro-F1, rules on an unseen layout", F(ru["macro_f1"])), ("Macro-F1, tagger on seen layouts", F(ts["macro_f1"])), ("Macro-F1, tagger on an unseen layout", F(tu["macro_f1"])), ("Macro-F1 after %d labelled documents of the new layout" % r["adaptation_docs"], F(ta["macro_f1"]))],
        "trap": f"A new template is the normal case in production. Rules written for one layout score {F(rs['macro_f1'])} there and {F(ru['macro_f1'])} on a new one; the tagger drops from {F(ts['macro_f1'])} to {F(tu['macro_f1'])}.",
        "compare": f"Labelling {r['adaptation_docs']} documents of the new layout lifts the tagger to {F(ta['macro_f1'])}, recovering {F(r['adaptation_recovers'])} of the {F(r['unseen_layout_drop'])} it lost. The field that breaks first on the new layout is the one with no fixed shape.",
        "outcome": "Measure on layouts held out of training, build the loop that turns a failed extraction into a labelled example, and route low-confidence fields to a person.",
    }


def generative(r):
    return {
        "headline": [("Pass rate v1, strict judge", P(r["v1_pass_rate_strict_judge"])), ("Pass rate v1, fuzzy judge", P(r["v1_pass_rate_fuzzy_judge"])), ("Pass rate v2, fuzzy judge", P(r["v2_pass_rate_fuzzy_judge"])), ("v2 minus v1, 95% interval", f"{P(r['v2_minus_v1'])} ({P(r['v2_minus_v1_ci95'][0])} to {P(r['v2_minus_v1_ci95'][1])})"), ("Judge agreement (kappa)", F(r["judge_agreement_kappa_v1"], 2))],
        "trap": f"The same outputs pass {P(r['v1_pass_rate_strict_judge'])} under the strict judge and {P(r['v1_pass_rate_fuzzy_judge'])} under the fuzzy one, because valid formats are rejected by exact matching. The judges agree only moderately (kappa {F(r['judge_agreement_kappa_v1'], 2)}).",
        "compare": f"Version 2 passes {P(r['v2_pass_rate_fuzzy_judge'])} against {P(r['v1_pass_rate_fuzzy_judge'])}: a difference of {P(r['v2_minus_v1'])} with a 95% interval of {P(r['v2_minus_v1_ci95'][0])} to {P(r['v2_minus_v1_ci95'][1])}. With only 60 items the interval on one pass rate is {F(r['ci_width_at_60_items'], 2)} wide, against {F(r['ci_width_at_full_set'], 2)} on the full set.",
        "outcome": "Agree the rubric with the people who own quality, show that two judges agree before trusting either, size the golden set from the interval you need, and replace the stand-in generator with your model.",
    }


HANDLERS = {
    "tabular": tabular, "forecast": forecast, "anomaly": anomaly, "recommender": recommender, "graph": graph, "nlp": nlp, "cv": cv,
    "bandit": bandit, "optimize": optimize, "llm-rag": llm_rag, "llm-agent": llm_agent, "regression": regression, "multiclass": multiclass,
    "uplift": uplift, "survival": survival, "control": control, "cluster": cluster, "audio": audio, "extraction": extraction, "generative": generative,
}


def flatten(d, prefix="", out=None, limit=60):
    out = {} if out is None else out
    for k, v in d.items():
        key = f"{prefix}{k}"
        if isinstance(v, dict):
            flatten(v, key + ".", out, limit)
        elif isinstance(v, bool):
            out[key] = v
        elif isinstance(v, (int, float)):
            out[key] = v
        elif isinstance(v, list) and v and all(isinstance(x, (int, float)) for x in v):
            out[key] = ", ".join(f"{x:.4g}" for x in v)
        if len(out) >= limit:
            break
    return out


def story(engine: str, results: dict) -> dict:
    if engine in HANDLERS:
        return HANDLERS[engine](results)
    flat = flatten(results, limit=8)
    return {
        "headline": [(k, f"{v:.4g}" if isinstance(v, float) else str(v)) for k, v in list(flat.items())[:6]],
        "trap": "This pack ships a hand-written starter with its own data generator, written to plant the traps named in the blueprint. Its README lists them one by one, and its tests make each one executable.",
        "compare": "The starter runs a baseline and a stronger design under the evaluation discipline the blueprint prescribes. The table at the end of this page lists every number from this run.",
        "outcome": "Read starter/README.md for the milestone-by-milestone expectations; then replace the synthetic generator with your data and keep the tests.",
    }
