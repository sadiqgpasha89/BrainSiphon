import base64
import socket
import struct

import pytest

from bs_preflight.checks import database, kafka
from bs_preflight.model import Context, FAIL, PASS, WARN
from servers import FakeKafka, FakePostgres, Tcp, free_port, recv_exact


def test_scram_sha256_matches_rfc7677_example():
    # RFC 7677 section 3: user "user", password "pencil"
    bare = "n=user,r=rOprNGfwEbeRWgbNEkqO"
    server_first = "r=rOprNGfwEbeRWgbNEkqO%hvYDpWUa2RaTCAfuxFIlj)hNlF$k0,s=W22ZaJ0SNY7soEsUEjb6gQ==,i=4096"
    final, server_sig = database.scram_client_final("pencil", bare, server_first)
    assert final == "c=biws,r=rOprNGfwEbeRWgbNEkqO%hvYDpWUa2RaTCAfuxFIlj)hNlF$k0,p=dHzbZapWIk4jUhN+Ute9ytag9zjfMHgsqmmiz7AndVQ="
    assert base64.b64encode(server_sig).decode() == "6rriTRBi23WpRR/wtup+mMhUZUn/dB5nLTJRsjl95G4="


@pytest.mark.parametrize("mode", ["trust", "cleartext", "md5", "scram"])
def test_postgres_login_for_every_authentication_method(mode, monkeypatch):
    srv = FakePostgres(mode)
    monkeypatch.setenv("PGU", "svc")
    monkeypatch.setenv("PGP", "s3cret-pw")
    try:
        r = database.run({"name": "feat", "type": "postgres", "host": "127.0.0.1", "port": srv.port, "user_env": "PGU", "password_env": "PGP", "database": "features", "timeout": 3}, Context())[0]
        assert r.status == PASS, r.message
        assert r.details["rows"] == [["1"]] and r.details["server_version"] == "16.3"
        assert "s3cret-pw" not in str(r.to_dict())
    finally:
        srv.close()


@pytest.mark.parametrize("mode", ["cleartext", "md5", "scram"])
def test_postgres_wrong_password_is_a_login_failure_not_a_network_failure(mode, monkeypatch):
    srv = FakePostgres(mode)
    monkeypatch.setenv("PGU", "svc")
    monkeypatch.setenv("PGP", "not-the-password")
    try:
        r = database.run({"name": "feat", "type": "postgres", "host": "127.0.0.1", "port": srv.port, "user_env": "PGU", "password_env": "PGP", "timeout": 3}, Context())[0]
        assert r.status == FAIL and "login rejected" in r.message and "network path works" in r.remediation
    finally:
        srv.close()


def test_postgres_without_credentials_only_proves_the_port():
    srv = FakePostgres("trust")
    try:
        r = database.run({"name": "feat", "type": "postgres", "host": "127.0.0.1", "port": srv.port, "timeout": 3}, Context())[0]
        assert r.status == WARN and "no credentials" in r.message
    finally:
        srv.close()


def test_postgres_connection_refused_is_classified():
    r = database.run({"name": "feat", "type": "postgres", "host": "127.0.0.1", "port": free_port(), "timeout": 2}, Context())[0]
    assert r.status == FAIL and "connection_refused" in r.message


def test_mysql_greeting_is_parsed():
    greeting = bytes([10]) + b"8.0.36\0" + struct.pack("<I", 7) + b"abcdefgh\0" + struct.pack("<H", 0xFFFF)
    pkt = struct.pack("<I", len(greeting))[:3] + b"\x00" + greeting
    srv = Tcp(lambda s: s.sendall(pkt))
    try:
        r = database.run({"name": "m", "type": "mysql", "host": "127.0.0.1", "port": srv.port, "timeout": 3}, Context())[0]
        assert r.status == PASS and r.details["server_version"] == "8.0.36" and r.details["ssl_supported"] is True
    finally:
        srv.close()


