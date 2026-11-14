import datetime as dt
import json
import os

import pytest

from fde_adapters.core import registry
from avm_integration import access, address, commercial, comps, licence, reso, workflow

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TODAY = dt.date(2026, 3, 14)


def pack(name):
    return json.load(open(os.path.join(ROOT, "market_packs", f"{name}.json")))


def lic(name="us-reso", **kw):
    p = pack(name)["licence"]
    return licence.Licence("MLS-X", uses=set(p["uses"]), fields_by_use={k: set(v) for k, v in p.get("fields_by_use", {"valuation": ["ListingKey", "ClosePrice"]}).items()}, attribution=p["attribution"], redistribute=p["redistribute"], retention_days=p.get("retention_days"), **kw)


# ---------------------------------------------------------------------------------------------- licence

def test_licence_field_filter_use_check_attribution_redistribution_audit_and_retention():
    L = lic()
    rec = {"ListingKey": "L1", "ClosePrice": 500000, "CloseDate": "2026-02-01", "AgentPhone": "555", "ListAgentFullName": "A", "LivingArea": 1800}
    got = L.filter(rec, "valuation", "avm-service", TODAY)
    assert "AgentPhone" not in got and "ListAgentFullName" not in got and got["ClosePrice"] == 500000, "personal agent data is not licensed for valuation and never enters the platform"
    assert L.audit[0]["fields"] == sorted(got) and L.audit[0]["use"] == "valuation" and L.audit[0]["user"] == "avm-service"
    with pytest.raises(licence.LicenceViolation, match="not licensed"):
        L.filter(rec, "marketing", "x", TODAY)
    with pytest.raises(licence.LicenceViolation, match="redistributed"):
        L.publish({"value": 1}, "external", TODAY)
    out = L.publish({"value": 1}, "internal", TODAY)
    assert "courtesy of the local MLS" in out["attribution"]
    open_data = lic("uk-land-registry")
    assert "Open Government Licence" in open_data.publish({"value": 1}, "external", TODAY)["attribution"]
    ended = lic(status="terminated")
    with pytest.raises(licence.LicenceViolation, match="terminated"):
        ended.filter(rec, "valuation", "x", TODAY)
    with pytest.raises(licence.LicenceViolation, match="expired"):
        lic(expires=dt.date(2026, 1, 1)).filter(rec, "valuation", "x", TODAY)
    assert L.purge_due([{"ListingKey": "old", "_retrieved": "2023-01-01"}, {"ListingKey": "new", "_retrieved": "2026-01-01"}], TODAY) == ["old"]


def test_every_market_pack_is_complete_and_states_how_to_get_the_data():
    for name in ("us-reso", "uk-land-registry", "in-state-registry"):
        p = pack(name)
        assert p["identifiers"]["parcel"]["pattern"] and p["licence"]["onboarding"] and "uses" in p["licence"] and "attribution" in p["licence"] and p["comparables"]["min_usable"] >= 3, name


# ---------------------------------------------------------------------------------------------- RESO

def test_reso_paging_filter_select_and_mapping_to_canonical_with_unit_normalisation(monkeypatch):
    srv = reso.mock_reso(7, 3)
    monkeypatch.setenv("MLS_TOKEN", "t")
    cfg = {"adapter": "reso-webapi", "name": "mls", "connection": {"base_url": srv.base, "mls": "MLS-X", "auth": {"type": "bearer", "token_env": "MLS_TOKEN"}},
           "read": {"since": "2026-01-01T00:00:00Z", "statuses": ["Closed"], "page_size": 3, "select": list(reso.FIELD_MAP)}, "retry": {"max_attempts": 2, "base_delay": 0, "max_delay": 0}}
    try:
        a = registry.build(cfg)
        assert a.healthcheck().ok
        recs = [r.raw or r.payload for r in a.read()]
        assert len(recs) == 7 and len(srv.calls("GET")) >= 4
        q = srv.calls("GET")[1]["query"]
        assert "ModificationTimestamp" in q and "StandardStatus" in q
        assert all("AgentPhone" not in r for r in recs), "$select keeps unlicensed fields off the wire"
        c = reso.to_canonical({**recs[0], "LivingArea": 100, "LivingAreaUnits": "SquareMeters"})
        assert c["listing_id"] == "L1" and c["living_area"] == pytest.approx(1076.4, abs=0.1) and c["area_unit"] == "SquareFeet" and c["price_per_sqft"] > 400 and c["_issues"] == []
        assert "closed listing without" in reso.to_canonical({"StandardStatus": "Closed", "ListingKey": "X"})["_issues"][0]
    finally:
        srv.close()


# ---------------------------------------------------------------------------------------------- addresses, parcels, duplicates, units

