"""Writes engines/<id>/engine.json and engines/<id>/gates.py.

engine.json describes what the engine implements. gates.py holds the executable checks every pack runs on its own results:
they are written to hold across the seeds and knob ranges the packs use, and a pack that breaks one fails its tests.
Re-run after changing an engine:  python tools/make_engine_meta.py
"""
from __future__ import annotations

import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
E = ROOT / "engines"
contracts = json.loads((ROOT / "data" / "kit-contracts.json").read_text())

NEW = {
    "regression": ("Continuous-target estimation with drift, leakage and heavy tails", "Ridge baseline against a quantile-capable boosted model on a synthetic table with a late drift, heavy-tailed heteroscedastic noise, outliers and a leaky column; reports MAE, RMSE, interval coverage, the worst segment and what a random split hides.", ["regression-estimation"], ["Chronological drift in the last quarter", "Heteroscedastic heavy-tailed noise, largest in the smallest segment", "A leaky column recorded after the outcome", "A random split that flatters the model"]),
    "multiclass": ("Multi-class classification with group leakage and a drifting prior", "Calibrated multinomial baseline against a boosted challenger, scored with macro-F1, per-class recall and calibration, on data with repeat entities, a confusable class pair and a prior that drifts.", ["multiclass-classification"], ["Repeat entities on both sides of a random split", "A confusable class pair with label noise", "A rare class that becomes common"]),
    "uplift": ("Treatment effect and causal measurement with known ground truth", "Naive comparison, inverse-propensity weighting and a two-model uplift ranker on a confounded observational sample, scored against the true effect and a randomised holdout.", ["uplift-causal-effect", "causal-measurement"], ["Treatment assigned on a variable that also drives the outcome", "A randomised holdout to evaluate honestly", "Heterogeneous effect including a harmed group"]),
    "survival": ("Time-to-event with censoring", "Kaplan-Meier, a naive complete-case classifier and a discrete-time hazard model on cohorts with administrative censoring and drop-out, scored with a concordance index and decile calibration.", ["survival-time-to-event"], ["Administrative censoring that grows for recent cohorts", "Drop-out before the event", "Treating censored subjects as non-events"]),
    "control": ("Sequential control: pacing, throttling and limits under delay and shocks", "Open-loop schedule against a PID pacer with anti-windup over 288 five-minute steps with outages, surges and delayed feedback; reports tracking error, overshoot, under-delivery and control-effort noise.", ["sequential-control-simulation"], ["Feedback delay", "An outage and a surge inside the day", "A hard cap where overshoot is worse than undershoot", "Gains high enough to make the controller jitter"]),
    "cluster": ("Clustering and segmentation with scaling, outliers and drift", "Unscaled k-means against robust scaling with a data-driven k, bootstrap stability, a minimum segment size and a segment-mix drift check.", ["clustering-segmentation"], ["One feature in thousands dwarfing the rest", "Outliers that capture a cluster", "Overlapping segments, so silhouette picks a coarse k", "A segment mix that shifts in the last period"]),
    "audio": ("Speech and audio classification under channel shift, plus word error rate", "Raw spectrum against a log filterbank with per-clip normalisation, with and without channel augmentation, on synthetic 8 kHz clips whose test channel is noisier and band-limited; includes a tested word-error-rate implementation.", ["speech-audio"], ["A noisier, band-limited test channel", "Recording gain mistaken for signal", "A feature that collapses when a band disappears"]),
    "extraction": ("Information extraction with a layout the model has never seen", "Layout-specific rules against a token tagger on invoices in three layouts, one of them unseen in training; reports per-field F1, the drop on the new layout and how far a few labelled documents recover it.", ["information-extraction"], ["A new template at test time", "A multi-token field with no fixed shape", "Rules written for a single layout"]),
    "generative": ("Evaluating generated or specialised output with a golden set and two judges", "A golden set of checkable items, stand-ins for two generator versions with controlled failure rates, a strict and a fuzzy judge, their agreement, and bootstrap intervals on the difference; replace the stand-in with your model.", ["generative-or-other"], ["A strict judge that rejects valid formats", "Two judges that disagree on borderline outputs", "A golden set too small to tell versions apart", "A forbidden claim that must never pass"]),
}

