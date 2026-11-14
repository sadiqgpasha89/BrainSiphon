"""RESO Web API (OData) connector for MLS data, with the RESO Data Dictionary mapped to the AVM's canonical property, listing and sale records."""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from fde_adapters.core.adapter import Adapter, Health
from fde_adapters.core.registry import register
from fde_adapters.mocks.server import MockRequest, MockServer

#: RESO Data Dictionary field -> canonical field (a starting subset; each MLS adds local fields)
FIELD_MAP = {"ListingKey": "listing_id", "ListingId": "mls_number", "StandardStatus": "status", "ListPrice": "list_price", "ClosePrice": "sale_price", "CloseDate": "sale_date", "LivingArea": "living_area", "LivingAreaUnits": "area_unit",
             "BedroomsTotal": "bedrooms", "BathroomsTotalInteger": "bathrooms", "YearBuilt": "year_built", "LotSizeSquareFeet": "lot_sqft", "PropertyType": "property_type", "PropertySubType": "property_subtype",
             "UnparsedAddress": "address_raw", "StreetNumber": "street_number", "StreetName": "street_name", "UnitNumber": "unit", "City": "city", "StateOrProvince": "state", "PostalCode": "postal_code", "Latitude": "lat", "Longitude": "lon",
             "ParcelNumber": "parcel_id", "ModificationTimestamp": "modified_at", "DaysOnMarket": "dom", "ConcessionsAmount": "concessions"}
SQFT_PER_SQM = 10.7639


@register
class ResoWebApiAdapter(Adapter):
    ID = "reso-webapi"
    TITLE = "MLS via the RESO Web API (OData)"
    PROTOCOL = "RESO Web API: OData v4 /Property with $filter on ModificationTimestamp, $select, $top, @odata.nextLink; OAuth2 client credentials or a bearer token issued by the MLS"
    MOCK_NOTE = "Reproduces /Property with $filter (ModificationTimestamp, StandardStatus), $select and @odata.nextLink. Each MLS has its own field set, replication rules and rate limits."
    CONNECTION = {"base_url": {"required": True}, "mls": {"required": True}, "auth": {"required": True}, "headers": {}, "proxy": {}, "ca_file": {}, "verify_tls": {}}
    READ = {"resource": {"default": "Property"}, "select": {}, "since": {"required": True, "description": "ISO timestamp: replicate changes after this"}, "statuses": {"default": ["Closed"]}, "page_size": {"default": 200}, "key_field": {"default": "ListingKey"}, "event_time_field": {"default": "ModificationTimestamp"}}
    WRITE = {"idempotency_fields": {}}

    def _init(self) -> None:
        self.http = self.build_http(self.conn["base_url"])

    def _health(self) -> Health:
        self.http.get("/Property", params={"$top": 1, "$select": "ListingKey"})
        return Health(True, {"mls": self.conn["mls"]})

    def _read_page(self, query: Dict[str, Any], cursor: Optional[str]) -> Tuple[List[Dict[str, Any]], Optional[str]]:
        r = self.cfg["read"]
        if cursor is None:
            sts = " or ".join(f"StandardStatus eq '{s}'" for s in r.get("statuses", ["Closed"]))
            params = {"$filter": f"ModificationTimestamp gt {query.get('since') or r['since']} and ({sts})", "$top": r.get("page_size", 200), "$orderby": "ModificationTimestamp"}
            if r.get("select"):
                params["$select"] = ",".join(r["select"])
            resp = self.http.get(f"/{r.get('resource', 'Property')}", params=params)
        else:
            resp = self.http.get(cursor)
        d = resp.json()
        return d["value"], d.get("@odata.nextLink")


def to_canonical(rec: Dict[str, Any]) -> Dict[str, Any]:
    """RESO record -> canonical. Area is normalised to square feet; a sale without a price or date is not a comparable and is flagged."""
    out = {FIELD_MAP[k]: v for k, v in rec.items() if k in FIELD_MAP}
    issues = []
    if out.get("area_unit") in ("SquareMeters", "sqm") and out.get("living_area"):
        out["living_area"] = round(out["living_area"] * SQFT_PER_SQM, 1)
        out["area_unit"] = "SquareFeet"
    if out.get("status") == "Closed" and not (out.get("sale_price") and out.get("sale_date")):
        issues.append("closed listing without ClosePrice or CloseDate")
    if out.get("sale_price") and out.get("living_area"):
        out["price_per_sqft"] = round(out["sale_price"] / out["living_area"], 2)
    if out.get("lat") is not None and not (-90 <= out["lat"] <= 90 and -180 <= out["lon"] <= 180):
        issues.append("coordinates out of range")
    out["_issues"] = issues
    return out


def mock_reso(n: int = 7, page: int = 3) -> MockServer:
    srv = MockServer("reso")
    srv.state["rows"] = [{"ListingKey": f"L{i}", "ListingId": f"MLS{1000 + i}", "StandardStatus": "Closed", "ListPrice": 500000 + i * 5000, "ClosePrice": 495000 + i * 5000, "CloseDate": f"2026-02-{10 + i:02d}", "LivingArea": 1800 + i * 20, "LivingAreaUnits": "SquareFeet",
                          "BedroomsTotal": 3, "BathroomsTotalInteger": 2, "YearBuilt": 1995, "PropertyType": "Residential", "UnparsedAddress": f"{100 + i} Main St, Springfield, IL 62704", "City": "Springfield", "StateOrProvince": "IL", "PostalCode": "62704",
                          "Latitude": 39.78 + i * 0.001, "Longitude": -89.65, "ParcelNumber": f"14-{i:03d}-001", "ModificationTimestamp": f"2026-03-{1 + i:02d}T10:00:00Z", "AgentPhone": "555-0100", "ListAgentFullName": "A. Agent"} for i in range(1, n + 1)]

    def prop(r: MockRequest):
        if not r.headers.get("Authorization"):
            return 401, {}, {"error": {"code": "401", "message": "Unauthorized"}}
        skip = int(r.q("$skip", "0"))
        top = min(int(r.q("$top", str(page))), page)
        rows = srv.state["rows"][skip : skip + top]
        sel = r.q("$select")
        if sel:
            keep = set(sel.split(","))
            rows = [{k: v for k, v in x.items() if k in keep} for x in rows]
        body: Dict[str, Any] = {"@odata.context": "x", "value": rows}
        if skip + top < len(srv.state["rows"]):
            body["@odata.nextLink"] = f"{srv.base}/Property?$skip={skip + top}&$top={top}" + (f"&$select={sel}" if sel else "")  # a real OData server keeps the query options in the next link
        return 200, {}, body

    srv.route("GET", r"/Property", prop)
    return srv
