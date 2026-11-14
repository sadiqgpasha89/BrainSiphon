# Proxy configuration

| Setting | Value | Notes |
|---------|-------|-------|
| HTTP proxy URL | | including port; credentials go in a secret, never in this file |
| HTTPS proxy URL | | usually the same host |
| Authentication | none / basic / NTLM / Kerberos / PAC file | NTLM and Kerberos need a local helper (cntlm, px) |
| `NO_PROXY` list | | internal domains, CIDRs of the data zone, the cluster service CIDR, `localhost` |
| TLS interception | yes / no | if yes, the corporate root CA must be trusted by: OS store, Python (`REQUESTS_CA_BUNDLE`, `SSL_CERT_FILE`), Java (cacerts), Node (`NODE_EXTRA_CA_CERTS`), containers |
| CONNECT allowed to ports | 443 / others | `proxy_checks[].connect_to` proves each destination |
| Allow-listed destinations | | one row per host the solution calls through the proxy |
| Proxy source address (for partner allow-lists) | | |

## Where each tool reads the proxy from

| Tool | Setting |
|------|---------|
| curl, git, most CLIs | `HTTPS_PROXY`, `NO_PROXY` |
| pip | `pip config set global.proxy`, or an index URL in `pip.conf` (preferred) |
| npm | `npm config set proxy`, `https-proxy`, `cafile` |
| Docker daemon | `/etc/systemd/system/docker.service.d/http-proxy.conf` |
| containerd / Kubernetes nodes | systemd drop-in for containerd; `NO_PROXY` must include the API server and service CIDR |
| Terraform | `HTTPS_PROXY`; provider mirrors via `.terraformrc` `provider_installation` |
| Java / JVM services | `-Dhttps.proxyHost -Dhttps.proxyPort -Dhttp.nonProxyHosts` |

## Verify

```bash
curl -sv -x "$HTTPS_PROXY" https://<destination>/ -o /dev/null 2>&1 | grep -E "CONNECT|HTTP/|issuer"
python3 -m bs_preflight run --config preflight.json --only proxy_checks
```

A `403` on CONNECT is a policy denial (allow-list the host); `407` is missing proxy credentials; a certificate whose issuer is the
customer's CA means TLS is intercepted and the CA must be trusted.
