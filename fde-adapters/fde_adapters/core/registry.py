"""Adapter registry: look an adapter up by id, list what exists, build one from a configuration file."""
from __future__ import annotations

from typing import Any, Dict, List, Type

from .adapter import Adapter
from .config import load as load_config
from .errors import ConfigError

_ADAPTERS: Dict[str, Type[Adapter]] = {}


def register(cls: Type[Adapter]) -> Type[Adapter]:
    if not cls.ID:
        raise ValueError(f"{cls.__name__} has no ID")
    if cls.ID in _ADAPTERS and _ADAPTERS[cls.ID] is not cls:
        raise ValueError(f"adapter id '{cls.ID}' is already registered")
    _ADAPTERS[cls.ID] = cls
    return cls


def load_all() -> Dict[str, Type[Adapter]]:
    """Import every connector module so that they register themselves."""
    import importlib
    import pkgutil

    from .. import connectors

    for m in pkgutil.iter_modules(connectors.__path__):
        importlib.import_module(f"{connectors.__name__}.{m.name}")
    return dict(_ADAPTERS)


def get(adapter_id: str) -> Type[Adapter]:
    load_all()
    try:
        return _ADAPTERS[adapter_id]
    except KeyError:
        raise ConfigError(f"unknown adapter '{adapter_id}'. Known: {', '.join(sorted(_ADAPTERS))}")


def build(config: Any, **kw: Any) -> Adapter:
    cfg = load_config(config)
    return get(cfg["adapter"])(cfg, **kw)


def catalogue() -> List[Dict[str, Any]]:
    load_all()
    return [{"id": c.ID, "title": c.TITLE, "protocol": c.PROTOCOL, "capabilities": list(c.CAPABILITIES), "mock": c.MOCK_NOTE} for c in sorted(_ADAPTERS.values(), key=lambda c: c.ID)]
