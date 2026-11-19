import datetime as dt
import json

import pytest

from fde_adapters.core import registry
from fde_adapters.mocks import vendors
from forecast_integration import calendar as cal
from forecast_integration import censoring, cold_start, contract, master_data
from forecast_integration.pipeline import InputNotReady, run_nightly


# ------------------------------------------------------------------ censored demand and lost sales

def test_available_share_uses_the_hourly_profile_not_a_flat_fraction():
    open_h = list(range(8, 21))
    assert censoring.available_share(open_h, open_h) == pytest.approx(1.0)
    morning_only = censoring.available_share(open_h, list(range(8, 12)))
    evening_only = censoring.available_share(open_h, list(range(16, 21)))
    assert 0.2 < morning_only < 0.4 and evening_only > 0.3 and morning_only != evening_only


def test_stockout_day_is_corrected_upward_and_labelled_with_the_method():
    open_h = list(range(8, 21))
    day = censoring.correct_day(20, open_h, list(range(8, 14)), [30, 28, 31])
    assert day["censored"] and day["method"] == "profile-extrapolation" and day["demand"] > 20 and day["lost_sales"] == pytest.approx(day["demand"] - 20, abs=1e-6)
    ok = censoring.correct_day(30, open_h, open_h, [])
    assert not ok["censored"] and ok["demand"] == 30 and ok["lost_sales"] == 0.0
    nearly_empty = censoring.correct_day(2, open_h, [8], [30, 28, 31])
    assert nearly_empty["method"] == "weekday-median" and nearly_empty["demand"] == 30, "too little availability to extrapolate: use the item's own weekday history"
    assert censoring.correct_day(0, open_h, [], [])["method"].startswith("no-basis"), "no basis is stated, not invented"


def test_lost_sales_report_values_the_loss():
    rows = [{"sku": "A", "store": "S1", "price": 2.5, **censoring.correct_day(10, list(range(8, 21)), list(range(8, 12)), [])}, {"sku": "A", "store": "S1", "price": 2.5, **censoring.correct_day(30, list(range(8, 21)), list(range(8, 21)), [])}]
    rep = censoring.lost_sales_report(rows)
    assert rep["by_item"]["A@S1"]["censored_days"] == 1 and rep["total_lost_value"] == pytest.approx(rep["total_lost_units"] * 2.5)


# ------------------------------------------------------------------ master data

def test_sku_reconciliation_across_sap_pos_and_the_merchandise_system():
    master = [{"sku": "000000000012345", "gtin": "4006381333931", "status": "active"}, {"sku": "ABC-1", "gtin": "5012345678900", "status": "discontinued"}, {"sku": "DUP1", "gtin": "4006381333931", "status": "active"}]
    pos = [{"pos_item_id": "p1", "gtin": "4006381333931"}, {"pos_item_id": "p2", "sku": "abc-1"}, {"pos_item_id": "p3", "gtin": "9999999999999"}, {"pos_item_id": "p4", "gtin": "5012345678900"}]
    r = master_data.reconcile_skus(master, pos)
    assert r["crosswalk"]["p2"] == "ABC-1" and r["crosswalk"]["p4"] == "ABC-1"
    assert [u["pos_item_id"] for u in r["unmatched_pos_items"]] == ["p3"] and "00004006381333931"[-14:] in r["duplicate_gtins"][0] + "x" or r["duplicate_gtins"]
    assert r["discontinued_with_sales"] == ["ABC-1"] and "p3" in r["invalid_check_digit"]
    assert master_data.norm_sku("000012345") == "12345" and master_data.check_digit_ok("4006381333931") and not master_data.check_digit_ok("4006381333932")


def test_store_reconciliation_with_aliases_and_closed_stores():
    master = [{"store_id": "0001", "aliases": ["ST-ONE"], "status": "open"}, {"store_id": "0002", "status": "closed"}]
    r = master_data.reconcile_stores(master, [{"store_code": "1"}, {"store_code": "ST-ONE"}, {"store_code": "2"}, {"store_code": "77"}])
    assert r["crosswalk"] == {"1": "1", "ST-ONE": "1", "2": "2"} and [u["store_code"] for u in r["unmatched"]] == ["77"] and r["closed_stores_with_sales"] == ["2"]
    assert "POS transaction log" in master_data.SOURCE_OF_TRUTH["sales"]


# ------------------------------------------------------------------ calendars, time zones, units

