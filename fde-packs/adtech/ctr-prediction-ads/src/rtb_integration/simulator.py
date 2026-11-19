"""A bid-request generator and replay tool: realistic OpenRTB traffic without an exchange connection."""
from __future__ import annotations

import json
import random
from typing import Any, Dict, Iterator, List, Optional

from .consent import build_tcf_v2

SIZES = [(300, 250), (320, 50), (728, 90), (300, 600), (160, 600)]
DOMAINS = ["news.example", "sports.example", "recipes.example", "tech.example", "weather.example"]


def generate(n: int, seed: int = 25, *, gdpr_share: float = 0.2, our_vendor_id: int = 755, tmax: int = 100) -> Iterator[Dict[str, Any]]:
    r = random.Random(seed)
    good = build_tcf_v2({1, 2, 3, 4, 7}, {our_vendor_id, 10, 20})
    no_purpose = build_tcf_v2({1}, {our_vendor_id})
    for i in range(n):
        w, h = r.choice(SIZES)
        req: Dict[str, Any] = {"id": f"req-{seed}-{i}", "tmax": tmax, "at": 2, "cur": ["USD"],
                               "imp": [{"id": "1", "banner": {"w": w, "h": h}, "bidfloor": round(r.uniform(0.05, 1.2), 2), "bidfloorcur": "USD"}],
                               "site": {"domain": r.choice(DOMAINS), "page": f"https://{r.choice(DOMAINS)}/a/{i}", "publisher": {"id": f"pub{r.randint(1, 20)}"}},
                               "device": {"ua": r.choice(["Mozilla/5.0 (iPhone)", "Mozilla/5.0 (Linux; Android 14)", "Mozilla/5.0 (Windows NT 10.0)"]), "ip": f"203.0.{r.randint(1, 200)}.{r.randint(1, 250)}", "devicetype": r.choice([1, 2, 4]), "os": r.choice(["iOS", "Android", "Windows"]), "geo": {"country": r.choice(["USA", "DEU", "FRA", "IND"])}},
                               "user": {"id": f"u{r.randint(1, 5000)}"}}
        if r.random() < gdpr_share:
            req["regs"] = {"ext": {"gdpr": 1}}
            req["user"]["ext"] = {"consent": r.choice([good, good, no_purpose, ""])}
        yield req