def test_address_normalisation_makes_different_spellings_match():
    a, b = address.normalise("123 North Main Street, Apt 4B, Springfield, IL 62704"), address.normalise("123 N. Main St  #4b Springfield IL 62704")
    assert a["unit"] == b["unit"] == "4B" and a["street_key"].startswith("123 n main st") and a["zip5"] == "62704" and a["key"] == b["key"]
    assert address.normalise("9 Elm Road")["unit"] == "" and address.normalise("9 Elm Road")["key"] != address.normalise("9 Elm Road Unit 2")["key"]


def test_parcel_ids_follow_the_market_format_and_bad_ones_are_reported():
    p = pack("us-reso")["identifiers"]["parcel"]["pattern"]
    assert address.parcel_id("14-003-001", p)["valid"] and not address.parcel_id("14003001", p)["valid"] and address.parcel_id("14 .003.001", r"^\d{11}$")["digits"] == "14003001"


def test_duplicate_relistings_are_one_sale_and_units_group_by_building():
    ls = [{"listing_id": "A", "address_raw": "10 Oak St, Town IL 60601", "status": "Closed", "sale_date": "2026-02-01", "sale_price": 400000}, {"listing_id": "B", "address_raw": "10 Oak Street, Town IL 60601", "status": "Closed", "sale_date": "2026-02-10", "sale_price": 400500},
          {"listing_id": "C", "address_raw": "10 Oak St, Town IL 60601", "status": "Closed", "sale_date": "2025-06-01", "sale_price": 350000}, {"listing_id": "D", "address_raw": "22 Pine Ave #3, Town IL 60601", "status": "Active"}, {"listing_id": "E", "address_raw": "22 Pine Ave #5, Town IL 60601", "status": "Active"}]
    r = address.resolve_duplicates(ls)
    oak = next(p for p in r["properties"] if p["property_key"].startswith("10 oak"))
    assert oak["sales"] == ["C", "A"] and oak["listings"] == ["C", "A", "B"]
    assert r["probable_duplicate_sales"] == [{"property": oak["property_key"], "kept": "A", "duplicate": "B"}], "B is the same sale as A: a relisting or a second feed, ten days apart at the same price"
    assert address.unit_relationships(ls) == {"22 pine ave town il 60601": ["3", "5"]}


# ---------------------------------------------------------------------------------------------- comparables, adjustments, confidence

SUBJECT = {"property_type": "Residential", "property_subtype": "SingleFamily", "lat": 39.78, "lon": -89.65, "living_area": 1800, "bedrooms": 3, "year_built": 1995}


def comp(i, area=1800, beds=3, year=1995, price=500000, days=30, dlat=0.002, sub="SingleFamily", typ="Residential"):
    return {"listing_id": f"C{i}", "property_type": typ, "property_subtype": sub, "lat": 39.78 + dlat, "lon": -89.65, "living_area": area, "bedrooms": beds, "year_built": year, "sale_price": price, "sale_date": (TODAY - dt.timedelta(days=days)).isoformat()}


def test_comparable_eligibility_and_ranking():
    s = lambda c: comps.similarity(SUBJECT, c, TODAY)  # noqa: E731
    assert s(comp(1)) > s(comp(2, area=2300, days=200, dlat=0.02))
    assert s(comp(3, typ="Commercial")) is None and s(comp(4, sub="Condo")) is None and s(comp(5, dlat=0.1)) is None and s(comp(6, days=400)) is None


def test_adjustments_move_the_comparable_towards_the_subject_and_cap_gross_and_net():
    bigger = comp(1, area=2000, beds=4, year=2005, price=560000)
    a = comps.adjust(SUBJECT, bigger, price_per_sqft=280)
    assert a["adjustments"]["size"] == (1800 - 2000) * 280 and a["adjustments"]["bedrooms"] == -8000 and a["adjustments"]["age"] == (1995 - 2005) * 400, "a larger, newer comparable is adjusted down to the subject"
    assert a["adjusted_price"] == 560000 + a["net"] and a["usable"]
    wild = comps.adjust(SUBJECT, comp(2, area=2800, beds=5, year=1950, price=500000), price_per_sqft=280)
    assert not wild["usable"] and wild["gross_pct"] > 0.25, "a comparable that needs more than 25% of adjustments is flagged and not used"


