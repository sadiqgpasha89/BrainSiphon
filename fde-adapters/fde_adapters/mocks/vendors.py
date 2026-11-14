"""Vendor-shaped mocks. Each reproduces the documented request and response shapes of the endpoints the matching connector
uses (authentication, paging, error format, idempotent write) and nothing more. They are NOT the vendors' sandboxes: passing
against a mock proves the connector's logic and contract, never the customer's configuration, licences or data."""
from __future__ import annotations

import base64
import json
import time
from typing import Any, Dict, List, Optional

from .server import MockRequest, MockServer


def _token_route(srv: MockServer, expected_client: str = "", expect_jwt: bool = False, ttl: int = 3600) -> None:
    srv.state.setdefault("token_calls", 0)
    srv.state.setdefault("valid_tokens", set())

    def tok(r: MockRequest):
        srv.state["token_calls"] += 1
        f = r.form()
        if expect_jwt:
            if f.get("grant_type") != "urn:ietf:params:oauth:grant-type:jwt-bearer" or f.get("assertion", "").count(".") != 2:
                return 400, {}, {"error": "invalid_grant", "error_description": "bad assertion"}
        else:
            auth = r.headers.get("Authorization", "")
            cid = base64.b64decode(auth.split()[1]).decode().split(":")[0] if auth.startswith("Basic ") else f.get("client_id", "")
            if f.get("grant_type") != "client_credentials" or (expected_client and cid != expected_client):
                return 401, {}, {"error": "invalid_client"}
        t = f"tok-{srv.state['token_calls']}"
        srv.state["valid_tokens"].add(t)
        return 200, {}, {"access_token": t, "token_type": "Bearer", "expires_in": ttl}

    srv.route("POST", r"/oauth2/token|/services/oauth2/token|/token", tok)


def _authed(srv: MockServer, r: MockRequest) -> bool:
    a = r.headers.get("Authorization", "")
    if a.startswith("Bearer "):
        return a[7:] in srv.state.get("valid_tokens", set()) or not srv.state.get("valid_tokens")
    return a.startswith("Basic ")


# -------------------------------------------------------------------------------------------------- Salesforce

CASES = [{"attributes": {"type": "Case"}, "Id": f"500{i:012d}", "Subject": s, "Priority": p, "Status": "New", "AccountId": f"001{i:012d}", "LastModifiedDate": f"2026-03-0{i}T10:00:00.000+0000", "BS_Ticket_Id__c": None}
         for i, (s, p) in enumerate([("Card declined in store", "High"), ("Cannot export report", "Medium"), ("Login loop on mobile", "Low"), ("Invoice mismatch", "High"), ("API 500 on bulk upload", "Medium")], start=1)]


def salesforce(page: int = 2) -> MockServer:
    srv = MockServer("salesforce")
    _token_route(srv, expect_jwt=True)
    srv.state["cases"], srv.state["upserts"] = [dict(c) for c in CASES], {}

    def query(r: MockRequest):
        if not _authed(srv, r):
            return 401, {}, [{"message": "Session expired or invalid", "errorCode": "INVALID_SESSION_ID"}]
        q = r.q("q", "") or ""
        if "FROM Case" not in q:
            return 400, {}, [{"message": "unsupported query", "errorCode": "MALFORMED_QUERY"}]
        rows = srv.state["cases"]
        return 200, {"Sforce-Limit-Info": "api-usage=10/15000"}, {"totalSize": len(rows), "done": len(rows) <= page, "records": rows[:page], **({} if len(rows) <= page else {"nextRecordsUrl": "/services/data/v60.0/query/01gNEXT-%d" % page})}

    def nxt(r: MockRequest):
        if not _authed(srv, r):
            return 401, {}, [{"message": "Session expired or invalid", "errorCode": "INVALID_SESSION_ID"}]
        off = int(r.path.rsplit("-", 1)[1])
        rows = srv.state["cases"][off:]
        return 200, {}, {"totalSize": len(srv.state["cases"]), "done": len(rows) <= page, "records": rows[:page], **({} if len(rows) <= page else {"nextRecordsUrl": "/services/data/v60.0/query/01gNEXT-%d" % (off + page)})}

    def upsert(r: MockRequest):
        if not _authed(srv, r):
            return 401, {}, [{"message": "Session expired or invalid", "errorCode": "INVALID_SESSION_ID"}]
        ext = r.path.rsplit("/", 1)[1]
        created = ext not in srv.state["upserts"]
        srv.state["upserts"][ext] = r.json()
        return (201, {}, {"id": "500NEW%09d" % len(srv.state["upserts"]), "success": True, "errors": []}) if created else (204, {}, b"")

    srv.route("GET", r"/services/data/v60\.0/limits", lambda r: (200, {}, {"DailyApiRequests": {"Max": 15000, "Remaining": 14990}}) if _authed(srv, r) else (401, {}, [{"errorCode": "INVALID_SESSION_ID", "message": "x"}]))
    srv.route("GET", r"/services/data/v60\.0/query", query)
    srv.route("GET", r"/services/data/v60\.0/query/01gNEXT-\d+", nxt)
    srv.route("PATCH", r"/services/data/v60\.0/sobjects/Case/BS_Ticket_Id__c/[^/]+", upsert)
    return srv


