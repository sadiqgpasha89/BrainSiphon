import json
import os
import socket
import time

import pytest

from fde_adapters.core import registry
from fde_adapters.core.errors import PermanentError
from fde_adapters.mocks.server import MockServer
from fde_adapters.protocols import fhir_map, hl7_build as B, hl7v2 as H

CFG = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "configs")


def cfg(name):
    d = json.load(open(os.path.join(CFG, f"{name}.connector.json")))
    d["retry"] = {"max_attempts": 3, "base_delay": 0.0, "max_delay": 0.0}
    return d


ADMIT = B.adt("A01", "M001", "20260314093000+0530", "MRN12345", "DOE", "JANE", "19700225", "F", "I", "ICU^101^A", "V0001", admit="20260314090000")


def test_parser_numbers_fields_the_hl7_way_including_msh():
    m = H.parse(ADMIT)
    assert m.type == "ADT^A01" and m.trigger == "ADT^A01" and m.control_id == "M001"
    assert m.msh.f(3) == "EHR" and m.msh.f(4) == "HOSP1" and m.msh.f(7) == "20260314093000+0530" and m.msh.f(12) == "2.5.1"
    assert m.seg("PID").f(3) == "MRN12345^^^HOSP1^MR" and m.seg("PID").f(5) == "DOE^JANE" and m.seg("PID").f(8) == "F"
    assert m.seg("PV1").f(3) == "ICU^101^A" and m.seg("PV1").f(19) == "V0001" and m.seg("PV1").f(44) == "20260314090000"
    assert m.comp(m.seg("PV1").f(3), 2) == "101"


def test_hl7_time_handles_offsets_and_precision():
    assert H.hl7_time("20260314093000+0530") == "2026-03-14T04:00:00Z"
    assert H.hl7_time("202603140930") == "2026-03-14T09:30:00Z"
    assert H.hl7_time("20260314") == "2026-03-14T00:00:00Z"
    assert H.hl7_time("") is None
    with pytest.raises(H.Hl7Error):
        H.hl7_time("2026031")


def test_escape_sequences():
    assert H.unescape("A\\F\\B\\S\\C\\T\\D\\R\\E\\E\\F") == "A|B^C&D~E\\F"


@pytest.mark.parametrize("bad,msg", [("PID|1||X", "MSH"), ("MSH|^~\\&|A|B|C|D|2026||ADT^A01||P|2.5", "MSH-10"), ("MSH|^~\\&|A|B|C|D|2026||ADT^A01|1|P|9.9\rPID|1", "version"), ("MSH|^~\\&|A|B|C|D|2026||ADT^A01|1|P|2.5\rEVN|A01", "PID")])
def test_validation_rejects_what_the_sender_must_fix(bad, msg):
    with pytest.raises(H.Hl7Error, match=msg):
        H.validate(H.parse(bad))


def test_ack_semantics_echo_control_id_and_carry_err_on_failure():
    m = H.parse(ADMIT)
    aa = H.parse(H.build_ack(m, "AA"))
    assert aa.seg("MSA").f(1) == "AA" and aa.seg("MSA").f(2) == "M001" and aa.msh.f(3) == "BRAINSIPHON" and aa.msh.f(5) == "EHR" and aa.seg("ERR") is None
    ae = H.parse(H.build_ack(m, "AE", "db down"))
    assert ae.seg("MSA").f(1) == "AE" and ae.seg("ERR") is not None


def test_mllp_end_to_end_duplicate_reject_and_retry_on_application_error():
    got, state = [], {"fail": 1}

    def handler(m):
        if m.control_id == "FLAKY" and state["fail"]:
            state["fail"] -= 1
            raise RuntimeError("downstream unavailable")
        if m.control_id == "BADDATA":
            raise H.Hl7Error("PV1-19 missing")
        got.append(m.control_id)

    srv = H.MllpServer(handler)
    try:
        assert H.send("127.0.0.1", srv.port, ADMIT)[0] == "AA"
        assert H.send("127.0.0.1", srv.port, ADMIT)[0] == "AA", "a re-sent message is acknowledged again"
        assert got == ["M001"] and srv.duplicates == 1, "but it must not be processed twice"
        flaky = B.adt("A08", "FLAKY", "20260314100000", "MRN12345", "DOE", "JANE", "19700225", "F", "I", "ICU^101^A", "V0001")
        assert H.send("127.0.0.1", srv.port, flaky, retries=3, backoff=0.01)[0] == "AA" and srv.errors and got[-1] == "FLAKY", "AE makes the sender retry with the same control id"
        bad = B.adt("A08", "BADDATA", "20260314100000", "MRN12345", "DOE", "JANE", "19700225", "F", "I", "ICU^101^A", "V0001")
        code, text = H.send("127.0.0.1", srv.port, bad, retries=3, backoff=0.01)
        assert code == "AR" and "PV1-19" in text and "BADDATA" not in got, "AR is final: it is never retried"
    finally:
        srv.close()


