"""From a footfall forecast to a staffing recommendation: queueing theory for how many people, labour rules for who may work, and a cost-versus-waiting trade-off."""
from __future__ import annotations

import datetime as dt
import math
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple


def erlang_c(agents: int, erlangs: float) -> float:
    """Probability that an arriving customer has to wait (M/M/N). Computed through Erlang B for numerical stability."""
    if agents <= erlangs:
        return 1.0
    b = 1.0
    for n in range(1, agents + 1):
        b = erlangs * b / (n + erlangs * b)
    return b / (1 - (erlangs / agents) * (1 - b))


def service_level(agents: int, arrivals_per_hour: float, aht_minutes: float, wait_target_minutes: float) -> float:
    """Share of customers served within the wait target."""
    a = arrivals_per_hour * aht_minutes / 60.0
    if agents <= a:
        return 0.0
    return 1 - erlang_c(agents, a) * math.exp(-(agents - a) * wait_target_minutes / aht_minutes)


def agents_needed(arrivals_per_hour: float, aht_minutes: float, wait_target_minutes: float, target_sl: float = 0.8, max_agents: int = 40) -> int:
    if arrivals_per_hour <= 0:
        return 0
    n = max(1, math.ceil(arrivals_per_hour * aht_minutes / 60.0))
    while n <= max_agents and service_level(n, arrivals_per_hour, aht_minutes, wait_target_minutes) < target_sl:
        n += 1
    return min(n, max_agents)


def hourly_requirement(forecast_p50: List[float], forecast_p90: List[float], aht: float, wait_target: float, target_sl: float, *, use_p90_for_peaks: bool = True, min_open_staff: int = 2) -> List[int]:
    """Plan to P50, but to P90 in the hours where the cost of a long queue is highest (the peak third of the day). Never below the safe minimum while open."""
    peak_cut = sorted(forecast_p50)[int(len(forecast_p50) * 2 / 3)] if forecast_p50 else 0
    req = []
    for p50, p90 in zip(forecast_p50, forecast_p90):
        lam = p90 if (use_p90_for_peaks and p50 >= peak_cut and p50 > 0) else p50
        req.append(0 if p50 == 0 else max(agents_needed(lam, aht, wait_target, target_sl), min_open_staff))
    return req


# ------------------------------------------------------------------------------------------------------------------- labour rules

@dataclass
class Rules:
    max_daily_hours: float = 9.0
    min_shift_hours: float = 4.0
    break_after_hours: float = 6.0
    break_minutes: int = 30
    min_rest_hours: float = 11.0
    max_weekly_hours: float = 40.0
    max_overtime_weekly: float = 6.0
    max_consecutive_days: int = 6


def validate_roster(shifts: List[Dict[str, Any]], rules: Rules, employees: Dict[str, Dict[str, Any]]) -> List[str]:
    """shifts: {"emp", "date" (date), "start" (hour), "end" (hour), "breaks": minutes}. Returns violations, empty when the roster is legal."""
    out: List[str] = []
    by_emp: Dict[str, List[Dict[str, Any]]] = {}
    for s in shifts:
        by_emp.setdefault(s["emp"], []).append(s)
        length = s["end"] - s["start"]
        e = employees.get(s["emp"], {})
        if length > rules.max_daily_hours:
            out.append(f"{s['emp']} {s['date']}: {length} h exceeds the {rules.max_daily_hours} h daily maximum")
        if length < rules.min_shift_hours:
            out.append(f"{s['emp']} {s['date']}: shift of {length} h is below the {rules.min_shift_hours} h minimum")
        if length > rules.break_after_hours and s.get("breaks", 0) < rules.break_minutes:
            out.append(f"{s['emp']} {s['date']}: a break of {rules.break_minutes} min is mandatory after {rules.break_after_hours} h")
        if s["date"].weekday() in e.get("unavailable_weekdays", []):
            out.append(f"{s['emp']} {s['date']}: employee is not available on this weekday")
    for emp, ss in by_emp.items():
        ss.sort(key=lambda s: (s["date"], s["start"]))
        for a, b in zip(ss, ss[1:]):
            gap = (dt.datetime.combine(b["date"], dt.time(b["start"])) - dt.datetime.combine(a["date"], dt.time(a["end"]))).total_seconds() / 3600
            if gap < rules.min_rest_hours:
                out.append(f"{emp}: only {gap:.1f} h rest between {a['date']} and {b['date']} (minimum {rules.min_rest_hours} h)")
        weeks: Dict[Tuple[int, int], float] = {}
        for s in ss:
            k = s["date"].isocalendar()[:2]
            weeks[k] = weeks.get(k, 0) + (s["end"] - s["start"])
        for k, h in weeks.items():
            if h > rules.max_weekly_hours + rules.max_overtime_weekly:
                out.append(f"{emp}: {h} h in week {k[1]} exceeds the weekly cap including overtime")
        days = sorted({s["date"] for s in ss})
        run = 1
        for a, b in zip(days, days[1:]):
            run = run + 1 if (b - a).days == 1 else 1
            if run > rules.max_consecutive_days:
                out.append(f"{emp}: more than {rules.max_consecutive_days} consecutive days ending {b}")
                break
    return out