# -------------------------------------------------------------------------------------------------- ServiceNow

INCIDENTS = [{"sys_id": f"sys{i:03d}", "number": f"INC00{i:05d}", "short_description": s, "priority": p, "state": "1", "correlation_id": "", "sys_updated_on": f"2026-03-0{i} 10:00:00", "caller_id": {"link": "x", "value": f"u{i}"}}
             for i, (s, p) in enumerate([("VPN drops hourly", "2"), ("Laptop will not boot", "3"), ("Payroll export fails", "1"), ("Printer offline", "4"), ("SSO loop", "2")], start=1)]


def servicenow() -> MockServer:
    srv = MockServer("servicenow")
    srv.state["incidents"] = [dict(i) for i in INCIDENTS]

    def table(r: MockRequest):
        if not _authed(srv, r):
            return 401, {}, {"error": {"message": "User Not Authenticated", "detail": "Required to provide Auth information"}, "status": "failure"}
        rows = srv.state["incidents"]
        sq = r.q("sysparm_query", "") or ""
        if sq.startswith("correlation_id="):
            want = sq.split("=", 1)[1].split("^")[0]
            rows = [x for x in rows if x["correlation_id"] == want]
        lim, off = int(r.q("sysparm_limit", "10")), int(r.q("sysparm_offset", "0"))
        return 200, {"X-Total-Count": str(len(rows))}, {"result": rows[off : off + lim]}

    def create(r: MockRequest):
        if not _authed(srv, r):
            return 401, {}, {"error": {"message": "User Not Authenticated"}}
        row = {"sys_id": f"sys{len(srv.state['incidents']) + 1:03d}", "number": "INC9", **r.json()}
        srv.state["incidents"].append(row)
        return 201, {}, {"result": row}

    def patch(r: MockRequest):
        sid = r.path.rsplit("/", 1)[1]
        for x in srv.state["incidents"]:
            if x["sys_id"] == sid:
                x.update(r.json())
                return 200, {}, {"result": x}
        return 404, {}, {"error": {"message": "No Record found"}}

    srv.route("GET", r"/api/now/table/incident", table)
    srv.route("POST", r"/api/now/table/incident", create)
    srv.route("PATCH", r"/api/now/table/incident/[^/]+", patch)
    return srv


# -------------------------------------------------------------------------------------------------- Dynamics 365 (Dataverse)

