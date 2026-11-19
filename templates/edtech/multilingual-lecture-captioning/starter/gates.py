"""Executable gates a pack runs on its own results. Each is (name, check); a failing gate fails the pack's tests."""

GATES = [
    ('the model learns on the training channel', lambda r: r["log_filterbank_with_channel_augmentation"]["same_channel"]["accuracy"] > 0.85),
    ('training on channel effects helps on the shifted channel', lambda r: r["augmentation_gain_on_shifted_channel"] >= 0),
    ('word error rate rises with corruption', lambda r: r["wer_simulated"]["noisy"] > r["wer_simulated"]["clean"]),
]
