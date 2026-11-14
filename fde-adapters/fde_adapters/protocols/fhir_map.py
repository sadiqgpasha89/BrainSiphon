"""HL7 v2 to FHIR R4 mapping for the resources a clinical-decision-support integration needs: Patient, Encounter, Observation.

Decisions encoded here (each is a place real integrations go wrong):
  - identity: the identifier is (assigning authority, MRN); a merge (ADT A40) re-points, it never creates a second patient
  - time: effective time is when the measurement happened (OBX-14, else OBR-7), never when the message arrived; the delay is recorded
  - results: P preliminary, F final, C corrected (replaces the prior value with the same identifier), X cancelled, D deleted -> entered-in-error
  - units: normalised to the unit the model was trained on, with a UCUM code; unknown unit conversions fail loudly, they are not guessed
  - codes: local codes go through a crosswalk to LOINC; an unmapped code is kept and flagged, never dropped silently
"""
from __future__ import annotations

import datetime as dt
from typing import Any, Dict, List, Optional, Tuple

from ..core.mapping import UNITS
from .hl7v2 import Hl7Error, Message, hl7_time, unescape

STATUS = {"F": "final", "C": "corrected", "P": "preliminary", "X": "cancelled", "D": "entered-in-error", "W": "entered-in-error", "R": "preliminary", "S": "preliminary", "I": "registered", "O": "registered"}
GENDER = {"M": "male", "F": "female", "O": "other", "U": "unknown", "A": "other", "N": "unknown"}
CLASS = {"I": "IMP", "E": "EMER", "O": "AMB", "P": "PRENC", "R": "AMB", "B": "OBSENC"}
ENC_STATUS = {"A01": "in-progress", "A04": "in-progress", "A08": "in-progress", "A02": "in-progress", "A03": "finished", "A11": "cancelled", "A13": "in-progress", "A06": "in-progress", "A07": "in-progress"}
UCUM = {"mmol/L": "mmol/L", "mg/dL": "mg/dL", "umol/L": "umol/L", "mmHg": "mm[Hg]", "%": "%", "/min": "/min", "bpm": "/min", "Cel": "Cel", "C": "Cel", "F": "[degF]", "g/dL": "g/dL", "K/uL": "10*3/uL", "10*3/uL": "10*3/uL", "mg/L": "mg/L", "ng/mL": "ng/mL", "mL/min": "mL/min"}
FLAGS = {"H": "H", "L": "L", "HH": "HH", "LL": "LL", "N": "N", "A": "A", "AA": "AA", "<": "L", ">": "H"}

# local code -> (LOINC code, display, the unit the model expects)
DEFAULT_CROSSWALK: Dict[str, Tuple[str, str, str]] = {
    "LACT": ("2524-7", "Lactate [Moles/volume] in Serum or Plasma", "mmol/L"),
    "2524-7": ("2524-7", "Lactate [Moles/volume] in Serum or Plasma", "mmol/L"),
    "WBC": ("6690-2", "Leukocytes [#/volume] in Blood", "10*3/uL"),
    "6690-2": ("6690-2", "Leukocytes [#/volume] in Blood", "10*3/uL"),
    "CREAT": ("2160-0", "Creatinine [Mass/volume] in Serum or Plasma", "mg/dL"),
    "2160-0": ("2160-0", "Creatinine [Mass/volume] in Serum or Plasma", "mg/dL"),
    "HR": ("8867-4", "Heart rate", "/min"),
    "8867-4": ("8867-4", "Heart rate", "/min"),
    "TEMP": ("8310-5", "Body temperature", "Cel"),
    "8310-5": ("8310-5", "Body temperature", "Cel"),
    "SBP": ("8480-6", "Systolic blood pressure", "mm[Hg]"),
    "8480-6": ("8480-6", "Systolic blood pressure", "mm[Hg]"),
    "RR": ("9279-1", "Respiratory rate", "/min"),
    "9279-1": ("9279-1", "Respiratory rate", "/min"),
    "SPO2": ("59408-5", "Oxygen saturation in Arterial blood by Pulse oximetry", "%"),
    "59408-5": ("59408-5", "Oxygen saturation in Arterial blood by Pulse oximetry", "%"),
}


def _ids(m: Message, field: str) -> List[Dict[str, str]]:
    out = []
    for rep in field.split(m.enc[1]):
        parts = rep.split(m.enc[0])
        if parts[0]:
            out.append({"value": parts[0], "authority": parts[3] if len(parts) > 3 else "", "type": parts[4] if len(parts) > 4 else ""})
    return out


