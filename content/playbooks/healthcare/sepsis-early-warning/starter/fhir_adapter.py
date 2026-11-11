"""HL7 FHIR v4 Observation and Encounter parser for real-time vitals extraction."""

from __future__ import annotations

from typing import Any, Dict, Optional

# Standard LOINC codes for clinical vitals
LOINC_MAP = {
    "8867-4": "hr",        # Heart rate (beats/min)
    "8480-6": "sbp",       # Systolic blood pressure (mmHg)
    "9279-1": "rr",        # Respiratory rate (breaths/min)
    "8310-5": "temp",      # Body temperature (Celsius)
    "2708-6": "spo2",      # Oxygen saturation (%)
    "2524-7": "lactate",   # Blood lactate (mmol/L)
}

def parse_fhir_observation(obs: Dict[str, Any]) -> tuple[Optional[str], Optional[float]]:
    """Extract metric name and numeric value from a FHIR v4 Observation resource."""
    code_coding = obs.get("code", {}).get("coding", [])
    metric_name = None
    for coding in code_coding:
        code = coding.get("code")
        if code in LOINC_MAP:
            metric_name = LOINC_MAP[code]
            break

    if not metric_name:
        return None, None

    val = obs.get("valueQuantity", {}).get("value")
    if val is not None:
        try:
            return metric_name, float(val)
        except (ValueError, TypeError):
            return metric_name, None
    return metric_name, None

def parse_fhir_bundle(bundle: Dict[str, Any]) -> Dict[str, float]:
    """Parse a FHIR transaction bundle of vitals into a flat feature dictionary."""
    vitals: Dict[str, float] = {}
    entries = bundle.get("entry", [])
    for entry in entries:
        resource = entry.get("resource", {})
        if resource.get("resourceType") == "Observation":
            metric, val = parse_fhir_observation(resource)
            if metric and val is not None:
                vitals[metric] = val
    return vitals