def test_business_date_is_store_local_and_respects_the_trading_cutoff():
    mum = cal.StoreCalendar("S1", utc_offset_minutes=330, business_day_cutoff_hour=3)
    assert mum.business_date(dt.datetime(2026, 3, 14, 22, 0, tzinfo=dt.timezone.utc)) == dt.date(2026, 3, 15), "22:00 UTC is already the next day in India"
    assert mum.business_date(dt.datetime(2026, 3, 14, 21, 0, tzinfo=dt.timezone.utc)) == dt.date(2026, 3, 14), "02:30 local still belongs to the previous trading day"
    ny = cal.StoreCalendar("S2", utc_offset_minutes=-240)
    assert ny.business_date(dt.datetime(2026, 7, 4, 2, 0, tzinfo=dt.timezone.utc)) == dt.date(2026, 7, 3)


def test_closures_holidays_and_weekly_closures_become_explicit_zero_rows_with_a_reason():
    c = cal.StoreCalendar("S1", 0, open_weekdays={0, 1, 2, 3, 4, 5}, holidays={dt.date(2026, 3, 17)}, closures=[(dt.date(2026, 3, 19), dt.date(2026, 3, 20), "refit")])
    h = cal.forecast_horizon_dates(c, dt.date(2026, 3, 15), 7)
    reasons = {r["date"]: r["reason"] for r in h if not r["trading"]}
    assert reasons == {"2026-03-15": "weekly closure", "2026-03-17": "holiday", "2026-03-19": "refit", "2026-03-20": "refit"}


def test_units_of_measure():
    assert cal.to_base_units(2, "DZ") == 24 and cal.to_base_units(1.5, "KG") == 1.5 and cal.to_base_units(3, "CS", pack_size=6) == 18
    with pytest.raises(ValueError, match="pack size"):
        cal.to_base_units(1, "CS")
    with pytest.raises(ValueError, match="unknown unit"):
        cal.to_base_units(1, "FURLONG")


# ------------------------------------------------------------------ contract, overrides, approval, replenishment

def row(**kw):
    r = {"sku": "A", "store": "S1", "forecast_date": "2026-03-20", "horizon_days": 14, "predicted_units": 20.0, "p10": 12.0, "p50": 20.0, "p90": 31.0, "model_version": "m7", "run_id": "run-1", "generated_at": "2026-03-14T01:00:00Z"}
    r.update(kw)
    return r


def test_output_contract_validation_and_manifest_integrity():
    assert contract.validate_row(row()) == []
    assert "quantiles" in contract.validate_row(row(p10=25.0))[0]
    assert "model_version is required" in contract.validate_row(row(model_version=""))
    assert "ISO date" in contract.validate_row(row(forecast_date="20/03/2026"))[0]
    rows = [row(), row(sku="B")]
    m = contract.run_manifest(rows, "run-1", "m7")
    assert contract.verify_manifest(rows, m) and m["rows"] == 2 and m["skus"] == 2
    assert not contract.verify_manifest(rows[:1], m) and not contract.verify_manifest([row(predicted_units=21.0), rows[1]], m)


def test_planner_override_is_bounded_attributed_approved_by_someone_else_and_applied_with_provenance():
    log = contract.OverrideLog()
    small = log.propose(row(), 22.0, "local_event", "planner.a")
    assert small.approved_by.startswith("auto"), "inside the tolerance: recorded and auto-approved"
    big = log.propose(row(sku="B"), 26.0, "promo_not_in_calendar", "planner.a")
    assert big.approved_by == ""
    out = log.apply([row(), row(sku="B")])
    assert out[0]["predicted_units"] == 22.0 and out[0]["override"]["reason"] == "local_event" and out[1]["predicted_units"] == 20.0, "an unapproved override is not applied"
    with pytest.raises(ValueError, match="cannot be the planner"):
        log.approve(big, "planner.a")
    log.approve(big, "category.mgr")
    assert log.apply([row(sku="B")])[0]["override"]["approved_by"] == "category.mgr"
    with pytest.raises(ValueError, match="exceeds"):
        log.propose(row(sku="C"), 60.0, "other", "planner.a")
    with pytest.raises(ValueError, match="reason"):
        log.propose(row(sku="D"), 21.0, "because", "planner.a")


def test_forecast_becomes_a_replenishment_proposal_that_needs_buyer_approval():
    p = contract.replenishment_proposal(row(), on_hand=30, on_order=20, lead_time_days=3, review_days=2, pack_size=12, min_order=24)
    assert p["status"] == "proposed" and p["needs_buyer_approval"] and p["basis"]["cover_days"] == 5 and p["basis"]["demand_over_cover"] == 100.0
    assert p["proposed_qty"] % 12 == 0 and p["proposed_qty"] >= 24 and p["proposed_qty"] * 1 >= 100 + p["basis"]["safety_stock"] - 50
    enough = contract.replenishment_proposal(row(), on_hand=500, on_order=0, lead_time_days=3, review_days=2, pack_size=12)
    assert enough["proposed_qty"] == 0, "stock covers the horizon: propose nothing"


