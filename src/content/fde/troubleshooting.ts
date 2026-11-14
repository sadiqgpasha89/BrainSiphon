/**
 * The FDE troubleshooting knowledge base: fifteen scenarios that recur in customer environments. Each has symptoms, diagnostic
 * commands, root causes, remediation steps and verification commands. `{{placeholders}}` are filled per use case and per customer.
 */
export interface TroubleEntry {
  id: string;
  title: string;
  area: 'identity' | 'network' | 'data' | 'model' | 'platform' | 'security' | 'configuration';
  symptoms: string[];
  diagnose: string[];
  causes: string[];
  fix: string[];
  verify: string[];
  /** who the FDE hands over to if it is not a customer-side problem */
  escalateTo: string;
}

export const TROUBLESHOOTING: TroubleEntry[] = [
  {
    id: 'auth-failure', title: 'Authentication failures (401)', area: 'identity',
    symptoms: ['Connector or API returns 401', 'Token endpoint answers invalid_client or invalid_grant', 'Logins loop back to the identity provider', 'Everything worked yesterday'],
    diagnose: ['python3 -m bs_preflight run --config preflight.json --only api_auth --only idp', 'curl -s {{issuer}}/.well-known/openid-configuration | jq .issuer', 'date -u; chronyc tracking   # clock skew above ~5 minutes breaks token validation', 'kubectl -n {{ns}} logs deploy/{{service}} --since=15m | grep -i -E "401|invalid_client|signature|expired"'],
    causes: ['Client secret expired or rotated without updating the secret store', 'Issuer string differs from the one in tokens (trailing slash, tenant id)', 'Audience or scope not registered for this client', 'Clock skew on the host or nodes', 'JWKS not reachable, so tokens cannot be validated'],
    fix: ['Rotate or re-read the secret from the store and restart the pods that cache it', 'Configure the issuer exactly as the discovery document reports it', 'Ask the IAM team to add the audience and scope to the app registration', 'Fix NTP on the nodes', 'Allow egress to the JWKS URI or mirror it inside'],
    verify: ['python3 -m bs_preflight run --config preflight.json --only api_auth   # PASS with claims shown', 'kubectl -n {{ns}} logs deploy/{{service}} --since=5m | grep -c 401   # expect 0'],
    escalateTo: 'Customer IAM team',
  },
  {
    id: 'missing-permissions', title: 'Missing permissions (403)', area: 'identity',
    symptoms: ['Authenticated but a call returns 403', 'A connector can read but not write', 'Works for an admin user, not for the service account', 'AccessDenied from object storage or a database'],
    diagnose: ['python3 -m bs_preflight run --config preflight.json --only service_accounts   # allowed and denied routes', 'kubectl auth can-i --list -n {{ns}} --as system:serviceaccount:{{ns}}:{{service}}', 'aws iam simulate-principal-policy --policy-source-arn {{role_arn}} --action-names s3:PutObject kms:Decrypt', 'psql "host={{db_host}} user={{db_user}} dbname={{db_name}}" -c "\\dp {{schema}}.*"'],
    causes: ['Role or scope not granted for the action the use case needs', 'Policy conditions (source IP, VPC endpoint, tag) not satisfied', 'Row or column-level security hiding the data', 'Service control or organisation policy overriding the grant'],
    fix: ['Request the specific permission with the purpose, through the customer access process', 'Make the call from the network path the policy allows', 'Ask the data owner for the masked or unmasked view that is approved', 'Raise the org-policy exception with the cloud platform team'],
    verify: ['python3 -m bs_preflight run --config preflight.json --only service_accounts   # allowed pass, denied still fail', 'repeat the failing call and record the request id'],
    escalateTo: 'Customer security and the system owner',
  },
  {
    id: 'network-connectivity', title: 'Network connectivity failures', area: 'network',
    symptoms: ['Connection timeouts to a customer system', 'Connection refused', 'Name does not resolve', 'Works from the jump host, not from the pods'],
    diagnose: ['python3 -m bs_preflight run --config preflight.json --only dns --only tcp --only proxy_checks', 'kubectl -n {{ns}} run netcheck --rm -it --restart=Never --image={{registry}}/busybox:1.36 -- nslookup {{target_host}}', 'kubectl -n {{ns}} get networkpolicy -o yaml', 'kubectl -n {{ns}} exec deploy/{{service}} -- sh -c "nc -vz {{target_host}} {{target_port}}"'],
    causes: ['Firewall rule missing for the cluster egress address or pod CIDR', 'Private DNS zone not linked to this network', 'NetworkPolicy default-deny blocking egress', 'Proxy not applied in the pod, or NO_PROXY missing the internal range', 'Kafka advertised listeners unreachable from the cluster'],
    fix: ['File the rule with the exact source (NAT or node CIDR), destination, port and ticket', 'Link the private zone and add the conditional forwarder', 'Add an egress NetworkPolicy for the destination and port', 'Set HTTPS_PROXY and NO_PROXY in the Helm values', 'Add DNS and firewall rules for every advertised listener'],
    verify: ['python3 -m bs_preflight run --config preflight.json --only tcp --only dns', 'kubectl -n {{ns}} exec deploy/{{service}} -- sh -c "nc -vz {{target_host}} {{target_port}}"'],
    escalateTo: 'Customer network team',
  },
  {
    id: 'certificate-expiry', title: 'Certificate expiration', area: 'security',
    symptoms: ['Sudden TLS handshake failures at a fixed time', 'x509: certificate has expired', 'A partner rejects the connection', 'Browser or client shows a trust error'],
    diagnose: ['python3 -m bs_preflight run --config preflight.json --only tls   # days to expiry for every endpoint', 'echo | openssl s_client -connect {{host}}:{{port}} -servername {{host}} 2>/dev/null | openssl x509 -noout -dates -subject -issuer', 'kubectl get certificate -A   # cert-manager', 'kubectl -n {{ns}} get secret {{tls_secret}} -o jsonpath="{.data.tls\\.crt}" | base64 -d | openssl x509 -noout -enddate'],
    causes: ['Rotation job failed or was never configured', 'Intermediate certificate missing from the served chain', 'A partner client certificate expired', 'Internal CA root changed and not distributed'],
    fix: ['Renew or re-issue and reload the workload', 'Serve the full chain', 'Request the new partner certificate (start 45 days ahead)', 'Distribute the CA bundle to every component and restart'],
    verify: ['python3 -m bs_preflight run --config preflight.json --only tls   # PASS and days_to_expiry above the minimum', 'openssl s_client -connect {{host}}:{{port}} -verify_return_error </dev/null'],
    escalateTo: 'Customer PKI or platform team',
  },
  {
    id: 'rate-limits', title: 'API rate limits (429)', area: 'platform',
    symptoms: ['429 Too Many Requests from a customer or partner API', 'Sync jobs slow down and fall behind', 'Retry storms', 'Quota exhausted messages (daily API calls)'],
    diagnose: ['kubectl -n {{ns}} logs deploy/{{service}} --since=30m | grep -c 429', 'curl -sI -H "Authorization: Bearer $TOKEN" {{api_url}} | grep -i -E "retry-after|x-ratelimit"', 'python3 -m fde_adapters check --config {{connector_config}}   # health shows remaining allowance where the API reports it'],
    causes: ['Polling where the API offers webhooks or an incremental export', 'No Retry-After handling or jitter, causing synchronised retries', 'A backfill running alongside live traffic', 'The plan\'s quota is lower than the design assumed'],
    fix: ['Use the incremental or bulk endpoint; reduce the polling rate', 'Honour Retry-After with jittered exponential backoff (the framework client does)', 'Run backfills off-peak at a capped rate', 'Request a higher quota with the volume estimate'],
    verify: ['kubectl -n {{ns}} logs deploy/{{service}} --since=15m | grep -c 429   # trending to zero', 'check the lag metric for the sync job returns to its target'],
    escalateTo: 'The API owner for a quota change; AI or platform engineer for client behaviour',
  },
  {
    id: 'db-connection-exhaustion', title: 'Database connection exhaustion', area: 'data',
    symptoms: ['remaining connection slots are reserved', 'Timeouts acquiring a connection', 'Latency spikes under load', 'Other applications on the database slow down'],
    diagnose: ['psql "host={{db_host}} user={{db_user}} dbname={{db_name}}" -c "select state, count(*) from pg_stat_activity group by 1"', 'psql ... -c "show max_connections"', 'kubectl -n {{ns}} get hpa; kubectl -n {{ns}} top pods', 'python3 -m bs_preflight run --config preflight.json --only databases'],
    causes: ['Pool size times replicas exceeds max_connections', 'Autoscaling multiplied the pools', 'Long transactions or leaked connections', 'No pooler (PgBouncer, RDS Proxy) in front'],
    fix: ['Cap pool size per pod and replicas so the total stays below the agreed budget', 'Put a pooler in front and use transaction pooling', 'Set statement and idle-in-transaction timeouts', 'Use a read replica for read-heavy paths'],
    verify: ['psql ... -c "select count(*) from pg_stat_activity"   # below the budget under load', 'repeat the load test and confirm no pool timeouts'],
    escalateTo: 'Customer DBA',
  },
  {
    id: 'kafka-consumer-lag', title: 'Kafka consumer lag', area: 'data',
    symptoms: ['Lag growing on a consumer group', 'Stale features or delayed decisions', 'Rebalance storms in the logs', 'Messages going to the dead-letter topic'],
    diagnose: ['kafka-consumer-groups.sh --bootstrap-server {{bootstrap}} --describe --group {{group}}', 'python3 -m bs_preflight run --config preflight.json --only kafka   # leaders and advertised listeners', 'kubectl -n {{ns}} logs deploy/{{service}} --since=15m | grep -i -E "rebalance|poll|deserial"', 'kafka-topics.sh --bootstrap-server {{bootstrap}} --describe --topic {{topic}}'],
    causes: ['Consumers fewer than partitions, or one slow partition', 'Processing slower than the producer rate', 'max.poll.interval.ms exceeded causing rebalances', 'Poison message blocking a partition', 'Schema change the consumer cannot decode'],
    fix: ['Scale consumers up to the partition count', 'Batch and parallelise inside the consumer; tune max.poll.records', 'Increase max.poll.interval.ms or reduce batch work', 'Route undecodable messages to the dead-letter topic and continue', 'Roll the consumer to the compatible schema'],
    verify: ['kafka-consumer-groups.sh ... --describe --group {{group}}   # LAG trending to the target', 'the freshness metric returns inside its SLO'],
    escalateTo: 'Customer streaming platform team',
  },
  {
    id: 'schema-incompatibility', title: 'Schema incompatibility', area: 'data',
    symptoms: ['Deserialisation errors', 'Null or missing fields in features', 'Contract test failures after an upstream release', 'Records quarantined in bulk'],
    diagnose: ['python3 -m fde_adapters contract --config {{connector_config}}   # contract battery', 'curl -s {{registry_url}}/subjects/{{subject}}/versions/latest | jq', 'kubectl -n {{ns}} logs deploy/{{service}} --since=30m | grep -i -E "schema|decode|contract"', 'select count(*) from {{quarantine_table}} where reason like \'schema%\''],
    causes: ['A breaking change shipped without a new contract version', 'Compatibility mode on the registry allows the break', 'A new enumeration value or unit', 'Time zone or format change'],
    fix: ['Ask the producer to republish with a compatible change or a new version and a migration window', 'Set BACKWARD_TRANSITIVE compatibility on the subject', 'Add the new value to the mapping and a test', 'Replay the quarantined records after the fix'],
    verify: ['python3 -m fde_adapters contract --config {{connector_config}}', 'the quarantine table stops growing and the replay drains it'],
    escalateTo: 'The data owner and producing team',
  },
  {
    id: 'data-quality', title: 'Data-quality failures', area: 'data',
    symptoms: ['Completeness or freshness assertions failing', 'Model scores shift without a code change', 'Reconciliation to a trusted report fails', 'Duplicate or late records'],
    diagnose: ['python3 data-quality-suite.py --partition {{partition}}   # delivery/templates/phase-2-data/data-quality-suite.py', 'select count(*), count(distinct event_id) from {{table}} where event_date = current_date', 'compare today\'s feature distributions with the last 7 days (PSI)', 'check the source system\'s own job status'],
    causes: ['Upstream job failed or ran late', 'A sensor or integration outage', 'A change in business definition', 'Duplicate delivery without idempotency'],
    fix: ['Serve the last good data with a stale flag and alert the owner', 'Backfill after the upstream is fixed, into a versioned namespace', 'Agree the new definition and update the contract', 'Enable idempotent consumers and de-duplicate by key'],
    verify: ['the data-quality suite passes on the next partition', 'reconciliation to the trusted report is within tolerance'],
    escalateTo: 'The data owner',
  },
  {
    id: 'model-serving-failure', title: 'Model-serving failures', area: 'model',
    symptoms: ['5xx from the scoring endpoint', 'Pods restarting or not ready', 'Latency above the budget', 'Responses carry degraded=true'],
    diagnose: ['kubectl -n {{ns}} get pods -l app={{service}}; kubectl -n {{ns}} describe pod -l app={{service}} | tail -40', 'kubectl -n {{ns}} logs deploy/{{service}} --previous --tail=100', 'curl -s https://{{endpoint}}/health/readiness', 'curl -s https://{{endpoint}}/metrics | grep -E "latency|degraded|model_version"'],
    causes: ['Model artifact missing, unsigned or the wrong digest', 'Feature store or a dependency down', 'Memory limit too low for the model', 'Configuration pointing at the wrong registry or bucket'],
    fix: ['Verify and re-pull the artifact by digest', 'Let the degradation ladder serve the baseline; fix the dependency', 'Raise limits to the load-tested values', 'Correct the configuration and redeploy with --atomic'],
    verify: ['bash deployment/smoke-test.sh https://{{endpoint}}', 'kubectl -n {{ns}} get pods   # all ready, no restarts'],
    escalateTo: 'ML or MLOps engineer; SRE for platform faults',
  },
  {
    id: 'gpu-memory', title: 'GPU memory exhaustion', area: 'model',
    symptoms: ['CUDA out of memory', 'Pods evicted or OOMKilled on GPU nodes', 'Throughput collapses under concurrency', 'Latency grows with batch size'],
    diagnose: ['kubectl -n {{ns}} exec deploy/{{service}} -- nvidia-smi', 'kubectl -n {{ns}} logs deploy/{{service}} --tail=200 | grep -i -E "out of memory|cuda"', 'kubectl describe node {{gpu_node}} | grep -A6 Allocated', 'curl -s https://{{endpoint}}/metrics | grep -E "batch|queue|gpu"'],
    causes: ['Batch or context size above what fits', 'Several replicas sharing one GPU without limits', 'Memory fragmentation or a leak across requests', 'A larger model version than the one load-tested'],
    fix: ['Cap batch size and context; enable dynamic batching limits', 'One replica per GPU or MIG slices with limits', 'Restart policy and a request-count recycle until the leak is fixed', 'Quantise or shard, or move to a larger GPU class'],
    verify: ['repeat the load test at 1.2x provisioned rate with nvidia-smi sampling; no OOM', 'latency p99 inside the budget'],
    escalateTo: 'Inference engineer',
  },
  {
    id: 'deployment-failure', title: 'Deployment failures', area: 'platform',
    symptoms: ['helm upgrade fails or times out', 'ImagePullBackOff', 'Pods Pending', 'Admission webhook denies the resource'],
    diagnose: ['helm -n {{ns}} status {{release}}; helm -n {{ns}} history {{release}}', 'kubectl -n {{ns}} get events --sort-by=.lastTimestamp | tail -30', 'kubectl -n {{ns}} describe pod -l app={{service}} | grep -A8 -E "Events|Failed"', 'kubectl get resourcequota -n {{ns}}; kubectl get psp,constraints -A 2>/dev/null | head'],
    causes: ['Image not in the customer registry or the pull secret is wrong', 'Quota or no capacity for the requested resources', 'Pod security or policy admission rejecting the spec', 'A value missing in the customer overrides'],
    fix: ['Mirror the image by digest and fix the pull secret', 'Raise the quota or reduce requests with the platform team', 'Adjust the securityContext to the policy, not the other way round', 'Fix the values and re-run with --atomic so a failure rolls back'],
    verify: ['helm -n {{ns}} status {{release}}   # deployed', 'bash deployment/smoke-test.sh https://{{endpoint}}'],
    escalateTo: 'Customer platform team',
  },
  {
    id: 'cross-tenant-leak', title: 'Cross-tenant data leakage', area: 'security',
    symptoms: ['A response, cache hit or log line contains another tenant\'s data', 'Retrieval returns documents the caller cannot access', 'A tenant reports seeing foreign records', 'An isolation test fails'],
    diagnose: ['STOP the affected flow first (feature flag or traffic share to zero), then:', 'kubectl -n {{ns}} logs deploy/{{service}} --since=24h | grep -E "tenant_hash|tenant_id" | sort | uniq -c   # who touched what', 'check cache keys carry the tenant: redis-cli -h {{redis_host}} --scan --pattern "t:*" | head', 'run the isolation tests from the tenant pack: python3 -m pytest tests -k tenant -q', 'preserve logs and request ids as evidence; do not pull more data to investigate'],
    causes: ['A query or cache key missing the tenant', 'A retrieval filter applied by the caller instead of the store', 'A shared index without a partition', 'A service credential broader than the caller\'s rights'],
    fix: ['Contain: disable the path, rotate affected credentials, invalidate caches', 'Add the tenant to every key and apply the filter in the store (fail closed without a tenant)', 'Move to on-behalf-of authorisation for reads', 'Notify per the customer\'s incident and breach process through the security contact'],
    verify: ['isolation tests pass, including the adversarial query', 'a canary tenant query for another tenant\'s phrase returns nothing', 'security signs the closure'],
    escalateTo: 'Security engineer and the customer security contact, immediately',
  },
  {
    id: 'incorrect-predictions', title: 'Incorrect predictions', area: 'model',
    symptoms: ['Users report wrong outputs', 'KPI moves the wrong way', 'Calibration or slice metrics degrade', 'A change in input mix'],
    diagnose: ['compare the live score distribution with the validation distribution and with last week (PSI)', 'curl -s https://{{endpoint}}/metrics | grep -E "model_version|calibration|drift"', 'pull 20 cases from the decision ledger and replay them: feature hash, model version, output', 'check feature freshness and the data-quality suite for the day'],
    causes: ['Data drift or a feature pipeline problem', 'A unit or definition change upstream (mapping out of date)', 'A threshold or policy change nobody recorded', 'Label delay making recent performance look different'],
    fix: ['Roll back to the previous model if a guardrail is breached', 'Fix the mapping and replay affected decisions', 'Restore the approved threshold from the decision log', 'Retrain through the gated pipeline; do not patch live'],
    verify: ['replay the 20 cases and confirm expected outputs', 'the guardrail metric returns inside its limits over a full window'],
    escalateTo: 'Data scientist and the decision owner',
  },
  {
    id: 'customer-config-error', title: 'Customer-specific configuration errors', area: 'configuration',
    symptoms: ['Works in staging, fails in production', 'Wrong endpoint, region, tenant or queue', 'A mapped field is empty', 'A threshold behaves unexpectedly'],
    diagnose: ['helm -n {{ns}} get values {{release}} -a | diff - customer-values.yaml', 'python3 -m fde_adapters check --config {{connector_config}}', 'compare the environment variables: kubectl -n {{ns}} set env deploy/{{service}} --list', 'search the decision log for the last approved change to the setting'],
    causes: ['Staging and production values drifted', 'A placeholder left unfilled', 'A credential or endpoint from another environment', 'A change made by hand outside version control'],
    fix: ['Reconcile the values from version control; forbid manual edits', 'Fill every placeholder; fail the deploy on an unknown one', 'Use per-environment secret paths', 'Record the correction in the decision log'],
    verify: ['helm get values equals the reviewed file', 'the contract tests pass in the target environment'],
    escalateTo: 'Platform engineer for drift; decision owner for thresholds',
  },
];

