"""Build correctly positioned HL7 v2 messages for simulators and tests (ADT and ORU). Fields are placed by number, not by counting pipes."""
from __future__ import annotations

from typing import Any, Dict, List, Optional


def _seg(name: str, fields: Dict[int, str], width: int = 0) -> str:
    n = max([width, *fields]) if fields else width
    return name + "".join("|" + fields.get(i, "") for i in range(1, n + 1))


def msh(trigger: str, control_id: str, ts: str, sending_app: str = "EHR", sending_fac: str = "HOSP1", version: str = "2.5.1") -> str:
    return f"MSH|^~\\&|{sending_app}|{sending_fac}|BRAINSIPHON|FDE|{ts}||{trigger}|{control_id}|P|{version}"


def pid(mrn: str, family: str, given: str, dob: str, sex: str, authority: str = "HOSP1", extra_ids: Optional[List[str]] = None) -> str:
    ids = "~".join([f"{mrn}^^^{authority}^MR", *(extra_ids or [])])
    return _seg("PID", {1: "1", 3: ids, 5: f"{family}^{given}", 7: dob, 8: sex})


def pv1(patient_class: str, location: str, visit: str, admit: str = "", discharge: str = "") -> str:
    return _seg("PV1", {1: "1", 2: patient_class, 3: location, 19: visit, 44: admit, 45: discharge})


def adt(trigger: str, control_id: str, ts: str, mrn: str, family: str, given: str, dob: str, sex: str, patient_class: str, location: str, visit: str,
        admit: str = "", discharge: str = "", merge_from: Optional[str] = None, authority: str = "HOSP1") -> str:
    segs = [msh(f"ADT^{trigger}", control_id, ts), _seg("EVN", {1: trigger, 2: ts}), pid(mrn, family, given, dob, sex, authority)]
    if merge_from:
        segs.append(_seg("MRG", {1: f"{merge_from}^^^{authority}^MR"}))
    segs.append(pv1(patient_class, location, visit, admit, discharge))
    return "\r".join(segs) + "\r"


def oru(control_id: str, ts: str, mrn: str, visit: str, filler_order: str, obs_time: str, results: List[Dict[str, Any]], family: str = "DOE", given: str = "JANE",
        dob: str = "19700225", sex: str = "F", location: str = "ICU^101^A", reported: str = "", authority: str = "HOSP1") -> str:
    """results: [{"code","text","system","value","units","range","flag","status","value_type"}] -> one OBX each."""
    segs = [msh("ORU^R01", control_id, ts), pid(mrn, family, given, dob, sex, authority), pv1("I", location, visit),
            _seg("OBR", {1: "1", 3: filler_order, 4: "PANEL^Panel^L", 7: obs_time, 22: reported or ts})]
    for i, r in enumerate(results, 1):
        segs.append(_seg("OBX", {1: str(i), 2: r.get("value_type", "NM"), 3: f"{r['code']}^{r.get('text', '')}^{r.get('system', 'LN')}", 5: str(r["value"]), 6: r.get("units", ""),
                                 7: r.get("range", ""), 8: r.get("flag", ""), 11: r.get("status", "F"), 14: r.get("time", obs_time)}))
    return "\r".join(segs) + "\r"