def dynamics() -> MockServer:
    srv = MockServer("dynamics365")
    _token_route(srv)
    srv.state["rows"] = [{"incidentid": f"00000000-0000-0000-0000-00000000000{i}", "ticketnumber": f"CAS-0{i}", "title": t, "prioritycode": p, "modifiedon": f"2026-03-0{i}T10:00:00Z", "bs_key": None}
                         for i, (t, p) in enumerate([("Portal down", 1), ("Wrong invoice", 2), ("Password reset", 3), ("Slow report", 2), ("Data export", 3)], start=1)]
    srv.state["alt"] = {}

    def lst(r: MockRequest):
        if not _authed(srv, r):
            return 401, {}, {"error": {"code": "0x80072ee7", "message": "Authorization failed"}}
        size = 2
        skip = int(r.q("$skiptoken", "0") or 0)
        rows = srv.state["rows"][skip : skip + size]
        body: Dict[str, Any] = {"@odata.context": "x", "value": rows}
        if skip + size < len(srv.state["rows"]):
            body["@odata.nextLink"] = f"{srv.base}/api/data/v9.2/incidents?$skiptoken={skip + size}"
        return 200, {"OData-Version": "4.0"}, body

    def upsert(r: MockRequest):
        if not _authed(srv, r):
            return 401, {}, {"error": {"message": "Authorization failed"}}
        key = r.path.split("bs_key='")[1].rstrip("')")
        created = key not in srv.state["alt"]
        srv.state["alt"][key] = r.json()
        return (204, {"OData-EntityId": f"{srv.base}/api/data/v9.2/incidents(new-{key})"}, b"") if created else (204, {}, b"")

    srv.route("GET", r"/api/data/v9\.2/WhoAmI", lambda r: (200, {}, {"UserId": "u-1", "OrganizationId": "o-1"}) if _authed(srv, r) else (401, {}, {"error": {}}))
    srv.route("GET", r"/api/data/v9\.2/incidents", lst)
    srv.route("PATCH", r"/api/data/v9\.2/incidents\(bs_key='[^']+'\)", upsert)
    return srv


# -------------------------------------------------------------------------------------------------- SAP OData (V2)

def sap() -> MockServer:
    srv = MockServer("sap-odata")
    srv.state["orders"] = [{"SalesOrder": f"4500{i:06d}", "SoldToParty": f"1000{i:03d}", "TotalNetAmount": f"{100 * i}.50", "TransactionCurrency": "EUR", "CreationDate": f"/Date({1772000000000 + i * 86400000})/", "YY1_BSKey": ""} for i in range(1, 6)]
    srv.state["csrf"] = "csrf-token-123"

    def lst(r: MockRequest):
        if not _authed(srv, r):
            return 401, {}, {"error": {"code": "401", "message": {"value": "Unauthorized"}}}
        h = {}
        if r.headers.get("X-CSRF-Token", "").lower() == "fetch":
            h["x-csrf-token"] = srv.state["csrf"]
            h["Set-Cookie"] = "sap-usercontext=sap-client=100; path=/"
        import re as _re

        top, skip = int(r.q("$top", "2")), int(r.q("$skip", "0"))
        allrows = srv.state["orders"]
        m = _re.fullmatch(r"(\w+) eq '(.*)'", r.q("$filter", "") or "")
        if m:
            allrows = [o for o in allrows if str(o.get(m.group(1), "")) == m.group(2).replace("''", "'")]
        rows = allrows[skip : skip + top]
        d: Dict[str, Any] = {"results": rows}
        if skip + top < len(allrows):
            d["__next"] = f"{srv.base}/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder?$top={top}&$skip={skip + top}"
        return 200, h, {"d": d}

    def create(r: MockRequest):
        if r.headers.get("X-CSRF-Token") != srv.state["csrf"]:
            return 403, {"x-csrf-token": "Required"}, {"error": {"code": "403", "message": {"value": "CSRF token validation failed"}}}
        body = r.json()
        srv.state["orders"].append(body)
        return 201, {}, {"d": body}

    def service_root(r: MockRequest):
        if not _authed(srv, r):
            return 401, {}, {"error": {"code": "401", "message": {"value": "Unauthorized"}}}
        h = {"Set-Cookie": "sap-usercontext=sap-client=100; path=/"}
        if r.headers.get("X-CSRF-Token", "").lower() == "fetch":
            h["x-csrf-token"] = srv.state["csrf"]
        return 200, h, {"d": {"EntitySets": ["A_SalesOrder"]}}

    srv.route("GET", r"/sap/opu/odata/sap/API_SALES_ORDER_SRV/?", service_root)
    srv.route("GET", r"/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder", lst)
    srv.route("POST", r"/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder", create)
    return srv


