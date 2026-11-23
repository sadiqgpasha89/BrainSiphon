"""Executable gates a pack runs on its own results. Each is (name, check); a failing gate fails the pack's tests."""

GATES = [
    ('the model beats the majority class', lambda r: r["baseline_lr"]["accuracy"] > r["majority_class_accuracy"] + 0.05),
    ('a random split does not understate the score', lambda r: r["leaky_split_inflation"] > -0.01),
    ('the class prior drifts', lambda r: r["test_class_shares"][4] > r["train_class_shares"][4]),
]