def authority_system(authority: str) -> str:
    return f"urn:oid:hospital:{authority.lower()}" if authority else "urn:oid:hospital:unknown"


def patient(m: Message) -> Dict[str, Any]:
    pid = m.seg("PID")
    if not pid:
        raise Hl7Error("no PID segment")
    ids = _ids(m, pid.f(3))
    mrn = next((i for i in ids if i["type"] in ("MR", "")), None)
    if not mrn:
        raise Hl7Error("PID-3 has no patient identifier of type MR")
    name = pid.f(5).split(m.enc[0])
    dob = pid.f(7)
    return {
        "resourceType": "Patient",
        "identifier": [{"use": "usual", "type": {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/v2-0203", "code": i["type"] or "MR"}]}, "system": authority_system(i["authority"]), "value": i["value"]} for i in ids],
        "name": [{"family": unescape(name[0], m.enc), "given": [unescape(g, m.enc) for g in name[1:2] if g]}],
        "gender": GENDER.get(pid.f(8), "unknown"),
        **({"birthDate": f"{dob[:4]}-{dob[4:6]}-{dob[6:8]}"} if len(dob) >= 8 else {}),
        "_key": {"system": authority_system(mrn["authority"]), "value": mrn["value"]},
    }


def encounter(m: Message, patient_key: Dict[str, str]) -> Dict[str, Any]:
    pv1 = m.seg("PV1")
    if not pv1:
        raise Hl7Error("no PV1 segment")
    trig = m.trigger.split("^")[1] if "^" in m.trigger else ""
    loc = pv1.f(3).split(m.enc[0])
    visit = pv1.f(19).split(m.enc[0])[0]
    if not visit:
        raise Hl7Error("PV1-19 (visit number) is missing: encounters cannot be matched without it")
    return {
        "resourceType": "Encounter",
        "identifier": [{"system": authority_system(m.msh.f(4)) + ":visit", "value": visit}],
        "status": ENC_STATUS.get(trig, "in-progress"),
        "class": {"system": "http://terminology.hl7.org/CodeSystem/v3-ActCode", "code": CLASS.get(pv1.f(2), "AMB")},
        "subject": {"identifier": patient_key},
        "location": [{"location": {"display": f"{loc[0]} {loc[1] if len(loc) > 1 else ''} {loc[2] if len(loc) > 2 else ''}".strip()}, "_unit": loc[0], "_room": loc[1] if len(loc) > 1 else "", "_bed": loc[2] if len(loc) > 2 else ""}],
        "period": {k: v for k, v in {"start": hl7_time(pv1.f(44)), "end": hl7_time(pv1.f(45))}.items() if v},
        "_key": {"system": authority_system(m.msh.f(4)) + ":visit", "value": visit},
    }


def _range(txt: str) -> Optional[Dict[str, Any]]:
    if "-" in txt and not txt.startswith("-"):
        lo, _, hi = txt.partition("-")
        try:
            return {"low": {"value": float(lo)}, "high": {"value": float(hi)}}
        except ValueError:
            return None
    for p, k in (("<", "high"), (">", "low")):
        if txt.startswith(p):
            try:
                return {k: {"value": float(txt[1:])}}
            except ValueError:
                return None
    return None


def observations(m: Message, patient_key: Dict[str, str], encounter_key: Optional[Dict[str, str]], *, crosswalk: Optional[Dict[str, Tuple[str, str, str]]] = None,
                 reference_ranges: Optional[Dict[str, Dict[str, float]]] = None, late_after_seconds: int = 3600) -> List[Dict[str, Any]]:
    """One Observation per numeric OBX. Non-numeric and unknown-unit results are returned with `_issues`, never dropped."""
    cw = crosswalk or DEFAULT_CROSSWALK
    obr = m.seg("OBR")
    filler = (obr.f(3).split(m.enc[0])[0] if obr else "") or m.control_id
    obr_time = hl7_time(obr.f(7)) if obr else None
    issued = hl7_time(obr.f(22)) if obr and obr.f(22) else hl7_time(m.msh.f(7))
    out: List[Dict[str, Any]] = []
    for x in m.segs("OBX"):
        issues: List[str] = []
        code_parts = x.f(3).split(m.enc[0])
        local = code_parts[0]
        system = code_parts[2] if len(code_parts) > 2 else ""
        loinc = cw.get(local)
        if not loinc:
            issues.append(f"code {local!r} ({system}) is not in the crosswalk")
        effective = hl7_time(x.f(14)) or obr_time or issued
        if not effective:
            issues.append("no observation time (OBX-14 and OBR-7 are empty)")
        status = STATUS.get(x.f(11), "unknown")
        if not x.f(11):
            issues.append("OBX-11 result status is empty: treated as unknown")
        value: Dict[str, Any] = {}
        raw_val = x.f(5)
        units = x.f(6).split(m.enc[0])[0]
        if x.f(2) == "NM":
            try:
                v = float(raw_val)
                target = loinc[2] if loinc else None
                src_u = UCUM.get(units, units)
                if target and units and src_u != target:
                    fn = UNITS.get((units, {"mmol/L": "mmol/L", "umol/L": "umol/L", "mg/dL": "mg/dL"}.get(target, target), {"2524-7": "lactate", "2160-0": "creatinine"}.get(loinc[0], ""))) or UNITS.get((units, target, ""))
                    if fn is None:
                        issues.append(f"unit {units!r} cannot be converted to {target!r}")
                        value = {"valueQuantity": {"value": v, "unit": units, "system": "http://unitsofmeasure.org", "code": src_u}}
                    else:
                        value = {"valueQuantity": {"value": round(fn(v), 4), "unit": target, "system": "http://unitsofmeasure.org", "code": target}, "_original": {"value": v, "unit": units}}
                else:
                    value = {"valueQuantity": {"value": v, "unit": units or (target or ""), "system": "http://unitsofmeasure.org", "code": src_u or target or ""}}
            except ValueError:
                issues.append(f"OBX-5 {raw_val!r} is not numeric for a numeric (NM) observation")
        else:
            value = {"valueString": unescape(raw_val, m.enc)}
        flag = FLAGS.get(x.f(8))
        rr = _range(x.f(7))
        site = (reference_ranges or {}).get(loinc[0] if loinc else local)
        if site:
            rr = {"low": {"value": site["low"]}, "high": {"value": site["high"]}}
        ident = {"system": authority_system(m.msh.f(4)) + ":obx", "value": f"{filler}-{x.f(1)}-{local}"}
        delay = None
        if effective and issued:
            delay = int((dt.datetime.fromisoformat(issued.replace("Z", "+00:00")) - dt.datetime.fromisoformat(effective.replace("Z", "+00:00"))).total_seconds())
        o: Dict[str, Any] = {
            "resourceType": "Observation",
            "identifier": [ident],
            "status": status,
            "category": [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/observation-category", "code": "laboratory" if (obr and obr.f(4)) else "vital-signs"}]}],
            "code": {"coding": [{"system": "http://loinc.org", "code": loinc[0], "display": loinc[1]}] if loinc else [{"system": f"urn:local:{system or 'unknown'}", "code": local}]},
            "subject": {"identifier": patient_key},
            **({"encounter": {"identifier": encounter_key}} if encounter_key else {}),
            **({"effectiveDateTime": effective} if effective else {}),
            **({"issued": issued} if issued else {}),
            **value,
            **({"interpretation": [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation", "code": flag}]}]} if flag else {}),
            **({"referenceRange": [rr]} if rr else {}),
            "_key": ident,
            "_late": bool(delay is not None and delay > late_after_seconds),
            "_delay_seconds": delay,
            "_issues": issues,
        }
        out.append(o)
    return out


def strip_internal(res: Dict[str, Any]) -> Dict[str, Any]:
    """The resource as it should be sent to a FHIR server: internal `_` keys removed."""
    return {k: (strip_internal(v) if isinstance(v, dict) else [strip_internal(i) if isinstance(i, dict) else i for i in v] if isinstance(v, list) else v) for k, v in res.items() if not k.startswith("_")}


def supersedes(existing: Optional[Dict[str, Any]], incoming: Dict[str, Any]) -> str:
    """Decide what to do with an observation whose identifier already exists: 'create', 'ignore' (duplicate or stale), or 'replace' (corrected)."""
    if existing is None:
        return "create"
    rank = {"entered-in-error": 4, "corrected": 3, "final": 2, "preliminary": 1, "cancelled": 1, "registered": 0, "unknown": 0}
    ex, inc = rank.get(existing.get("status", "unknown"), 0), rank.get(incoming.get("status", "unknown"), 0)
    if inc > ex:
        return "replace"
    if inc == ex and existing.get("valueQuantity") != incoming.get("valueQuantity") and incoming.get("status") == "corrected":
        return "replace"
    return "ignore"
