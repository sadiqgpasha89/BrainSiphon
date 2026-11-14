# Enterprise network topology

Customer: ______  Environment: ______  Date: ______  Completed by: ______  Reviewed by (customer): ______

## 1. Zones

| Zone | Purpose | CIDR(s) | Internet egress | Inbound from | Notes |
|------|---------|---------|-----------------|--------------|-------|
| Corporate / user network | Analysts, clinicians, planners | | proxy / direct / none | | |
| DMZ / API edge | API gateway, WAF | | | internet / partners | |
| Application zone | Where the solution runs | | proxy / none | DMZ only | |
| Data zone | Databases, warehouses, brokers | | none | Application zone only | |
| Management zone | CI runners, bastions, monitoring | | | | |
| Partner / third-party links | Carriers, exchanges, payment switches | | | | |

## 2. Paths the solution needs (one row per flow; the firewall CSV expands these into rules)

| Flow | From | To | Direction | Protocol | Crosses a zone boundary? | Inspected (IDS/TLS break)? |
|------|------|----|-----------|----------|---------------------------|----------------------------|
| Request ingestion | | | | | | |
| Feature / state reads | | | | | | |
| Decision write-back | | | | | | |
| Telemetry export | | | | | | |
| Container image pull | | | | | | |
| Package installs | | | | | | |
| Model artifact download | | | | | | |

## 3. Constraints

- [ ] TLS inspection is performed on egress (record the corporate CA and how to trust it): ______
- [ ] Source addresses must be allow-listed by partners (record the NAT/egress IPs): ______
- [ ] Latency between zones that matter for the latency budget (ms): ______
- [ ] Change windows and the lead time for firewall changes (days): ______
- [ ] Which zones are air-gapped (no route to the internet at all): ______

## 4. How to discover it

```bash
ip route; ip -br addr                      # what this host can see
traceroute -n <data-zone-host>             # where the packets stop
curl -sv --max-time 5 https://<host>/ -o /dev/null   # TLS, proxy and DNS in one go
```

Feeds: `tcp`, `proxy_checks`, `egress_denied` in `preflight.json`.
