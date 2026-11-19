"""Learner state and point-in-time features. `LearnerState` is the SAME object in training replay and in the
online service: one answer in, one updated state out, features read BEFORE the answer is applied."""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

FEATURES = ["n_prev", "correct_prev", "wrong_prev", "ewma", "last_correct", "hours_since_skill", "hours_since_any",
            "item_logit", "recent10", "skill"]
EWMA_ALPHA = 0.3


@dataclass
class LearnerState:
    n: dict = field(default_factory=dict)
    right: dict = field(default_factory=dict)
    ewma: dict = field(default_factory=dict)
    last_ts: dict = field(default_factory=dict)
    last_ok: dict = field(default_factory=dict)
    any_ts: float = -1.0
    recent: list = field(default_factory=list)

    def read(self, skill: int, ts: float, item_logit: float) -> list[float]:
        n, r = self.n.get(skill, 0), self.right.get(skill, 0)
        return [n, r, n - r, self.ewma.get(skill, 0.5), self.last_ok.get(skill, 0.5),
                ts - self.last_ts[skill] if skill in self.last_ts else -1.0,
                ts - self.any_ts if self.any_ts >= 0 else -1.0, item_logit,
                float(np.mean(self.recent[-10:])) if self.recent else 0.5, skill]

    def update(self, skill: int, ts: float, correct: int) -> None:
        self.n[skill] = self.n.get(skill, 0) + 1
        self.right[skill] = self.right.get(skill, 0) + correct
        self.ewma[skill] = (1 - EWMA_ALPHA) * self.ewma.get(skill, 0.5) + EWMA_ALPHA * correct
        self.last_ts[skill], self.last_ok[skill], self.any_ts = ts, correct, ts
        self.recent.append(correct)


def item_logits(train: pd.DataFrame, prior: float = 8.0) -> dict[int, float]:
    """Smoothed per-question correct rate on TRAINING students only: 'calibrate on other students'."""
    g = train.groupby("question").correct.agg(["sum", "count"])
    base = train.correct.mean()
    rate = (g["sum"] + prior * base) / (g["count"] + prior)
    return {int(q): float(np.log(r / (1 - r))) for q, r in rate.items()}


def replay(df: pd.DataFrame, logits: dict[int, float]) -> pd.DataFrame:
    df = df.sort_values(["student", "ts_h"], kind="mergesort").reset_index(drop=True)
    prior = float(np.mean(list(logits.values()))) if logits else 0.0
    out = np.empty((len(df), len(FEATURES)))
    state, cur = LearnerState(), None
    for i, (stu, ts, sk, q, y) in enumerate(zip(df.student.to_numpy(), df.ts_h.to_numpy(), df.skill.to_numpy(),
                                                 df.question.to_numpy(), df.correct.to_numpy())):
        if stu != cur:
            state, cur = LearnerState(), stu
        out[i] = state.read(int(sk), float(ts), logits.get(int(q), prior))
        state.update(int(sk), float(ts), int(y))
    f = pd.DataFrame(out, columns=FEATURES)
    return pd.concat([df[["student", "ts_h", "question", "correct", "true_p"]], f], axis=1)
