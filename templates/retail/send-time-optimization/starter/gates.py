"""Executable gates a pack runs on its own results. Each is (name, check); a failing gate fails the pack's tests."""

GATES = [
    ('the learned policy is worth more than the best constant action', lambda r: r["learned_greedy"]["true_value"] > r["always_best_average_action"]["true_value"]),
    ('doubly robust is close to the true value', lambda r: abs(r["learned_greedy"]["doubly_robust"] - r["learned_greedy"]["true_value"]) < 0.08),
]
