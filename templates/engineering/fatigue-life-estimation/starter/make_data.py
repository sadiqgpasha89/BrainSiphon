"""Engine: evaluating generated or specialised outputs (summaries, drafts, reports, plans, designs, creative or code-like output).

There is no single label for these use cases, so the engine builds the part that is always needed: a golden set of items with checkable
facts and constraints, deterministic stand-ins for two versions of a generator, and two judges that must be shown to agree before
either is trusted. The generator is a stand-in with controlled failure rates; replace `generate_output` with a call to your model.
"""

from __future__ import annotations

import numpy as np

ENTITIES = ["Meridian Bank", "Orchid Retail", "Kestrel Health", "Atlas Freight", "Lumen Ads", "Sable Security", "Quill Learning", "Harbor Homes", "Nimbus Cloud", "Verity Insurance"]
FORBIDDEN = ["guarantee", "always", "never fails"]


def golden_set(n: int = 240, seed: int = 91) -> list[dict]:
    rng = np.random.default_rng(seed)
    out = []
    for i in range(n):
        out.append({
            "id": i,
            "entity": ENTITIES[int(rng.integers(0, len(ENTITIES)))],
            "amount": int(rng.integers(1_000, 90_000)),
            "date": f"2025-{int(rng.integers(1, 13)):02d}-{int(rng.integers(1, 29)):02d}",
            "max_words": 40,
        })
    return out


if __name__ == "__main__":
    g = golden_set(5)
    print(g[0])