def test_mllp_server_survives_garbage_and_a_sender_without_framing():
    srv = H.MllpServer(lambda m: None)
    try:
        s = socket.create_connection(("127.0.0.1", srv.port), timeout=3)
        s.sendall(b"GET / HTTP/1.1\r\n\x1c\r")
        reply = H.read_frame(s)
        assert reply is not None and "MSA|AR" in reply
        s.close()
        assert H.send("127.0.0.1", srv.port, ADMIT)[0] == "AA", "the server keeps serving after a bad client"
    finally:
        srv.close()


def test_a_slow_second_message_on_one_connection_is_still_acknowledged():
    srv = H.MllpServer(lambda m: None)
    try:
        s = socket.create_connection(("127.0.0.1", srv.port), timeout=3)
        for cid in ("A1", "A2"):
            s.sendall(H.frame(B.adt("A08", cid, "20260314100000", "M1", "D", "J", "19700101", "M", "I", "W^1^1", "V1")))
            assert "MSA|AA|" + cid in H.read_frame(s)
        s.close()
    finally:
        srv.close()


# ----------------------------------------------------------------------------------------------------------- FHIR mapping

def oru(**kw):
    d = dict(control_id="R1", ts="20260314120000", mrn="MRN12345", visit="V0001", filler_order="LAB900", obs_time="20260314113000",
             results=[{"code": "LACT", "text": "Lactate", "system": "L", "value": "27.0", "units": "mg/dL", "range": "0.5-2.2", "flag": "HH", "status": "F"}])
    d.update(kw)
    return H.parse(B.oru(**d))


def patient_and_enc(m):
    p = fhir_map.patient(m)
    return p, p["_key"], {"system": fhir_map.authority_system("HOSP1") + ":visit", "value": "V0001"}


def test_patient_and_encounter_mapping_from_adt():
    m = H.parse(ADMIT)
    p = fhir_map.patient(m)
    assert p["gender"] == "female" and p["birthDate"] == "1970-02-25" and p["identifier"][0]["value"] == "MRN12345" and p["_key"]["system"] == "urn:oid:hospital:hosp1"
    e = fhir_map.encounter(m, p["_key"])
    assert e["status"] == "in-progress" and e["class"]["code"] == "IMP" and e["location"][0]["_unit"] == "ICU" and e["period"]["start"] == "2026-03-14T09:00:00Z" and e["identifier"][0]["value"] == "V0001"
    disch = H.parse(B.adt("A03", "M9", "20260315", "MRN12345", "DOE", "JANE", "19700225", "F", "I", "ICU^101^A", "V0001", discharge="20260315100000"))
    assert fhir_map.encounter(disch, p["_key"])["status"] == "finished"
    no_visit = H.parse(B.adt("A01", "M2", "20260314", "MRN1", "D", "J", "19700101", "M", "I", "W^1^1", ""))
    with pytest.raises(H.Hl7Error, match="PV1-19"):
        fhir_map.encounter(no_visit, fhir_map.patient(no_visit)["_key"])


