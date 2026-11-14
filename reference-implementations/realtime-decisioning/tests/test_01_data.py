"""Source integration, CDC, validation and ingestion."""

from sqlalchemy import func, select

from bsref import bus, cdc, db
from data import ingest, schema, source_system, worker


def test_every_valid_source_transaction_is_landed_exactly_once(world):
    with db.tx() as c:
        source = c.execute(select(func.count()).select_from(schema.core_transactions)).scalar_one()
        landed = c.execute(select(func.count()).select_from(schema.raw_transactions)).scalar_one()
        distinct = c.execute(select(func.count(func.distinct(schema.raw_transactions.c.txn_id)))).scalar_one()
    assert landed == source == distinct == world["seeded"]["emitted"]["txn"]


def test_malformed_events_are_quarantined_with_their_violations(world):
    with db.tx() as c:
        rows = c.execute(select(db.quarantine.c.violations).where(db.quarantine.c.dataset == "transaction")).scalars().all()
    assert len(rows) == world["seeded"]["emitted"]["malformed"] > 0
    joined = " ".join(rows)
    assert "amount" in joined and "rail" in joined and "card_id: missing" in joined and "country" in joined


def test_no_event_was_dead_lettered_and_the_consumer_is_caught_up(world):
    with db.tx() as c:
        assert c.execute(select(func.count()).select_from(db.dead_letters)).scalar_one() == 0
        assert bus.lag(c, ingest.TOPIC, ingest.GROUP) == 0


def test_rerunning_cdc_and_ingestion_changes_nothing(world):
    out = worker.run_once()
    assert out["cdc"]["relayed"] == 0 and out["consumer"]["processed"] == 0


def test_a_duplicate_source_event_is_ignored(world):
    with db.tx() as c:
        txn = dict(c.execute(select(schema.core_transactions).limit(1)).mappings().one())
        before = c.execute(select(func.count()).select_from(schema.raw_transactions)).scalar_one()
    with db.tx(db.source_engine()) as c:
        cdc.append_outbox(c, "payment", "txn.authorised", txn["txn_id"], txn)  # the switch emits the same event again
    out = worker.run_once()
    with db.tx() as c:
        after = c.execute(select(func.count()).select_from(schema.raw_transactions)).scalar_one()
    assert out["ingest"]["duplicates"] == 1 and after == before


def test_chargebacks_become_fraud_labels_at_their_filing_time(world):
    with db.tx() as c:
        n = c.execute(select(func.count()).select_from(schema.labels).where(schema.labels.c.source == "chargeback")).scalar_one()
        early = c.execute(
            select(func.count()).select_from(schema.labels.join(
                schema.raw_transactions, schema.labels.c.txn_id == schema.raw_transactions.c.txn_id))
            .where(schema.labels.c.label_time <= schema.raw_transactions.c.event_time)
        ).scalar_one()
    assert n == world["seeded"]["emitted"]["chargeback"] > 20
    assert early == 0  # a label never exists before its transaction


def test_the_world_is_deterministic_for_a_seed():
    a = source_system.build_world(3, 20, 10, 1_800_000_000.0)
    b = source_system.build_world(3, 20, 10, 1_800_000_000.0)
    assert a == b and len(a) > 100
