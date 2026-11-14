"""How mastery predictions update after new interactions, offline synchronisation, and the firewall between a mastery estimate and an official grade."""
from __future__ import annotations

import datetime as dt
from typing import Any, Dict, List, Optional, Tuple


class BKT:
    """Bayesian Knowledge Tracing per skill (guess, slip, learn, prior). The production model (SAKT/AKT) replaces this behind the same `update` call; BKT stays as the explainable baseline."""

    def __init__(self, p_init: float = 0.2, p_learn: float = 0.15, p_guess: float = 0.2, p_slip: float = 0.1, forget_per_day: float = 0.01):
        self.p0, self.learn, self.guess, self.slip, self.forget = p_init, p_learn, p_guess, p_slip, forget_per_day

    def update(self, p: float, correct: bool, days_since_last: float = 0.0) -> float:
        p = p * (1 - self.forget) ** days_since_last  # decay after a long break: mastery estimates must not stay overconfident
        if correct:
            post = p * (1 - self.slip) / (p * (1 - self.slip) + (1 - p) * self.guess)
        else:
            post = p * self.slip / (p * self.slip + (1 - p) * (1 - self.guess))
        return post + (1 - post) * self.learn

    def trace(self, outcomes: List[bool], p: Optional[float] = None) -> List[float]:
        p = self.p0 if p is None else p
        out = []
        for c in outcomes:
            p = self.update(p, c)
            out.append(round(p, 4))
        return out


class OfflineSync:
    """Learners practise offline on a device and sync later. Events carry (device id, per-device sequence, client time). The server sorts by client time then sequence, drops duplicates by (device, seq),
    and flags clock skew; mastery is recomputed from the merged history, never patched incrementally, so the result does not depend on arrival order."""

    def __init__(self, max_clock_skew: dt.timedelta = dt.timedelta(hours=24)):
        self.seen: set = set()
        self.history: Dict[Tuple[str, str], List[Dict[str, Any]]] = {}
        self.max_skew = max_clock_skew
        self.flagged: List[Dict[str, Any]] = []

    def ingest(self, ev: Dict[str, Any], received_at: dt.datetime) -> str:
        k = (ev["device"], ev["seq"])
        if k in self.seen:
            return "duplicate"
        self.seen.add(k)
        t = dt.datetime.fromisoformat(ev["t"].replace("Z", "+00:00"))
        if t > received_at + self.max_skew or t < received_at - dt.timedelta(days=365):
            self.flagged.append({**ev, "why": "client clock implausible"})
            return "flagged"
        self.history.setdefault((ev["learner"], ev["skill"]), []).append(ev)
        return "accepted"

    def mastery(self, learner: str, skill: str, model: BKT) -> Dict[str, Any]:
        evs = sorted(self.history.get((learner, skill), []), key=lambda e: (e["t"], e["device"], e["seq"]))
        p, last = model.p0, None
        for e in evs:
            t = dt.datetime.fromisoformat(e["t"].replace("Z", "+00:00"))
            p = model.update(p, bool(e["correct"]), ((t - last).total_seconds() / 86400) if last else 0.0)
            last = t
        return {"p_mastery": round(p, 4), "n": len(evs), "mastered": p >= 0.95 and len(evs) >= 3}


class GradeFirewall:
    """A mastery estimate is **evidence for the teacher**. It never becomes an official grade by itself. Writing to the gradebook needs a teacher action, recorded, and the system refuses to do it any other way."""

    def __init__(self, write_gradebook):
        self._write = write_gradebook
        self.proposals: Dict[str, Dict[str, Any]] = {}
        self.attempted_direct_writes = 0

    def propose(self, student: str, skill: str, p_mastery: float, now: dt.datetime) -> Dict[str, Any]:
        pid = f"{student}:{skill}:{now.date()}"
        self.proposals[pid] = {"student": student, "skill": skill, "p_mastery": p_mastery, "status": "pending-teacher-review", "at": now.isoformat()}
        return self.proposals[pid]

    def write_grade(self, student: str, skill: str, value: float, *, source: str) -> None:
        if source != "teacher":
            self.attempted_direct_writes += 1
            raise PermissionError("official grades are written by a teacher, never by a model or a pipeline")
        self._write(student, skill, value)

    def teacher_decides(self, pid: str, teacher: str, accept: bool, official_value: Optional[float] = None, note: str = "") -> Dict[str, Any]:
        p = self.proposals[pid]
        if accept:
            if official_value is None:
                raise ValueError("the teacher states the official value; the model's estimate is not copied")
            self.write_grade(p["student"], p["skill"], official_value, source="teacher")
        p.update(status="accepted" if accept else "rejected", teacher=teacher, official_value=official_value if accept else None, note=note)
        return p
