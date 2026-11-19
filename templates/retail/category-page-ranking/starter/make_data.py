"""Synthetic browsing sessions with order structure, bots and a mid-month sale.

  * item-to-item flow is ASYMMETRIC (a phone leads to a case, a case rarely leads back to the phone), so order carries signal
  * 10% of sessions are crawler bots that walk the catalogue in id order, under a second per item: a spurious
    "item i leads to item i+1" signal that is as strong as the real one if you do not filter them
  * every session has a THEME category (a shopper looking for a lamp keeps coming back to lamps)
  * on day 22 a sale makes 30 items far more popular, so a random split of sessions leaks that popularity into training
  * logged-in history is absent: only the clicks of the current session are available
Rows: session, day, step, item, category, dwell_s, is_bot
"""

from __future__ import annotations

import numpy as np
import pandas as pd


def generate(n_sessions: int = 60_000, n_items: int = 1500, days: int = 30, seed: int = 9, bot_share: float = 0.10) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    n_cat = 30
    cat = rng.integers(0, n_cat, n_items)
    pop = 1 / np.arange(1, n_items + 1) ** 0.85
    rng.shuffle(pop)
    succ = np.stack([rng.choice(n_items, 6, replace=False) for _ in range(n_items)])
    succ_p = rng.dirichlet(np.full(6, 0.8), n_items)
    by_cat = [np.flatnonzero(cat == c)[np.argsort(-pop[cat == c])][:8] for c in range(n_cat)]   # a theme's staple items
    sale_items = rng.choice(n_items, 30, replace=False)

    rows = []
    day_of = np.sort(rng.integers(0, days, n_sessions))
    for s in range(n_sessions):
        d = int(day_of[s])
        p = pop.copy()
        if d >= 22:
            p[sale_items] *= 40
        p /= p.sum()
        bot = rng.random() < bot_share
        n = int(rng.integers(5, 16)) if bot else 2 + int(rng.geometric(0.28))
        n = min(n, 20)
        cur = int(rng.choice(n_items, p=p))
        theme = int(cat[cur])
        for k in range(n):
            if bot:
                cur = cur + 1 if k else int(rng.integers(0, n_items - 25))
                item, dwell = cur, float(rng.uniform(0.1, 0.9))
            else:
                if k == 0:
                    item = cur
                else:
                    u = rng.random()
                    if u < 0.50:
                        item = int(succ[cur, rng.choice(6, p=succ_p[cur])])
                    elif u < 0.75:
                        item = int(rng.choice(by_cat[theme]))
                    else:
                        item = int(rng.choice(n_items, p=p))
                dwell = float(rng.lognormal(2.6, 0.8))
            cur = item
            rows.append((s, d, k, item, int(cat[item]), dwell, int(bot)))
    return pd.DataFrame(rows, columns=["session", "day", "step", "item", "category", "dwell_s", "is_bot"])


if __name__ == "__main__":
    df = generate()
    df.to_csv("sessions.csv", index=False)
    print(f"{df.session.nunique():,} sessions, {len(df):,} clicks, {df.item.nunique():,} items, "
          f"bot sessions {df.groupby('session').is_bot.first().mean():.1%}")
