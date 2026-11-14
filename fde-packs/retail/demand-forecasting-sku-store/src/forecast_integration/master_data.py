"""SKU and store master-data reconciliation across the systems that each think they own the truth.

Declare the source of truth per attribute (see docs), then reconcile the others to it. This module turns the identifiers of SAP,
Oracle Retail (RMS), the POS and the e-commerce platform into one canonical id, and reports everything that cannot be matched."""
from __future__ import annotations

import re
from typing import Any, Dict, Iterable, List, Tuple

SOURCE_OF_TRUTH = {
    "sku": "PIM / merchandise system (SAP material master or Oracle Retail item master)", "product_hierarchy": "PIM / merchandise system",
    "store": "Store master in the merchandise system (not the POS terminal table)", "inventory_availability": "Warehouse management and store stock ledger (on-hand and available-to-promise)",
    "sales": "POS transaction log (sales as transacted, not as reported)", "price": "Pricing system / price-change calendar",
}


def norm_sku(s: str) -> str:
    """Canonical SKU key: SAP pads material numbers with leading zeros, POS often sends GTINs, RMS uses item ids with suffixes."""
    s = re.sub(r"\s+", "", str(s)).upper()
    return s.lstrip("0") or "0"


def norm_gtin(g: str) -> str:
    g = re.sub(r"\D", "", str(g))
    return g.zfill(14) if g else ""


def check_digit_ok(gtin: str) -> bool:
    g = re.sub(r"\D", "", gtin)
    if len(g) not in (8, 12, 13, 14):
        return False
    digits = [int(c) for c in g.zfill(14)]
    s = sum(d * (3 if i % 2 == 0 else 1) for i, d in enumerate(digits[:-1]))
    return (10 - s % 10) % 10 == digits[-1]


def reconcile_skus(master: Iterable[Dict[str, Any]], pos_items: Iterable[Dict[str, Any]]) -> Dict[str, Any]:
    """master: {"sku", "gtin", "description", "status"}; pos_items: {"pos_item_id", "gtin"|"sku"}. Returns the crosswalk and what failed to match."""
    by_sku = {norm_sku(m["sku"]): m for m in master}
    by_gtin: Dict[str, str] = {}
    dup_gtin: List[str] = []
    for k, m in by_sku.items():
        g = norm_gtin(m.get("gtin", ""))
        if g:
            if g in by_gtin and by_gtin[g] != k:
                dup_gtin.append(g)
            by_gtin[g] = k
    cross: Dict[str, str] = {}
    unmatched: List[Dict[str, Any]] = []
    bad_check: List[str] = []
    for p in pos_items:
        g = norm_gtin(p.get("gtin", ""))
        if g and not check_digit_ok(g):
            bad_check.append(p["pos_item_id"])
        k = by_gtin.get(g) or (norm_sku(p["sku"]) if p.get("sku") and norm_sku(p["sku"]) in by_sku else None)
        if k:
            cross[p["pos_item_id"]] = k
        else:
            unmatched.append(p)
    return {"crosswalk": cross, "unmatched_pos_items": unmatched, "duplicate_gtins": sorted(set(dup_gtin)), "invalid_check_digit": bad_check,
            "discontinued_with_sales": sorted({k for k in cross.values() if by_sku[k].get("status") in ("discontinued", "delisted")})}


def reconcile_stores(master: Iterable[Dict[str, Any]], pos_stores: Iterable[Dict[str, Any]]) -> Dict[str, Any]:
    by_id = {str(m["store_id"]).lstrip("0"): m for m in master}
    by_alias = {a.upper(): str(m["store_id"]).lstrip("0") for m in master for a in m.get("aliases", [])}
    cross, unmatched = {}, []
    for s in pos_stores:
        k = str(s["store_code"]).lstrip("0")
        if k in by_id:
            cross[s["store_code"]] = k
        elif str(s["store_code"]).upper() in by_alias:
            cross[s["store_code"]] = by_alias[str(s["store_code"]).upper()]
        else:
            unmatched.append(s)
    closed_with_sales = sorted({v for v in cross.values() if by_id[v].get("status") == "closed"})
    return {"crosswalk": cross, "unmatched": unmatched, "closed_stores_with_sales": closed_with_sales}