# -------------------------------------------------------------------------------------------------- Snowflake SQL API v2

def snowflake() -> MockServer:
    srv = MockServer("snowflake")
    srv.state["rows"] = [[str(i), f"CUST{i}", str(i * 10.5), f"2026-03-0{i}T10:00:00Z"] for i in range(1, 8)]
    srv.state["merged"] = {}
    srv.state["pending"] = 0

    def stmt(r: MockRequest):
        if r.headers.get("X-Snowflake-Authorization-Token-Type") not in ("KEYPAIR_JWT", "OAUTH"):
            return 401, {}, {"code": "390303", "message": "Invalid OAuth access token."}
        body = r.json()
        sql = body["statement"].strip().upper()
        if sql.startswith("MERGE"):
            key = body["bindings"]["1"]["value"]
            existed = key in srv.state["merged"]
            srv.state["merged"][key] = body["bindings"]
            return 200, {}, {"code": "090001", "statementHandle": "h-merge", "data": [["0" if existed else "1", "1" if existed else "0"]], "resultSetMetaData": {"numRows": 1, "rowType": [{"name": "number of rows inserted"}, {"name": "number of rows updated"}], "partitionInfo": [{"rowCount": 1}]}}
        if srv.state["pending"] > 0:
            return 202, {}, {"code": "333334", "message": "Asynchronous execution in progress.", "statementHandle": "h-sel", "statementStatusUrl": "/api/v2/statements/h-sel"}
        cols = [{"name": n} for n in ("ID", "CUSTOMER", "AMOUNT", "UPDATED_AT")]
        return 200, {}, {"code": "090001", "statementHandle": "h-sel", "data": srv.state["rows"][:3], "resultSetMetaData": {"numRows": 7, "rowType": cols, "partitionInfo": [{"rowCount": 3}, {"rowCount": 3}, {"rowCount": 1}]}}

    def part(r: MockRequest):
        if r.q("partition") is None:
            if srv.state["pending"] > 0:
                srv.state["pending"] -= 1
                return 202, {}, {"code": "333334", "message": "Asynchronous execution in progress.", "statementHandle": "h-sel", "statementStatusUrl": "/api/v2/statements/h-sel"}
            return 200, {}, {"code": "090001", "statementHandle": "h-sel", "data": srv.state["rows"][:3], "resultSetMetaData": {"numRows": 7, "rowType": [{"name": n} for n in ("ID", "CUSTOMER", "AMOUNT", "UPDATED_AT")], "partitionInfo": [{"rowCount": 3}, {"rowCount": 3}, {"rowCount": 1}]}}
        p = int(r.q("partition", "0") or 0)
        return 200, {}, {"data": srv.state["rows"][p * 3 : p * 3 + 3]}

    srv.route("POST", r"/api/v2/statements/?", stmt)
    srv.route("GET", r"/api/v2/statements/h-[a-z]+", part)
    return srv


# -------------------------------------------------------------------------------------------------- Databricks SQL statements