def test_observation_codes_units_status_time_and_late_flag():
    m = oru()
    p, pk, ek = patient_and_enc(m)
    (o,) = fhir_map.observations(m, pk, ek)
    assert o["code"]["coding"][0] == {"system": "http://loinc.org", "code": "2524-7", "display": "Lactate [Moles/volume] in Serum or Plasma"}
    assert abs(o["valueQuantity"]["value"] - 27.0 / 9.008) < 1e-3, "mg/dL lactate is converted to mmol/L, the unit the model trained on"
    assert o["valueQuantity"]["unit"] == "mmol/L" and o["_original"] == {"value": 27.0, "unit": "mg/dL"}
    assert o["effectiveDateTime"] == "2026-03-14T11:30:00Z" and o["issued"] == "2026-03-14T12:00:00Z"
    assert o["status"] == "final" and o["interpretation"][0]["coding"][0]["code"] == "HH"
    assert o["_late"] is False and o["_delay_seconds"] == 1800
    late = fhir_map.observations(oru(reported="20260314180000"), pk, ek)[0]
    assert late["_late"] is True and late["_delay_seconds"] == 6.5 * 3600, "event time stays the draw time; the delay is recorded, not hidden"


def test_site_reference_ranges_override_the_message_range():
    m = oru()
    _, pk, ek = patient_and_enc(m)
    (o,) = fhir_map.observations(m, pk, ek, reference_ranges={"2524-7": {"low": 0.7, "high": 2.0}})
    assert o["referenceRange"][0] == {"low": {"value": 0.7}, "high": {"value": 2.0}}


def test_unmapped_code_unknown_unit_and_missing_status_are_flagged_not_dropped():
    m = oru(results=[{"code": "XYZ", "text": "Local thing", "system": "L", "value": "5", "units": "u", "status": ""}, {"code": "LACT", "value": "abc", "units": "mmol/L", "status": "F"}, {"code": "WBC", "value": "7.1", "units": "furlongs", "status": "F"}])
    _, pk, ek = patient_and_enc(m)
    xs = fhir_map.observations(m, pk, ek)
    assert len(xs) == 3
    assert any("not in the crosswalk" in i for i in xs[0]["_issues"]) and any("result status is empty" in i for i in xs[0]["_issues"])
    assert xs[0]["code"]["coding"][0]["system"] == "urn:local:L"
    assert any("not numeric" in i for i in xs[1]["_issues"])
    assert any("cannot be converted" in i for i in xs[2]["_issues"])


def test_corrected_duplicate_stale_and_deleted_results():
    base = oru()
    _, pk, ek = patient_and_enc(base)
    final = fhir_map.observations(base, pk, ek)[0]
    again = fhir_map.observations(oru(control_id="R2"), pk, ek)[0]
    corrected = fhir_map.observations(oru(control_id="R3", results=[{"code": "LACT", "value": "36.0", "units": "mg/dL", "status": "C"}]), pk, ek)[0]
    prelim = fhir_map.observations(oru(control_id="R4", results=[{"code": "LACT", "value": "30", "units": "mg/dL", "status": "P"}]), pk, ek)[0]
    deleted = fhir_map.observations(oru(control_id="R5", results=[{"code": "LACT", "value": "0", "units": "mg/dL", "status": "D"}]), pk, ek)[0]
    assert fhir_map.supersedes(None, final) == "create"
    assert fhir_map.supersedes(final, again) == "ignore", "an exact duplicate changes nothing"
    assert fhir_map.supersedes(final, corrected) == "replace"
    assert fhir_map.supersedes(corrected, prelim) == "ignore", "a late preliminary must not overwrite a corrected value"
    assert fhir_map.supersedes(final, deleted) == "replace" and deleted["status"] == "entered-in-error"


def test_identity_merge_resolves_the_old_mrn_to_the_surviving_patient():
    a = registry.build(cfg("hl7v2-mllp"))
    port = a.listen()
    try:
        assert H.send("127.0.0.1", port, ADMIT)[0] == "AA"
        merge = B.adt("A40", "MERGE1", "20260314110000", "MRN99999", "DOE", "JANE", "19700225", "F", "I", "ICU^101^A", "V0002", merge_from="MRN12345")
        assert H.send("127.0.0.1", port, merge)[0] == "AA"
        lab = B.oru("R7", "20260314120000", "MRN12345", "V0001", "LAB1", "20260314113000", [{"code": "HR", "value": "112", "units": "/min", "status": "F"}])
        assert H.send("127.0.0.1", port, lab)[0] == "AA"
        recs = list(a.read())
        oru_rec = [r for r in recs if r.payload["kind"] == "oru"][0].payload
        assert oru_rec["observations"][0]["subject"]["identifier"]["value"] == "MRN99999", "results filed under the merged-away MRN land on the surviving patient"
        assert [r.payload["kind"] for r in recs] == ["adt", "adt", "oru"]
    finally:
        a.close()