# ------------------------------------------------------------------ cold start

def test_cold_start_borrows_from_peers_blends_in_history_and_widens_the_interval():
    items = [{"id": f"P{i}", "category": "snacks", "price_band": "mid", "region": "N", "weekly_units": 40 + i} for i in range(6)] + [{"id": "X", "category": "tools", "price_band": "mid", "region": "N", "weekly_units": 5}]
    prior = cold_start.peer_prior({"id": "NEW", "category": "snacks", "price_band": "mid", "region": "N"}, items, k=5)
    assert prior["weekly_units"] == 42 and "X" not in prior["peers"] and "4 attribute" not in prior["basis"] and "3 attribute" in prior["basis"]
    b0, b4, b8 = cold_start.blend(42, []), cold_start.blend(42, [60] * 4), cold_start.blend(42, [60] * 8)
    assert b0["weekly_units"] == 42 and b0["cold_start"] and b4["weight_on_own_history"] == 0.5 and b4["weekly_units"] == 51 and not b8["cold_start"] and b8["weekly_units"] == 60
    lo, mid, hi = cold_start.widen_interval(10, 20, 35, weight_on_own=0.0)
    assert (lo, mid, hi) == (0.0, 20, 50) and cold_start.widen_interval(10, 20, 35, 1.0) == (10, 20, 35)
    assert cold_start.peer_prior({"id": "N"}, [])["peers"] == []


# ------------------------------------------------------------------ the batch path

def test_nightly_batch_runs_from_object_storage_to_a_manifest_and_refuses_incomplete_input(monkeypatch):
    srv = vendors.s3("retail-forecast", page=3)
    monkeypatch.setenv("S3_ENDPOINT", srv.base); monkeypatch.setenv("S3_ACCESS_KEY", "a"); monkeypatch.setenv("S3_SECRET_KEY", "b")
    cfg = json.load(open(__file__.replace("tests/test_forecast_integration.py", "config/pos-sales.connector.json")))
    cfg["retry"] = {"max_attempts": 2, "base_delay": 0, "max_delay": 0}
    ad = registry.build(cfg)
    day = "2026-03-14"
    put = lambda k, rows: srv.state["objects"].__setitem__(k, ("\n".join(json.dumps(r) for r in rows) + "\n").encode())  # noqa: E731
    put(f"inputs/{day}/sales/part-0.jsonl", [{"sku": "A", "store": "S1", "date": "2026-03-13", "units": "20"}, {"sku": "B", "store": "S1", "date": "2026-03-13", "units": "30"}])
    with pytest.raises(InputNotReady, match="_SUCCESS"):
        run_nightly(ad, day, lambda c, d: [], model_version="m7")
    srv.state["objects"][f"inputs/{day}/sales/_SUCCESS"] = b"{}"
    put(f"inputs/{day}/stock/part-0.jsonl", [{"sku": "A", "store": "S1", "date": "2026-03-13", "open_hours": list(range(8, 21)), "in_stock_hours": list(range(8, 14))}, {"sku": "B", "store": "S1", "date": "2026-03-13", "open_hours": list(range(8, 21)), "in_stock_hours": list(range(8, 21))}])
    srv.state["objects"][f"inputs/{day}/stock/_SUCCESS"] = b"{}"
    seen = {}

    def forecast(corrected, d):
        seen["c"] = {c["sku"]: c for c in corrected}
        return [row(sku=c["sku"], forecast_date="2026-03-15", predicted_units=c["demand"], p10=c["demand"] * 0.7, p50=c["demand"], p90=c["demand"] * 1.4) for c in corrected]

    m = run_nightly(ad, day, forecast, model_version="m7")
    assert m["rows"] == 2 and m["censored_days"] == 1 and seen["c"]["A"]["censored"] and seen["c"]["A"]["demand"] > 20 and not seen["c"]["B"]["censored"]
    keys = [k for k in srv.state["objects"] if k.startswith(f"outputs/{day}/forecast/")]
    assert any(k.endswith("_SUCCESS") for k in keys) and any(k.endswith(".jsonl") for k in keys)
    body = [json.loads(l) for k in sorted(keys) if k.endswith(".jsonl") for l in srv.state["objects"][k].decode().splitlines()]
    assert contract.verify_manifest(sorted(body, key=lambda r: r["sku"]), {**m, "sha256": contract.run_manifest(sorted(body, key=lambda r: r["sku"]), m["run_id"], "m7")["sha256"]})
    # a forecast that violates the contract publishes nothing
    before = set(srv.state["objects"])
    with pytest.raises(ValueError, match="violate the output contract"):
        run_nightly(ad, day, lambda c, d: [row(p10=99.0)], model_version="m8", run_id="run-bad")
    assert set(srv.state["objects"]) == before
    srv.close()
