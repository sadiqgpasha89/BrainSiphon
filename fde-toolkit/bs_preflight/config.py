"""Configuration loading. JSON on purpose: the standard library reads it, so no YAML package is needed on a locked-down host."""
from __future__ import annotations

import json
import os
import re
from typing import Any, Dict, List

#: config section -> (module name, required keys)
SECTIONS: Dict[str, List[str]] = {
    "proxy_checks": [],
    "dns": ["name", "host"],
    "tcp": ["name", "host", "port"],
    "tls": ["name", "host"],
    "http": ["name", "url"],
    "api_auth": ["name"],
    "idp": ["name"],
    "service_accounts": ["name", "base_url", "auth_ref"],
    "databases": ["name", "type", "host"],
    "kafka": ["name", "bootstrap"],
    "object_storage": ["name", "endpoint", "bucket", "access_key_env", "secret_key_env"],
    "cloud_access": ["name", "command"],
    "egress_denied": ["host"],
}

_PLACEHOLDER = re.compile(r"\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-([^}]*))?\}")


def expand_env(value: Any) -> Any:
    """Replace ${VAR} and ${VAR:-default} in strings. Credentials are never placed in the file: it names the variable (`*_env`)."""
    if isinstance(value, str):
        return _PLACEHOLDER.sub(lambda m: os.environ.get(m.group(1), m.group(2) if m.group(2) is not None else m.group(0)), value)
    if isinstance(value, list):
        return [expand_env(v) for v in value]
    if isinstance(value, dict):
        return {k: expand_env(v) for k, v in value.items()}
    return value


class ConfigError(ValueError):
    pass


def load(path: str) -> Dict[str, Any]:
    try:
        with open(path, encoding="utf-8") as f:
            raw = json.load(f)
    except FileNotFoundError:
        raise ConfigError(f"configuration file not found: {path}")
    except json.JSONDecodeError as e:
        raise ConfigError(f"{path} is not valid JSON: {e}")
    cfg = expand_env(raw)
    validate(cfg)
    return cfg


def validate(cfg: Dict[str, Any]) -> None:
    if not isinstance(cfg, dict):
        raise ConfigError("the configuration must be a JSON object")
    for key in cfg:
        if key not in SECTIONS and key not in ("customer", "environment", "use_case", "offline", "proxy", "timeout", "ca_file", "notes", "$schema", "owner_contacts"):
            raise ConfigError(f"unknown configuration key '{key}'")
    seen = set()
    for section, required in SECTIONS.items():
        items = cfg.get(section, [])
        if not isinstance(items, list):
            raise ConfigError(f"'{section}' must be a list")
        for i, item in enumerate(items):
            for r in required:
                if r not in item:
                    raise ConfigError(f"{section}[{i}] is missing required key '{r}'")
            if "name" in item:
                k = (section, item["name"])
                if k in seen:
                    raise ConfigError(f"duplicate name '{item['name']}' in {section}")
                seen.add(k)
            for k in item:
                if re.search(r"(password|secret|token|api_key)$", k) and not k.endswith("_env"):
                    raise ConfigError(f"{section}[{i}].{k}: do not put credentials in the file; name an environment variable with '{k}_env'")
