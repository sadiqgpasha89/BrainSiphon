"""A file-backed model registry: immutable versions, stages, lineage, integrity checks, promotion history and rollback.

Layout under MODEL_REGISTRY_DIR:
    <name>/index.json                    stages -> version, plus the promotion history
    <name>/<version>/model.joblib        the packaged model object
    <name>/<version>/manifest.json       metrics, params, feature signature, training-data hash, code version, sha256
    <name>/<version>/requirements.txt    the library versions the model was trained with

A version is written once and never changed; serving loads by stage and verifies the sha256 before unpickling. In production
this role is played by MLflow Model Registry / SageMaker Model Registry / Vertex AI; the operations are the same four:
register, promote, load, roll back.
"""

from __future__ import annotations

import hashlib
import json
import os
import time
from importlib import metadata as importlib_metadata
from pathlib import Path
from typing import Any

import joblib

STAGES = ("candidate", "production", "archived")


class RegistryError(Exception):
    pass


class Registry:
    def __init__(self, root: Path | str):
        self.root = Path(root)

    # ── internals ──
    def _dir(self, name: str) -> Path:
        return self.root / name

    def _index(self, name: str) -> dict[str, Any]:
        p = self._dir(name) / "index.json"
        if not p.exists():
            return {"name": name, "production": None, "previous_production": None, "versions": [], "history": []}
        return json.loads(p.read_text())

    def _write_index(self, name: str, idx: dict[str, Any]) -> None:
        p = self._dir(name) / "index.json"
        tmp = p.with_suffix(".tmp")
        tmp.write_text(json.dumps(idx, indent=2))
        os.replace(tmp, p)  # atomic: a reader sees the old index or the new one, never half of it

    # ── operations ──
    def register(
        self,
        name: str,
        model: Any,
        metrics: dict[str, float],
        params: dict[str, Any],
        features: list[str],
        training_data_hash: str,
        code_version: str = "",
        libraries: tuple[str, ...] = ("scikit-learn", "numpy", "pandas"),
        extra: dict[str, Any] | None = None,
    ) -> str:
        idx = self._index(name)
        version = f"v{len(idx['versions']) + 1:04d}"
        vdir = self._dir(name) / version
        vdir.mkdir(parents=True, exist_ok=False)
        joblib.dump(model, vdir / "model.joblib")
        sha = hashlib.sha256((vdir / "model.joblib").read_bytes()).hexdigest()
        reqs = []
        for lib in libraries:
            try:
                reqs.append(f"{lib}=={importlib_metadata.version(lib)}")
            except importlib_metadata.PackageNotFoundError:
                pass
        (vdir / "requirements.txt").write_text("\n".join(reqs) + "\n")
        manifest = {
            "name": name,
            "version": version,
            "created_at": time.time(),
            "metrics": metrics,
            "params": params,
            "features": features,
            "training_data_hash": training_data_hash,
            "code_version": code_version or os.environ.get("GIT_SHA", "unknown"),
            "sha256": sha,
            "extra": extra or {},
        }
        (vdir / "manifest.json").write_text(json.dumps(manifest, indent=2))
        idx["versions"].append(version)
        self._write_index(name, idx)
        return version

    def manifest(self, name: str, version: str) -> dict[str, Any]:
        p = self._dir(name) / version / "manifest.json"
        if not p.exists():
            raise RegistryError(f"{name}/{version} is not registered")
        return json.loads(p.read_text())

    def versions(self, name: str) -> list[dict[str, Any]]:
        idx = self._index(name)
        return [
            {**self.manifest(name, v), "stage": "production" if v == idx["production"] else "candidate"}
            for v in idx["versions"]
        ]

    def production_version(self, name: str) -> str | None:
        return self._index(name)["production"]

    def history(self, name: str) -> list[dict[str, Any]]:
        return self._index(name)["history"]

    def promote(self, name: str, version: str, by: str, reason: str) -> None:
        idx = self._index(name)
        if version not in idx["versions"]:
            raise RegistryError(f"{name}/{version} is not registered")
        if idx["production"] == version:
            return
        idx["previous_production"], idx["production"] = idx["production"], version
        idx["history"].append({"action": "promote", "version": version, "by": by, "reason": reason, "at": time.time()})
        self._write_index(name, idx)

    def rollback(self, name: str, by: str, reason: str) -> str:
        idx = self._index(name)
        prev = idx["previous_production"]
        if not prev:
            raise RegistryError(f"{name}: no previous production version to roll back to")
        idx["production"], idx["previous_production"] = prev, idx["production"]
        idx["history"].append({"action": "rollback", "version": prev, "by": by, "reason": reason, "at": time.time()})
        self._write_index(name, idx)
        return prev

    def load(self, name: str, version: str | None = None) -> tuple[Any, dict[str, Any]]:
        """Load a version (default: production) after verifying its checksum. Returns (model, manifest)."""
        version = version or self.production_version(name)
        if version is None:
            raise RegistryError(f"{name}: no production version")
        man = self.manifest(name, version)
        blob = self._dir(name) / version / "model.joblib"
        if hashlib.sha256(blob.read_bytes()).hexdigest() != man["sha256"]:
            raise RegistryError(f"{name}/{version}: checksum mismatch, refusing to load")
        return joblib.load(blob), man


def data_hash(*parts: Any) -> str:
    """A short, stable fingerprint of the training data (row count, time range, column list ...)."""
    return hashlib.sha256(json.dumps(parts, sort_keys=True, default=str).encode()).hexdigest()[:16]
