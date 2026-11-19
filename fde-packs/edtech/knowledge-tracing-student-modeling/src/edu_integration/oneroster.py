"""OneRoster 1.2 rostering: parse, paginate, and reconcile students, teachers, classes and enrolments into the tool's own roster.

Rostering is a sync problem, not a read: duplicates, transfers, withdrawals, year rollover and records marked `tobedeleted` are the normal cases."""
from __future__ import annotations

import csv
import datetime as dt
import io
from typing import Any, Dict, Iterable, List, Optional, Tuple

from fde_adapters.core.http import HttpClient


def paged(client: HttpClient, path: str, key: str, limit: int = 100) -> Iterable[Dict[str, Any]]:
    """OneRoster collections use `limit` and `offset` and report the total in `X-Total-Count`."""
    offset = 0
    while True:
        r = client.get(path, params={"limit": limit, "offset": offset})
        rows = (r.json() or {}).get(key, [])
        yield from rows
        total = int(r.headers.get("x-total-count", offset + len(rows)))
        offset += limit
        if not rows or offset >= total:
            return


def read_csv(files: Dict[str, str]) -> Dict[str, List[Dict[str, str]]]:
    """The OneRoster CSV bundle: users.csv, classes.csv, enrollments.csv, orgs.csv, academicSessions.csv. Header names are the OneRoster field names."""
    return {name: list(csv.DictReader(io.StringIO(text))) for name, text in files.items()}


def reconcile(existing: Dict[str, Dict[str, Any]], incoming: List[Dict[str, Any]], *, key: str = "sourcedId") -> Dict[str, Any]:
    """Compare the tool's current records with the SIS feed. Never hard-delete on absence: a record that disappears is `deactivated` after two consecutive misses (set by the caller)."""
    seen = set()
    created, updated, deactivated, unchanged, conflicts = [], [], [], [], []
    for r in incoming:
        k = r[key]
        if k in seen:
            conflicts.append({"id": k, "why": "duplicate sourcedId in one feed"})
            continue
        seen.add(k)
        if r.get("status") == "tobedeleted":
            deactivated.append(k)
        elif k not in existing:
            created.append(k)
        elif any(existing[k].get(f) != r.get(f) for f in r if f in existing[k] and f != "dateLastModified"):
            updated.append(k)
        else:
            unchanged.append(k)
    missing = sorted(set(existing) - seen)
    return {"created": created, "updated": updated, "deactivated": deactivated, "unchanged": unchanged, "missing_from_feed": missing, "conflicts": conflicts}


def enrolment_changes(enrolments: List[Dict[str, Any]], *, today: dt.date) -> Dict[str, Any]:
    """Classify enrolments: duplicate (same user, class), transfer (a user leaves one class and joins another in the same course), ended, future."""
    by_pair: Dict[Tuple[str, str], List[Dict[str, Any]]] = {}
    for e in enrolments:
        by_pair.setdefault((e["userSourcedId"], e["classSourcedId"]), []).append(e)
    dups = sorted(f"{u}/{c}" for (u, c), v in by_pair.items() if len([x for x in v if x.get("status") != "tobedeleted"]) > 1)
    active = [e for e in enrolments if e.get("status") != "tobedeleted" and (not e.get("endDate") or dt.date.fromisoformat(e["endDate"]) >= today) and (not e.get("beginDate") or dt.date.fromisoformat(e["beginDate"]) <= today)]
    ended = sorted({e["sourcedId"] for e in enrolments if e.get("endDate") and dt.date.fromisoformat(e["endDate"]) < today})
    future = sorted({e["sourcedId"] for e in enrolments if e.get("beginDate") and dt.date.fromisoformat(e["beginDate"]) > today})
    per_course: Dict[Tuple[str, str], set] = {}
    for e in active:
        per_course.setdefault((e["userSourcedId"], e.get("courseSourcedId", "")), set()).add(e["classSourcedId"])
    transfers = sorted(f"{u}/{c}" for (u, c), cl in per_course.items() if len(cl) > 1 and c)
    return {"active": len(active), "duplicates": dups, "ended": ended, "future": future, "possible_transfers": transfers}


def year_rollover(classes: List[Dict[str, Any]], new_session: str, today: dt.date) -> Dict[str, List[str]]:
    """At the academic-year boundary: classes of the old session close, mastery carries over per student and skill (it is the learner's, not the class's)."""
    old = [c["sourcedId"] for c in classes if c.get("termSourcedId") != new_session]
    new = [c["sourcedId"] for c in classes if c.get("termSourcedId") == new_session]
    return {"close": old, "open": new}
