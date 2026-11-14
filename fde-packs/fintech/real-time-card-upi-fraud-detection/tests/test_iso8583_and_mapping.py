import datetime as dt

import pytest

from fraud_switch import iso8583 as iso
from fraud_switch import upi
from fraud_switch.hsm import SoftwareTokeniser
from fraud_switch.mapping import Decision, to_score_request, to_switch_response, upi_to_score_request

TOK = SoftwareTokeniser({"k1": b"k1-dev-only"}, "k1")
NOW = dt.datetime(2026, 3, 14, tzinfo=dt.timezone.utc)


def auth(over=None):
    f = {2: "4111111111111111", 3: "000000", 4: "000000150000", 7: "0314093000", 11: "000123", 12: "093000", 13: "0314", 18: "5411", 22: "051", 32: "410001", 37: "607309000123", 41: "TERM0001", 42: "MERCHANT000001 ", 49: "356"}
    f.update(over or {})
    return iso.IsoMessage("0100", f)


def test_pack_unpack_round_trip_for_every_field_kind():
    m = auth()
    m.f.update({35: "4111111111111111=29121011234", 43: "SHOP NAME".ljust(40), 48: "X" * 120, 52: "0123456789ABCDEF", 55: "9F2608" + "AA" * 8, 102: "1234567890"})
    for bm in ("hex", "binary"):
        out = iso.unpack(iso.pack(m, bitmap=bm), bitmap=bm)
        assert out.mti == "0100" and out.f == m.f, bm


def test_a_known_message_has_the_expected_bytes_and_secondary_bitmap_is_used_only_when_needed():
    m = iso.IsoMessage("0800", {7: "0314093000", 11: "000001", 70: "301"})
    b = iso.pack(m)
    assert b == b"0800" + b"8220000000000000" + b"0400000000000000" + b"0314093000" + b"000001" + b"301"
    assert iso.pack(auth()).startswith(b"01007238")  # primary bitmap only: no field above 64
    assert iso.unpack(b).f == m.f


@pytest.mark.parametrize("bad,msg", [(b"01007238440108C0800016411", "ends inside"), (b"01007238440108C080001641111111111111110000000000000125500314" + b"X", None), (b"ABCD" + b"0" * 16, "not numeric")])
def test_truncated_and_malformed_messages_are_rejected_not_misread(bad, msg):
    with pytest.raises(iso.IsoError, match=msg):
        iso.unpack(bad)


def test_pack_enforces_the_field_table():
    with pytest.raises(iso.IsoError, match="numeric"):
        iso.pack(auth({"4": "x"}) if False else iso.IsoMessage("0100", {4: "12A"}))
    with pytest.raises(iso.IsoError, match="not in the field table"):
        iso.pack(iso.IsoMessage("0100", {99: "x"}))
    with pytest.raises(iso.IsoError, match="maximum"):
        iso.pack(iso.IsoMessage("0100", {2: "1" * 20}))


def test_retransmission_has_the_same_key_but_a_reversal_does_not():
    a, b = auth(), iso.IsoMessage("0101", auth().f)
    assert a.key() == b.key()
    assert a.key() != iso.IsoMessage("0400", a.f).key()
    assert a.key() != auth({11: "000124"}).key()


def test_card_request_maps_to_the_internal_contract_and_never_carries_the_pan():
    req = to_score_request(auth({22: "071"}), TOK, now=NOW)
    assert req["card_token"].startswith("k1:") and "4111111111111111" not in str(req)
    assert (req["channel"], req["amount_minor"], req["amount"], req["currency"], req["entry_mode"], req["mcc"], req["bin"]) == ("card", 150000, 1500.0, "356", "contactless", "5411", "411111")
    assert req["event_time"] == "2026-03-14T09:30:00Z" and req["merchant_id"] == "MERCHANT000001" and req["rrn"] == "607309000123"
    assert req["emv_present"] is False and to_score_request(auth({55: "9F26"}), TOK, now=NOW)["emv_present"] is True
    with pytest.raises(ValueError):
        to_score_request(iso.IsoMessage("0100", {4: "1"}), TOK)