def databricks() -> MockServer:
    srv = MockServer("databricks")
    srv.state["rows"] = [[str(i), f"SKU{i}", str(i * 2.25)] for i in range(1, 8)]
    srv.state["merged"] = {}
    srv.state["polls"] = 0

    def stmt(r: MockRequest):
        if not r.headers.get("Authorization", "").startswith("Bearer "):
            return 401, {}, {"error_code": "UNAUTHENTICATED", "message": "Invalid access token"}
        b = r.json()
        sql = b["statement"].strip().upper()
        if sql.startswith("MERGE"):
            k = next(p["value"] for p in b["parameters"] if p["name"] == "k")
            srv.state["merged"][k] = b["parameters"]
            return 200, {}, {"statement_id": "st-m", "status": {"state": "SUCCEEDED"}, "manifest": {"schema": {"columns": [{"name": "num_affected_rows"}]}, "total_chunk_count": 1}, "result": {"data_array": [["1"]]}}
        if srv.state["polls"] == 0:
            srv.state["polls"] = 1
            return 200, {}, {"statement_id": "st-1", "status": {"state": "PENDING"}}
        return 200, {}, _dbx_done(0)

    def poll(r: MockRequest):
        return 200, {}, _dbx_done(0)

    def chunk(r: MockRequest):
        i = int(r.path.rsplit("/", 1)[1])
        return 200, {}, {"chunk_index": i, "data_array": srv.state["rows"][i * 3 : i * 3 + 3], **({"next_chunk_index": i + 1, "next_chunk_internal_link": f"/api/2.0/sql/statements/st-1/result/chunks/{i + 1}"} if (i + 1) * 3 < 7 else {})}

    def _dbx_done(i: int):
        return {"statement_id": "st-1", "status": {"state": "SUCCEEDED"}, "manifest": {"schema": {"columns": [{"name": "sku_id"}, {"name": "sku"}, {"name": "price"}]}, "total_chunk_count": 3, "total_row_count": 7},
                "result": {"chunk_index": 0, "data_array": srv.state["rows"][:3], "next_chunk_index": 1, "next_chunk_internal_link": "/api/2.0/sql/statements/st-1/result/chunks/1"}}

    srv.route("POST", r"/api/2\.0/sql/statements/?", stmt)
    srv.route("GET", r"/api/2\.0/sql/statements/st-1", poll)
    srv.route("GET", r"/api/2\.0/sql/statements/st-1/result/chunks/\d+", chunk)
    return srv


# -------------------------------------------------------------------------------------------------- S3-compatible object storage

def s3(bucket: str = "forecasts", page: int = 2) -> MockServer:
    """Path-style S3: ListObjectsV2 with continuation tokens, GET, PUT (honours If-None-Match: *), DELETE. Requires a SigV4 header."""
    srv = MockServer("s3")
    srv.state["objects"] = {}

    def signed(r: MockRequest) -> bool:
        return "AWS4-HMAC-SHA256" in r.headers.get("Authorization", "") and bool(r.headers.get("x-amz-date")) and bool(r.headers.get("x-amz-content-sha256"))

    def listing(r: MockRequest):
        if not signed(r):
            return 403, {"Content-Type": "application/xml"}, b"<Error><Code>AccessDenied</Code></Error>"
        prefix, tok = r.q("prefix", "") or "", int(r.q("continuation-token", "0") or 0)
        keys = sorted(k for k in srv.state["objects"] if k.startswith(prefix))
        chunk = keys[tok : tok + page]
        more = tok + page < len(keys)
        xml = "<ListBucketResult>" + f"<IsTruncated>{'true' if more else 'false'}</IsTruncated>" + (f"<NextContinuationToken>{tok + page}</NextContinuationToken>" if more else "")
        xml += "".join(f"<Contents><Key>{k}</Key><Size>{len(srv.state['objects'][k])}</Size></Contents>" for k in chunk) + "</ListBucketResult>"
        return 200, {"Content-Type": "application/xml"}, xml.encode()

    def obj(r: MockRequest):
        if not signed(r):
            return 403, {"Content-Type": "application/xml"}, b"<Error><Code>AccessDenied</Code></Error>"
        from urllib.parse import unquote
        key = unquote(r.path.split(f"/{bucket}/", 1)[1])
        if r.method == "GET":
            return (200, {"Content-Type": "application/octet-stream"}, srv.state["objects"][key]) if key in srv.state["objects"] else (404, {"Content-Type": "application/xml"}, b"<Error><Code>NoSuchKey</Code></Error>")
        if r.method == "PUT":
            if r.headers.get("If-None-Match") == "*" and key in srv.state["objects"]:
                return 412, {"Content-Type": "application/xml"}, b"<Error><Code>PreconditionFailed</Code></Error>"
            srv.state["objects"][key] = r.body
            return 200, {"ETag": '"etag"'}, b""
        if r.method == "DELETE":
            srv.state["objects"].pop(key, None)
            return 204, {}, b""
        return 405, {}, b""

    srv.route("GET", rf"/{bucket}/?", listing)
    for m in ("GET", "PUT", "DELETE"):
        srv.route(m, rf"/{bucket}/.+", obj)
    return srv
