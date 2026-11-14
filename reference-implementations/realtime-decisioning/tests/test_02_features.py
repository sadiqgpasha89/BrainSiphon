"""Feature correctness: no leakage, and one implementation for training and serving."""

import json

from sqlalchemy import select

from bsref import db, featurestore
from data import ingest, schema
from features import backfill, transforms


def _txn(t, **kw):
    return {"txn_id": f"x{t}", "card_id": 1, "merchant_id": 9, "device_id": 5, "amount": 100.0, "rail": "card",
            "country": "IN", "event_time": float(t), **kw}


def test_features_describe_the_past_only():
    card, device, merchant = transforms.new_card(), transforms.new_device(), transforms.new_merchant()
    first = transforms.compute(_txn(1000), card, device, merchant)
    assert first["card_txn_count_24h"] == 0 and first["is_new_device_for_card"] == 1 and first["amount_to_card_avg_ratio"] == 1
    transforms.update(_txn(1000), card, device, merchant)
    second = transforms.compute(_txn(1600, amount=400.0), card, device, merchant)
    assert second["card_txn_count_1h"] == 1 and second["card_amount_sum_24h"] == 100.0
    assert second["amount_to_card_avg_ratio"] == 4.0 and second["secs_since_last_txn"] == 600
    assert second["is_new_device_for_card"] == 0 and second["is_new_merchant_for_card"] == 0


def test_merchant_rate_counts_only_chargebacks_already_filed():
    card, device, merchant = transforms.new_card(), transforms.new_device(), transforms.new_merchant()
    for t in range(10):
        transforms.update(_txn(t), card, device, merchant)
    before = transforms.compute(_txn(50), card, device, merchant)["merchant_chargeback_rate"]
    transforms.on_chargeback(merchant, 60.0)
    after = transforms.compute(_txn(70), card, device, merchant)["merchant_chargeback_rate"]
    assert before == 0.0 and after > 0.02


def test_mule_device_signal_counts_other_cards_only():
    device = transforms.new_device()
    for card_id in (1, 2, 3):
        transforms.update(_txn(100 + card_id, card_id=card_id), transforms.new_card(), device, transforms.new_merchant())
    f = transforms.compute(_txn(200, card_id=1), transforms.new_card(), device, transforms.new_merchant())
    assert f["device_distinct_cards_7d"] == 2


def test_streaming_features_equal_the_offline_replay(world):
    """Training/serving skew check: the features logged by the streaming path match a from-scratch offline replay."""
    with db.tx() as c:
        report = backfill.parity(c)
    assert report["rows"] > 10000 and report["max_abs_difference"] < 1e-9, report


def test_the_scoring_path_reproduces_the_logged_features(world):
    """For the newest transaction of a card, features from the online store (minus that transaction) equal the logged ones."""
    with db.tx() as c:
        last = dict(c.execute(select(schema.raw_transactions).order_by(schema.raw_transactions.c.event_time.desc()).limit(1))
                    .mappings().one())
        logged = json.loads(c.execute(select(schema.txn_features.c.features)
                                      .where(schema.txn_features.c.txn_id == last["txn_id"])).scalar_one())
        nxt = {**last, "txn_id": "probe-000001", "event_time": last["event_time"] + 60}
        online = ingest.online_features(c, nxt)
    assert online["card_txn_count_1h"] == logged["card_txn_count_1h"] + 1  # the store now includes `last`
    assert online["secs_since_last_txn"] == 60 and online["is_new_merchant_for_card"] == 0


def test_feature_view_is_the_model_signature(world):
    names = featurestore.feature_names("fraud_txn")
    card, device, merchant = transforms.new_card(), transforms.new_device(), transforms.new_merchant()
    assert list(transforms.compute(_txn(1), card, device, merchant)) == names
