"""Settings come from the environment (12-factor); structured configuration comes from configs/*.yaml."""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml


def home() -> Path:
    """Root of the implementation (the directory holding configs/, data/, models/ ...)."""
    return Path(os.environ.get("APP_HOME", Path.cwd())).resolve()


def load_env(path: Path | None = None) -> None:
    """Read KEY=VALUE lines from .env into the environment without overriding variables that are already set."""
    p = path or home() / ".env"
    if not p.exists():
        return
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


load_env()


@dataclass(frozen=True)
class Settings:
    env: str
    home: Path
    database_url: str
    source_database_url: str
    registry_dir: Path
    auth_mode: str  # "local" (HS256, users from configs/users.yaml) or "oidc" (RS256 from a key file or JWKS URL)
    jwt_secret: str
    jwt_public_key_file: str
    oidc_jwks_url: str
    oidc_issuer: str
    oidc_audience: str
    token_ttl_seconds: int
    alert_webhook_url: str
    log_level: str


def _sqlite_default(root: Path) -> str:
    return f"sqlite:///{root / 'var' / 'app.db'}"


@lru_cache(maxsize=1)
def settings() -> Settings:
    root = home()
    db = os.environ.get("DATABASE_URL") or _sqlite_default(root)
    return Settings(
        env=os.environ.get("APP_ENV", "local"),
        home=root,
        database_url=db,
        source_database_url=os.environ.get("SOURCE_DATABASE_URL") or db,
        registry_dir=Path(os.environ.get("MODEL_REGISTRY_DIR") or root / "models" / "registry"),
        auth_mode=os.environ.get("AUTH_MODE", "local"),
        jwt_secret=os.environ.get("JWT_SECRET", ""),
        jwt_public_key_file=os.environ.get("JWT_PUBLIC_KEY_FILE", ""),
        oidc_jwks_url=os.environ.get("OIDC_JWKS_URL", ""),
        oidc_issuer=os.environ.get("OIDC_ISSUER", ""),
        oidc_audience=os.environ.get("OIDC_AUDIENCE", ""),
        token_ttl_seconds=int(os.environ.get("TOKEN_TTL_SECONDS", "3600")),
        alert_webhook_url=os.environ.get("ALERT_WEBHOOK_URL", ""),
        log_level=os.environ.get("LOG_LEVEL", "INFO"),
    )


def reset_settings() -> None:
    """Tests change the environment between cases."""
    settings.cache_clear()


def load_yaml(relative: str) -> dict[str, Any]:
    """Read a YAML file relative to the implementation root, e.g. load_yaml('configs/pipeline.yaml')."""
    with open(home() / relative, encoding="utf-8") as fh:
        return yaml.safe_load(fh) or {}
