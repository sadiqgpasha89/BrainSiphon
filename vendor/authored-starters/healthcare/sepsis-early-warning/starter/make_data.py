"""Synthetic ICU stream: hourly vitals, irregular labs with result delays, and adjudicated sepsis onset.

Traps that are built in on purpose:
  * labs are DRAWN at one time and RESULT 1-2 hours later; a feature may only use a lab after its result time
  * clinicians measure more when they are worried, so measurement counts rise before onset (missingness signal)
  * `abx_ordered` is placed by clinicians who already suspect sepsis, so it leaks the label; it is kept in the
    table so that you can prove your feature list excludes it
  * ~9% of patients develop sepsis; their vitals drift for 6-10 hours before onset, but many drift slowly
"""

from __future__ import annotations

import numpy as np
import pandas as pd


def generate(n_patients: int = 2400, seed: int = 11, sepsis_rate: float = 0.09) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    frames = []
    for pid in range(n_patients):
        los = int(rng.integers(30, 160))  # length of stay in hours
        h = np.arange(los)
        septic = rng.random() < sepsis_rate
        onset = int(rng.integers(14, los)) if septic else -1
        drift_len = int(rng.integers(5, 11))
        # severity ramps from 0 to 1 over the drift window before onset; slow drifters ramp more gently
        ramp = np.clip((h - (onset - drift_len)) / drift_len, 0, 1) if septic else np.zeros(los)
        amp = rng.uniform(0.5, 1.0) if septic else 0.0
        sev = ramp * amp
        base = dict(hr=rng.normal(82, 9), sbp=rng.normal(124, 12), rr=rng.normal(16, 2), temp=rng.normal(36.9, 0.25),
                    spo2=rng.normal(97, 1))
        # benign confounders: some non-septic patients are tachycardic or febrile for hours (post-op, anxiety, pain)
        bump = np.zeros(los)
        if not septic and rng.random() < 0.18:
            s = int(rng.integers(0, max(1, los - 8)))
            bump[s:s + int(rng.integers(4, 12))] = rng.uniform(0.3, 0.8)
        eff = np.maximum(sev, bump * 0.9)
        noise = lambda sd: rng.normal(0, sd, los)  # noqa: E731
        df = pd.DataFrame({
            "pid": pid, "hour": h,
            "hr": base["hr"] + 28 * eff + noise(5), "sbp": base["sbp"] - 26 * sev - 4 * bump + noise(7),
            "rr": base["rr"] + 8 * eff + noise(1.4), "temp": base["temp"] + 1.1 * eff + noise(0.18),
            "spo2": base["spo2"] - 3.5 * sev + noise(1.0),
        })
        # clinicians chart vitals every 1-4h normally and hourly when worried (worry starts ~3h before onset)
        worry = (h >= onset - 3) & (h < onset) if septic else (bump > 0.5)
        chart_p = np.where(worry, 0.95, rng.uniform(0.35, 0.55))
        for c in ("hr", "sbp", "rr", "temp", "spo2"):
            df[c] = df[c].where(rng.random(los) < chart_p)
        # lactate: drawn irregularly (more often when worried), result 1-2h later
        draw = rng.random(los) < np.where(worry, 0.5, 0.06)
        lact_true = 1.1 + 2.6 * sev + np.abs(noise(0.25))
        df["lactate_value"] = np.where(draw, lact_true, np.nan)
        df["lactate_result_hour"] = np.where(draw, h + rng.integers(1, 3, size=los), np.nan)
        df["abx_ordered"] = ((h >= onset - 1) & septic).astype(int) if septic else (rng.random(los) < 0.01).astype(int)
        df["onset_hour"] = onset
        df["sepsis"] = int(septic)
        frames.append(df)
    out = pd.concat(frames, ignore_index=True)
    # the label for the learning problem: "onset within the next 6 hours"; rows at or after onset are censored
    out["y_next6h"] = ((out.onset_hour >= 0) & (out.onset_hour - out.hour > 0) & (out.onset_hour - out.hour <= 6)).astype(int)
    out["censored"] = ((out.onset_hour >= 0) & (out.hour >= out.onset_hour)).astype(int)
    return out


if __name__ == "__main__":
    df = generate()
    df.to_csv("icu_hourly.csv", index=False)
    print(f"{df.pid.nunique():,} patients, {len(df):,} patient-hours, sepsis in "
          f"{df.groupby('pid').sepsis.first().mean():.1%} of stays, positive hours {df[df.censored == 0].y_next6h.mean():.2%}")
