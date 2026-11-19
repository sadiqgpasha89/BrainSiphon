"""Synthetic developer docs and a golden question set, with the traps of a docs assistant.

Corpus (about 130 chunks): per product, a v1 and a v2 reference page (limits, reliability, data), tutorials that
mention the same words in other senses, and a changelog chunk that quotes BOTH the old and the new value.
Golden questions: latest-version facts, explicit v1 facts, and UNANSWERABLE questions about things the docs never state.
The product names are held apart: tune on `dev_products`, report on the rest, so the test set is not the tuning set.
"""

from __future__ import annotations

import random
from dataclasses import dataclass

PRODUCTS = ["payments", "webhooks", "auth", "files", "search", "billing", "users", "events", "exports", "quotas", "notify", "audit"]
FACTS = {
    "rate_limit": {"unit": "requests per minute", "doc": "The {p} API allows {v} requests per minute per API key.",
                   "q": ["What is the rate limit for the {p} API{ver}?", "How many calls per minute does the {p} API accept{ver}?", "What throttle applies to the {p} API{ver}?"]},
    "max_payload": {"unit": "MB", "doc": "Request bodies sent to the {p} API may be at most {v} MB.",
                    "q": ["What is the maximum payload size for {p}{ver}?", "How large can a {p} request body be{ver}?", "What is the size cap for {p} requests{ver}?"]},
    "timeout": {"unit": "seconds", "doc": "Calls to {p} time out after {v} seconds.",
                "q": ["How long before a {p} request times out{ver}?", "What is the {p} timeout{ver}?", "After how many seconds does {p} give up{ver}?"]},
    "retention": {"unit": "days", "doc": "{p} records are retained for {v} days before deletion.",
                  "q": ["How long do you keep {p} data{ver}?", "What is the retention period for {p} records{ver}?", "How many days until {p} records expire{ver}?"]},
}
UNANSWERABLE = ["What is the uptime SLA of the {p} API?", "Does the {p} API support GraphQL?", "Which regions host the {p} service?"]


@dataclass
class Chunk:
    id: int
    product: str
    version: str     # "v1", "v2" or "any"
    kind: str        # reference | tutorial | changelog
    text: str


def generate(seed: int = 17):
    rng = random.Random(seed)
    values = {(p, v, f): rng.choice(range(2, 40)) * (10 if f == "rate_limit" else 1) + (v == "v2") * (rng.randint(1, 5) * (10 if f == "rate_limit" else 1))
              for p in PRODUCTS for v in ("v1", "v2") for f in FACTS}
    chunks: list[Chunk] = []

    def add(product, version, kind, text):
        chunks.append(Chunk(len(chunks), product, version, kind, text))

    for p in PRODUCTS:
        for v in ("v1", "v2"):
            add(p, v, "reference", f"[{v}] {p} API reference, limits. " + FACTS["rate_limit"]["doc"].format(p=p, v=values[(p, v, 'rate_limit')]) + " " + FACTS["max_payload"]["doc"].format(p=p, v=values[(p, v, 'max_payload')]))
            add(p, v, "reference", f"[{v}] {p} API reference, reliability and data. " + FACTS["timeout"]["doc"].format(p=p, v=values[(p, v, 'timeout')]) + " " + FACTS["retention"]["doc"].format(p=p.capitalize(), v=values[(p, v, 'retention')]))
        for f, spec in FACTS.items():
            add(p, "any", "changelog", f"Changelog, {p}: in v2 the {f.replace('_', ' ')} changed from {values[(p, 'v1', f)]} {spec['unit']} to {values[(p, 'v2', f)]} {spec['unit']}.")
        add(p, "any", "tutorial", f"Tutorial: getting started with {p}. Avoid hitting the limit by batching calls, and handle a timeout with exponential backoff.")
        add(p, "any", "tutorial", f"Tutorial: {p} webhooks and retries. Store payload data for a few days while you debug; check the size of each message.")
        add(p, "any", "tutorial", f"Guide: monitoring {p}. Track how many requests you send per minute and alert when the error rate rises.")
    rng.shuffle(chunks)
    for i, c in enumerate(chunks):
        c.id = i
    gold = []
    for p in PRODUCTS:
        for f, spec in FACTS.items():
            gold.append({"q": rng.choice(spec["q"]).format(p=p, ver=""), "product": p, "fact": f, "version": "v2", "answer": values[(p, "v2", f)], "type": "latest"})
            gold.append({"q": rng.choice(spec["q"]).format(p=p, ver=" in v1"), "product": p, "fact": f, "version": "v1", "answer": values[(p, "v1", f)], "type": "v1"})
        for t in UNANSWERABLE:
            gold.append({"q": t.format(p=p), "product": p, "fact": None, "version": None, "answer": None, "type": "unanswerable"})
    dev_products = set(PRODUCTS[:6])
    return chunks, gold, dev_products


if __name__ == "__main__":
    ch, g, dev = generate()
    print(f"{len(ch)} chunks, {len(g)} golden questions "
          f"({sum(x['type'] == 'unanswerable' for x in g)} unanswerable), dev products {sorted(dev)}")