def required_skills_ok(shifts: List[Dict[str, Any]], employees: Dict[str, Dict[str, Any]], day: dt.date, hour: int, need: Dict[str, int]) -> Dict[str, bool]:
    on = [employees[s["emp"]] for s in shifts if s["date"] == day and s["start"] <= hour < s["end"]]
    return {skill: sum(1 for e in on if skill in e.get("skills", [])) >= n for skill, n in need.items()}


# ------------------------------------------------------------------------------------------------------------------- recommendation

SHIFT_TEMPLATES = [(8, 12), (8, 14), (9, 17), (10, 18), (12, 20), (14, 20), (9, 15), (11, 19)]


def recommend(day: dt.date, requirement: Dict[int, int], employees: Dict[str, Dict[str, Any]], rules: Rules, *, cost_per_hour: float = 1.0, wait_cost_per_agent_hour_short: float = 3.0) -> Dict[str, Any]:
    """Greedy cover: repeatedly add the shift that closes the most uncovered agent-hours per hour of labour, then assign the employees available that day. Reports any hour that could not be covered."""
    need = dict(requirement)
    chosen: List[Tuple[int, int]] = []
    while any(v > 0 for v in need.values()) and len(chosen) < 60:
        best, gain = None, 0.0
        for s, e in SHIFT_TEMPLATES:
            if e - s > rules.max_daily_hours:
                continue
            g = sum(1 for h in range(s, e) if need.get(h, 0) > 0) / (e - s)
            if g > gain:
                best, gain = (s, e), g
        if not best:
            break
        chosen.append(best)
        for h in range(*best):
            if need.get(h, 0) > 0:
                need[h] -= 1
    avail = [e for e, d in employees.items() if day.weekday() not in d.get("unavailable_weekdays", [])]
    shifts, used, unfilled = [], set(), []
    for s, e in sorted(chosen, key=lambda x: -(x[1] - x[0])):
        pick = next((emp for emp in avail if emp not in used), None)
        if pick is None:
            unfilled.append((s, e))
            continue
        used.add(pick)
        shifts.append({"emp": pick, "date": day, "start": s, "end": e, "breaks": rules.break_minutes if e - s > rules.break_after_hours else 0})
    cover = {h: sum(1 for x in shifts if x["start"] <= h < x["end"]) for h in requirement}
    short = {h: requirement[h] - cover[h] for h in requirement if cover[h] < requirement[h]}
    hours = sum(x["end"] - x["start"] for x in shifts)
    return {"shifts": shifts, "labour_hours": hours, "labour_cost": round(hours * cost_per_hour, 2), "short_hours": short, "unfilled_templates": unfilled,
            "expected_shortfall_cost": round(sum(short.values()) * wait_cost_per_agent_hour_short, 2), "legal": validate_roster(shifts, rules, employees) == []}