export const TROUBLE_BY_ID: Record<string, TroubleEntry> = Object.fromEntries(TROUBLESHOOTING.map((t) => [t.id, t]));

/** Which scenarios matter most for a use case, in order: derived from its latency class, mode and paradigms. */
export function rankScenarios(opts: { online: boolean; llm: boolean; gpu: boolean; tenant: boolean; streaming: boolean; batch: boolean; partners: boolean }): string[] {
  const score: Record<string, number> = {};
  const add = (id: string, n: number) => (score[id] = (score[id] ?? 0) + n);
  for (const t of TROUBLESHOOTING) add(t.id, 1);
  if (opts.online) ['model-serving-failure', 'network-connectivity', 'db-connection-exhaustion', 'rate-limits'].forEach((i) => add(i, 3));
  if (opts.streaming) ['kafka-consumer-lag', 'schema-incompatibility'].forEach((i) => add(i, 3));
  if (opts.batch) ['data-quality', 'schema-incompatibility', 'customer-config-error'].forEach((i) => add(i, 3));
  if (opts.gpu || opts.llm) ['gpu-memory', 'model-serving-failure'].forEach((i) => add(i, 3));
  if (opts.tenant) add('cross-tenant-leak', 6);
  if (opts.partners) ['certificate-expiry', 'auth-failure', 'rate-limits'].forEach((i) => add(i, 3));
  ['auth-failure', 'missing-permissions', 'network-connectivity', 'deployment-failure', 'incorrect-predictions'].forEach((i) => add(i, 2));
  return Object.keys(score).sort((a, b) => score[b]! - score[a]! || a.localeCompare(b));
}
