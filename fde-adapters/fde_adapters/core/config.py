"""Connector configuration: JSON file or dict, `${ENV}` expansion, secrets only by environment-variable name."""
from __future__ import annotations

import json
import os
import re
from typing import Any, Dict, List

from .errors import ConfigError

_PLACEHOLDER = re.compile(r"\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-([^}]*))?\}")
_SECRETISH = re.compile(r"(password|secret|token|api_?key|private_?key)$", re.I)


def expand(value: Any) -> Any:
    if isinstance(value, str):
        return _PLACEHOLDER.sub(lambda m: os.environ.get(m.group(1), m.group(2) if m.group(2) is not None else m.group(0)), value)
    if isinstance(value, list):
        return [expand(v) for v in value]
    if isinstance(value, dict):
        return {k: expand(v) for k, v in value.items()}
    return value


def reject_inline_secrets(node: Any, where: str = "") -> None:
    if isinstance(node, dict):
        for k, v in node.items():
            if _SECRETISH.search(k) and not k.endswith("_env") and isinstance(v, str) and v and not v.startswith("${"):
                raise ConfigError(f"{where}{k}: do not put a credential in the file; name an environment variable with '{k}_env'")
            reject_inline_secrets(v, f"{where}{k}.")
    elif isinstance(node, list):
        for i, v in enumerate(node):
            reject_inline_secrets(v, f"{where}{i}.")


def load(source: Any) -> Dict[str, Any]:
    if isinstance(source, str):
        try:
            with open(source, encoding="utf-8") as f:
                raw = json.load(f)
        except FileNotFoundError:
            raise ConfigError(f"connector configuration not found: {source}")
        except json.JSONDecodeError as e:
            raise ConfigError(f"{source}: invalid JSON: {e}")
    else:
        raw = source
    reject_inline_secrets(raw)
    cfg = expand(raw)
    if "adapter" not in cfg:
        raise ConfigError("configuration must name an 'adapter'")
    cfg.setdefault("name", cfg["adapter"])
    return cfg


def env(name: str, required: bool = True) -> str:
    v = os.environ.get(name, "")
    if required and not v:
        raise ConfigError(f"environment variable {name} is not set")
    return v


def check_spec(spec: Dict[str, Dict[str, Any]], section: Dict[str, Any], where: str) -> List[str]:
    """Check one config section against an adapter's CONFIG_SPEC; returns the problems rather than raising on the first."""
    problems = []
    for key, rule in spec.items():
        if rule.get("required") and key not in section and "default" not in rule:
            problems.append(f"{where}.{key} is required: {rule.get('description', '')}")
    for key in section:
        if key not in spec and not key.startswith("_"):
            problems.append(f"{where}.{key} is not a known setting (known: {', '.join(sorted(spec))})")
    return problems
