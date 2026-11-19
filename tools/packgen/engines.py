"""Which engine runs for which use case, and with which knobs.

The engine is chosen from the blueprint's problem type. `exact` means the engine implements that problem type; `adaptable` means it
implements a neighbouring one and the pack says what to change. The knobs and seed are derived from the use-case slug, so every pack
runs its own deterministic synthetic world and reports its own numbers.
"""

from __future__ import annotations

import hashlib
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]

ENGINE_BY_PROBLEM = {
    "binary-event-classification": "tabular",
    "multiclass-classification": "multiclass",
    "regression-estimation": "regression",
    "forecasting": "forecast",
    "time-series-anomaly-detection": "anomaly",
    "tabular-anomaly-detection": "anomaly",
    "text-classification": "nlp",
    "information-extraction": "extraction",
    "entity-resolution": "graph",
    "graph-analytics": "graph",
    "search-ranking": "recommender",
    "personalised-ranking": "recommender",
    "next-item-recommendation": "recommender",
    "vision-classification": "cv",
    "vision-detection-segmentation": "cv",
    "off-policy-decisioning": "bandit",
    "optimisation-allocation": "optimize",
    "grounded-qa": "llm-rag",
    "grounded-generation": "llm-rag",
    "agentic-read-only": "llm-agent",
    "agentic-write-actions": "llm-agent",
    "uplift-causal-effect": "uplift",
    "causal-measurement": "uplift",
    "survival-time-to-event": "survival",
    "sequential-control-simulation": "control",
    "clustering-segmentation": "cluster",
    "speech-audio": "audio",
    "generative-or-other": "generative",
}

# problem types an engine implements as they are; every other type routed to it is an adaptation
EXACT = {
    "tabular": {"binary-event-classification"},
    "multiclass": {"multiclass-classification"},
    "regression": {"regression-estimation"},
    "forecast": {"forecasting"},
    "anomaly": {"time-series-anomaly-detection"},
    "nlp": {"text-classification"},
    "extraction": {"information-extraction"},
    "graph": {"entity-resolution"},
    "recommender": {"next-item-recommendation"},
    "cv": {"vision-classification"},
    "bandit": {"off-policy-decisioning"},
    "optimize": {"optimisation-allocation"},
    "llm-rag": {"grounded-qa"},
    "llm-agent": {"agentic-read-only"},
    "uplift": {"uplift-causal-effect"},
    "survival": {"survival-time-to-event"},
    "control": {"sequential-control-simulation"},
    "cluster": {"clustering-segmentation"},
    "audio": {"speech-audio"},
    "generative": set(),  # an evaluation harness around a stand-in generator: always an adaptation of your real generator
}

# (low, high, kind) per knob; a knob is drawn from the slug hash, so two use cases of one engine differ
KNOBS: dict[str, dict[str, tuple[float, float, str]]] = {
    "tabular": {"n_entities": (1800, 3000, "int"), "positive_entity_rate": (0.02, 0.045, "float"), "n_flash_sales": (3, 8, "int")},
    "forecast": {"n_series": (150, 300, "int")},
    "anomaly": {"n_series": (60, 120, "int"), "anomalies_per_series": (1.8, 3.5, "float")},
    "recommender": {"n_sessions": (30000, 60000, "int"), "bot_share": (0.05, 0.15, "float")},
    "graph": {"n_clusters": (1200, 2200, "int"), "hub_share": (0.08, 0.16, "float")},
    "nlp": {"n_docs": (4500, 7000, "int")},
    "cv": {"n": (3500, 5500, "int"), "prevalence": (0.08, 0.16, "float")},
    "bandit": {"n": (20000, 40000, "int"), "logging_temperature": (0.8, 1.3, "float")},
    "optimize": {"n_instances": (100, 200, "int"), "noise": (0.25, 0.45, "float")},
    "llm-rag": {},
    "llm-agent": {},
    "regression": {"n": (16000, 26000, "int"), "outlier_share": (0.01, 0.04, "float"), "drift": (0.15, 0.4, "float")},
    "multiclass": {"n": (10000, 16000, "int"), "label_noise": (0.04, 0.09, "float"), "dup_share": (0.25, 0.45, "float")},
    "uplift": {"n": (30000, 45000, "int"), "confound": (0.8, 1.6, "float"), "holdout": (0.12, 0.2, "float")},
    "survival": {"n": (6000, 10000, "int"), "dropout": (0.1, 0.3, "float")},
    "control": {"days": (40, 80, "int")},
    "cluster": {"n": (4500, 7000, "int"), "outlier_share": (0.005, 0.02, "float")},
    "audio": {"n_train": (1000, 1600, "int"), "test_snr": (0.0, 6.0, "float")},
    "extraction": {"n_train": (800, 1400, "int")},
    "generative": {"n": (200, 320, "int")},
}

ALL_ENGINES = sorted(KNOBS)


def digest(slug: str) -> int:
    return int(hashlib.sha256(slug.encode()).hexdigest(), 16)


def seed_for(slug: str) -> int:
    return digest(slug) % 90_000 + 1_000


def knobs_for(slug: str, engine: str) -> dict:
    h = digest(slug) >> 16
    out = {}
    for i, (name, (lo, hi, kind)) in enumerate(KNOBS[engine].items()):
        frac = ((h >> (8 * i)) & 255) / 255
        v = lo + (hi - lo) * frac
        out[name] = int(round(v, -1 if kind == "int" and hi >= 1000 else 0)) if kind == "int" else round(v, 3)
    return out


def pick_engine(problem_type: str) -> tuple[str, str]:
    """(engine, fit) where fit is 'exact' or 'adaptable'."""
    engine = ENGINE_BY_PROBLEM.get(problem_type, "generative")
    return engine, ("exact" if problem_type in EXACT[engine] else "adaptable")


_meta: dict[str, dict] = {}


def engine_meta(engine: str) -> dict:
    if not _meta:
        for p in (ROOT / "engines").glob("*/engine.json"):
            _meta[p.parent.name] = json.loads(p.read_text())
    return _meta[engine]
