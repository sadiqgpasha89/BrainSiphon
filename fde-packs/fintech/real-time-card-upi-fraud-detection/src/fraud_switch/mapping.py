"""External message -> internal score request; model decision -> switch response. Both directions in one place, so a change is reviewed once.

Internal contract: contracts/score-request.schema.json and contracts/score-response.schema.json.
"""
from __future__ import annotations

import datetime as dt
import hashlib
from dataclasses import dataclass
from typing import Any, Dict, Optional

from .hsm import Tokeniser
from .iso8583 import IsoMessage, respond

ENTRY_MODE = {"01": "manual", "02": "magstripe", "05": "chip", "07": "contactless", "81": "ecommerce", "90": "magstripe", "91": "contactless_magstripe"}
PROC_TYPE = {"00": "purchase", "01": "cash", "09": "purchase_cashback", "20": "refund", "30": "balance_inquiry"}
ACTIONS = ("ALLOW", "STEP_UP", "BLOCK")

# decision action -> (DE39, rationale). Agree these with the acquirer: some map STEP_UP to 1A, some to 65 or 70.
RESPONSE_MAP = {"ALLOW": ("00", "approved by risk"), "STEP_UP": ("1A", "additional customer authentication required"), "BLOCK": ("59", "suspected fraud")}


def mmddhhmmss(s: str, year: int) -> str:
    return dt.datetime.strptime(f"{year}{s}", "%Y%m%d%H%M%S").replace(tzinfo=dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def to_score_request(m: IsoMessage, tok: Tokeniser, *, now: Optional[dt.datetime] = None, minor_units: int = 2) -> Dict[str, Any]:
    """ISO 8583 0100/0200 -> internal ScoreRequest. The PAN is tokenised here and never leaves this function in clear."""
    pan = m.get(2)
    if not pan:
        raise ValueError("DE2 (PAN) is required to score")
    year = (now or dt.datetime.now(dt.timezone.utc)).year
    amount_minor = int(m.get(4, "0"))
    return {
        "transaction_id": hashlib.sha256("|".join(map(str, m.key())).encode()).hexdigest()[:32],
        "channel": "card",
        "mti": m.mti,
        "card_token": tok.tokenise(pan),
        "bin": pan[:6],
        "amount_minor": amount_minor,
        "amount": amount_minor / (10 ** minor_units),
        "currency": m.get(49, "356"),
        "txn_type": PROC_TYPE.get(m.get(3, "000000")[:2], "other"),
        "entry_mode": ENTRY_MODE.get(m.get(22, "000")[:2], "unknown"),
        "pin_verified": m.get(22, "000")[2:3] == "1",
        "mcc": m.get(18, ""),
        "merchant_id": m.get(42, "").strip(),
        "terminal_id": m.get(41, "").strip(),
        "acquirer_id": m.get(32),
        "rrn": m.get(37),
        "stan": m.get(11),
        "event_time": mmddhhmmss(m.get(7), year) if m.get(7) else None,
        "emv_present": 55 in m.f,
        "ip": None,
    }


def upi_to_score_request(u: Dict[str, Any], tok: Tokeniser) -> Dict[str, Any]:
    """UPI ReqPay (parsed) -> internal ScoreRequest. Same internal contract as the card path: the model sees one schema."""
    return {
        "transaction_id": hashlib.sha256(f"upi|{u['txn_id']}".encode()).hexdigest()[:32], "channel": "upi", "mti": "UPI-" + u["txn_type"],
        "card_token": tok.tokenise(u["payer_vpa"]), "bin": "", "amount_minor": int(round(float(u["amount"]) * 100)), "amount": float(u["amount"]), "currency": "356",
        "txn_type": "collect" if u["txn_type"] == "COLLECT" else "pay", "entry_mode": "upi", "pin_verified": False, "mcc": u.get("payer_code") or "",
        "merchant_id": u.get("payee_vpa") or "", "terminal_id": (u.get("device") or {}).get("id") or "", "acquirer_id": "", "rrn": u.get("ref_id") or "", "stan": "",
        "event_time": u.get("ts"), "emv_present": False, "ip": (u.get("device") or {}).get("ip"),
    }


@dataclass
class Decision:
    action: str
    score: float
    reason_codes: list
    model_version: str
    source: str = "model"  # model | fallback | stand-in
    approved_amount_minor: Optional[int] = None


def to_switch_response(req: IsoMessage, d: Decision, *, partial_supported: bool = False) -> IsoMessage:
    """Decision -> ISO 0110/0210. A partial approval keeps the requested amount in DE4 and puts the approved amount in DE54."""
    code, _why = RESPONSE_MAP[d.action]
    extra: Dict[int, str] = {}
    if d.approved_amount_minor is not None and d.action == "ALLOW":
        if partial_supported and d.approved_amount_minor < int(req.get(4, "0")):
            code = "10"
            extra[54] = f"0057356C{d.approved_amount_minor:012d}"  # account type 00, amount type 57 (approved), currency 356, credit sign, amount
        elif d.approved_amount_minor < int(req.get(4, "0")):
            code, _ = RESPONSE_MAP["STEP_UP"]  # the requester cannot take a partial approval: do not shrink silently
    auth = hashlib.sha256((req.get(37) + req.get(11)).encode()).hexdigest()[:6].upper() if code in ("00", "10") else ""
    return respond(req, code, auth_id=auth, extra=extra)
