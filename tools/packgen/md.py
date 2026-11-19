"""Small Markdown helpers shared by the document generators."""

from __future__ import annotations

import re
from typing import Any


def get(d: Any, path: str, default: Any = None) -> Any:
    """d['a']['b'][0]-style lookup with a dotted path; missing keys give `default`."""
    cur = d
    for part in path.split("."):
        if isinstance(cur, dict) and part in cur:
            cur = cur[part]
        elif isinstance(cur, list) and part.isdigit() and int(part) < len(cur):
            cur = cur[int(part)]
        else:
            return default
    return cur


def cell(v: Any) -> str:
    if v is None:
        return ""
    if isinstance(v, bool):
        return "yes" if v else "no"
    if isinstance(v, (list, tuple)):
        return "<br>".join(f"- {cell(x)}" for x in v)
    if isinstance(v, dict):
        return "<br>".join(f"**{humanize(k)}:** {cell(x)}" for k, x in v.items())
    return str(v).replace("|", "\\|").replace("\n", "<br>").strip()


def humanize(key: str) -> str:
    s = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", key).replace("_", " ").replace("-", " ")
    return s[:1].upper() + s[1:]


def table(rows: list[dict], cols: list[tuple[str, str]] | None = None, extra: list[str] | None = None) -> str:
    """Markdown table from a list of dicts. `cols` is [(key, header)]; `extra` adds blank fill-in columns."""
    if not rows:
        return "_none listed_\n"
    if cols is None:
        cols = [(k, humanize(k)) for k in rows[0].keys()]
    heads = [h for _, h in cols] + (extra or [])
    out = ["| " + " | ".join(heads) + " |", "|" + "|".join("---" for _ in heads) + "|"]
    for r in rows:
        out.append("| " + " | ".join([cell(r.get(k)) for k, _ in cols] + [" " for _ in (extra or [])]) + " |")
    return "\n".join(out) + "\n"


def bullets(items: list[Any]) -> str:
    return "\n".join(f"- {cell(i) if not isinstance(i, str) else i}" for i in items) + "\n" if items else "_none listed_\n"


def checklist(items: list[Any]) -> str:
    return "\n".join(f"- [ ] {i}" for i in items) + "\n" if items else ""


def fence(lang: str, body: str) -> str:
    return f"```{lang}\n{body.rstrip()}\n```\n"


def render(v: Any, level: int = 3) -> str:
    """Generic fallback renderer: strings, lists of strings or dicts, and nested dicts."""
    if v is None or v == "" or v == [] or v == {}:
        return "_not applicable_\n"
    if isinstance(v, str):
        return v.strip() + "\n"
    if isinstance(v, list):
        if all(isinstance(x, dict) for x in v):
            return table(v)
        return bullets(v)
    if isinstance(v, dict):
        out = []
        for k, x in v.items():
            if isinstance(x, (dict, list)) and x:
                out.append(f"{'#' * level} {humanize(k)}\n\n{render(x, min(level + 1, 6))}")
            else:
                out.append(f"- **{humanize(k)}:** {cell(x)}")
        return "\n".join(out) + "\n"
    return f"{v}\n"


def doc(title: str, lead: str, *sections: tuple[str, str]) -> str:
    parts = [f"# {title}\n", lead.strip() + "\n"]
    for heading, body in sections:
        if body and body.strip():
            parts.append(f"## {heading}\n\n{body.strip()}\n")
    return "\n".join(parts).rstrip() + "\n"


def pct(x: float, digits: int = 1) -> str:
    return f"{x * 100:.{digits}f}%"


def num(x: float, digits: int = 3) -> str:
    return f"{x:.{digits}f}"
