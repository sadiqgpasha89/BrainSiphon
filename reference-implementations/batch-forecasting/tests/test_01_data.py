"""Source integration, CDC with restatements, validation."""

from datetime import date

from sqlalchemy import func, select

from bsref import bus, cdc, db
from data import ingest, schema, source_system, worker


def test_landed_sales_equal_the_source_including_restatements(world):
    """After CDC, every row equals the source system's CURRENT value: restatements were applied as updates."""
    with db.tx() as c:
        src = {tuple(r[:3]): r[3] for r in c.execute(select(schema.core_sales.c.store_id, schema.core_sales.c.sku,
                                                           schema.core_sales.c.day, schema.core_sales.c.units))}
        got = {tuple(r[:3]): r[3] for r in c.execute(select(schema.sales_daily.c.store_id, schema.sales_daily.c.sku,
                                                           schema.sales_daily.c.day, schema.sales_daily.c.units))}
        restated = c.execute(select(func.count()).select_from(schema.sales_daily).where(schema.sales_daily.c.restated == 1)).scalar_one()
    assert got == src and len(got) == world["seeded"]["emitted"]["sale"]
    assert 0 < restated <= world["seeded"]["emitted"]["restate"]


def test_malformed_rows_are_quarantined(world):
    with db.tx() as c:
        rows = c.execute(select(db.quarantine.c.violations)).scalars().all()
        assert c.execute(select(func.count()).select_from(db.dead_letters)).scalar_one() == 0
        assert bus.lag(c, ingest.TOPIC, ingest.GROUP) == 0
    assert len(rows) == world["seeded"]["emitted"]["malformed"] > 0
    assert any("units" in r for r in rows) and any("store_id" in r for r in rows)


def test_an_older_change_arriving_late_cannot_overwrite_a_newer_one(world):
    with db.tx() as c:
        row = dict(c.execute(select(schema.sales_daily).limit(1)).mappings().one())
    payload = {k: row[k] for k in ("store_id", "sku", "day", "on_promo", "stockout", "price")} | {"units": 99999}
    ing = ingest.Ingestor()
    with db.tx() as c:  # replay an event whose source sequence is older than the one already applied
        ing.handle(c, {"event_type": "sales.restated", "key": "k", "source_seq": row["source_seq"] - 1, "data": payload})
        ing.flush(c)
        units = c.execute(select(schema.sales_daily.c.units).where(
            schema.sales_daily.c.store_id == row["store_id"], schema.sales_daily.c.sku == row["sku"],
            schema.sales_daily.c.day == row["day"])).scalar_one()
    assert ing.stats["stale_ignored"] == 1 and units == row["units"]


def test_a_new_restatement_through_cdc_updates_the_row(world):
    with db.tx() as c:
        row = dict(c.execute(select(schema.sales_daily).order_by(schema.sales_daily.c.day).limit(1)).mappings().one())
    payload = {k: row[k] for k in ("store_id", "sku", "day", "on_promo", "stockout", "price")} | {"units": row["units"] + 7}
    with db.tx(db.source_engine()) as c:
        c.execute(schema.core_sales.update().where(
            schema.core_sales.c.store_id == row["store_id"], schema.core_sales.c.sku == row["sku"],
            schema.core_sales.c.day == row["day"]).values(units=payload["units"]))
        cdc.append_outbox(c, "sales", "sales.restated", "k", payload)
    assert worker.run_once()["ingest"]["restatements"] == 1
    assert worker.run_once()["consumer"]["processed"] == 0  # idempotent
    with db.tx() as c:
        assert c.execute(select(schema.sales_daily.c.units).where(
            schema.sales_daily.c.store_id == row["store_id"], schema.sales_daily.c.sku == row["sku"],
            schema.sales_daily.c.day == row["day"])).scalar_one() == row["units"] + 7


def test_the_world_is_deterministic_for_a_seed():
    a = source_system.build_world(5, 2, 3, 60, date(2026, 1, 1))
    assert a == source_system.build_world(5, 2, 3, 60, date(2026, 1, 1)) and len(a) > 300
