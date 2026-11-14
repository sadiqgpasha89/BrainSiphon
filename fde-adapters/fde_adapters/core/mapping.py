"""Declarative field mapping: external record -> internal record, with transforms, lookups, units and a mapping report.

    spec = {
      "fields": {
        "ticket_id": {"from": "Id", "required": True},
        "priority":  {"from": "Priority", "transform": ["map"], "map": {"High": "P2"}, "default": "P3"},
        "opened_at": {"from": "CreatedDate", "transform": ["to_utc"]},
        "lactate":   {"from": "result.value", "transform": ["to_float", "unit:mg/dL->mmol/L:lactate"]},
        "display":   {"concat": ["First", "Last"], "sep": " "},
        "source":    {"value": "salesforce"}
      },
      "lookups": {"loinc": {"2524-7": "lactate"}}
    }
"""
from __future__ import annotations

import datetime as dt
import re
from typing import Any, Callable, Dict, List, Optional, Tuple

from .errors import ConfigError, ContractError

_PATH = re.compile(r"[^.\[\]]+|\[\d+\]")


def get_path(obj: Any, path: str) -> Any:
    """`a.b[0].c`; `a|b` takes the first path that is not None. Missing keys give None, never an exception."""
    for alt in path.split("|"):
        cur = obj
        for tok in _PATH.findall(alt.strip()):
            if cur is None:
                break
            if tok.startswith("["):
                i = int(tok[1:-1])
                cur = cur[i] if isinstance(cur, (list, tuple)) and -len(cur) <= i < len(cur) else None
            else:
                cur = cur.get(tok) if isinstance(cur, dict) else None
        if cur is not None:
            return cur
    return None


#: unit conversions that matter in real integrations; extend per customer. (from, to, quantity) -> function
UNITS: Dict[Tuple[str, str, str], Callable[[float], float]] = {
    ("mg/dL", "mmol/L", "lactate"): lambda v: v / 9.008,
    ("mg/dL", "mmol/L", "glucose"): lambda v: v / 18.016,
    ("mg/dL", "umol/L", "creatinine"): lambda v: v * 88.4,
    ("F", "C", ""): lambda v: (v - 32) * 5 / 9,
    ("lb", "kg", ""): lambda v: v * 0.45359237,
    ("in", "cm", ""): lambda v: v * 2.54,
    ("ft2", "m2", ""): lambda v: v * 0.09290304,
    ("minor", "major", ""): lambda v: v / 100.0,
    ("major", "minor", ""): lambda v: v * 100.0,
}


