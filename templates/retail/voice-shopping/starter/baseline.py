"""Audio engine: raw spectrum against a log filterbank with per-clip normalisation, under channel shift; plus word error rate.

    python baseline.py     -> prints the report (also returned by run())
"""

from __future__ import annotations

import json

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score
from sklearn.preprocessing import StandardScaler

from make_data import SR, generate

FRAME, HOP, BANDS = 256, 128, 20


def frames(x: np.ndarray) -> np.ndarray:
    n = 1 + (len(x) - FRAME) // HOP
    idx = np.arange(FRAME)[None, :] + HOP * np.arange(n)[:, None]
    return x[idx] * np.hanning(FRAME)


def raw_spectrum(x: np.ndarray) -> np.ndarray:
    """Mean magnitude spectrum: sensitive to recording gain."""
    return np.abs(np.fft.rfft(frames(x), axis=1)).mean(axis=0)


def filterbank() -> np.ndarray:
    """Triangular filters spaced on the mel scale between 100 Hz and Nyquist."""
    mel = lambda f: 2595 * np.log10(1 + f / 700)
    inv = lambda m: 700 * (10 ** (m / 2595) - 1)
    pts = inv(np.linspace(mel(100), mel(SR / 2), BANDS + 2))
    bins = np.floor((FRAME + 1) * pts / SR).astype(int)
    fb = np.zeros((BANDS, FRAME // 2 + 1))
    for i in range(BANDS):
        a, b, c = bins[i], bins[i + 1], bins[i + 2]
        fb[i, a:b] = (np.arange(a, b) - a) / max(b - a, 1)
        fb[i, b:c] = (c - np.arange(b, c)) / max(c - b, 1)
    return fb


FB = filterbank()


def log_filterbank(x: np.ndarray) -> np.ndarray:
    """Mean log energy per band, with the clip's own average removed so a louder recording looks the same."""
    power = np.abs(np.fft.rfft(frames(x), axis=1)) ** 2
    feats = np.log(power @ FB.T + 1e-8).mean(axis=0)
    return feats - feats.mean()


def edit_distance(a: list[str], b: list[str]) -> int:
    d = list(range(len(b) + 1))
    for i, x in enumerate(a, 1):
        prev, d[0] = d[0], i
        for j, y in enumerate(b, 1):
            prev, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, prev + (x != y))
    return d[-1]


def wer(reference: str, hypothesis: str) -> float:
    """Word error rate: (substitutions + deletions + insertions) / words in the reference."""
    r, h = reference.split(), hypothesis.split()
    return edit_distance(r, h) / max(len(r), 1)


def simulated_wer(seed: int, sub_rate: float, del_rate: float, n: int = 300) -> float:
    """WER of a transcript corrupted at known rates, to show the metric tracks the corruption (simulated, not a speech model)."""
    rng = np.random.default_rng(seed)
    vocab = "account balance transfer payment refund card limit statement branch loan rate".split()
    errs = words = 0
    for _ in range(n):
        ref = [vocab[i] for i in rng.integers(0, len(vocab), 8)]
        hyp = []
        for w in ref:
            u = rng.random()
            if u < del_rate:
                continue
            hyp.append(vocab[int(rng.integers(0, len(vocab)))] if u < del_rate + sub_rate else w)
        errs += edit_distance(ref, hyp)
        words += len(ref)
    return errs / words


def fit_eval(Ftr, ytr, tests: dict) -> dict:
    sc = StandardScaler().fit(Ftr)
    clf = LogisticRegression(max_iter=1000).fit(sc.transform(Ftr), ytr)
    return {name: {"accuracy": float((p := clf.predict(sc.transform(F))) .__eq__(y).mean()), "macro_f1": float(f1_score(y, p, average="macro"))} for name, (F, y) in tests.items()}


def run(seed: int = 81, **gen) -> dict:
    Xtr, Xaug, ytr, Xsame, Xshift, yte = generate(seed=seed, **gen)
    out = {"train_clips": len(Xtr), "test_clips": len(yte), "sample_rate_hz": SR}
    for name, fn, augment in (
        ("raw_spectrum_baseline", raw_spectrum, False),
        ("log_filterbank_challenger", log_filterbank, False),
        ("log_filterbank_with_channel_augmentation", log_filterbank, True),
    ):
        F = lambda X: np.stack([fn(x) for x in X])
        Ftr, y_fit = (np.vstack([F(Xtr), F(Xaug)]), np.concatenate([ytr, ytr])) if augment else (F(Xtr), ytr)
        out[name] = fit_eval(Ftr, y_fit, {"same_channel": (F(Xsame), yte), "shifted_channel": (F(Xshift), yte)})
    out["channel_shift_drop_challenger"] = out["log_filterbank_challenger"]["same_channel"]["accuracy"] - out["log_filterbank_challenger"]["shifted_channel"]["accuracy"]
    out["augmentation_gain_on_shifted_channel"] = out["log_filterbank_with_channel_augmentation"]["shifted_channel"]["accuracy"] - out["log_filterbank_challenger"]["shifted_channel"]["accuracy"]
    out["wer_simulated"] = {"clean": simulated_wer(seed, 0.03, 0.01), "noisy": simulated_wer(seed, 0.15, 0.06)}
    return out


if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
