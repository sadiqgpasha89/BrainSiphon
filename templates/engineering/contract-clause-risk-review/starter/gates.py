"""Executable gates a pack runs on its own results. Each is (name, check); a failing gate fails the pack's tests."""

GATES = [
    ('rules fail on a layout they were not written for', lambda r: r["rules_unseen_layout"]["macro_f1"] < r["rules_seen_layout"]["macro_f1"]),
    ('the tagger generalises at least as well as rules', lambda r: r["tagger_unseen_layout"]["macro_f1"] >= r["rules_unseen_layout"]["macro_f1"]),
    ('labelling a few new-layout documents does not hurt', lambda r: r["adaptation_recovers"] >= 0),
]
