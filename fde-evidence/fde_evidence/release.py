"""Release identity: what exactly was deployed. Commit, image digests, configuration version and model version."""
from __future__ import annotations

import datetime as dt
import hashlib
import os
import subprocess
from typing import Any, Dict, List, Optional


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _git(repo: str, *args: str) -> Optional[str]:
    try:
        r = subprocess.run(["git", "-C", repo, *args], capture_output=True, text=True, timeout=20)
    except (OSError, subprocess.SubprocessError):
        return None
    return r.stdout.strip() if r.returncode == 0 else None


def capture(repo: str, *, images: Optional[List[str]] = None, config_files: Optional[List[str]] = None, model_name: str = "", model_version: str = "", model_artifact: str = "", environment: str = "", by: str = "", now: Optional[str] = None) -> Dict[str, Any]:
    """`images` are `name@sha256:digest` references (from the registry or `kubectl`); a tag-only reference is recorded as unpinned."""
    commit = _git(repo, "rev-parse", "HEAD")
    dirty = bool(_git(repo, "status", "--porcelain")) if commit else None
    imgs = []
    for ref in images or []:
        name, _, digest = ref.partition("@")
        imgs.append({"image": name, "digest": digest, "pinned": digest.startswith("sha256:") and len(digest) == 71})
    cfg = [{"path": p, "sha256": sha256_file(p)} for p in sorted(config_files or [])]
    config_version = hashlib.sha256("".join(f"{c['path']}={c['sha256']}\n" for c in cfg).encode()).hexdigest()[:16] if cfg else ""
    model = {"name": model_name, "version": model_version, "artifact": os.path.basename(model_artifact) if model_artifact else "", "sha256": sha256_file(model_artifact) if model_artifact else ""}
    problems = []
    if commit is None:
        problems.append("not a git checkout: the commit is unknown")
    elif dirty:
        problems.append("the working tree has uncommitted changes: the commit does not describe what was deployed")
    problems += [f"image {i['image']} is not pinned by digest" for i in imgs if not i["pinned"]]
    if not model_version:
        problems.append("no model version given")
    if not cfg:
        problems.append("no configuration files given")
    return {"schema_version": 1, "captured_at": now or dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), "captured_by": by, "environment": environment,
            "commit": commit, "branch": _git(repo, "rev-parse", "--abbrev-ref", "HEAD"), "describe": _git(repo, "describe", "--tags", "--always"), "dirty": dirty,
            "images": imgs, "config": {"version": config_version, "files": cfg}, "model": model, "complete": not problems, "problems": problems}