def test_sqlserver_prelogin_reports_version_and_encryption():
    def handler(s):
        recv_exact(s, 8)
        s.recv(4096)
        table = b"\x00\x00\x0b\x00\x06" + b"\x01\x00\x11\x00\x01" + b"\xff"
        body = table + b"\x0f\x00\x07\xd0\x00\x00" + b"\x03"  # version 15.0.2000, encryption REQUIRED
        s.sendall(bytes([4, 1]) + struct.pack("!H", len(body) + 8) + b"\x00\x00\x01\x00" + body)

    srv = Tcp(handler)
    try:
        r = database.run({"name": "sql", "type": "sqlserver", "host": "127.0.0.1", "port": srv.port, "timeout": 3}, Context())[0]
        assert r.status == PASS, r.message
        assert r.details["server_version"] == "15.0.2000" and r.details["encryption"] == "required"
    finally:
        srv.close()


def test_oracle_listener_ping_recognises_a_refuse_with_err_zero():
    def handler(s):
        s.recv(4096)
        msg = b"(DESCRIPTION=(TMP=)(VSNNUM=318767104)(ERR=0)(ERROR_STACK=(ERROR=(CODE=0)(EMFI=4))))"
        s.sendall(struct.pack("!HHBBH", 8 + len(msg), 0, 4, 0, 0) + msg)

    srv = Tcp(handler)
    try:
        r = database.run({"name": "ora", "type": "oracle", "host": "127.0.0.1", "port": srv.port, "timeout": 3}, Context())[0]
        assert r.status == PASS and r.details["tns_reply"] == "refuse"
    finally:
        srv.close()


def test_oracle_port_that_is_not_a_listener_is_a_warning():
    srv = Tcp(lambda s: (s.recv(4096), s.sendall(b"\x00\x08\x00\x00\x09\x00\x00\x00")))
    try:
        r = database.run({"name": "ora", "type": "oracle", "host": "127.0.0.1", "port": srv.port, "timeout": 3}, Context())[0]
        assert r.status == WARN
    finally:
        srv.close()


# ------------------------------------------------------------------------------------------- Kafka

def test_kafka_topics_present_missing_and_advertised_listener_ok():
    srv = FakeKafka({"tx.events": 3})
    try:
        res = kafka.run({"name": "events", "bootstrap": [f"127.0.0.1:{srv.port}"], "topics": ["tx.events", "decisions.v1"], "timeout": 3}, Context())
        by = {r.id: r for r in res}
        assert by["kafka.events"].status == PASS
        assert by["kafka.events.advertised"].status == PASS
        assert by["kafka.events.topic.tx.events"].status == PASS and by["kafka.events.topic.tx.events"].details["partitions"] == 3
        missing = by["kafka.events.topic.decisions.v1"]
        assert missing.status == FAIL and "does not exist" in missing.message
    finally:
        srv.close()


def test_kafka_advertised_listener_unreachable_is_the_classic_private_network_failure():
    srv = FakeKafka({"tx.events": 1}, advertised_host="127.0.0.1", advertised_port=free_port())
    try:
        res = kafka.run({"name": "events", "bootstrap": [f"127.0.0.1:{srv.port}"], "topics": ["tx.events"], "timeout": 2}, Context())
        adv = [r for r in res if r.id.endswith("advertised")][0]
        assert adv.status == FAIL and "advertise" in adv.message and "advertised.listeners" in adv.remediation
    finally:
        srv.close()


def test_kafka_port_that_is_not_kafka_is_explained():
    srv = Tcp(lambda s: (s.recv(4096), s.sendall(b"HTTP/1.1 400 Bad Request\r\n\r\n")))
    try:
        r = kafka.run({"name": "events", "bootstrap": [f"127.0.0.1:{srv.port}"], "timeout": 2}, Context())[0]
        assert r.status == FAIL and "did not behave like a Kafka broker" in r.remediation
    finally:
        srv.close()
