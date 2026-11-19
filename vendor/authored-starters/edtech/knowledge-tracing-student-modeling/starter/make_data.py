"""Synthetic learner interactions with learning, forgetting and adaptive practice selection.

Each student has an ability per skill that rises with practice and decays back toward its starting value during
breaks. Questions have an IRT-style difficulty and a skill. The system (like a real tutor) tends to give students
more of the skills they are currently weak at, so the practice a student gets depends on the model's own view of them.
Rows: student, ts_h (hours since the student's first event), skill, question, correct, true_p
"""

from __future__ import annotations

import numpy as np
import pandas as pd


def sigmoid(x):
    return 1 / (1 + np.exp(-x))


def generate(n_students: int = 2500, n_skills: int = 15, n_questions: int = 240, mean_len: int = 140, seed: int = 21) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    q_skill = rng.integers(0, n_skills, n_questions)
    q_diff = rng.normal(0.2, 1.0, n_questions)
    by_skill = [np.flatnonzero(q_skill == s) for s in range(n_skills)]
    rows = []
    for sid in range(n_students):
        trait = rng.normal(0, 0.9)                      # a general-ability trait shared across skills
        theta0 = rng.normal(-0.4, 0.6, n_skills) + trait
        ability = theta0.copy()
        speed = rng.lognormal(-1.7, 0.4)
        last_t = np.zeros(n_skills)
        recent = np.full(n_skills, 0.5)
        t = 0.0
        for _ in range(max(10, rng.poisson(mean_len))):
            gap = rng.exponential(9.0) + (rng.uniform(100, 400) if rng.random() < 0.04 else 0.0)
            t += gap
            s = int(np.argmin(recent + rng.normal(0, 0.25, n_skills))) if rng.random() < 0.6 else int(rng.integers(0, n_skills))
            ability[s] = theta0[s] + (ability[s] - theta0[s]) * np.exp(-(t - last_t[s]) / 300.0) if last_t[s] > 0 else ability[s]
            pool = by_skill[s]
            q = int(pool[np.argmin(np.abs(q_diff[pool] - ability[s] + rng.normal(0, 1.4, len(pool))))])
            p = 0.2 + 0.75 * sigmoid(1.3 * (ability[s] - q_diff[q]))
            y = int(rng.random() < p)
            ability[s] += speed * (1.0 if y else 0.35)
            recent[s] = 0.7 * recent[s] + 0.3 * y
            last_t[s] = t
            rows.append((sid, t, s, q, y, p))
    return pd.DataFrame(rows, columns=["student", "ts_h", "skill", "question", "correct", "true_p"])


if __name__ == "__main__":
    df = generate()
    df.to_csv("interactions.csv", index=False)
    print(f"{df.student.nunique():,} students, {len(df):,} answers, {df.skill.nunique()} skills, "
          f"mean correct {df.correct.mean():.1%}")
