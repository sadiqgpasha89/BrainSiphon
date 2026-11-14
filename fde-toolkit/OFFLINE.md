# Using the toolkit in restricted and air-gapped environments

## 1. Getting it in

The toolkit is plain files and a Python package with no dependencies. Transfer it the way the customer transfers anything:

```bash
# on a connected machine
tar czf fde-toolkit.tgz fde-toolkit && sha256sum fde-toolkit.tgz > fde-toolkit.tgz.sha256
# carry fde-toolkit.tgz and the .sha256 across the boundary (approved media, a one-way gateway, or the customer's artifact repository)
# on the jump host
sha256sum -c fde-toolkit.tgz.sha256 && tar xzf fde-toolkit.tgz && cd fde-toolkit && python3 -m bs_preflight --version
```

No Python on the jump host: copy only `shell/preflight.sh`. It needs bash and `timeout`, plus `openssl`, `curl` and `getent` (or
`dig`) for the checks that use them.

## 2. What it never does

- It never contacts a host that is not in your configuration. There is no telemetry and no update check.
- With `"offline": true` (or `--offline`) it also skips every item marked `"requires_internet": true`.
- It never writes credentials: configs name environment variables, and anything read is redacted from reports.

## 3. Proving the air gap

List destinations that must be unreachable under `egress_denied`; a check **passes only when the connection fails**. The air-gapped
example blocks `pypi.org`, `registry-1.docker.io`, `ghcr.io`, a public resolver (`8.8.8.8:53`) and `example.com`.
DNS-level isolation is a separate property: a `dns` item with `expect_cidrs` set to the enclave range proves that the names the
solution uses resolve only to enclave addresses.

## 4. Mirrors for everything else the delivery needs

| Need | Typical mirror | Verify with |
|------|----------------|-------------|
| Container images | Harbor, Artifactory, ECR/ACR/GAR private registry, Quay | `http` check on `/v2/` (200 or 401 means a registry answers); `skopeo inspect` via `cloud_access` |
| Python packages | Artifactory/Nexus PyPI proxy, or a vendored wheelhouse | `http` check on `/simple/`; `pip download -d wheelhouse -r requirements.txt` on a connected host |
| npm packages | Verdaccio, Artifactory | `http` check on the registry URL |
| Helm charts | OCI registry or ChartMuseum | `helm pull oci://...` via `cloud_access` |
| Terraform providers | filesystem or network mirror (`.terraformrc` `provider_installation`) | `terraform providers mirror` on a connected host |
| Model weights and datasets | internal object storage (S3-compatible), verified by digest | `object_storage` check |
| OS packages | internal yum/apt mirror | `http` check |

## 5. Offline install of the solution itself

```bash
# connected host: stage everything with digests
mkdir -p staging/wheels staging/images staging/charts
pip download -r requirements.txt -d staging/wheels
helm pull <chart> --destination staging/charts
skopeo copy --all docker://<image>@sha256:<digest> dir:staging/images/<name>
(cd staging && find . -type f -exec sha256sum {} \;) > staging.sha256

# enclave: verify, then load into the private registry and install without an index
sha256sum -c staging.sha256
skopeo copy --all dir:staging/images/<name> docker://registry.enclave.example/<name>:<tag>
pip install --no-index --find-links staging/wheels -r requirements.txt
```
