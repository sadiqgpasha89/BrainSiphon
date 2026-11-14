"""UPI ReqPay (collect and pay) parsing, an illustrative subset of the NPCI structure.

The element and attribute names below follow the public shape of the UPI `ReqPay` message (Head, Meta, Txn, Payer, Payees, Amount).
It is **not** the normative specification: NPCI issues the current schema, signing rules and certification suite only through the
customer's sponsor PSP bank. Treat this as the mapping skeleton and replace it with a parser generated from the schema the bank gives you.
"""
from __future__ import annotations

import xml.etree.ElementTree as ET
from typing import Any, Dict

NS = {"upi": "http://npci.org/upi/schema/"}


class UpiError(ValueError):
    pass


def parse_reqpay(xml: str) -> Dict[str, Any]:
    try:
        root = ET.fromstring(xml)
    except ET.ParseError as e:
        raise UpiError(f"not well-formed XML: {e}") from e
    if not root.tag.endswith("ReqPay"):
        raise UpiError(f"expected ReqPay, got {root.tag}")

    def find(path: str):
        return root.find(path) if root.find(path) is not None else root.find(path.replace("upi:", ""))

    def el(name: str):
        return next((e for e in root.iter() if e.tag.split("}")[-1] == name), None)

    head, txn, payer, amount = el("Head"), el("Txn"), el("Payer"), None
    if head is None or txn is None or payer is None:
        raise UpiError("Head, Txn and Payer are required")
    payees = [e for e in root.iter() if e.tag.split("}")[-1] == "Payee"]
    amount = next((e for e in payer if e.tag.split("}")[-1] == "Amount"), None)
    if amount is None:
        raise UpiError("Payer/Amount is required")
    dev = {t.get("name"): t.get("value") for t in payer.iter() if t.tag.split("}")[-1] == "Tag"}
    ttype = txn.get("type")
    if ttype not in ("PAY", "COLLECT"):
        raise UpiError(f"Txn@type must be PAY or COLLECT, got {ttype!r}")
    return {
        "msg_id": head.get("msgId"), "txn_id": txn.get("id"), "txn_type": ttype, "ref_id": txn.get("refId"), "ts": txn.get("ts"),
        "payer_vpa": payer.get("addr"), "payer_code": payer.get("code"), "payee_vpa": payees[0].get("addr") if payees else None,
        "amount": amount.get("value"), "currency": amount.get("curr", "INR"),
        "device": {"id": dev.get("ID"), "ip": dev.get("IP"), "os": dev.get("OS"), "app": dev.get("APP"), "geo": dev.get("GEOCODE")},
    }


def build_respay(req: Dict[str, Any], result: str, err_code: str = "", approval_ref: str = "") -> str:
    """RespPay-shaped acknowledgement carrying the decision (SUCCESS / FAILURE) and an error code for declines."""
    return (f'<upi:RespPay xmlns:upi="http://npci.org/upi/schema/"><Head ver="2.0" msgId="{req["msg_id"]}"/>'
            f'<Resp reqMsgId="{req["msg_id"]}" result="{result}" errCode="{err_code}" approvalNum="{approval_ref}"/></upi:RespPay>')
