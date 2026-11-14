"""A JSON Schema subset validator (no dependencies) for contract tests that must run on a locked-down host."""
from __future__ import annotations

import re
from typing import Any, Dict, List

_FORMATS = {
    "date-time": re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$"),
    "date": re.compile(r"^\d{4}-\d{2}-\d{2}$"),
    "uuid": re.compile(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"),
}


def _type_ok(v: Any, t: str) -> bool:
    return {
        "string": isinstance(v, str), "boolean": isinstance(v, bool), "null": v is None,
        "integer": isinstance(v, int) and not isinstance(v, bool),
        "number": isinstance(v, (int, float)) and not isinstance(v, bool),
        "object": isinstance(v, dict), "array": isinstance(v, list),
    }[t]


def validate(value: Any, schema: Dict[str, Any], path: str = "", root: Dict[str, Any] = None) -> List[str]:
    """Errors as 'pointer: message'. Supports type, enum, const, required, properties, additionalProperties, items, minimum,
    maximum, exclusiveMinimum, exclusiveMaximum, minLength, maxLength, pattern, format, minItems, maxItems, oneOf, anyOf, allOf, $ref."""
    root = root or schema
    errs: List[str] = []
    here = path or "/"
    if "$ref" in schema:
        node: Any = root
        for part in schema["$ref"].lstrip("#/").split("/"):
            node = node[part]
        return validate(value, node, path, root)
    if "type" in schema:
        types = schema["type"] if isinstance(schema["type"], list) else [schema["type"]]
        if not any(_type_ok(value, t) for t in types):
            return [f"{here}: expected {'/'.join(types)}, got {type(value).__name__}"]
    if "enum" in schema and value not in schema["enum"]:
        errs.append(f"{here}: {value!r} is not one of {schema['enum']}")
    if "const" in schema and value != schema["const"]:
        errs.append(f"{here}: must equal {schema['const']!r}")
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        for k, ok in (("minimum", lambda v, b: v >= b), ("maximum", lambda v, b: v <= b), ("exclusiveMinimum", lambda v, b: v > b), ("exclusiveMaximum", lambda v, b: v < b)):
            if k in schema and not ok(value, schema[k]):
                errs.append(f"{here}: {value} violates {k} {schema[k]}")
    if isinstance(value, str):
        if "minLength" in schema and len(value) < schema["minLength"]: errs.append(f"{here}: shorter than {schema['minLength']}")
        if "maxLength" in schema and len(value) > schema["maxLength"]: errs.append(f"{here}: longer than {schema['maxLength']}")
        if "pattern" in schema and not re.search(schema["pattern"], value): errs.append(f"{here}: does not match {schema['pattern']}")
        if "format" in schema and schema["format"] in _FORMATS and not _FORMATS[schema["format"]].match(value):
            errs.append(f"{here}: not a valid {schema['format']}")
    if isinstance(value, dict):
        for r in schema.get("required", []):
            if r not in value:
                errs.append(f"{path}/{r}: required")
        props = schema.get("properties", {})
        for k, v in value.items():
            if k in props:
                errs += validate(v, props[k], f"{path}/{k}", root)
            elif schema.get("additionalProperties") is False:
                errs.append(f"{path}/{k}: unexpected property")
    if isinstance(value, list):
        if "minItems" in schema and len(value) < schema["minItems"]: errs.append(f"{here}: fewer than {schema['minItems']} items")
        if "maxItems" in schema and len(value) > schema["maxItems"]: errs.append(f"{here}: more than {schema['maxItems']} items")
        if "items" in schema:
            for i, v in enumerate(value):
                errs += validate(v, schema["items"], f"{path}/{i}", root)
    for kw in ("allOf",):
        for s in schema.get(kw, []):
            errs += validate(value, s, path, root)
    if "anyOf" in schema and not any(not validate(value, s, path, root) for s in schema["anyOf"]):
        errs.append(f"{here}: matches none of anyOf")
    if "oneOf" in schema and sum(1 for s in schema["oneOf"] if not validate(value, s, path, root)) != 1:
        errs.append(f"{here}: must match exactly one of oneOf")
    return errs
