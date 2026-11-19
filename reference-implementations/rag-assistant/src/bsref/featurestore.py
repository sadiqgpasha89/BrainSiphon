"""Feature store: a registry of feature definitions, an online key-value store and a training/serving skew guard.

Definitions live in features/definitions.yaml (name, entity, dtype, description, owner). The online store holds the latest
feature vector per entity. In production the online store is Redis / DynamoDB and the registry is Feast or a platform
equivalent; the interface (get / put / the definition file) is what the implementation depends on.
"""

from __future__ import annotations

import hashlib
import json
from typing import Any

from sqlalchemy import select
from sqlalchemy.engine import Connection

from . import db
from .config import load_yaml


def definitions(path: str = "features/definitions.yaml") -> dict[str, Any]:
    return load_yaml(path)


def feature_names(view: str, path: str = "features/definitions.yaml") -> list[str]:
    """The ordered model input list for a feature view. Order matters: it is the model signature."""
    return [f["name"] for f in definitions(path)["views"][view]["features"]]


def signature_hash(names: list[str]) -> str:
    """Stored with every model so that serving can refuse a model whose inputs no longer match the feature view."""
    return hashlib.sha256(json.dumps(names).encode()).hexdigest()[:16]


def put(conn: Connection, entity_type: str, entity_id: str, features: dict[str, Any], event_time: float) -> None:
    db.upsert(
        conn,
        db.online_features,
        {"entity_type": entity_type, "entity_id": str(entity_id)},
        {"features": db.dumps(features), "event_time": event_time, "updated_at": db.now()},
    )


def get(conn: Connection, entity_type: str, entity_id: str) -> tuple[dict[str, Any] | None, float | None]:
    """Returns (features, event_time) or (None, None) for an entity never seen: the caller must have a cold-start default."""
    row = conn.execute(
        select(db.online_features.c.features, db.online_features.c.event_time).where(
            db.online_features.c.entity_type == entity_type, db.online_features.c.entity_id == str(entity_id)
        )
    ).first()
    if row is None:
        return None, None
    return json.loads(row[0]), float(row[1])
