"""Reference kit: image classification / defect detection (inspection, radiology triage, document tamper, damage assessment).

Synthetic 20x20 grayscale images from two sites. A positive image contains a small bright blob (the finding) at a random place.
Traps:
  * shortcut: at site A positives are also slightly brighter overall (a lighting or scanner quirk), so a model can score well
    without ever looking for the blob; at site B that correlation does not exist
  * site shift: background level and noise differ between sites
  * rare positives: 12% prevalence
Columns of the returned frame are the pixels; `site`, `label` and `group` (the physical item or patient) are metadata.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

SIZE = 20


def generate(n: int = 5000, seed: int = 71, prevalence: float = 0.12) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    site = rng.integers(0, 2, n)                                   # 0 = site A, 1 = site B
    label = (rng.random(n) < prevalence).astype(int)
    yy, xx = np.mgrid[0:SIZE, 0:SIZE]
    imgs = np.empty((n, SIZE * SIZE))
    for i in range(n):
        bg = 0.45 if site[i] == 0 else 0.60
        noise = 0.06 if site[i] == 0 else 0.10
        grad = rng.uniform(-0.1, 0.1) * (xx - SIZE / 2) / SIZE + rng.uniform(-0.1, 0.1) * (yy - SIZE / 2) / SIZE
        img = bg + grad + rng.normal(0, noise, (SIZE, SIZE))
        if site[i] == 0 and label[i]:
            img += 0.07                                            # the shortcut: brighter overall for positives at site A
        if label[i]:
            cx, cy = rng.uniform(4, SIZE - 4, 2)
            img += rng.uniform(0.25, 0.45) * np.exp(-((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * 1.4 ** 2))
        imgs[i] = img.ravel()
    df = pd.DataFrame(imgs, columns=[f"p{k}" for k in range(SIZE * SIZE)])
    df["site"], df["label"], df["group"] = site, label, np.arange(n) // 2   # two images per physical item
    return df


if __name__ == "__main__":
    d = generate()
    print(f"{len(d):,} images, prevalence {d.label.mean():.1%}, site A {int((d.site == 0).sum()):,} / site B {int((d.site == 1).sum()):,}")
