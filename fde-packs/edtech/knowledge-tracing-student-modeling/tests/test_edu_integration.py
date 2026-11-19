import base64
import datetime as dt
import json
import os
import random
import shutil
import subprocess
import tempfile
import time

import pytest

from fde_adapters.core.http import b64url
from fde_adapters.mocks.server import MockServer
from fde_adapters.core.http import HttpClient, NoAuth
from edu_integration import consent, fairness, identity, lti13, mastery, oneroster, permissions, qti, xapi

NOW = dt.datetime(2026, 3, 14, 10, 0, tzinfo=dt.timezone.utc)
D = lambda s: dt.date.fromisoformat(s)  # noqa: E731


# ----------------------------------------------------------------------------------------------- LTI 1.3

@pytest.fixture(scope="module")
def keys():
    if not shutil.which("openssl"):
        pytest.skip("openssl missing")
    d = tempfile.mkdtemp()
    k = os.path.join(d, "k.pem")
    subprocess.run(["openssl", "genrsa", "-out", k, "2048"], check=True, capture_output=True)
    n = int(subprocess.run(["openssl", "rsa", "-in", k, "-noout", "-modulus"], capture_output=True, text=True).stdout.strip().split("=")[1], 16)
    return k, {"n": b64url(n.to_bytes((n.bit_length() + 7) // 8, "big")), "e": b64url((65537).to_bytes(3, "big"))}


def launch(keys, **over):
    from fde_adapters.core.http import rs256_sign
    claims = {"iss": "https://lms.school.example", "aud": "tool-client", "sub": "lms-user-1", "exp": int(time.time()) + 300, "nonce": "n-1", "name": "Ada",
              lti13.CLAIM + "version": "1.3.0", lti13.CLAIM + "message_type": "LtiResourceLinkRequest", lti13.CLAIM + "deployment_id": "dep-1", lti13.CLAIM + "roles": ["http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"],
              lti13.CLAIM + "context": {"id": "course-9"}, lti13.CLAIM + "resource_link": {"id": "rl-1"}}
    claims.update(over)
    h = b64url(json.dumps({"alg": "RS256", "kid": "k1"}).encode()); p = b64url(json.dumps(claims).encode())
    return f"{h}.{p}.{b64url(rs256_sign(f'{h}.{p}'.encode(), keys[0]))}"


def validator(keys):
    return lti13.LaunchValidator({"https://lms.school.example": {"client_id": "tool-client", "deployment_ids": ["dep-1"], "keys": {"k1": keys[1]}}})


def test_lti_launch_accepts_a_valid_launch_and_extracts_context_and_roles(keys):
    r = validator(keys).validate(launch(keys), expected_nonce="n-1")
    assert (r["subject"], r["context"], r["resource_link"], r["is_learner"], r["is_instructor"], r["message_type"]) == ("lms-user-1", "course-9", "rl-1", True, False, "LtiResourceLinkRequest")
    t = validator(keys).validate(launch(keys, **{lti13.CLAIM + "roles": ["http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor"]}), expected_nonce="n-1")
    assert t["is_instructor"] and not t["is_learner"]


@pytest.mark.parametrize("over,msg", [({"aud": "other-tool"}, "audience"), ({"exp": 1}, "expired"), ({"nonce": "n-X"}, "nonce does not match"), ({lti13.CLAIM + "deployment_id": "dep-9"}, "deployment_id"),
                                       ({lti13.CLAIM + "version": "1.1"}, "1.3.0"), ({lti13.CLAIM + "message_type": "Weird"}, "message_type"), ({lti13.CLAIM + "resource_link": None}, "resource_link"), ({"iss": "https://evil.example"}, "unregistered platform")])
def test_lti_launch_rejections(keys, over, msg):
    with pytest.raises(lti13.LtiError, match=msg):
        validator(keys).validate(launch(keys, **over), expected_nonce="n-1")


def test_lti_replayed_launch_tampered_and_alg_none_tokens_are_refused(keys):
    v = validator(keys)
    tok = launch(keys)
    v.validate(tok, expected_nonce="n-1")
    with pytest.raises(lti13.LtiError, match="replayed"):
        v.validate(tok, expected_nonce="n-1")
    h, p, s = launch(keys, nonce="n-2").split(".")
    forged = b64url(json.dumps({"iss": "https://lms.school.example", "aud": "tool-client", "sub": "admin", "exp": int(time.time()) + 300, "nonce": "n-2"}).encode())
    with pytest.raises(lti13.LtiError, match="signature"):
        v.validate(f"{h}.{forged}.{s}", expected_nonce="n-2")
    none = b64url(json.dumps({"alg": "none"}).encode()) + "." + p + "."
    with pytest.raises(lti13.LtiError, match="RS256"):
        v.validate(none, expected_nonce="n-2")


def test_deep_linking_response_is_a_signed_jwt_the_platform_can_verify(keys):
    jwt = lti13.deep_link_response("tool-client", "https://lms.school.example", "dep-1", [{"type": "ltiResourceLink", "title": "Fractions practice", "url": "https://tool.example/launch?skill=frac"}], "state-1", keys[0], "tool-k1", now=1772000000)
    h, p, s = jwt.split(".")
    from fde_adapters.connectors.idp import _b64d, rs256_verify
    assert rs256_verify(f"{h}.{p}".encode(), _b64d(s), int.from_bytes(_b64d(keys[1]["n"]), "big"), 65537)
    c = json.loads(_b64d(p))
    assert c[lti13.CLAIM + "message_type"] == "LtiDeepLinkingResponse" and c[lti13.DL + "content_items"][0]["title"] == "Fractions practice" and c[lti13.DL + "data"] == "state-1" and c["aud"] == "https://lms.school.example"


# ----------------------------------------------------------------------------------------------- OneRoster

def test_oneroster_paging_with_total_count_and_csv_bundle():
    srv = MockServer("oneroster")
    users = [{"sourcedId": f"u{i}", "status": "active", "givenName": "G", "familyName": f"F{i}", "role": "student"} for i in range(7)]

    def lst(r):
        o, l = int(r.q("offset", "0")), int(r.q("limit", "100"))
        return 200, {"X-Total-Count": str(len(users))}, {"users": users[o : o + l]}

    srv.route("GET", r"/ims/oneroster/rostering/v1p2/users", lst)
    try:
        c = HttpClient(srv.base, NoAuth())
        got = list(oneroster.paged(c, "/ims/oneroster/rostering/v1p2/users", "users", limit=3))
        assert [u["sourcedId"] for u in got] == [f"u{i}" for i in range(7)] and len(srv.calls("GET")) == 3
    finally:
        srv.close()
    csv = oneroster.read_csv({"users": "sourcedId,status,givenName,familyName\nu1,active,Ada,Lovelace\n"})
    assert csv["users"][0]["familyName"] == "Lovelace"


def test_roster_reconcile_creates_updates_deactivates_and_never_deletes_on_absence():
    existing = {"u1": {"givenName": "Ada", "familyName": "L"}, "u2": {"givenName": "Bo", "familyName": "K"}, "u3": {"givenName": "Cy", "familyName": "M"}}
    feed = [{"sourcedId": "u1", "givenName": "Ada", "familyName": "L"}, {"sourcedId": "u2", "givenName": "Bob", "familyName": "K"}, {"sourcedId": "u4", "givenName": "Di", "familyName": "N"}, {"sourcedId": "u5", "status": "tobedeleted"}, {"sourcedId": "u4", "givenName": "Di"}]
    r = oneroster.reconcile(existing, feed)
    assert r["created"] == ["u4"] and r["updated"] == ["u2"] and r["unchanged"] == ["u1"] and r["deactivated"] == ["u5"] and r["missing_from_feed"] == ["u3"] and r["conflicts"][0]["why"].startswith("duplicate")


def test_enrolment_duplicates_transfers_endings_and_year_rollover():
    e = lambda i, u, c, **kw: {"sourcedId": i, "userSourcedId": u, "classSourcedId": c, "courseSourcedId": kw.pop("course", "math7"), **kw}  # noqa: E731
    en = [e("e1", "s1", "c1"), e("e2", "s1", "c1"), e("e3", "s2", "c1", endDate="2026-03-01"), e("e4", "s2", "c2", beginDate="2026-03-02"), e("e5", "s3", "c3", beginDate="2026-09-01"), e("e6", "s4", "c1"), e("e7", "s4", "c2")]
    r = oneroster.enrolment_changes(en, today=D("2026-03-14"))
    assert r["duplicates"] == ["s1/c1"] and r["ended"] == ["e3"] and r["future"] == ["e5"] and r["possible_transfers"] == ["s4/math7"] and r["active"] == 5
    assert oneroster.year_rollover([{"sourcedId": "c1", "termSourcedId": "2025"}, {"sourcedId": "c2", "termSourcedId": "2026"}], "2026", D("2026-09-01")) == {"close": ["c1"], "open": ["c2"]}


# ----------------------------------------------------------------------------------------------- xAPI and Caliper

def stmt(**kw):
    s = {"id": "6690e6c9-3ef0-4ed3-8b37-7f3964730bee", "actor": {"account": {"homePage": "https://lms.school.example", "name": "lms-user-1"}}, "verb": {"id": "http://adlnet.gov/expapi/verbs/answered"},
         "object": {"id": "https://items.example/q/42", "definition": {"extensions": {"https://brainsiphon.example/skills": ["frac.add"]}}}, "result": {"success": True, "score": {"scaled": 1.0}, "duration": "PT1M30S"}, "timestamp": "2026-03-14T09:00:00Z"}
    s.update(kw)
    return s


def test_xapi_validation_and_mapping_to_the_learner_event():
    ev = xapi.to_learner_event(stmt(), "inst-1")
    assert (ev["kind"], ev["correct"], ev["duration_s"], ev["skills"], ev["learner_ref"]) == ("answer", True, 90.0, ["frac.add"], "https://lms.school.example|lms-user-1")
    for bad, msg in [({"actor": {"mbox": "mailto:a@b", "openid": "x"}}, "exactly one"), ({"verb": {"id": "answered"}}, "IRI"), ({"id": "123"}, "UUID"), ({"timestamp": "yesterday"}, "ISO"), ({"result": {"score": {"scaled": 3}}}, "scaled")]:
        with pytest.raises(xapi.XapiError, match=msg):
            xapi.validate_statement(stmt(**bad))
    assert xapi.to_learner_event({k: v for k, v in stmt().items() if k != "id"}, "i")["event_id"] == xapi.to_learner_event({k: v for k, v in stmt().items() if k != "id"}, "i")["event_id"], "an id is derived deterministically when the statement has none"


def test_caliper_events_map_and_the_store_is_idempotent_and_replays_in_order():
    env = {"sensor": "s", "data": [{"id": "urn:uuid:aaaa", "type": "AssessmentItemEvent", "actor": {"id": "https://lms/users/1"}, "object": {"id": "https://items/1"}, "eventTime": "2026-03-14T09:00:00.000Z", "generated": {"scoreGiven": 1, "maxScore": 1, "extensions": {"isCorrect": True}}}, {"id": "urn:uuid:bbbb", "type": "ToolUseEvent", "actor": {"id": "x"}, "object": {"id": "y"}}]}
    evs = xapi.from_caliper(env, "inst")
    assert len(evs) == 1 and evs[0]["correct"] is True and evs[0]["score_scaled"] == 1.0
    st = xapi.EventStore()
    late = {**xapi.to_learner_event(stmt(id="11111111-1111-4111-8111-111111111111", timestamp="2026-03-14T08:00:00Z"), "i")}
    early = {**xapi.to_learner_event(stmt(id="22222222-2222-4222-8222-222222222222", timestamp="2026-03-14T07:00:00Z"), "i")}
    assert st.add(late) and st.add(early) and not st.add(late) and st.duplicates == 1
    assert [e["occurred_at"] for e in st.replay("https://lms.school.example|lms-user-1")] == ["2026-03-14T07:00:00Z", "2026-03-14T08:00:00Z"]


QTI = """<assessmentItem xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1" identifier="q42" title="Add fractions"><responseDeclaration identifier="RESPONSE" cardinality="single" baseType="identifier"><correctResponse><value>B</value></correctResponse></responseDeclaration>
<itemBody><choiceInteraction responseIdentifier="RESPONSE" maxChoices="1"><prompt>1/2 + 1/4?</prompt><simpleChoice identifier="A">1/6</simpleChoice><simpleChoice identifier="B">3/4</simpleChoice><simpleChoice identifier="C">2/6</simpleChoice><simpleChoice identifier="D">1</simpleChoice></choiceInteraction></itemBody>
<metadata><meta name="skills" content="frac.add,frac.common-denominator"/></metadata></assessmentItem>"""


def test_qti_item_and_response_mapping():
    item = qti.parse_item(QTI)
    assert item["identifier"] == "q42" and item["correct"] == ["B"] and len(item["choices"]) == 4 and item["interaction"] == "choiceInteraction" and item["skills"] == ["frac.add", "frac.common-denominator"]
    assert qti.score_response(item, ["B"]) == {"item": "q42", "correct": True, "skills": item["skills"], "guess_probability": 0.25}
    assert not qti.score_response(item, ["A"])["correct"] and not qti.score_response(item, [])["correct"]
    with pytest.raises(qti.QtiError):
        qti.parse_item("<x/>")


# ----------------------------------------------------------------------------------------------- identity, consent, permissions

def test_identity_links_by_strong_keys_only_and_sends_lookalikes_to_review():
    sis = [{"sourcedId": "S1", "email": "ada@school.example", "givenName": "Ada", "familyName": "Lovelace"}, {"sourcedId": "S2", "email": "", "givenName": "Sam", "familyName": "Lee"}, {"sourcedId": "S3", "email": "", "givenName": "Sam", "familyName": "Lee"}]
    m = identity.IdentityMap("inst-1")
    a = m.match_lms("lms-1", {"sis_id": "S1"}, sis)
    b = m.match_lms("lms-2", {"email": "ADA@school.example"}, sis)
    assert a["how"] == "sis id" and b["how"] == "unique email" or b["how"] == "existing link"
    c = m.match_lms("lms-3", {"given": "Sam", "family": "Lee"}, sis)
    assert c["canonical"] is None and c["how"] == "review" and m.review[0]["candidates"] == ["S2", "S3"], "two students called Sam Lee are never auto-merged"
    assert a["canonical"] == identity.canon("student", "inst-1", "S1") and identity.canon("student", "inst-1", "S1") != identity.canon("student", "inst-2", "S1")
    with pytest.raises(ValueError, match="already linked"):
        m.link("lms", "lms-1", "stu_other", "x", "y")
    assert len(m.audit) >= 2


def test_consent_by_age_withdrawal_gate_deletion_across_every_store_and_retention():
    reg = consent.ConsentRegistry("US-COPPA")
    kid, teen = D("2016-05-01"), D("2008-05-01")
    assert reg.required_from(kid, D("2026-03-14")) == "guardian" and reg.required_from(teen, D("2026-03-14")) == "self"
    with pytest.raises(consent.ConsentRequired, match="guardian"):
        reg.grant("s1", "adaptive-practice", "self", kid, NOW)
    reg.grant("s1", "adaptive-practice", "guardian-7", kid, NOW)
    reg.gate("s1", "adaptive-practice")
    assert reg.withdraw("s1", "adaptive-practice", NOW) == 1
    with pytest.raises(consent.ConsentRequired):
        reg.gate("s1", "adaptive-practice")
    data = {"events": {"s1": 10, "s2": 5}, "mastery": {"s1": 3}, "backups": {"s1": 1}}
    old = {"events": [(NOW - dt.timedelta(days=500), "s2"), (NOW - dt.timedelta(days=10), "s2")]}
    st = consent.Stores()
    for name in data:
        st.register(name, lambda s, n=name: data[n].pop(s, 0), 365, (lambda cutoff, n=name: len([1 for t, _ in old.get(n, []) if t < cutoff])))
    st.register("analytics", lambda s: 1 / 0, None)
    rep = st.delete_learner("s1", "guardian-7", NOW)
    assert rep["stores"]["events"] == {"deleted": 10} and "s1" not in data["events"] and "s1" not in data["mastery"] and "s1" not in data["backups"]
    assert rep["complete"] is False and "error" in rep["stores"]["analytics"], "a store that fails is reported, so the request is not silently marked done"
    assert st.run_retention(NOW)["events"] == 1


def test_permission_model_scopes_every_role():
    o = permissions.Org()
    o.school_district = {"sch1": "d1", "sch2": "d2"}
    o.class_school = {"c1": "sch1", "c2": "sch2"}
    o.student_classes = {"s1": {"c1"}, "s2": {"c2"}}
    o.teacher_classes = {"t1": {"c1"}}
    o.guardian_students = {"g1": {"s1"}}
    o.admin_scope = {"a-school": "school:sch1", "a-dist": "district:d1", "a-other": "district:d2"}
    ok = lambda u, r, s: o.can_view_student(u, r, s)  # noqa: E731
    assert ok("s1", "student", "s1") and not ok("s1", "student", "s2") and ok("g1", "guardian", "s1") and not ok("g1", "guardian", "s2")
    assert ok("t1", "teacher", "s1") and not ok("t1", "teacher", "s2")
    assert ok("a-school", "school_admin", "s1") and not ok("a-school", "school_admin", "s2") and ok("a-dist", "district_admin", "s1") and not ok("a-dist", "district_admin", "s2") and ok("a-other", "district_admin", "s2")
    assert not ok("root", "platform_admin", "s1"), "platform staff have no default access to learner data"
    assert o.visible_students("t1", "teacher", ["s1", "s2"]) == ["s1"]


# ----------------------------------------------------------------------------------------------- mastery updates, offline sync, grade firewall

def test_mastery_rises_with_success_falls_on_slips_decays_after_a_break_and_stays_a_probability():
    m = mastery.BKT()
    up = m.trace([True] * 6)
    assert all(b > a for a, b in zip(up, up[1:])) and up[-1] > 0.95 and 0 < up[0] < 1
    assert m.update(0.9, False) < 0.9 and m.update(0.5, True) > 0.5
    assert m.update(0.9, True, days_since_last=60) < m.update(0.9, True, days_since_last=0), "after a long break the estimate is less sure"
    assert all(0 <= x <= 1 for x in m.trace([random.Random(3).random() < 0.5 for _ in range(200)]))


def test_offline_sync_is_order_independent_deduplicated_and_flags_bad_clocks():
    base = dt.datetime(2026, 3, 14, 8, 0, tzinfo=dt.timezone.utc)
    evs = [{"learner": "s1", "skill": "frac", "device": "tab-1", "seq": i, "t": (base + dt.timedelta(minutes=i)).isoformat(), "correct": i % 3 != 0} for i in range(1, 9)]
    a, b = mastery.OfflineSync(), mastery.OfflineSync()
    rcv = base + dt.timedelta(days=1)
    for e in evs:
        assert a.ingest(e, rcv) == "accepted"
    shuffled = evs[:]
    random.Random(1).shuffle(shuffled)
    for e in shuffled + evs[:3]:
        b.ingest(e, rcv)
    m = mastery.BKT()
    assert a.mastery("s1", "frac", m) == b.mastery("s1", "frac", m), "the same history gives the same mastery however it arrived, and duplicates change nothing"
    assert b.ingest(evs[0], rcv) == "duplicate" and a.mastery("s1", "frac", m)["n"] == 8
    assert a.ingest({**evs[0], "seq": 99, "t": (rcv + dt.timedelta(days=400)).isoformat()}, rcv) == "flagged" and a.flagged[0]["why"] == "client clock implausible"


def test_grade_firewall_a_model_estimate_never_becomes_a_grade_without_a_teacher():
    written = []
    fw = mastery.GradeFirewall(lambda s, k, v: written.append((s, k, v)))
    p = fw.propose("s1", "frac", 0.97, NOW)
    assert p["status"] == "pending-teacher-review" and written == []
    with pytest.raises(PermissionError, match="teacher"):
        fw.write_grade("s1", "frac", 0.97, source="pipeline")
    assert fw.attempted_direct_writes == 1 and written == []
    with pytest.raises(ValueError, match="official value"):
        fw.teacher_decides(next(iter(fw.proposals)), "ms.rao", True)
    d = fw.teacher_decides(next(iter(fw.proposals)), "ms.rao", True, official_value=0.85, note="also considered the project")
    assert written == [("s1", "frac", 0.85)] and d["status"] == "accepted" and d["official_value"] == 0.85 != d["p_mastery"], "the teacher states the grade; the model's number is not copied"


# ----------------------------------------------------------------------------------------------- fairness

def test_group_fairness_report_flags_gaps_and_refuses_to_pass_small_groups():
    rng = random.Random(5)
    rows = []
    for g, n, noise in (("A", 400, 0.15), ("B", 400, 0.45), ("C", 10, 0.1)):
        for _ in range(n):
            y = int(rng.random() < 0.5)
            rows.append({"y": y, "p": min(max(y * 0.7 + 0.15 + rng.gauss(0, noise), 0), 1), "group": g})
    r = fairness.group_report(rows, "group")
    assert r["groups"]["C"]["status"] == "too small to assess" and r["groups"]["A"]["auc"] > r["groups"]["B"]["auc"]
    assert any(f["group"] == "B" and f["problem"] == "AUC gap" for f in r["flags"]) and r["pass"] is False and "not a finding of fairness" in r["note"]
    assert fairness.auc([1, 0], [0.9, 0.1]) == 1.0 and fairness.auc([1, 1], [0.5, 0.5]) != fairness.auc([1, 1], [0.5, 0.5])