def test_valuation_range_and_the_low_confidence_escalation_thresholds():
    cs = [comp(i, area=1800 + i * 20, price=500000 + i * 2000, days=20 + i * 10) for i in range(6)]
    v = comps.select_and_value(SUBJECT, cs, TODAY)
    assert 480000 < v["value"] < 505000 and v["low"] <= v["value"] <= v["high"] and v["n_usable"] >= 3 and v["range_pct"] < 0.1
    c = comps.confidence(v, model_value=v["value"] * 1.02)
    assert c["level"] == "high" and c["route"] == "automated" and c["reasons"] == []
    far = comps.confidence(v, model_value=v["value"] * 1.3)
    assert far["route"] != "automated" and "differs from the comparable value" in far["reasons"][0]
    thin = comps.select_and_value(SUBJECT, cs[:2], TODAY)
    assert thin["value"] is None and "usable" in thin["reason"] and comps.confidence(thin)["route"] == "human appraiser" and comps.confidence(thin)["score"] == 0.0
    noisy = comps.select_and_value(SUBJECT, [comp(i, price=p) for i, p in enumerate([300000, 600000, 480000, 700000, 520000])], TODAY)
    cn = comps.confidence(noisy)
    assert cn["level"] in ("low", "medium") and any("range" in r for r in cn["reasons"])
    assert comps.select_and_value(SUBJECT, [comp(9, dlat=0.5)], TODAY)["comparables"] == []


# ---------------------------------------------------------------------------------------------- commercial, access, workflow

def test_commercial_valuation_is_separate_and_refuses_without_income_data():
    rec = {"gross_potential_rent": 1_200_000, "occupancy": 0.92, "operating_expenses": 400_000, "cap_rate_source": "broker survey Q4", "lease_roll": [1], "area_rentable": 30000}
    r = commercial.direct_capitalisation(rec, "office", cap_rate=0.07)
    assert r["noi"] == round(1_200_000 * 0.92 - 400_000) and r["value"] == round((1_200_000 * 0.92 - 400_000) / 0.07) and r["route"].startswith("commercial appraiser")
    assert "occupancy" in commercial.direct_capitalisation({**rec, "occupancy": None}, "office", cap_rate=0.07)["reason"]
    assert commercial.direct_capitalisation({**rec, "operating_expenses": 2_000_000}, "office", cap_rate=0.07)["reason"].startswith("net operating income")
    assert commercial.direct_capitalisation({**rec, "occupancy": 1.0}, "office", cap_rate=0.07)["egi"] == round(1_200_000 * 0.95), "never assumes better than the vacancy floor"
    with pytest.raises(ValueError, match="residential"):
        commercial.missing_data("house", rec)


def test_role_access_hides_licensed_comparables_from_roles_that_may_not_receive_them():
    val = {"value": 510000, "low": 495000, "high": 525000, "range_pct": 0.06, "confidence": {"level": "high"}, "comparables": [{"listing_id": "C1", "sale_price": 500000, "adjustments": {"size": 1}}]}
    assert "comparables" in access.redact(val, "appraiser") and "comparables" not in access.redact(val, "broker") and access.redact(val, "broker")["comparables_summary"]["n"] == 1
    assert access.redact(val, "borrower") == {"low": 495000, "high": 525000} and "confidence" in access.redact(val, "underwriter") and "comparables" not in access.redact(val, "underwriter")
    assert access.redact(val, "nobody") == {} and not access.can("broker", "adjustments")


def test_review_challenge_and_underwriting_payload():
    low = comps.confidence({"value": 500000, "range_pct": 0.3, "n_usable": 3})
    v = workflow.Valuation("V1", "10 Oak St", 500000, 450000, 560000, low, "avm-3.2")
    assert v.state == "appraiser_review"
    now = dt.datetime(2026, 3, 14, tzinfo=dt.timezone.utc)
    with pytest.raises(workflow.WorkflowError, match="licensed appraiser"):
        v.review("analyst.x", "analyst", now)
    with pytest.raises(workflow.WorkflowError, match="must state why"):
        v.review("appr.lee", "appraiser", now, adopted_value=430000)
    with pytest.raises(workflow.WorkflowError, match="only a final"):
        workflow.underwriting_payload(v, "x")
    v.review("appr.lee", "appraiser", now, adopted_value=480000, note="two superior-condition comparables were excluded")
    p = workflow.underwriting_payload(v, "Listing data courtesy of the local MLS")
    assert p["collateral_value"] == 480000 and p["reviewed_by"] == "appr.lee" and p["method"] == "AVM with human review" and "comparables" not in p and p["attribution"].startswith("Listing data")
    with pytest.raises(workflow.WorkflowError, match="reason and at least one"):
        v.challenge("lender.q", "underwriter", now, "too high", [])
    v.challenge("lender.q", "underwriter", now, "a sale next door at 420k closed last week", ["MLS 98765 closing statement"])
    assert v.state == "challenged"
    with pytest.raises(workflow.WorkflowError, match="licensed appraiser"):
        v.review("analyst.x", "analyst", now)
    v.review("appr.lee", "appraiser", now, adopted_value=455000, note="added the new sale")
    assert v.final_value == 455000 and [h["state"] for h in v.history][-2:] == ["challenged", "final"]
    auto = workflow.Valuation("V2", "x", 500000, 495000, 505000, {"route": "automated", "level": "high", "reasons": []}, "avm-3.2")
    assert auto.state == "automated"
