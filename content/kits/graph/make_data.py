"""Reference kit: entity resolution and ring detection on a link graph (same person, same household, linked accounts,
fraud rings, matched products). Entities share attributes (phone, device, address, name, network address) and the task is to
decide which entities are the same real-world group.

Traps built in on purpose:
  * hubs: a few shared values (a public Wi-Fi address, a call-centre phone) link hundreds of unrelated entities; connecting
    everything that shares ANY value merges them into one giant false component (transitive closure)
  * missing and typo'd attributes, so some true links have no exact shared value
  * clusters of size 1 are the majority (most entities have no duplicate)
Entities have a hidden `cluster` id (ground truth) and the observed attributes.
"""

from __future__ import annotations

import numpy as np
import pandas as pd


def generate(n_clusters: int = 1800, seed: int = 53, hub_share: float = 0.12, n_hubs: int = 12) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    sizes = rng.choice([1, 2, 3, 4, 6, 9], size=n_clusters, p=[0.62, 0.2, 0.08, 0.05, 0.03, 0.02])
    rows = []
    phone_id = device_id = addr_id = 0
    first = [f"{a}{b}" for a in "abcdefghijklmnopqrstuvwxyz" for b in "aeiou"]
    for c, k in enumerate(sizes):
        cphone, cdev, caddr = phone_id, device_id, addr_id
        phone_id += 1; device_id += 1; addr_id += 1
        base = f"{rng.choice(first)}{rng.choice(first)}{rng.integers(100, 999)}"
        for _ in range(k):
            name = list(base)
            if rng.random() < 0.3:                                       # a typo
                name[rng.integers(0, len(name))] = rng.choice(list("abcdefghij"))
            rows.append({
                "cluster": c,
                "name": "".join(name),
                "phone": cphone if rng.random() < 0.8 else (phone_id := phone_id + 1) - 1,
                "device": cdev if rng.random() < 0.6 else (device_id := device_id + 1) - 1,
                "address": caddr if rng.random() < 0.5 else (addr_id := addr_id + 1) - 1,
                "net": int(rng.integers(0, n_hubs)) if rng.random() < hub_share else 10_000 + len(rows),
            })
    df = pd.DataFrame(rows)
    for col in ("phone", "device", "address"):                            # some values simply missing
        df.loc[rng.random(len(df)) < 0.08, col] = -1
    return df.sample(frac=1.0, random_state=seed).reset_index(drop=True)


if __name__ == "__main__":
    d = generate()
    print(f"{len(d):,} entities in {d.cluster.nunique():,} true clusters; "
          f"largest hub links {d[d.net < 12].groupby('net').size().max()} entities")