NEW_SLOTS = {
 "uplift": [
  [
   "confounder (x0)",
   "drives both who is treated and the outcome"
  ],
  [
   "effect modifier (x1)",
   "the treatment helps only when this is positive"
  ],
  [
   "harm modifier (x2)",
   "with x1 it marks the group the treatment harms"
  ],
  [
   "outcome driver (x3)",
   "raises the baseline outcome"
  ],
  [
   "noise (x4)",
   "irrelevant to both"
  ]
 ],
 "control": [
  [
   "cumulative delivery",
   "what has been delivered so far, seen after a delay"
  ],
  [
   "plan",
   "the target cumulative curve"
  ],
  [
   "opportunity",
   "the demand available each step, which the controller does not control"
  ],
  [
   "multiplier",
   "the controller's output each step"
  ]
 ],
 "regression": [
  [
   "main driver (x1)",
   "the strongest continuous driver; interacts with x2 and shifts in the last quarter"
  ],
  [
   "interaction partner (x2)",
   "modifies the effect of x1 and sets the noise level"
  ],
  [
   "non-linear effect (x3)",
   "a smooth non-linear effect that a straight line cannot fit"
  ],
  [
   "threshold flag (x4)",
   "matters only above a threshold"
  ],
  [
   "segment",
   "a categorical segment with its own level and noise"
  ]
 ],
 "audio": [
  [
   "log filterbank energies",
   "band energies, normalised per clip"
  ],
  [
   "raw magnitude spectrum",
   "gain-sensitive baseline"
  ],
  [
   "channel augmentation",
   "low-pass and noise added at training time"
  ],
  [
   "word error rate",
   "edit distance over reference words"
  ]
 ],
 "extraction": [
  [
   "token shape",
   "capitalisation and digit pattern of a token"
  ],
  [
   "neighbouring words",
   "the words before and after, which carry the layout"
  ],
  [
   "line position",
   "where in the document the token sits"
  ],
  [
   "field rules",
   "layout-specific regular expressions"
  ]
 ],
 "generative": [
  [
   "key facts",
   "the entity, amount and date every output must contain"
  ],
  [
   "constraints",
   "length and forbidden claims"
  ],
  [
   "strict judge",
   "exact canonical strings"
  ],
  [
   "fuzzy judge",
   "any valid format"
  ]
 ],
 "multiclass": [
  [
   "separating feature (x1)",
   "the feature that best separates the classes"
  ],
  [
   "second separating feature (x2)",
   "a second independent separator"
  ],
  [
   "confusable-pair feature (x3)",
   "the feature on which classes 2 and 3 barely differ"
  ],
  [
   "noise feature (x4)",
   "carries little class information"
  ],
  [
   "entity group",
   "the repeat entity that must not appear on both sides of a split"
  ]
 ],
 "cluster": [
  [
   "value feature (f0)",
   "in currency units, thousands of times larger than the others"
  ],
  [
   "behaviour features (f1-f3)",
   "separate the segments"
  ],
  [
   "engagement features (f4-f6)",
   "separate some segments"
  ],
  [
   "noise feature (f7)",
   "carries little structure"
  ]
 ],
 "survival": [
  [
   "risk factor (x0)",
   "raises the hazard"
  ],
  [
   "protective factor (x1)",
   "lowers the hazard"
  ],
  [
   "secondary risk (x2)",
   "a smaller risk effect"
  ],
  [
   "noise (x3)",
   "irrelevant"
  ],
  [
   "entry date",
   "the cohort the subject joined, used for the time-based split"
  ]
 ]
}

