"""Canonical identifiers and identity reconciliation between the LMS and the SIS.

Every entity gets a canonical id that is **ours**, minted once and mapped from each system's id; the model and the stores use only the canonical id. The LMS knows a learner as an LTI `sub`
per platform; the SIS knows them as a OneRoster `sourcedId`. They are joined by an explicit, auditable link, not by name."""
from __future__ import annotations

import hashlib
from typing import Any, Dict, List, Optional, Tuple

KINDS = ("institution", "student", "course", "class", "assessment", "skill")


def canon(kind: str, institution: str, *source_ids: str) -> str:
    """Deterministic canonical id: the same inputs always give the same id, across runs and machines. Prefix says what it is."""
    assert kind in KINDS
    return f"{kind[:3]}_" + hashlib.sha256("|".join([kind, institution, *source_ids]).encode()).hexdigest()[:20]


class IdentityMap:
    def __init__(self, institution: str):
        self.inst = institution
        self.links: Dict[Tuple[str, str], str] = {}  # (system, external id) -> canonical student id
        self.review: List[Dict[str, Any]] = []
        self.audit: List[Dict[str, Any]] = []

    def link(self, system: str, ext_id: str, canonical_id: str, by: str, evidence: str) -> None:
        existing = self.links.get((system, ext_id))
        if existing and existing != canonical_id:
            raise ValueError(f"{system}:{ext_id} is already linked to {existing}: unlink it deliberately first")
        self.links[(system, ext_id)] = canonical_id
        self.audit.append({"system": system, "ext_id": ext_id, "canonical": canonical_id, "by": by, "evidence": evidence})

    def resolve_sis(self, rec: Dict[str, Any]) -> str:
        """A SIS student record mints (or finds) the canonical id. The SIS is the system of record for who a student is."""
        k = ("sis", rec["sourcedId"])
        if k not in self.links:
            self.link("sis", rec["sourcedId"], canon("student", self.inst, rec["sourcedId"]), "system", "SIS sourcedId")
        return self.links[k]

    def match_lms(self, lms_sub: str, lms: Dict[str, Any], sis_students: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Link an LMS user to a SIS student. Automatic only on a strong key (the SIS id carried in the LMS record, or an institutional email that is unique).
        Name and birthdate similarity only produces a *review* item: two children with the same name in one school is ordinary."""
        if ("lms", lms_sub) in self.links:
            return {"canonical": self.links[("lms", lms_sub)], "how": "existing link"}
        if lms.get("sis_id"):
            hits = [s for s in sis_students if s["sourcedId"] == lms["sis_id"]]
            if len(hits) == 1:
                c = self.resolve_sis(hits[0])
                self.link("lms", lms_sub, c, "system", "lms record carries the SIS id")
                return {"canonical": c, "how": "sis id"}
        if lms.get("email"):
            hits = [s for s in sis_students if (s.get("email") or "").lower() == lms["email"].lower()]
            if len(hits) == 1:
                c = self.resolve_sis(hits[0])
                self.link("lms", lms_sub, c, "system", "unique institutional email")
                return {"canonical": c, "how": "unique email"}
        look = [s["sourcedId"] for s in sis_students if s.get("familyName", "").lower() == lms.get("family", "").lower() and s.get("givenName", "").lower() == lms.get("given", "").lower()]
        self.review.append({"lms_sub": lms_sub, "candidates": look, "why": "no strong key: needs a person to decide"})
        return {"canonical": None, "how": "review"}