def to_utc(v: Any, fmt: Optional[str] = None, tz: Optional[str] = None) -> str:
    """ISO 8601, epoch seconds/milliseconds, or a strptime format (with a fixed offset like +05:30) -> UTC ISO 8601 with Z."""
    if isinstance(v, (int, float)):
        secs = v / 1000 if v > 1e11 else v
        return dt.datetime.fromtimestamp(secs, dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    s = str(v).strip()
    if fmt:
        d = dt.datetime.strptime(s, fmt)
    else:
        s2 = s.replace("Z", "+00:00")
        if re.fullmatch(r"\d{14}", s):  # HL7 timestamp 20260314093000
            d = dt.datetime.strptime(s, "%Y%m%d%H%M%S")
        elif re.fullmatch(r"\d{8}", s):
            d = dt.datetime.strptime(s, "%Y%m%d")
        else:
            s2 = re.sub(r"([+-]\d{2})(\d{2})$", r"\1:\2", s2)  # +0530 -> +05:30
            d = dt.datetime.fromisoformat(s2)
    if d.tzinfo is None:
        d = d.replace(tzinfo=_fixed_offset(tz) if tz else dt.timezone.utc)
    return d.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _fixed_offset(tz: str) -> dt.timezone:
    m = re.fullmatch(r"([+-])(\d{2}):?(\d{2})", tz)
    if not m:
        raise ConfigError(f"timezone must be a fixed offset like +05:30, got {tz!r}")
    sign = 1 if m.group(1) == "+" else -1
    return dt.timezone(sign * dt.timedelta(hours=int(m.group(2)), minutes=int(m.group(3))))


class Mapper:
    def __init__(self, spec: Dict[str, Any]):
        if "fields" not in spec:
            spec = {"fields": spec}
        self.fields: Dict[str, Dict[str, Any]] = spec["fields"]
        self.lookups: Dict[str, Dict[str, Any]] = spec.get("lookups", {})
        self.strict = spec.get("strict", True)
        known = {"strip", "upper", "lower", "to_str", "to_int", "to_float", "to_bool", "to_utc", "round", "scale", "pad", "substr", "regex", "map", "lookup", "unit", "default"}
        for name, f in self.fields.items():
            if not any(k in f for k in ("from", "concat", "value")):
                raise ConfigError(f"mapping field '{name}' needs one of from, concat or value")
            for t in f.get("transform", []):
                base, _, arg = t.partition(":")
                if base not in known:
                    raise ConfigError(f"mapping field '{name}': unknown transform '{base}' (known: {', '.join(sorted(known))})")
                if base == "lookup" and arg not in self.lookups:
                    raise ConfigError(f"mapping field '{name}': lookup table '{arg}' is not defined")
                if base == "unit":
                    frm_to, _, qty = arg.partition(":")
                    frm, _, to = frm_to.partition("->")
                    if (frm, to, qty) not in UNITS and (frm, to, "") not in UNITS:
                        raise ConfigError(f"mapping field '{name}': no unit conversion {frm}->{to} for '{qty}'")

    def _transform(self, v: Any, t: str, f: Dict[str, Any]) -> Any:
        name, _, arg = t.partition(":")
        if v is None and name not in ("default",):
            return None
        if name == "strip": return str(v).strip()
        if name == "upper": return str(v).upper()
        if name == "lower": return str(v).lower()
        if name == "to_str": return str(v)
        if name == "to_int": return int(float(v))
        if name == "to_float": return float(v)
        if name == "to_bool": return str(v).strip().lower() in ("1", "true", "t", "yes", "y")
        if name == "to_utc": return to_utc(v, f.get("format"), f.get("tz"))
        if name == "round": return round(float(v), int(arg or 0))
        if name == "scale": return float(v) * float(arg)
        if name == "pad": return str(v).zfill(int(arg))
        if name == "substr":
            a, _, b = arg.partition(":")
            return str(v)[int(a or 0) : int(b) if b else None]
        if name == "regex":
            pat, _, grp = arg.rpartition(":")
            m = re.search(pat, str(v))
            return m.group(int(grp)) if m else None
        if name == "map":
            table = f.get("map", {})
            return table.get(v, table.get(str(v), f.get("default") if "default" in f else v))
        if name == "lookup":
            return self.lookups.get(arg, {}).get(str(v))
        if name == "unit":
            frm_to, _, qty = arg.partition(":")
            frm, _, to = frm_to.partition("->")
            fn = UNITS.get((frm, to, qty)) or UNITS.get((frm, to, ""))
            if fn is None:
                raise ConfigError(f"no unit conversion {frm}->{to} for '{qty}'")
            return round(fn(float(v)), 4)
        if name == "default": return f["default"] if v is None else v
        raise ConfigError(f"unknown transform '{name}'")

    def apply(self, raw: Dict[str, Any]) -> Tuple[Dict[str, Any], List[Dict[str, str]]]:
        out: Dict[str, Any] = {}
        issues: List[Dict[str, str]] = []
        for name, f in self.fields.items():
            if "value" in f:
                v: Any = f["value"]
            elif "concat" in f:
                parts = [get_path(raw, p) for p in f["concat"]]
                v = f.get("sep", " ").join(str(p) for p in parts if p not in (None, "")) or None
            else:
                v = get_path(raw, f["from"])
            try:
                for t in f.get("transform", []):
                    v = self._transform(v, t, f)
                if v is None and "default" in f:
                    v = f["default"]
            except (ValueError, TypeError) as e:
                issues.append({"field": name, "problem": f"transform failed: {e}"})
                v = None
            if v is None and f.get("required"):
                issues.append({"field": name, "problem": "required value is missing"})
            out[name] = v
        return out, issues

    def map(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        rec, issues = self.apply(raw)
        if issues and self.strict:
            raise ContractError(f"mapping failed: {issues}", errors=issues)
        return rec
