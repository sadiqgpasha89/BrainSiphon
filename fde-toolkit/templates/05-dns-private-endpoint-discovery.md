# DNS and private-endpoint discovery

| Host name | Purpose | Expected answer (CIDR) | CNAME chain expected | Resolver | Zone type | Owner |
|-----------|---------|------------------------|----------------------|----------|-----------|-------|
| | | | | | public / private / split-horizon | |

## Questions

- [ ] Which resolver do workloads use (cloud default, corporate forwarders, CoreDNS)? ______
- [ ] Are private zones linked to the network the solution runs in (privatelink, private hosted zones)? ______
- [ ] Is there a conditional forwarder from the cloud to the corporate DNS, and back? ______
- [ ] Does any required service resolve to a **public** address from inside the network but must use a **private endpoint**? ______
- [ ] TTLs and negative-caching behaviour that could affect failover: ______

## Commands

```bash
getent ahosts <host>                                  # what applications see
dig +short +trace <host>                              # the delegation chain
dig @<resolver> <host> A +noall +answer +ttlid        # a specific resolver, CNAMEs and TTLs
kubectl run dns-probe --rm -it --image=busybox:1.36 --restart=Never -- nslookup <host>   # from inside the cluster
```

Typical private-endpoint names: `*.privatelink.blob.core.windows.net`, `*.vpce-*.amazonaws.com`, `*.p.googleapis.com`.
Feeds the `dns` section (`expect_cidrs`, `resolver`, `private_endpoint`, `expect_cname_contains`).
