"""Engine: speech and audio classification (wake word, call-intent, audio event, speaker or machine-sound classification).

Synthetic 8 kHz clips of 0.5 s. Each class is a pair of tones with an amplitude envelope, buried in noise.
Traps planted:
  * the test channel differs from training: lower signal-to-noise ratio and a band-limited (low-pass) microphone
  * a level (gain) difference between recordings, which a raw-magnitude feature mistakes for signal
The word error rate (`wer`) is the metric for transcription use cases; it is implemented and tested in baseline.py.
"""

from __future__ import annotations

import numpy as np

SR = 8000
N = 4000
CLASSES = [(300, 640), (420, 900), (560, 1250), (700, 1600), (860, 2100)]


def clip(label: int, rng: np.random.Generator, snr_db: float, lowpass: bool = False) -> np.ndarray:
    t = np.arange(N) / SR
    f1, f2 = CLASSES[label]
    f1, f2 = f1 * rng.uniform(0.97, 1.03), f2 * rng.uniform(0.97, 1.03)
    env = np.hanning(N) ** rng.uniform(0.5, 1.5)
    sig = env * (np.sin(2 * np.pi * f1 * t + rng.uniform(0, 6.28)) + 0.7 * np.sin(2 * np.pi * f2 * t + rng.uniform(0, 6.28)))
    noise = rng.normal(0, 1, N)
    power = np.mean(sig**2) / 10 ** (snr_db / 10)
    x = sig + noise * np.sqrt(power)
    if lowpass:  # a cheap microphone: 9-tap moving average removes the higher tone
        x = np.convolve(x, np.ones(9) / 9, mode="same")
    return x * rng.lognormal(0, 0.5)  # recording gain


def generate(n_train: int = 1500, n_test: int = 600, seed: int = 81, train_snr: float = 12.0, test_snr: float = 3.0):
    """Returns clean training clips, the same labels re-recorded with random channel effects (augmentation), and two test sets."""
    rng = np.random.default_rng(seed)
    ytr = rng.integers(0, len(CLASSES), n_train)
    yte = rng.integers(0, len(CLASSES), n_test)
    Xtr = np.stack([clip(int(c), rng, train_snr) for c in ytr])
    Xaug = np.stack([clip(int(c), rng, float(rng.uniform(0, 12)), lowpass=bool(rng.random() < 0.6)) for c in ytr])
    Xte_same = np.stack([clip(int(c), rng, train_snr) for c in yte])
    Xte_shift = np.stack([clip(int(c), rng, test_snr, lowpass=True) for c in yte])
    return Xtr, Xaug, ytr, Xte_same, Xte_shift, yte


if __name__ == "__main__":
    Xtr, _, ytr, a, b, yte = generate(200, 50)
    print(f"{len(Xtr)} train clips of {N / SR:.1f} s at {SR} Hz, {len(CLASSES)} classes")