GATES = {
    "tabular": [("baseline clears chance", 'r["baseline_lr"]["pr_auc"] > 4 * r["test_positive_rate"]'), ("recall at 0.5% false positives", 'r["baseline_lr"]["recall_at_0.5pct_fpr"] > 0.3'), ("challenger earns its place", 'r["challenger_hgb"]["pr_auc"] >= 0.8 * r["baseline_lr"]["pr_auc"]')],
    "forecast": [("model beats the seasonal baseline at 7 days", 'r["h7"]["wmape_model"] < r["h7"]["wmape_baseline"]'), ("forecast value added is positive", 'r["h7"]["fva"] > 0.05'), ("90th-percentile band coverage", '0.7 < r["p90_coverage"] < 0.98')],
    "anomaly": [("calendar-aware scoring finds at least what the naive score finds", 'r["seasonal_z_calendar"]["recall"] >= r["naive_z"]["recall"]'), ("calendar-aware recall is useful", 'r["seasonal_z_calendar"]["recall"] > 0.5')],
    "recommender": [("session-aware model beats popularity", 'r["theme_aware"]["hit_rate@20"] > 2 * r["popularity"]["hit_rate@20"]'), ("order helps or at least does not hurt", 'r["ordered_transition"]["hit_rate@20"] >= 0.95 * r["bag_covisit"]["hit_rate@20"]')],
    "graph": [("weighted matching beats a shared-value rule on precision", 'r["weighted_pair_model"]["pair_precision"] > r["any_shared_value"]["pair_precision"]'), ("clusters are pure", 'r["weighted_pair_model"]["purity"] > 0.9')],
    "nlp": [("a random split with a leak overstates macro-F1", 'r["random_split_with_leak"]["macro_f1"] > r["time_split_clean"]["macro_f1"]'), ("a frozen model degrades on later months", 'r["frozen_model_months_6_7"]["macro_f1"] <= r["frozen_model_next_month"]["macro_f1"] + 0.01')],
    "cv": [("the new site is harder than the held-out images of the training site", 'r["pixels_lr"]["site_A_heldout"]["auc"] > r["pixels_lr"]["site_B"]["auc"]'), ("the training-site threshold misfires on the new site", 'r["pixels_lr"]["site_B_at_A_threshold"]["false_positive_rate"] > 0.2')],
    "bandit": [("the learned policy is worth more than the best constant action", 'r["learned_greedy"]["true_value"] > r["always_best_average_action"]["true_value"]'), ("doubly robust is close to the true value", 'abs(r["learned_greedy"]["doubly_robust"] - r["learned_greedy"]["true_value"]) < 0.08')],
    "optimize": [("an uncertainty penalty does not increase regret", 'r["optimal_with_uncertainty_penalty"]["regret_vs_oracle_pct"] <= r["greedy_on_predictions"]["regret_vs_oracle_pct"]'), ("optimising on predictions promises more than it delivers", 'r["optimal_on_predictions"]["optimism_gap_pct"] > 0')],
    "llm-rag": [("the guarded pipeline hallucinates no more than the naive one", 'r["guarded"]["hallucination_rate"] <= r["naive"]["hallucination_rate"]'), ("answered precision does not fall", 'r["guarded"]["answered_precision"] >= r["naive"]["answered_precision"]')],
    "llm-agent": [("the guarded agent takes no more unsafe actions", 'r["guarded"]["unsafe_actions"] <= r["naive"]["unsafe_actions"]'), ("injection success does not rise", 'r["guarded"]["injection_success_rate"] <= r["naive"]["injection_success_rate"]')],
    "regression": [("challenger earns its place on MAE", 'r["mae_gain_vs_baseline"] > 0.05'), ("a leaky feature would look far better than the honest model", 'r["leaky_feature_rmse"] < 0.6 * r["honest_rmse"]'), ("interval coverage is in a sane range", '0.5 <= r["interval_80_coverage"] <= 0.95'), ("a global error hides a worse segment", 'r["worst_segment_vs_overall"] > 1.0')],
    "multiclass": [("the model beats the majority class", 'r["baseline_lr"]["accuracy"] > r["majority_class_accuracy"] + 0.05'), ("a random split does not understate the score", 'r["leaky_split_inflation"] > -0.01'), ("the class prior drifts", 'r["test_class_shares"][4] > r["train_class_shares"][4]')],
    "uplift": [("weighting reduces the bias of the naive comparison", 'abs(r["ipw_bias"]) < abs(r["naive_bias"])'), ("the naive comparison is biased upward", 'r["naive_bias"] > 0.02'), ("the uplift ranking beats random targeting", 'r["t_learner_qini_auc"] > r["random_ranking_qini_auc"]')],
    "survival": [("counting censored subjects as non-events understates the rate", 'r["count_all_rows_bias_vs_km"] < 0'), ("the hazard model ranks better than chance", 'r["c_index"] > 0.58'), ("predicted risk is calibrated across deciles", 'r["decile_calibration_mean_abs_gap"] < 0.08')],
    "control": [("feedback beats an open-loop schedule", 'r["pid"]["tracking_rmse_pct"] < r["open_loop"]["tracking_rmse_pct"]'), ("aggressive gains make the controller jitter more", 'r["pid_aggressive_gains"]["oscillation"] > r["pid"]["oscillation"]')],
    "cluster": [("scaling recovers more of the segments than raw distance", 'r["robust_scaled_ari_at_true_k"] > r["unscaled_ari"]'), ("segments are stable under resampling", 'r["bootstrap_stability_ari"] > 0.5'), ("no segment is a sliver", 'r["smallest_segment_share"] > 0.01')],
    "audio": [("the model learns on the training channel", 'r["log_filterbank_with_channel_augmentation"]["same_channel"]["accuracy"] > 0.85'), ("training on channel effects helps on the shifted channel", 'r["augmentation_gain_on_shifted_channel"] >= 0'), ("word error rate rises with corruption", 'r["wer_simulated"]["noisy"] > r["wer_simulated"]["clean"]')],
    "extraction": [("rules fail on a layout they were not written for", 'r["rules_unseen_layout"]["macro_f1"] < r["rules_seen_layout"]["macro_f1"]'), ("the tagger generalises at least as well as rules", 'r["tagger_unseen_layout"]["macro_f1"] >= r["rules_unseen_layout"]["macro_f1"]'), ("labelling a few new-layout documents does not hurt", 'r["adaptation_recovers"] >= 0')],
    "generative": [("the better generator is not detected as worse", 'r["v2_minus_v1"] > 0'), ("the judges are not interchangeable", 'r["judge_agreement_kappa_v1"] < 1.0'), ("a small golden set gives a wider interval", 'r["ci_width_at_60_items"] > r["ci_width_at_full_set"]')],
}

