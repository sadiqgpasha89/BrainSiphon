"""QTI 2.1 assessment items: parse the question and the correct response, and map a learner's response to correctness and the skills the item measures."""
from __future__ import annotations

import xml.etree.ElementTree as ET
from typing import Any, Dict, List

NS = {"q": "http://www.imsglobal.org/xsd/imsqti_v2p1"}


class QtiError(ValueError):
    pass


def parse_item(xml: str) -> Dict[str, Any]:
    try:
        root = ET.fromstring(xml)
    except ET.ParseError as e:
        raise QtiError(f"not well-formed XML: {e}") from e
    if not root.tag.endswith("assessmentItem"):
        raise QtiError("root element must be assessmentItem")
    tag = lambda e: e.tag.split("}")[-1]  # noqa: E731
    decl = next((e for e in root if tag(e) == "responseDeclaration"), None)
    if decl is None:
        raise QtiError("responseDeclaration is required")
    correct = [v.text for cr in decl if tag(cr) == "correctResponse" for v in cr if tag(v) == "value"]
    inter = next((e for e in root.iter() if tag(e).endswith("Interaction")), None)
    choices = [{"id": c.get("identifier"), "text": "".join(c.itertext()).strip()} for c in (inter.iter() if inter is not None else []) if tag(c) == "simpleChoice"]
    meta = {m.get("name"): m.get("content") for m in root.iter() if tag(m) == "meta"}
    return {"identifier": root.get("identifier"), "title": root.get("title"), "cardinality": decl.get("cardinality"), "base_type": decl.get("baseType"), "interaction": tag(inter) if inter is not None else None, "choices": choices, "correct": correct,
            "skills": [s for s in (meta.get("skills") or "").split(",") if s]}


def score_response(item: Dict[str, Any], response: List[str]) -> Dict[str, Any]:
    if item["cardinality"] == "single":
        ok = len(response) == 1 and response[0] in item["correct"]
    else:
        ok = sorted(response) == sorted(item["correct"])
    guess_risk = 1 / len(item["choices"]) if item["choices"] else None
    return {"item": item["identifier"], "correct": ok, "skills": item["skills"], "guess_probability": guess_risk}
