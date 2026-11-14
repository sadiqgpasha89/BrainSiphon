/**
 * Customer-environment deployment modes: eight workflows, each with what must run inside the customer's environment, how images
 * and packages get there, what to validate before applying, and the exact deploy, verify, rollback and cleanup commands.
 * `{{placeholders}}` are filled from the customer configuration in the workspace.
 */
export const DEPLOY_MODE_IDS = ['customer-aws', 'customer-azure', 'customer-gcp', 'customer-kubernetes', 'on-premises', 'hybrid', 'air-gapped', 'managed-saas'] as const;
export type DeployModeId = (typeof DEPLOY_MODE_IDS)[number];

export interface DeployMode {
  id: DeployModeId;
  name: string;
  summary: string;
  /** must run inside the customer's boundary */
  inside: string[];
  /** may run outside it */
  outside: string[];
  prerequisites: string[];
  registries: { privateRegistry: string; packages: string; artifacts: string; offline: string[] };
  validateBeforeDeploy: string[];
  deploy: string[];
  verify: string[];
  rollback: string[];
  cleanup: string[];
  risks: string[];
}

const K8S_DEPLOY = [
  'helm lint deployment/helm/ai-solution -f deployment/helm/ai-solution/values-{{env}}.yaml',
  'helm upgrade --install {{release}} deployment/helm/ai-solution -n {{ns}} --create-namespace -f deployment/helm/ai-solution/values-{{env}}.yaml -f customer-values.yaml --atomic --wait --timeout 10m',
];
const K8S_VERIFY = [
  'kubectl -n {{ns}} rollout status deploy/{{service}} --timeout=5m',
  'kubectl -n {{ns}} get pods -o wide',
  'helm -n {{ns}} test {{release}}',
  'bash deployment/smoke-test.sh https://{{endpoint}}',
  'python3 -m bs_preflight run --config preflight.json --out readiness-report-after.json',
];
const K8S_ROLLBACK = ['helm -n {{ns}} history {{release}}', 'helm -n {{ns}} rollback {{release}} <revision> --wait --timeout 10m', 'kubectl -n {{ns}} rollout status deploy/{{service}}', 'bash deployment/smoke-test.sh https://{{endpoint}}'];
const K8S_CLEAN = ['helm -n {{ns}} uninstall {{release}}', 'kubectl delete namespace {{ns}} --wait=true', 'kubectl get pv | grep {{ns}}   # persistent volumes that survive the namespace: delete only after the data owner confirms'];
const POLICY = 'conftest test --policy deployment/policy <(helm template {{release}} deployment/helm/ai-solution -f deployment/helm/ai-solution/values-{{env}}.yaml)';
const KUBECONFORM = 'helm template {{release}} deployment/helm/ai-solution -f deployment/helm/ai-solution/values-{{env}}.yaml | kubeconform -strict -summary -';