def test_adapter_rejects_unsupported_message_types_with_ar():
    a = registry.build(cfg("hl7v2-mllp"))
    port = a.listen()
    try:
        orm = "MSH|^~\\&|EHR|H|BS|FDE|20260314||ORM^O01|X1|P|2.5\rPID|1||M1^^^H^MR\r"
        code, text = H.send("127.0.0.1", port, orm, retries=1)
        assert code == "AR" and "not handled" in text
    finally:
        a.close()


# ----------------------------------------------------------------------------------------------------------- FHIR client

def fhir_mock():
    srv = MockServer("fhir")
    srv.state["obs"] = [{"resourceType": "Observation", "id": f"o{i}", "status": "final", "code": {"coding": [{"system": "http://loinc.org", "code": "2524-7"}]}, "subject": {"reference": f"Patient/p{i}"}, "valueQuantity": {"value": 1.0 + i, "unit": "mmol/L"}, "effectiveDateTime": f"2026-03-0{i}T10:00:00+00:00"} for i in range(1, 6)]
    srv.state["created"] = {}
    srv.state["tokens"] = 0

    def token(r):
        srv.state["tokens"] += 1
        return 200, {}, {"access_token": "t", "expires_in": 300}

    def search(r):
        s = int(r.q("_getpagesoffset", "0"))
        n = int(r.q("_count", "2"))
        n = min(n, 2)
        rows = srv.state["obs"][s : s + n]
        b = {"resourceType": "Bundle", "type": "searchset", "entry": [{"resource": x} for x in rows], "link": [{"relation": "self", "url": "x"}]}
        if s + n < len(srv.state["obs"]):
            b["link"].append({"relation": "next", "url": f"{srv.base}/fhir/Observation?_getpagesoffset={s + n}&_count={n}"})
        return 200, {"Content-Type": "application/fhir+json"}, b

    def create(r):
        ine = r.headers.get("if-none-exist", "")
        if ine in srv.state["created"]:
            return 200, {"Location": "x"}, {}
        srv.state["created"][ine] = r.json()
        return 201, {"Location": f"{srv.base}/fhir/Observation/n{len(srv.state['created'])}"}, {}

    srv.route("POST", r"/token", token)
    srv.route("GET", r"/fhir/metadata", lambda r: (200, {}, {"resourceType": "CapabilityStatement", "fhirVersion": "4.0.1", "software": {"name": "MockFHIR"}}))
    srv.route("GET", r"/fhir/Observation", search)
    srv.route("POST", r"/fhir/Observation", create)
    return srv


def test_fhir_client_pages_maps_and_writes_conditionally(monkeypatch):
    srv = fhir_mock()
    monkeypatch.setenv("FHIR_BASE_URL", srv.base + "/fhir"); monkeypatch.setenv("FHIR_TOKEN_URL", srv.base + "/token")
    monkeypatch.setenv("FHIR_CLIENT_ID", "c"); monkeypatch.setenv("FHIR_CLIENT_SECRET", "s")
    try:
        a = registry.build(cfg("fhir-r4"))
        assert a.healthcheck().checks["fhir_version"] == "4.0.1"
        recs = list(a.read())
        assert [r.payload["observation_id"] for r in recs] == ["o1", "o2", "o3", "o4", "o5"]
        assert recs[0].payload["loinc"] == "2524-7" and recs[0].payload["value"] == 2.0 and recs[0].payload["effective_at"] == "2026-03-01T10:00:00Z"
        assert srv.state["tokens"] == 1
        w = {"score_id": "S1", "status": "final", "code": {"text": "sepsis risk"}, "valueQuantity": {"value": 0.82}, "_internal": "dropped"}
        r1 = a.write([w], key_fields=["score_id"])
        a.store = type(a.store)()
        r2 = a.write([w], key_fields=["score_id"])
        assert r1.accepted == 1 and r2.accepted == 1 and len(srv.state["created"]) == 1, "If-None-Exist makes the replay a no-op even after a restart"
        sent = list(srv.state["created"].values())[0]
        assert "_internal" not in sent and sent["identifier"][0]["system"] == "urn:brainsiphon:sepsis-score"
    finally:
        srv.close()
