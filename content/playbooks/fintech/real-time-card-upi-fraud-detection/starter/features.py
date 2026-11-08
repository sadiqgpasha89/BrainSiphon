"""Point-in-time features. Every feature for a row uses ONLY rows strictly earlier than that row
(and labels that had already matured by then). `test_starter.py` proves it by truncating the future."""

from __future__ import annotations

from collections import Counter, defaultdict, deque

import numpy as np
import pandas as pd

DAY = 86_400.0


def window_stats(group: np.ndarray, ts: np.ndarray, amount: np.ndarray, window_s: float):
    """Count and sum of earlier events of the same group inside (t - window, t). Windows close strictly
    before the decision time, so ties and the event itself are excluded."""
    order = np.lexsort((ts, group))
    g, t, a = group[order].astype(np.int64), ts[order], amount[order]
    t0 = t.min()
    span = (t.max() - t0) + 2 * window_s + 1
    key = g * span + (t - t0 + window_s)
    hi = np.searchsorted(key, key, side="left")
    lo = np.searchsorted(key, key - window_s, side="left")
    cs = np.concatenate([[0.0], np.cumsum(a)])
    cnt, tot = np.empty(len(ts)), np.empty(len(ts))
    cnt[order], tot[order] = hi - lo, cs[hi] - cs[lo]
    return cnt, tot


class DeviceFanOut:
    """Distinct cards seen on a device in the last 24h. The SAME class runs in training (batch replay)
    and in serving (one event at a time), which is how you avoid train/serve skew."""

    def __init__(self, window_s: float = DAY):
        self.window_s = window_s
        self._q: dict[int, deque] = defaultdict(deque)
        self._c: dict[int, Counter] = defaultdict(Counter)
        self._seen: set[tuple[int, int]] = set()

    def query_then_update(self, device: int, card: int, ts: float) -> tuple[int, int]:
        q, c = self._q[device], self._c[device]
        while q and q[0][0] <= ts - self.window_s:
            _, old = q.popleft()
            c[old] -= 1
            if c[old] == 0:
                del c[old]
        fan_out = len(c)
        new_pair = int((card, device) not in self._seen)
        q.append((ts, card))
        c[card] += 1
        self._seen.add((card, device))
        return fan_out, new_pair


def _cumulative_at(events: pd.DataFrame, merchants: pd.Series, when: pd.Series) -> pd.DataFrame:
    q = pd.DataFrame({"merchant": merchants.to_numpy(), "t": when.to_numpy()})
    q["row"] = np.arange(len(q))
    q = q.sort_values("t", kind="mergesort")
    m = pd.merge_asof(q, events, on="t", by="merchant", direction="backward")
    return m.sort_values("row")[["cum_n", "cum_f"]].fillna(0.0).reset_index(drop=True)


def merchant_matured_rate(tx: pd.DataFrame, window_days: int | None, prior_n: float = 50.0, prior_p: float = 0.005):
    """Fraud rate of a merchant using only labels that had *arrived* by decision time (label_ts <= ts)."""
    ev = tx[["merchant", "label_ts", "is_fraud"]].rename(columns={"label_ts": "t"}).sort_values("t", kind="mergesort")
    ev["cum_n"] = ev.groupby("merchant").cumcount() + 1.0
    ev["cum_f"] = ev.groupby("merchant")["is_fraud"].cumsum().astype(float)
    ev = ev[["merchant", "t", "cum_n", "cum_f"]]
    now = _cumulative_at(ev, tx["merchant"], tx["ts"])
    n, f = now["cum_n"], now["cum_f"]
    if window_days is not None:
        past = _cumulative_at(ev, tx["merchant"], tx["ts"] - window_days * DAY)
        n, f = n - past["cum_n"], f - past["cum_f"]
    return ((f + prior_n * prior_p) / (n + prior_n)).to_numpy()


FEATURES = ["amount", "card_cnt_1m", "card_cnt_1h", "card_cnt_24h", "card_sum_1h", "card_sum_24h",
            "device_fan_out_24h", "new_device_for_card", "merchant_rate_7d", "merchant_rate_90d",
            "merchant_drift", "merchant_cnt_1h", "hour"]


def build_features(tx: pd.DataFrame) -> pd.DataFrame:
    tx = tx.sort_values(["ts", "txn_id"], kind="mergesort").reset_index(drop=True)
    card, ts, amt = tx["card"].to_numpy(), tx["ts"].to_numpy(), tx["amount"].to_numpy()
    out = pd.DataFrame({"txn_id": tx["txn_id"], "amount": amt})
    for name, w in (("1m", 60.0), ("1h", 3600.0), ("24h", DAY)):
        cnt, tot = window_stats(card, ts, amt, w)
        out[f"card_cnt_{name}"] = cnt
        if name != "1m":
            out[f"card_sum_{name}"] = tot
    out["merchant_cnt_1h"], _ = window_stats(tx["merchant"].to_numpy(), ts, amt, 3600.0)

    fan, new = DeviceFanOut(), []
    fo = np.empty(len(tx))
    for i, (d, c, t) in enumerate(zip(tx["device"].to_numpy(), card, ts)):
        fo[i], n = fan.query_then_update(int(d), int(c), float(t))
        new.append(n)
    out["device_fan_out_24h"], out["new_device_for_card"] = fo, new

    out["merchant_rate_7d"] = merchant_matured_rate(tx, 7)
    out["merchant_rate_90d"] = merchant_matured_rate(tx, 90)
    out["merchant_drift"] = out["merchant_rate_7d"] / out["merchant_rate_90d"]
    out["hour"] = (ts // 3600) % 24
    out["is_fraud"], out["ts"], out["label_ts"] = tx["is_fraud"].to_numpy(), ts, tx["label_ts"].to_numpy()
    return out