def test_upi_collect_and_pay_map_to_the_same_internal_contract():
    xml = ('<upi:ReqPay xmlns:upi="http://npci.org/upi/schema/"><Head ver="2.0" ts="2026-03-14T09:30:00+05:30" orgId="ACQ" msgId="MSG1"/>'
           '<Meta><Tag name="PAYSVC" value="UPI"/></Meta><Txn id="TXN9" note="rent" refId="REF1" ts="2026-03-14T09:30:00+05:30" type="COLLECT"/>'
           '<Payer addr="alice@okbank" name="Alice" seqNum="1" type="PERSON" code="0000"><Device><Tag name="ID" value="DEV42"/><Tag name="IP" value="203.0.113.9"/></Device>'
           '<Amount value="2500.00" curr="INR"/></Payer><Payees><Payee addr="bob@okbank" name="Bob" seqNum="1" type="PERSON" code="0000"><Amount value="2500.00" curr="INR"/></Payee></Payees></upi:ReqPay>')
    u = upi.parse_reqpay(xml)
    assert (u["txn_type"], u["payer_vpa"], u["payee_vpa"], u["amount"], u["device"]["id"]) == ("COLLECT", "alice@okbank", "bob@okbank", "2500.00", "DEV42")
    req = upi_to_score_request(u, TOK)
    assert req["channel"] == "upi" and req["amount_minor"] == 250000 and req["txn_type"] == "collect" and req["card_token"].startswith("k1:") and "alice" not in str(req)
    assert set(req) == set(to_score_request(auth(), TOK, now=NOW)), "card and UPI share one internal schema"
    assert "MSG1" in upi.build_respay(u, "FAILURE", "U16")
    with pytest.raises(upi.UpiError, match="PAY or COLLECT"):
        upi.parse_reqpay(xml.replace('type="COLLECT"', 'type="NOPE"'))
    with pytest.raises(upi.UpiError, match="well-formed"):
        upi.parse_reqpay("<x")


def test_decision_to_response_code_mapping_and_partial_approval_rules():
    req = auth()
    assert to_switch_response(req, Decision("ALLOW", 0.1, [], "v"), partial_supported=False).get(39) == "00"
    assert to_switch_response(req, Decision("STEP_UP", 0.6, ["X"], "v")).get(39) == "1A"
    assert to_switch_response(req, Decision("BLOCK", 0.9, ["X"], "v")).get(39) == "59"
    r = to_switch_response(req, Decision("ALLOW", 0.1, [], "v", approved_amount_minor=75000), partial_supported=True)
    assert r.get(39) == "10" and r.get(4) == "000000150000" and r.get(54).endswith("000000075000"), "partial approval: DE4 keeps the request, DE54 carries the approved amount"
    r2 = to_switch_response(req, Decision("ALLOW", 0.1, [], "v", approved_amount_minor=75000), partial_supported=False)
    assert r2.get(39) == "1A", "a requester that cannot take a partial approval is never silently given less"
    assert to_switch_response(req, Decision("ALLOW", 0.1, [], "v")).get(38) != "" and to_switch_response(req, Decision("BLOCK", 0.9, [], "v")).get(38) == ""


def test_tokeniser_rotation_overlap_and_retirement():
    t = SoftwareTokeniser({"k1": b"one"}, "k1")
    old = t.tokenise("4111111111111111")
    assert t.tokenise("4111111111111111") == old and old.startswith("k1:")
    t.rotate("k2", b"two")
    new = t.tokenise("4111111111111111")
    assert new.startswith("k2:") and new != old
    assert t.matches("4111111111111111", old) and t.matches("4111111111111111", new), "both verify during the overlap window"
    t.retire("k1")
    assert not t.matches("4111111111111111", old)
    with pytest.raises(ValueError):
        t.retire("k2")