export const DEPLOY_MODES: DeployMode[] = [
  {
    id: 'customer-aws', name: 'Customer-managed AWS', summary: 'The solution runs in the customer\'s AWS account on EKS, with the customer\'s VPC, KMS, IAM and private endpoints.',
    inside: ['EKS cluster and nodes in the customer VPC', 'Scoring and application services', 'Feature store, databases and brokers that hold customer data', 'KMS keys, Secrets Manager and IAM roles (IRSA)', 'ECR repositories and VPC endpoints'], outside: ['CI that builds signed artifacts (pushes to the customer ECR through an approved role)', 'Telemetry export only where the contract allows'],
    prerequisites: ['An account or OU approved by the customer cloud team', 'A deployer role with the permissions the plan needs (reviewed, time-boxed)', 'VPC with private subnets, NAT or endpoints for ECR, S3, STS, KMS, Secrets Manager', 'Service quotas for the node types'],
    registries: { privateRegistry: 'Amazon ECR in the customer account (replication from the build account, or `skopeo copy`)', packages: 'CodeArtifact or the customer\'s Artifactory for pip, npm and Helm', artifacts: 'S3 with a bucket policy and VPC endpoint for model artifacts', offline: ['skopeo copy --all docker://{{source_registry}}/{{image}}@{{digest}} docker://{{account}}.dkr.ecr.{{region}}.amazonaws.com/{{image}}:{{tag}}', 'pip config set global.index-url {{pip_index}}'] },
    validateBeforeDeploy: ['aws sts get-caller-identity', 'python3 -m bs_preflight run --config preflight.json --out readiness-report.json', 'terraform -chdir=deployment/terraform/aws init -backend-config=../backend.hcl', 'terraform -chdir=deployment/terraform/aws validate', 'terraform -chdir=deployment/terraform/aws plan -var-file=../environments/{{env}}.tfvars -out=tfplan', 'terraform -chdir=deployment/terraform/aws show -json tfplan > tfplan.json', 'aws eks describe-cluster --name {{cluster}} --query cluster.endpointPublicAccess   # must be false outside dev', POLICY, KUBECONFORM],
    deploy: ['terraform -chdir=deployment/terraform/aws apply tfplan   # run by, or approved by, the customer platform team', 'aws eks update-kubeconfig --name {{cluster}} --region {{region}}', ...K8S_DEPLOY],
    verify: K8S_VERIFY,
    rollback: [...K8S_ROLLBACK, '# infrastructure: terraform -chdir=deployment/terraform/aws apply <previous plan>  (never destroy data stores to roll back)'],
    cleanup: [...K8S_CLEAN, 'terraform -chdir=deployment/terraform/aws plan -destroy -var-file=../environments/{{env}}.tfvars -out=destroy.plan   # review, then apply with the platform team', 'aws ecr batch-delete-image --repository-name {{image}} --image-ids imageTag={{tag}}'],
    risks: ['Public EKS endpoint left on', 'IAM role wider than reviewed', 'Endpoint DNS not linked to the VPC', 'Quota for GPU nodes'],
  },
  {
    id: 'customer-azure', name: 'Customer-managed Azure', summary: 'AKS in the customer\'s subscription with their VNet, Key Vault, managed identities and private endpoints.',
    inside: ['AKS cluster in the customer VNet', 'Scoring and application services', 'Data stores and brokers holding customer data (Azure Database, Event Hubs, Storage with private endpoints)', 'Key Vault, managed identities and Azure Policy assignments', 'Azure Container Registry'], outside: ['CI that builds and pushes signed images to ACR through a service principal or federated credential'],
    prerequisites: ['Subscription and resource group approved', 'Deployer role (Contributor scoped to the resource group, plus User Access Administrator only if role assignments are in scope)', 'VNet with subnets and private DNS zones linked', 'Azure Policy initiatives understood (they can deny the plan)'],
    registries: { privateRegistry: 'Azure Container Registry with a private endpoint (`az acr import` or `skopeo copy`)', packages: 'Azure Artifacts or the customer\'s Artifactory', artifacts: 'Azure Storage with private endpoint', offline: ['az acr import --name {{registry}} --source {{source_registry}}/{{image}}@{{digest}} --image {{image}}:{{tag}}'] },
    validateBeforeDeploy: ['az account show -o json', 'python3 -m bs_preflight run --config preflight.json --out readiness-report.json', 'terraform -chdir=deployment/terraform/azure init -backend-config=../backend.hcl', 'terraform -chdir=deployment/terraform/azure validate', 'terraform -chdir=deployment/terraform/azure plan -var-file=../environments/{{env}}.tfvars -out=tfplan', 'az policy state list --resource-group {{resource_group}} --filter "complianceState eq \'NonCompliant\'" -o table', POLICY, KUBECONFORM],
    deploy: ['terraform -chdir=deployment/terraform/azure apply tfplan', 'az aks get-credentials --resource-group {{resource_group}} --name {{cluster}}', ...K8S_DEPLOY],
    verify: K8S_VERIFY, rollback: K8S_ROLLBACK,
    cleanup: [...K8S_CLEAN, 'terraform -chdir=deployment/terraform/azure plan -destroy -var-file=../environments/{{env}}.tfvars -out=destroy.plan', 'az acr repository delete --name {{registry}} --image {{image}}:{{tag}} --yes'],
    risks: ['Azure Policy denying the deployment at apply time', 'Private DNS zone not linked', 'Managed identity role assignment lag (minutes)'],
  },
  {
    id: 'customer-gcp', name: 'Customer-managed GCP', summary: 'GKE in the customer\'s project with their VPC, Cloud KMS, Workload Identity and Private Service Connect.',
    inside: ['GKE cluster (private) in the customer VPC', 'Scoring and application services', 'Cloud SQL, Pub/Sub or Kafka and storage holding customer data', 'Cloud KMS, Secret Manager and Workload Identity bindings', 'Artifact Registry'], outside: ['CI that pushes signed images to Artifact Registry through workload identity federation'],
    prerequisites: ['Project approved; organisation policies reviewed', 'Deployer role set reviewed', 'VPC, subnets with secondary ranges, Cloud NAT or Private Google Access, Private Service Connect where needed'],
    registries: { privateRegistry: 'Artifact Registry (`gcrane copy` or `skopeo copy`)', packages: 'Artifact Registry remote and virtual repositories for pip, npm, Maven', artifacts: 'Cloud Storage with VPC Service Controls', offline: ['gcrane cp {{source_registry}}/{{image}}@{{digest}} {{region}}-docker.pkg.dev/{{project}}/{{repo}}/{{image}}:{{tag}}'] },
    validateBeforeDeploy: ['gcloud auth list && gcloud config get-value project', 'python3 -m bs_preflight run --config preflight.json --out readiness-report.json', 'terraform -chdir=deployment/terraform/gcp init -backend-config=../backend.hcl', 'terraform -chdir=deployment/terraform/gcp validate', 'terraform -chdir=deployment/terraform/gcp plan -var-file=../environments/{{env}}.tfvars -out=tfplan', 'gcloud resource-manager org-policies list --project {{project}}', POLICY, KUBECONFORM],
    deploy: ['terraform -chdir=deployment/terraform/gcp apply tfplan', 'gcloud container clusters get-credentials {{cluster}} --region {{region}} --project {{project}}', ...K8S_DEPLOY],
    verify: K8S_VERIFY, rollback: K8S_ROLLBACK,
    cleanup: [...K8S_CLEAN, 'terraform -chdir=deployment/terraform/gcp plan -destroy -var-file=../environments/{{env}}.tfvars -out=destroy.plan', 'gcloud artifacts docker images delete {{region}}-docker.pkg.dev/{{project}}/{{repo}}/{{image}}:{{tag}} --quiet'],
    risks: ['VPC Service Controls blocking the CI or the cluster', 'Organisation policy denying external IPs or specific regions', 'Workload Identity binding missing'],
  },
  {
    id: 'customer-kubernetes', name: 'Customer-managed Kubernetes', summary: 'An existing customer cluster (OpenShift, Rancher, vanilla, any cloud): the solution is a namespace and a Helm release; the customer owns the cluster.',
    inside: ['The customer cluster namespace and its network policies', 'Scoring and application services', 'Stateful services either in-cluster (operators) or the customer\'s managed services', 'The customer\'s ingress, service mesh and secret store'], outside: ['Build and signing'],
    prerequisites: ['A namespace with a ResourceQuota and the roles to install a Helm release (not cluster-admin)', 'StorageClass, IngressClass and an image pull secret', 'Pod security admission level (restricted) understood', 'NetworkPolicy default-deny understood'],
    registries: { privateRegistry: 'The customer\'s registry (Harbor, Quay, Artifactory, OpenShift internal registry)', packages: 'The customer\'s package mirror', artifacts: 'The customer\'s object storage or artifact repository', offline: ['skopeo copy --all docker://{{source_registry}}/{{image}}@{{digest}} docker://{{registry}}/{{image}}:{{tag}}', 'helm pull oci://{{source_registry}}/charts/ai-solution --version {{chart_version}} && helm push ai-solution-{{chart_version}}.tgz oci://{{registry}}/charts'] },
    validateBeforeDeploy: ['kubectl auth can-i create deployments -n {{ns}}', 'kubectl auth can-i create networkpolicies -n {{ns}}', 'kubectl get resourcequota -n {{ns}}', 'kubectl get storageclass', 'python3 -m bs_preflight run --config preflight.json --out readiness-report.json', POLICY, KUBECONFORM, 'helm template {{release}} deployment/helm/ai-solution -f deployment/helm/ai-solution/values-{{env}}.yaml | kubectl apply --dry-run=server -n {{ns}} -f -'],
    deploy: K8S_DEPLOY, verify: K8S_VERIFY, rollback: K8S_ROLLBACK, cleanup: K8S_CLEAN,
    risks: ['Pod security or admission policy rejecting the pods', 'Default-deny network policy blocking the connectors', 'No StorageClass for the stateful components'],
  },
  {
    id: 'on-premises', name: 'On-premises infrastructure', summary: 'Customer data centre: virtual machines or bare metal, a cluster the customer runs, internal registries and an internal CA.',
    inside: ['Everything: scoring, application, data stores, brokers, observability, secrets (Vault or an HSM-backed store)'], outside: ['Nothing that touches customer data; build and signing happen outside and arrive as signed artifacts'],
    prerequisites: ['Hardware or VM capacity and GPU drivers where needed', 'Internal DNS, NTP and a corporate CA bundle', 'A Kubernetes distribution the customer supports, or Docker Compose for a single-node pilot', 'Backups and storage the customer operates'],
    registries: { privateRegistry: 'Harbor or the customer\'s registry; images arrive by `skopeo copy` or a transferred archive', packages: 'Internal PyPI and npm mirrors (Artifactory, Nexus), or a vendored wheelhouse', artifacts: 'MinIO, Ceph or the customer\'s object storage', offline: ['docker save {{image}}:{{tag}} | gzip > {{image}}.tar.gz   # on the connected side', 'gunzip -c {{image}}.tar.gz | docker load && docker tag {{image}}:{{tag}} {{registry}}/{{image}}:{{tag}} && docker push {{registry}}/{{image}}:{{tag}}'] },
    validateBeforeDeploy: ['python3 -m bs_preflight run --config preflight.json --out readiness-report.json', 'chronyc tracking   # clock skew breaks token validation', 'openssl verify -CAfile {{ca_bundle}} {{server_cert}}', 'kubectl get nodes -o wide', POLICY, KUBECONFORM],
    deploy: [...K8S_DEPLOY, '# single-node pilot: docker compose -f deployment/docker/docker-compose.fullstack.yml --env-file .env.customer up -d'], verify: K8S_VERIFY, rollback: [...K8S_ROLLBACK, '# compose: docker compose -f deployment/docker/docker-compose.fullstack.yml down && docker compose -f ... up -d with the previous tags'],
    cleanup: [...K8S_CLEAN, 'docker compose -f deployment/docker/docker-compose.fullstack.yml down -v   # -v removes volumes: only with the data owner\'s approval'],
    risks: ['Clock skew', 'Internal CA not trusted by every component', 'GPU driver and CUDA mismatch', 'No spare capacity for a rolling update'],
  },
  {
    id: 'hybrid', name: 'Hybrid cloud', summary: 'Regulated data and the decision path stay in the customer\'s data centre or sovereign region; training, experimentation and non-regulated analytics run in a public cloud on tokenised data.',
    inside: ['Decision path: gateway, scoring, feature store, decision ledger, the connectors to systems of record', 'Anything that holds raw regulated data'], outside: ['Training and experimentation on tokenised or de-identified data', 'Model registry (signed artifacts flow in one direction: out to in)', 'Non-regulated analytics'],
    prerequisites: ['Private connectivity between the two sides (VPN, Direct Connect, ExpressRoute, Interconnect)', 'A data-classification rule for what may cross', 'A one-way, signed path for model artifacts into the customer side', 'Tokenisation or de-identification at the boundary'],
    registries: { privateRegistry: 'A registry on each side; images are promoted by digest, never rebuilt', packages: 'Mirrors on each side', artifacts: 'Signed model artifacts promoted across the boundary with verification', offline: ['cosign verify --key {{cosign_pub}} {{registry}}/{{image}}@{{digest}}', 'skopeo copy --all docker://{{cloud_registry}}/{{image}}@{{digest}} docker://{{registry}}/{{image}}:{{tag}}'] },
    validateBeforeDeploy: ['python3 -m bs_preflight run --config preflight.json --out readiness-report.json   # include the cross-boundary paths and the egress_denied checks', 'confirm with the data owner which fields cross the boundary and that they are tokenised there', POLICY, KUBECONFORM],
    deploy: ['# customer side', ...K8S_DEPLOY, '# cloud side: apply the cloud stack for training and analytics from deployment/terraform/<cloud>'], verify: [...K8S_VERIFY, 'confirm no raw regulated field appears in the cloud-side stores: run the sampling query agreed with the data owner'], rollback: K8S_ROLLBACK, cleanup: K8S_CLEAN,
    risks: ['A raw field crossing the boundary', 'Model artifact promoted without verification', 'Latency between the sides on the decision path (keep it off the path)'],
  },
  {
    id: 'air-gapped', name: 'Air-gapped environments', summary: 'No route to the internet. Everything (images, charts, packages, models, CA bundles, documentation) arrives as verified, signed files through the customer\'s transfer process.',
    inside: ['Everything, including registry, package mirror, identity provider, time source and certificate authority'], outside: ['The connected staging side where bundles are built, scanned and signed'],
    prerequisites: ['An approved transfer path (data diode, approved media, a one-way gateway) and the people who operate it', 'An internal registry, package mirror, NTP and DNS inside the enclave', 'The enclave\'s CA bundle', 'A written rule for how bundles are verified on arrival'],
    registries: { privateRegistry: 'The enclave registry, populated from signed archives (`skopeo copy dir:` to `docker://`)', packages: 'A wheelhouse and an npm cache built on the connected side, verified by checksum', artifacts: 'The enclave\'s object storage; model weights verified by digest', offline: ['pip download -r requirements.txt -d bundle/wheels && helm pull <chart> -d bundle/charts && skopeo copy --all docker://<image>@<digest> dir:bundle/images/<name>', '(cd bundle && find . -type f -exec sha256sum {} \;) > bundle.sha256 && cosign sign-blob --key {{cosign_key}} bundle.sha256 > bundle.sha256.sig', '# in the enclave: cosign verify-blob --key {{cosign_pub}} --signature bundle.sha256.sig bundle.sha256 && sha256sum -c bundle.sha256', 'skopeo copy --all dir:bundle/images/<name> docker://{{registry}}/<name>:{{tag}}', 'pip install --no-index --find-links bundle/wheels -r requirements.txt'] },
    validateBeforeDeploy: ['python3 -m bs_preflight run --config preflight.airgapped.json --offline --out readiness-report.json   # includes egress_denied: the air gap must be real', 'sha256sum -c bundle.sha256', POLICY, KUBECONFORM],
    deploy: K8S_DEPLOY, verify: [...K8S_VERIFY, 'python3 -m bs_preflight run --config preflight.airgapped.json --offline --only egress_denied   # still no route out after deployment'], rollback: K8S_ROLLBACK, cleanup: [...K8S_CLEAN, 'skopeo delete docker://{{registry}}/{{image}}:{{tag}}   # when the registry allows deletes'],
    risks: ['An image or chart that pulls from the internet at runtime', 'A package that tries the public index', 'Certificate expiry with no way to fetch a new one: track rotation dates', 'Telemetry or licence checks phoning home'],
  },
  {
    id: 'managed-saas', name: 'Managed SaaS environments', summary: 'The vendor-run service hosts the solution; the customer\'s environment holds only connectors, an agent or gateway, and the identity and network trust.',
    inside: ['Connectors and the on-site gateway or agent that reach the customer\'s systems', 'Identity trust (SSO federation, SCIM) and private connectivity (PrivateLink, peering, IP allow-listing)', 'Data the contract requires to stay (tokenisation at the connector)'], outside: ['The multi-tenant service: scoring, application, models, observability'],
    prerequisites: ['A tenant with the right region and data-residency setting', 'SSO federation and SCIM configured by the customer IAM', 'Outbound allow-list or private link to the service', 'A data-processing agreement and the sub-processor list reviewed'],
    registries: { privateRegistry: 'Only for the on-site agent: pulled from the customer\'s registry', packages: 'n/a for the service; the agent follows the customer\'s package policy', artifacts: 'n/a', offline: ['skopeo copy --all docker://{{vendor_registry}}/agent@{{digest}} docker://{{registry}}/agent:{{tag}}'] },
    validateBeforeDeploy: ['python3 -m bs_preflight run --config preflight.json --out readiness-report.json   # outbound to the service endpoints and the IdP', 'confirm the tenant region, retention and sub-processors with the customer privacy officer'],
    deploy: ['helm upgrade --install {{release}}-agent oci://{{registry}}/charts/agent -n {{ns}} --create-namespace -f customer-values.yaml --atomic --wait', '# configure the tenant: SSO, SCIM, connectors and policies through the service\'s admin API or console, recorded as code'], verify: ['kubectl -n {{ns}} rollout status deploy/{{release}}-agent', 'bash deployment/smoke-test.sh https://{{endpoint}}', 'python3 -m bs_preflight run --config preflight.json --out readiness-report-after.json'],
    rollback: ['helm -n {{ns}} rollback {{release}}-agent <revision> --wait', '# tenant configuration: re-apply the previous configuration from version control'], cleanup: ['helm -n {{ns}} uninstall {{release}}-agent', '# request tenant deletion and a deletion certificate from the vendor under the data-processing agreement'],
    risks: ['Data residency setting wrong at tenant creation', 'Allow-list missing the vendor\'s egress ranges', 'SCIM deprovisioning not tested'],
  },
];

export const DEPLOY_MODE_BY_ID: Record<DeployModeId, DeployMode> = Object.fromEntries(DEPLOY_MODES.map((m) => [m.id, m])) as Record<DeployModeId, DeployMode>;

/** Replace {{key}} with a value; an unknown key stays visible so a missing setting is obvious, not silently blank. */
export const fill = (text: string, vars: Record<string, string>): string => text.replace(/\{\{(\w+)\}\}/g, (m, k: string) => vars[k] ?? m);
