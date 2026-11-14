"""Appraisal review and challenge workflow, and the payloads to underwriting and collateral management."""
from __future__ import annotations

import datetime as dt
from typing import Any, Dict, List, Optional


class WorkflowError(Exception):
    pass


STATES = ("automated", "analyst_review", "appraiser_review", "challenged", "final", "withdrawn")


class Valuation:
    def __init__(self, vid: str, subject: str, value: Optional[float], low: Optional[float], high: Optional[float], confidence: Dict[str, Any], model_version: str):
        self.id, self.subject, self.value, self.low, self.high, self.confidence, self.model_version = vid, subject, value, low, high, confidence, model_version
        self.state = {"automated": "automated", "analyst review": "analyst_review", "human appraiser": "appraiser_review"}[confidence["route"] if confidence["route"] in ("automated", "analyst review", "human appraiser") else "human appraiser"]
        self.history: List[Dict[str, Any]] = [{"state": self.state, "by": "system", "note": "initial routing: " + "; ".join(confidence.get("reasons", [])) or "confidence high"}]
        self.final_value: Optional[float] = None

    def review(self, by: str, role: str, now: dt.datetime, *, adopted_value: Optional[float] = None, note: str = "") -> None:
        if self.state not in ("analyst_review", "appraiser_review", "challenged"):
            raise WorkflowError(f"cannot review a valuation that is {self.state}")
        if self.state in ("appraiser_review", "challenged") and role != "appraiser":
            raise WorkflowError("this valuation needs a licensed appraiser")
        if adopted_value is not None and self.value and abs(adopted_value - self.value) / self.value > 0.05 and not note:
            raise WorkflowError("a reviewer who moves the value by more than 5% must state why")
        self.final_value = adopted_value if adopted_value is not None else self.value
        self.state = "final"
        self.history.append({"state": "final", "by": by, "role": role, "at": now.isoformat(), "adopted": self.final_value, "model_value": self.value, "note": note})

    def challenge(self, by: str, role: str, now: dt.datetime, reason: str, evidence: List[str]) -> None:
        """A lender, borrower or broker disputes the value. Needs a reason and evidence (for example a recent comparable the model did not see); routes to an appraiser."""
        if self.state != "final" and self.state != "automated":
            raise WorkflowError(f"cannot challenge a valuation that is {self.state}")
        if not reason or not evidence:
            raise WorkflowError("a challenge needs a reason and at least one piece of evidence")
        self.state = "challenged"
        self.history.append({"state": "challenged", "by": by, "role": role, "at": now.isoformat(), "reason": reason, "evidence": evidence})


def underwriting_payload(v: Valuation, licence_attribution: str) -> Dict[str, Any]:
    """What underwriting and collateral management receive: the value they may rely on, the range, the confidence and how it was reached: never the licensed listing data."""
    if v.state != "final":
        raise WorkflowError("only a final valuation goes to underwriting")
    return {"valuation_id": v.id, "subject": v.subject, "collateral_value": v.final_value, "range": [v.low, v.high], "confidence": v.confidence["level"], "model_version": v.model_version,
            "reviewed_by": next((h["by"] for h in reversed(v.history) if h["state"] == "final"), "system"), "attribution": licence_attribution, "method": "AVM with human review" if len(v.history) > 1 else "AVM"}