for d in sorted(p for p in E.iterdir() if p.is_dir()):
    eid = d.name
    if eid in NEW:
        label, summary, types, traps = NEW[eid]
        meta = {"id": eid, "label": label, "summary": summary, "problemTypes": types, "traps": traps, "origin": "brainsiphon"}
    else:
        kit = json.loads((d / "kit.json").read_text())
        c = contracts.get(eid, {})
        meta = {
            "id": eid, "label": kit["label"], "summary": kit["summary"],
            "problemTypes": c.get("problemTypes", []) + list((c.get("adaptable") or {}).keys()),
            "traps": [x["trap"] for x in kit.get("lessons", [])], "origin": "pattern-kit",
        }
    meta["slots"] = [{"feature": f, "meaning": m} for f, m in NEW_SLOTS[eid]] if eid in NEW_SLOTS else json.loads((d / "kit.json").read_text()).get("slots", [])
    (d / "engine.json").write_text(json.dumps(meta, indent=1, ensure_ascii=False) + "\n")
    body = ['"""Executable gates a pack runs on its own results. Each is (name, check); a failing gate fails the pack\'s tests."""', "", "GATES = ["]
    for name, expr in GATES[eid]:
        body.append(f'    ({name!r}, lambda r: {expr}),')
    body.append("]")
    (d / "gates.py").write_text("\n".join(body) + "\n")
print("wrote", len(list(E.glob("*/engine.json"))), "engine.json and", len(list(E.glob("*/gates.py"))), "gates.py")
