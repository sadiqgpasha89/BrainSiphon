# Cybersecurity, part 1 (use cases 1-25)
== network-intrusion-detection-flow-anomaly | Network Intrusion Detection via Flow Anomalies | tabular,time-series | sub-100ms | production-grade | a=2000 k=1
obj: Detect lateral movement, scanning and command-and-control from network flow metadata at line rate, including in encrypted traffic.
loss: \mathcal{L}=\|x-\mathrm{Dec}(\mathrm{Enc}(x))\|^2+\lambda\,\mathrm{SemiSupervisedBCE}
con: 100 Gbps links ; Encrypted payloads invisible ; Alert precision for SOC ; Edge sensor CPU limits
sn: Features | Flow-level behavioural features (fan-out, periodicity, byte ratios) | Payload signatures | TLS hides payloads and signatures lag new attacks
sn: Benchmarks | Evaluate on recent real traffic with temporal splits | Public datasets like KDD/CICIDS | Public datasets are years old with artefacts that inflate accuracy
sig: Fan-out and new-destination rate | distinct new peers per host per hour | Scanning and lateral movement | Window and baseline exclude the alert
sig: Beaconing periodicity | autocorrelation of connection intervals | C2 beacons | Jitter handling
sig: Byte ratio asymmetry | upload to download ratio | Exfiltration | Direction labelling
noise: Source port | ephemeral and random
noise: Absolute packet counts | scale with host role not intent
base: Signature-based IDS rules (Snort/Suricata) plus static thresholds.
prod: Per-role autoencoder and gradient-boosted classifier on streaming flow aggregates, with host-role baselines and a graph layer for lateral movement.
pipe: Flow collectors @ NetFlow and eBPF ; Flow aggregator @ Flink windows ; Role-aware baseline @ per-role model ; Anomaly and class model @ GBDT plus autoencoder ; Alert enrichment @ asset and identity context ; SOC queue @ analyst triage ; Analyst verdicts @ label feedback
edge: New backup job creates huge uploads | exfiltration alerts fire on a legitimate scheduled transfer | Change-calendar integration and per-role baselines with maintenance windows
edge: Sensor drops packets under load | features are silently biased low and attacks hide | Sensor health metrics and drop-rate gating on detections
off: Recall at fixed alerts per day ; Precision on analyst-verified alerts
on: Mean time to detect ; Analyst false-positive hours
gap: Training on public datasets with unrealistic attacks ; Random flow splits leak the same session across train and test

== endpoint-malware-detection | Endpoint Malware Detection (Static + Dynamic) | tabular,computer-vision | sub-100ms | staff-principal | a=50 k=50
obj: Classify files and processes as malicious on the endpoint in milliseconds with very low false positives on enterprise software.
loss: \mathcal{L}=\mathrm{CE}(y,p)+\lambda\,\mathrm{AdversarialRobustness}
con: Under 20 ms on-device scan ; CPU overhead under 2% ; Offline operation ; False positive on signed business software is unacceptable
sn: Evasion | Robustness to packing, obfuscation and adversarial byte edits | Accuracy on a random test split | Random splits contain near-duplicate families and hide generalisation failure
sn: Time | Evaluate on files first seen after the training cutoff | Random splits | Malware drift makes random-split accuracy meaningless
sig: PE header and import features | imports, section entropy, header anomalies | Cheap static signal | Packers distort them
sig: API call n-gram behaviour | sandbox API call sequences | Behavioural truth | Sandbox evasion
sig: Reputation features | prevalence, signer, first-seen age | Strong prior | Reputation lookup latency
noise: File name | trivial to change
noise: File size alone | weak and gameable
base: Signature and heuristic AV engine with cloud reputation lookup.
prod: Two-stage on-device LightGBM/CNN static model with cloud dynamic analysis, reputation features and FP-controlled thresholds on a goodware corpus.
pipe: File event hook @ endpoint agent ; Static feature extractor @ native code ; On-device classifier @ quantised model ; Reputation lookup @ cloud cache ; Sandbox detonation @ dynamic analysis ; Verdict engine @ policy ; Telemetry and verdicts @ cloud lake
edge: Legitimate installer is packed like malware | goodware flagged and business stops | Signer allow-lists and goodware-weighted thresholds
edge: Model update causes mass false positives | fleet-wide quarantine of a common library | Canary rollout by device ring and automatic rollback
off: TPR at 0.001% FPR on goodware ; Time-split detection rate
on: Detections per 1M files ; False positive incidents
gap: Random splits with near-duplicate samples ; Goodware corpus unrepresentative of enterprise software

== phishing-url-and-email-detection | Phishing URL & Email Detection | nlp,tabular | sub-100ms | production-grade | a=20 k=20
obj: Block phishing emails and links at delivery and click time, catching novel campaigns before blocklists update.
loss: \mathcal{L}=\mathrm{FL}(p,y)+\lambda\,\mathrm{Calibration}
con: Delivery latency under 100 ms ; Zero tolerance for blocking business-critical mail ; Multilingual ; Campaigns live for minutes
sn: Novelty | Features from page, domain age and infrastructure | URL blocklists | Phishing domains live for hours, lists lag
sn: Click-time | Re-scan links at click time | Scan at delivery only | Attackers weaponise links after delivery
sig: Domain age and registration pattern | days since registration, registrar risk | Newly registered domains | WHOIS timing
sig: Brand impersonation score | visual and text similarity to known brands | Lookalike pages | Brand corpus
sig: Sender-recipient relationship graph | prior interaction between sender and recipient | Unfamiliar senders | Graph as-of
noise: Email subject length | weak
noise: Number of recipients | confounded with newsletters
base: Blocklists plus keyword heuristics.
prod: Ensemble of URL char-CNN, page-screenshot ViT and email-header/body transformer with sender-graph features and click-time rescanning.
pipe: Mail gateway @ SMTP ; Header and sender graph features @ graph lookup ; Text and URL model @ transformer ; Page crawler and screenshot @ headless browser ; Phish classifier @ ensemble ; Policy action @ quarantine or banner ; User reports @ labels
edge: Legitimate marketing mail from a new domain | false positive blocks a critical vendor | Allow-list workflow and sender reputation ramp
edge: Attackers cloak pages from crawlers | scanner sees benign page | Residential-IP crawling and user-agent diversity
off: Detection rate at 1 in 100k false positive ; Time-to-detect of new campaigns
on: Phish delivered per 1M ; User-reported phish rate
gap: Training on old campaigns ; Cloaked pages labelled benign

== business-email-compromise-detection | Business Email Compromise Detection | nlp,graph | sub-100ms | staff-principal | a=10 k=15
obj: Detect payment-redirect and executive-impersonation emails that contain no malware or links, using relationship and intent signals.
loss: \mathcal{L}=\mathrm{BCE}(y,p)\cdot w(\text{amount at risk})
con: Very few positives ; Plain-text attacks ; Low false positives on finance mail ; Real-time before delivery
sn: Context | Sender-recipient history and communication graph | Content-only classifiers | BEC mails are well-written and benign-looking
sn: Intent | Detect intent (payment change, urgency) with LLM features | Link and attachment scanning | There is no malicious payload to find
sig: First-contact flag with finance role | sender never emailed this recipient | Impersonation | Graph snapshot
sig: Display-name vs address mismatch | name of an exec with external address | Spoofing | Directory
sig: Payment-change intent score | NLP intent classifier | Payload | Calibration
noise: Message length | weak
noise: Time of day | weak
base: Rules for display-name spoofing and external executive mimicry.
prod: Graph-and-intent model: sender-recipient relationship features plus transformer intent classifier, gated by amount-at-risk context.
pipe: Mail gateway @ SMTP ; Relationship graph lookup @ graph store ; Intent classifier @ transformer ; BEC scorer @ GBDT ; Policy and banner @ action ; Finance verification @ out-of-band call ; Confirmed cases @ labels
edge: Compromised real vendor account sends the fraud email | relationship features look legitimate | Behaviour-change features on the vendor and invoice anomalies
edge: Executive travels and emails from a personal address | legitimate mail flagged | Executive-specific allow-lists with step-up verification
off: Recall at fixed FP per million ; Amount-weighted recall
on: Dollar loss from BEC ; Verification calls triggered
gap: Few labelled positives from known incidents ; Evaluating on spoofing only

== ueba-insider-threat-detection | UEBA: Insider Threat Detection | time-series,graph | batch | staff-principal | a=50 k=2
obj: Rank users and entities by behavioural risk against their own and peer baselines to surface insider threats and compromised accounts.
loss: \mathcal{L}=\sum_t\left[\log\sigma_t+\frac{(x_t-\mu_t)^2}{2\sigma_t^2}\right]
con: Privacy and works-council constraints ; Explainability for investigators ; Peer-group baselines ; Few true insiders
sn: Baselines | Per-user and peer-group baselines with seasonal adjustment | Global thresholds | Roles differ enormously in normal behaviour
sn: Aggregation | Risk accumulation over time with decay | Single-event alerts | Insiders act subtly across weeks
sig: Peer-relative deviation | z-score of activity vs peer group | Unusual behaviour | Peer group definition
sig: Sensitive resource first-access | first access to a sensitive repository | Reconnaissance | Access log as-of
sig: Off-hours and volume shift | change in off-hours activity | Behaviour change | Personal baseline
noise: Employee tenure | fairness risk
noise: Job title text | encoded by peer group
base: Rule-based DLP and access alerts.
prod: Personalised baselines (Bayesian) with peer-group models, entity risk accumulation and analyst-facing timeline explanations.
pipe: Log ingestion @ SIEM ; Entity resolver @ identity mapping ; Baseline models @ per-user and peer ; Risk accumulator @ decayed scores ; Ranked entity list @ UEBA console ; HR and security review @ human ; Investigation outcomes @ labels
edge: Reorganisation changes peer groups | everyone's baseline shifts | Org-change events trigger baseline refresh
edge: Legitimate project spike | risk scores jump for an entire team | Project metadata as context and group-level suppression
off: Recall of known insider cases ; Precision at investigator capacity
on: Investigated cases with findings ; Time to detection
gap: Very few true insider labels ; Evaluating with synthetic insiders

== identity-threat-detection-sso | Identity Threat Detection in SSO Logs | tabular,graph | sub-100ms | production-grade | a=10 k=3
obj: Detect token theft, MFA fatigue attacks and suspicious sign-ins in identity-provider logs in real time and trigger step-up or session revocation.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}
con: Decision during authentication within 50 ms ; Step-up friction budget ; Privacy ; Global workforce travel
sn: Sequence | Sign-in sequences and session continuity | Per-login anomaly scores | Token theft shows as a session jump not a bad login
sn: Calibration | Risk bands tied to actions | Raw probabilities | Policies need thresholds with known error rates
sig: Session token reuse across IPs | same token from distinct networks | Token theft | Token IDs hashed
sig: MFA push storm | number of denied pushes in 10 minutes | Fatigue attack | Window
sig: Impossible-travel score | speed between locations | Compromise | VPN handling
noise: Browser version | noisy
noise: Login time of day | confounded by timezone
base: Static rules for impossible travel and country blocks.
prod: Streaming feature builder with gradient-boosted risk scoring and policy engine for step-up, revoke or block, with user-visible explanations.
pipe: IdP log stream @ Kafka ; Session and device features @ Flink ; Risk model @ GBDT ; Policy engine @ risk bands ; Step-up or revoke @ IdP API ; SOC queue @ analyst ; Confirmed compromises @ labels
edge: Corporate VPN exits change | everyone appears to travel | VPN egress registry and dynamic IP reputation
edge: Executive travel to high-risk country | step-up annoys leadership | Travel-notice integration and risk-tier policy
off: Detection recall at fixed step-up rate ; Time to revoke
on: Account takeovers per 100k users ; Step-up rate for legitimate users
gap: Labels from confirmed incidents only ; Simulated attacks lacking real token behaviours

== siem-alert-triage-ml | SIEM Alert Triage & Prioritisation | tabular | seconds | production-grade | a=500 k=3
obj: Score and prioritise the flood of SIEM alerts so analysts spend time on the 2% that matter.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{RankLoss}
con: Millions of alerts per day ; Explainable priorities ; Feedback loop from analysts ; SLA for critical alerts
sn: Labels | Analyst dispositions with noise handling | Closed-as-benign counted as truth | Benign closure is often a time-saving shortcut
sn: Context | Asset criticality and identity context | Alert severity from the rule | Rule severity is set statically
sig: Rule historical true-positive rate | TP rate of the rule per asset class | Prior | Matured labels
sig: Asset criticality | business criticality tier | Impact | CMDB
sig: Alert co-occurrence | related alerts on the same host | Attack chains | Window
noise: Alert text | duplicates rule name
noise: Analyst name | personal
base: Rule severity ordering.
prod: Gradient-boosted triage ranker with asset context and co-occurrence features, active learning from analyst feedback.
pipe: Alert stream @ SIEM ; Context enrichment @ CMDB and identity ; Triage ranker @ LightGBM ; Correlation grouper @ clustering ; Priority queue @ SOAR ; Analyst @ human ; Disposition feedback @ labels
edge: New detection rule has no history | cold-start priority is wrong | Prior from similar rules and exploration for new rules
edge: Analysts rubber-stamp low-priority alerts | labels are biased | Random audit sampling of low-priority alerts
off: Recall of true incidents in top-k ; Precision at analyst capacity
on: Mean time to respond to critical alerts ; Alerts handled per analyst hour
gap: Disposition labels biased by prior ordering ; Evaluating only alerts that were triaged

== soc-copilot-llm-investigation | SOC Investigation Copilot | llm-agents,nlp | seconds | staff-principal | a=100 k=20 s=6 t=450
obj: Accelerate investigations by letting an agent gather evidence from SIEM, EDR and identity tools and propose verdicts with cited queries.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{tool results})+\lambda\,\mathrm{UnsupportedClaim}
con: Read-only tools by default ; Response actions need approval ; Full audit trail ; Prompt-injection resistance
sn: Tools | Typed, least-privilege query tools | Free-form shell access | Free-form access enables injection-driven damage
sn: Evidence | Every claim linked to a log line | Narrative explanations | Analysts need to verify quickly
sig: Evidence link rate | share of claims with log references | Trust | Link verification
sig: Query success and retry count | tool failures per case | Reliability | Telemetry
sig: Verdict agreement with senior analysts | agreement rate | Quality | Blind review
noise: Narrative length | not quality
noise: Model confidence phrasing | uncalibrated
base: SOAR playbooks with static enrichment steps.
prod: Planner–executor agent over typed security tools with evidence verification, step budgets and approval gates for containment actions.
pipe: Alert context loader @ SIEM ; Planner agent @ LLM ; SIEM and EDR query tools @ read-only APIs ; Identity and threat-intel tools @ APIs ; Evidence verifier @ log-line check ; Analyst workspace @ human ; Audit log @ immutable
edge: Attacker plants instructions in log fields or file names | agent runs unintended tool calls | Treat logs as untrusted data and enforce tool allow-lists
edge: Tool returns huge result sets | context overflows and the agent drops key facts | Result summarisation tools with pagination
off: Verdict accuracy on replayed cases ; Evidence link validity
on: Investigation time per alert ; Escalation precision
gap: Replay set includes cases used for prompt tuning ; Judging by analyst satisfaction not correctness

== threat-hunting-hypothesis-agent | Threat Hunting Hypothesis Generation | llm-agents,graph | seconds | staff-principal | a=5 k=20 s=5 t=400
obj: Generate and test threat-hunting hypotheses from fresh intelligence against telemetry, turning reports into validated detections or negative results.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{CTI})+\lambda\,\mathrm{InvalidQuery}
con: Queries must be safe and cost-bounded ; MITRE ATT&CK mapping ; Reproducible hunts ; Hunter oversight
sn: Mapping | Map reports to ATT&CK techniques and data sources | Free-form hunting ideas | Without data-source mapping the hunt cannot run
sn: Cost | Query cost budgets | Unbounded search over the lake | Expensive queries can take down the SIEM
sig: Technique coverage gap | techniques lacking detections | Priority | Coverage matrix
sig: Query validity rate | queries that run and return | Reliability | Execution
sig: Hit-rate on hypotheses | share producing leads | Value | Review
noise: Report length | none
noise: Hype of the threat actor | marketing noise
base: Manual hunts from threat reports.
prod: CTI-to-ATT&CK extraction, data-source-aware query synthesis with cost estimators, result triage and conversion of confirmed hunts into detection rules.
pipe: Threat-intel feeds @ ingestion ; Technique extractor @ LLM ; Query synthesiser @ data-source-aware ; Cost guard @ query planner ; Hunt executor @ SIEM ; Hunter review @ human ; Detection engineering @ rule pipeline
edge: Synthesised query scans the entire data lake | an unscoped synthesised query scans the whole data lake and overloads the SIEM | Cost estimator and scoped time windows
edge: Report is wrong or deliberately misleading | hunts built on a wrong or planted report waste analyst time and miss real activity | Source reliability scoring and corroboration
off: Query validity and hit-rate ; Coverage gain
on: Detections created per hunt ; Hunter hours saved
gap: No ground truth for negative hunts ; Counting hypotheses not validated outcomes

== vulnerability-prioritization-exploit-prediction | Vulnerability Prioritisation & Exploit Prediction | tabular,nlp | batch | production-grade | a=0.1 k=5
obj: Predict which CVEs will be exploited in the wild and prioritise patching by exploit likelihood and asset exposure.
loss: \mathcal{L}=\mathrm{BCE}(y,p)\quad y=\text{exploited within 30 days}
con: 20k+ new CVEs a year ; Patch capacity limits ; Asset context ; Explainable priority
sn: Prediction | Exploitation likelihood, not CVSS severity | CVSS score ordering | CVSS correlates weakly with real exploitation
sn: Context | Asset exposure and compensating controls | Global CVE ranking | An unreachable critical CVE can wait
sig: Exploit code availability | public PoC or exploit-kit mention | Strong predictor | Timing of first PoC
sig: Product and vendor prevalence | deployment prevalence | Attack surface | Inventory
sig: Social and threat-intel chatter | mention velocity | Early signal | Source bias
noise: CVE ID number | arbitrary
noise: CVSS base score alone | weak
base: Patch by CVSS severity and SLA.
prod: Gradient-boosted exploitation model (EPSS-style) combined with asset exposure graph and business criticality into a risk-ranked remediation queue.
pipe: Vulnerability scan data @ scanners ; CVE feature enrichment @ NVD and exploit feeds ; Exploit model @ GBDT ; Asset exposure join @ CMDB and network graph ; Risk ranker @ priority score ; Patch owner queue @ ticketing ; Patch outcomes @ closure
edge: Zero-day with no CVE record | model cannot rank | Threat-intel overrides and manual escalation path
edge: Asset inventory incomplete | exposure unknown and risk underestimated | Discovery coverage metrics and conservative defaults
off: AUC and precision at top-k for 30-day exploitation ; Calibration
on: Exploited-vulnerability exposure time ; Patch effort per risk reduced
gap: Exploitation labels are biased toward observed attacks ; Using features that appear after exploitation

== patch-risk-and-sequencing | Patch Risk Prediction & Sequencing | tabular | batch | foundational | a=0.1 k=3
obj: Predict which patches will cause outages and schedule rollouts in rings to cut patch-induced downtime.
loss: \mathcal{L}=\mathrm{BCE}(\text{incident},p)\cdot w(\text{asset criticality})
con: Change windows ; Rollback capability ; Dependency graph ; Compliance deadlines
sn: Risk | Predicted breakage risk per patch-asset pair | Same ring for all assets | Critical systems need slower rings
sn: Dependency | Software dependency graph | Per-host patching | Shared libraries break many services
sig: Patch vendor history | past breakage rate | Risk | Vendor tags
sig: Asset configuration diversity | uncommon configurations | Breakage | Inventory
sig: Service dependency fan-in | dependents of the component | Blast radius | Graph
noise: Patch size | weak
noise: Release day | weak
base: Patch Tuesday schedule with fixed rings.
prod: Breakage-risk model with dependency-aware ring assignment and automated canary health checks.
pipe: Patch catalogue @ vendor feeds ; Asset and config data @ CMDB ; Risk model @ GBDT ; Ring planner @ dependency graph ; Deployment orchestrator @ patch tool ; Health checks @ monitors ; Incident feedback @ tickets
edge: Zero-day emergency patching | skips safety rings | Emergency path with extra monitoring and fast rollback
edge: Rare configuration | no historical data | Config-clustering priors and slower rings
off: AUC for patch incident prediction ; Simulated downtime reduction
on: Patch-induced incidents ; Time to patch critical vulnerabilities
gap: Incident labels missing for unreported breakages ; Ignoring change windows in evaluation

== attack-path-analysis-graph | Attack Path Analysis on Enterprise Graphs | graph,reinforcement-learning | batch | staff-principal | a=0.5 k=10
obj: Compute and rank the most plausible attack paths from entry points to crown-jewel assets, guiding the smallest set of fixes that break them.
loss: \min_{S}\;|S|\ \text{s.t. every high-probability path from entry to crown jewels is cut by }S
con: Graph of millions of nodes ; Continuous updates ; Explainable paths ; Safe (no active exploitation)
sn: Choke points | Minimum cuts that break many paths | Fix every finding | Remediation capacity is limited
sn: Probability | Edge exploitability weighted by exploit likelihood | Reachability only | Reachable is not exploitable
sig: Edge exploit probability | exploit likelihood for the technique | Path weight | Vulnerability data
sig: Betweenness of nodes | paths passing through | Choke point | Graph
sig: Crown-jewel proximity | hops to critical assets | Impact | Definitions
noise: Node display name | none
noise: Count of vulnerabilities per host | volume not paths
base: Vulnerability lists per host.
prod: Probabilistic attack graph with exploitability-weighted edges and min-cut remediation selection, refreshed continuously from scanners, IAM and network data.
pipe: Asset IAM and network data @ lake ; Graph builder @ property graph ; Exploitability model @ GBDT ; Path engine @ probabilistic search ; Remediation optimiser @ min-cut ; Security engineer @ human ; Fix verification @ re-scan
edge: Graph stale after cloud changes | paths reported that no longer exist | Streaming updates from cloud audit logs
edge: Over-permissive IAM discovered at scale | thousands of paths | Priority by crown-jewel proximity and fix leverage
off: Path coverage vs red-team findings ; Remediation leverage
on: Reachable crown-jewel paths ; Mean time to break top paths
gap: Validation lacking red-team ground truth ; Static graph snapshots

== dns-tunneling-and-dga-detection | DNS Tunnelling & DGA Detection | nlp,tabular | sub-100ms | production-grade | a=500 k=1
obj: Detect data exfiltration over DNS and algorithmically generated domains used by malware, at resolver scale.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}
con: Billions of queries per day ; Under 1 ms per query ; Very low false positives ; Privacy
sn: Lexical | Character-level domain models and entropy | Static blocklists | DGA domains are never in blocklists
sn: Behaviour | Per-client query patterns (NXDOMAIN rate, subdomain entropy) | Single-domain scoring | Tunnelling shows in volume and entropy per client
sig: Subdomain entropy and length | Shannon entropy of labels | Tunnelling | Language effects
sig: NXDOMAIN burst rate | NXDOMAIN per minute per client | DGA search | Window
sig: Domain age and popularity | registration age and rank | Reputation | Data freshness
noise: Query type alone | weak
noise: TTL | weak
base: Blocklists and entropy thresholds.
prod: Char-CNN domain classifier plus per-client behavioural model, streaming at resolver with local caches.
pipe: DNS query stream @ resolver tap ; Lexical scorer @ char-CNN ; Client aggregator @ Flink ; Behaviour model @ GBDT ; Verdict and sinkhole @ policy ; SOC alerts @ queue ; Analyst labels @ feedback
edge: CDN and cloud services use random-looking subdomains | false positives on legitimate traffic | Known-service allow-lists and structural patterns
edge: Attackers mimic natural-language domains | lexical models miss | Dictionary-DGA features and behavioural fallbacks
off: Detection rate at 1e-6 FPR ; Time to detect
on: Blocked C2 domains ; False blocks of legitimate services
gap: Benign data from popularity lists with CDN gaps ; DGA families memorised

== ransomware-early-detection | Ransomware Early Detection | time-series,tabular | sub-100ms | staff-principal | a=100 k=2
obj: Detect mass file encryption within seconds on endpoints and file servers to stop it before significant data is lost.
loss: \mathcal{L}=\mathrm{FL}(y,p)+\lambda\,\mathrm{DetectionDelay}
con: Detection within 10 seconds ; Very low false positives on backup and compression tools ; Minimal I/O overhead ; Auto-containment
sn: Behaviour | File I/O entropy changes and rename patterns | Static file signatures | New ransomware families have no signatures
sn: Speed | Early partial-encryption detection | Waiting for full evidence | Every second costs thousands of files
sig: Write entropy jump | entropy of written blocks vs original | Encryption | Block sampling
sig: Rename and extension change rate | files renamed per second | Mass change | Time window
sig: Process lineage anomaly | process spawned by office app or script | Initial access | Lineage data
noise: File path names | highly variable
noise: Process name | trivial to change
base: Canary files and signature AV.
prod: Streaming behavioural classifier on I/O telemetry with kernel-level hooks, canary files and automatic process suspension plus snapshot rollback.
pipe: Kernel I/O telemetry @ minifilter driver ; Sliding-window features @ on-agent ; Behaviour classifier @ small GBDT ; Containment @ process suspend ; Snapshot rollback @ storage ; SOC alert @ queue ; Incident labels @ cloud
edge: Legitimate encryption tools (backup, disk encryption) | production file servers get frozen | Allow-listed signed encryptors and context-aware scoring
edge: Intermittent or slow encryption to evade thresholds | detection delayed | Low-and-slow detectors with cumulative counters
off: Detection latency and files lost at fixed FPR ; Recall by family
on: Files encrypted before containment ; Business interruption events
gap: Lab ransomware samples differ from live attacks ; Benign tools underrepresented in tests

== cloud-misconfiguration-and-drift | Cloud Misconfiguration & Drift Detection | tabular,graph | batch | foundational | a=1 k=5
obj: Find risky cloud configurations (public buckets, open security groups) and rank them by exposure and data sensitivity.
loss: \mathcal{L}=\mathrm{BCE}(y,p)\cdot w(\text{exposure})
con: Millions of resources ; Continuous change ; Business exceptions ; Fix ownership
sn: Context | Combine configuration with reachability and data sensitivity | Finding counts | A public bucket with logs is lower risk than one with PII
sn: Drift | Detect configuration changes via event stream | Periodic full scans | Scans miss short-lived exposures
sig: Internet reachability | network path from internet | Exposure | Graph
sig: Data classification | sensitivity of stored data | Impact | DLP tags
sig: Change event recency | time since misconfiguration was introduced | Urgency | Event logs
noise: Resource name | none
noise: Tag count | weak
base: CIS benchmark rule scanner.
prod: Event-driven posture graph with exposure and data-sensitivity scoring and ML-based owner attribution for tickets.
pipe: Cloud config and audit logs @ event streams ; Posture graph @ graph store ; Exposure analyser @ reachability engine ; Risk scorer @ GBDT ; Owner attribution @ tags and history ; Ticketing @ ITSM ; Remediation status @ labels
edge: Intentional public bucket for a website | intentionally public buckets keep firing alerts and bury the genuinely risky exposures | Exception registry with expiry
edge: Ephemeral resources exist for minutes | scans miss exposure | Event-driven evaluation on creation
off: Precision at top risk findings ; Coverage of real incidents
on: Mean time to remediate critical exposures ; Open exposures
gap: Evaluating on rule hits only ; Ignoring ownership resolution errors

== cloud-iam-privilege-anomaly | Cloud IAM Privilege Anomaly & Least-Privilege | graph,tabular | batch | staff-principal | a=5 k=3
obj: Detect abnormal permission use and recommend least-privilege policies by learning actual usage across identities and roles.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{GraphReg}
con: No outages from permission removal ; Complex trust relationships ; Audit logs at scale ; Role-chaining
sn: Usage | Right-size from observed usage with safety margins | Remove all unused permissions blindly | Rare but legitimate break-glass permissions get removed
sn: Paths | Effective permissions through role chaining | Direct policies only | Escalation paths hide in chains
sig: Permission use ratio | used divided by granted permissions | Over-provisioning | Window length
sig: Role-assumption chain depth | chain length to powerful role | Escalation | Graph
sig: Unusual API call for principal | rarity of call for this identity | Anomaly | Baseline
noise: Policy name | none
noise: Number of policies | weak
base: Access-analyser style findings of unused permissions.
prod: Identity graph with effective-permission analysis, usage-based right-sizing recommendations and anomaly models on API-call sequences.
pipe: Cloud audit logs @ lake ; Identity graph @ graph DB ; Effective-permission engine @ policy analysis ; Usage model @ baseline stats ; Anomaly detector @ sequence model ; Policy recommender @ least-privilege generator ; Engineer approval @ human
edge: Quarterly job needs permissions rarely used | removal breaks it | Long usage windows and staged removal with alerts
edge: Third-party role trust misconfigured | external escalation path | Cross-account trust analysis
off: Privilege reduction without breakage in shadow ; Anomaly precision
on: Excess permissions removed ; Privilege-escalation findings
gap: Short usage windows ; No labelled escalation events

== container-runtime-anomaly-detection | Container Runtime Anomaly Detection | time-series,tabular | sub-100ms | production-grade | a=1000 k=1
obj: Detect compromised containers via syscalls, process trees and network behaviour with low overhead.
loss: \mathcal{L}=\|x-\mathrm{Dec}(\mathrm{Enc}(x))\|^2
con: Under 3% overhead ; Ephemeral workloads ; Sparse labelled attacks ; Kubernetes-native
sn: Baselines | Learn per-image behavioural profiles | Host-level thresholds | Containers of one image behave consistently, hosts do not
sn: Ephemerality | Build profiles from image and deployment, not instance | Instance-level baselines | Instances live minutes
sig: Syscall n-gram novelty | rare syscall sequences for the image | Exploit behaviour | Profile coverage
sig: Unexpected process spawn | shell in a service container | Compromise | Image profile
sig: Outbound connection novelty | new destinations | C2 | Profile
noise: Container ID | ephemeral
noise: Pod IP | ephemeral
base: Runtime rules (Falco) with static signatures.
prod: eBPF telemetry feeding per-image profile learners and a sequence anomaly model, with Kubernetes metadata enrichment.
pipe: eBPF syscall and network events @ node agent ; Metadata enricher @ Kubernetes API ; Image-profile model @ sequence model ; Anomaly scorer @ per-image ; Response action @ kill or quarantine ; SOC alert @ queue ; Incident labels @ feedback
edge: Rolling deployment changes behaviour | alerts fire on new but legitimate version | Version-aware profile warm-up
edge: Debug sessions by engineers | flagged as compromise | Change-ticket correlation and break-glass tagging
off: Detection of simulated exploits at low FP ; Profile coverage
on: Container compromise dwell time ; False quarantines
gap: Simulated attacks lacking realism ; Profiles learned during an already-compromised period

== malicious-package-detection | Malicious Open-Source Package Detection | nlp,tabular | batch | production-grade | a=0.1 k=20
obj: Detect malicious packages (typosquats, install-script malware, dependency confusion) in package registries and CI before they run.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}
con: Millions of packages ; New versions published constantly ; Low false positives for maintainers ; Real-time CI gating
sn: Behaviour | Install-script and network behaviour in sandbox | Name similarity alone | Malicious code can hide under a normal-looking name
sn: Provenance | Maintainer and publishing-pattern changes | Package contents only | Account takeover shows in the publishing pattern
sig: Install-script risk | network or exec calls in install hooks | Malware | Static analysis
sig: Maintainer change or new publisher | ownership change | Takeover | Registry data
sig: Name similarity to popular packages | edit distance and keyboard proximity | Typosquat | Popularity list
noise: Package size | weak
noise: Number of versions | weak
base: Blocklists and name-similarity heuristics.
prod: Static plus sandbox features with maintainer-behaviour model in a gradient-boosted classifier and CI policy enforcement.
pipe: Registry feed @ new versions ; Static analyser @ AST and heuristics ; Sandbox detonation @ network-isolated ; Maintainer behaviour model @ GBDT ; Risk scorer @ ensemble ; CI gate @ policy ; Security review @ analyst
edge: Legitimate package adds a postinstall script | flagged as malware | Maintainer reputation weighting and reviewer fast path
edge: Sandbox evasion by delayed execution | malware not triggered | Time acceleration and multi-environment runs
off: Detection of known malicious packages at low FP ; Time to detect after publish
on: Malicious packages blocked before install ; Developer friction
gap: Test set made of known blocklists ; Benign packages not representative

== secret-leak-detection-in-code | Secret & Credential Leak Detection in Code | nlp,tabular | sub-100ms | foundational | a=50 k=5
obj: Find API keys, tokens and credentials in commits and repos with high precision to prevent leaks before merge.
loss: \mathcal{L}=\mathrm{BCE}(y,p)
con: Pre-commit latency under 1 s ; Millions of repos ; Very few false positives (developer trust) ; History scanning
sn: Precision | Combine regex with context and entropy models | Regex only | High-entropy strings include many non-secrets
sn: Validity | Verify live credentials safely | Report all matches | Dead keys are noise
sig: Pattern match for provider format | key prefix and checksum | Strong evidence | Format updates
sig: Entropy and character class | string statistics | Randomness | Threshold
sig: Surrounding context tokens | variable names like api_key | Intent | Language
noise: File extension alone | weak
noise: Commit message | weak
base: Regex scanner with entropy threshold.
prod: Provider-format detectors plus a small context classifier and safe verification calls, integrated into pre-commit and CI.
pipe: Commit hook @ git ; Pattern detectors @ regex bank ; Context classifier @ small transformer ; Verifier @ provider APIs ; Policy action @ block or warn ; Developer notification @ IDE or chat ; Rotation workflow @ secret manager
edge: Test fixtures contain fake keys | fake keys in test fixtures trigger repeated alerts and cause developers to ignore the scanner | Fixture path rules and verification of validity
edge: Secrets in git history already leaked | new commit passes but exposure persists | History scanning and forced rotation
off: Precision and recall on labelled secrets ; Verified-valid rate
on: Secrets leaked to default branch ; Developer overrides
gap: Positives from synthetic keys ; No evaluation on minified files

== llm-static-code-vulnerability-detection | LLM-Assisted Code Vulnerability Detection | llm-agents,nlp | seconds | staff-principal | a=20 k=10 s=4 t=400
obj: Find exploitable vulnerabilities in pull requests by combining static analysis with LLM reasoning and automatic proof-of-concept validation.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{code})+\lambda\,\mathrm{FalsePositive}
con: Low false positives (developer trust) ; Fix suggestions that compile ; Secure handling of proprietary code ; PR latency under minutes
sn: Verification | Validate findings by static/dynamic confirmation | Trust LLM claims | LLMs report plausible non-bugs confidently
sn: Context | Cross-file data-flow context | Single-file snippets | Vulnerabilities span call chains
sig: Taint path confirmation | static taint analysis path exists | Evidence | Analyser quality
sig: Exploit PoC success | generated test triggers issue | Proof | Sandbox
sig: Fix compile and test pass | patch builds and passes tests | Actionability | CI
noise: Code style issues | not security
noise: Comment content | injection risk
base: SAST scanner with rule packs.
prod: Hybrid SAST plus LLM triage, with agentic data-flow retrieval, PoC generation in sandbox and patch validation by CI.
pipe: PR diff intake @ git hook ; SAST scan @ CodeQL or Semgrep ; Context retriever @ call-graph ; LLM triage agent @ code model ; PoC and patch validator @ sandbox CI ; Developer comment @ PR bot ; Dev feedback @ accept or dismiss
edge: Malicious comment instructs the LLM to ignore issues | vulnerabilities suppressed | Strip comments from LLM inputs for decisions
edge: Huge monorepo PRs | context overflow | Diff-scoped analysis with call-graph slicing
off: Precision and recall on CVE-labelled commits ; PoC confirmation rate
on: True vulnerabilities fixed pre-merge ; Developer dismissal rate
gap: Benchmarks memorised from training data ; Counting reported findings not confirmed ones

== ml-guided-fuzzing | ML-Guided Fuzzing | reinforcement-learning | batch | staff-principal | a=0.01 k=5
obj: Increase crash discovery per CPU hour by learning which inputs and mutations are most likely to reach new code.
loss: \max_\pi\;\mathbb{E}\!\left[\sum_t \text{new coverage}_t\right]
con: Millions of executions per hour ; Deterministic reproduction ; Triage deduplication ; Safe sandbox
sn: Guidance | Learn mutation scheduling from coverage feedback | Pure random mutation | Random wastes most executions on useless inputs
sn: Triage | Crash deduplication and exploitability ranking | Raw crash counts | Thousands of crashes share few root causes
sig: Coverage novelty reward | new edges per execution | Reward | Instrumentation
sig: Input structure features | grammar-aware features | Smarter mutation | Parser
sig: Crash stack hash | dedup key | Triage | Symbolisation
noise: Execution time per input | resource noise
noise: Seed file name | none
base: AFL-style coverage-guided fuzzing.
prod: Coverage-guided fuzzer with a learned mutation scheduler (bandit), grammar-based generator and crash triage classifier.
pipe: Corpus manager @ seed store ; Mutation scheduler @ bandit policy ; Fuzz executors @ sandbox fleet ; Coverage monitor @ instrumentation ; Crash triager @ dedup classifier ; Security engineer @ human ; Fixed bugs @ feedback
edge: Fuzz harness is shallow | coverage plateaus early | Harness quality metrics and deeper entry points
edge: Flaky crashes not reproducible | non-reproducible crashes consume triage time and produce tickets nobody can act on | Reproduction gating before ticket creation
off: Unique crashes and new edges per CPU hour ; Triage precision
on: Bugs found per fuzz month ; Time to find regression
gap: Counting duplicate crashes as separate bugs ; Benchmarks on toy targets

== waf-ml-attack-detection | ML Web Application Firewall | nlp,tabular | sub-10ms | production-grade | a=100 k=2
obj: Detect injection, XSS and logic attacks in HTTP requests inline with very low latency and very few false positives.
loss: \mathcal{L}=\mathrm{FL}(p,y)+\lambda\,\mathrm{Calibration}
con: Under 1 ms inline ; False positives block revenue ; Per-application tuning ; Encrypted payload decoding
sn: Context | Per-endpoint behavioural baselines | Global signatures | Applications differ in legitimate payloads
sn: Decoding | Normalise encodings before classification | Raw string models | Attackers hide payloads in nested encodings
sig: Normalised payload token features | token n-grams after decoding | Attack syntax | Decoder coverage
sig: Parameter type anomaly | value deviates from learned type | Injection | Per-endpoint stats
sig: Request-rate and sequence context | rapid probing pattern | Scanning | Window
noise: User-agent | spoofable
noise: Header order alone | weak
base: OWASP CRS rule set.
prod: Request normalisation then compact char-CNN/GBDT per-endpoint models alongside CRS rules, with shadow-mode tuning.
pipe: Request ingress @ edge proxy ; Normaliser @ decoder ; Rules engine @ CRS ; ML scorer @ compact model ; Decision @ block or challenge ; Tuning console @ security team ; Attack labels @ SOC
edge: New app release changes parameter formats | legitimate traffic scores as anomalous | Deployment hooks that trigger model re-baselining
edge: Attackers learn the model's blind spots | targeted evasion | Randomised ensembles and adversarial training
off: Detection rate at 1e-5 FPR ; Latency overhead
on: Blocked attack requests ; False-block incidents
gap: Training on attack toolkits only ; Replay traffic from a single app

== api-abuse-and-bot-detection | API Abuse & Bot Detection | tabular,time-series | sub-100ms | production-grade | a=20 k=1
obj: Detect scraping, enumeration and business-logic abuse on APIs while preserving legitimate integrations.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}
con: Sub-20 ms decisions ; Partner integrations must not break ; Adaptive attackers ; Privacy-safe fingerprints
sn: Behaviour | Sequence and rate patterns per API key and fingerprint | Per-IP rate limits | Botnets rotate IPs
sn: Business logic | Endpoint-flow anomalies (skipping steps) | Volume only | Logic abuse has normal volume
sig: Endpoint sequence entropy | entropy of API-call sequences | Automation | Session windows
sig: Request timing regularity | variance of inter-request times | Scripted | Window
sig: Enumeration pattern | sequential ID access | Scraping | Pattern
noise: IP address alone | rotates
noise: User-agent | spoofed
base: Rate limits per IP and API key.
prod: Streaming behavioural features with GBDT scoring, device fingerprint signals and adaptive challenges tied to risk.
pipe: API gateway @ Envoy ; Session and key aggregator @ Flink ; Bot model @ GBDT ; Risk policy @ throttle or challenge ; Partner allow-list @ registry ; Abuse analyst @ human ; Confirmed abuse @ labels
edge: Large legitimate partner bursts | misclassified as scraping | Partner baselines and contractual rate profiles
edge: Residential proxies disguise bots | IP-based features useless | Behavioural and fingerprint features dominate
off: Detection rate at fixed false-block rate ; Challenge success for humans
on: Scraped records per day ; Legitimate user friction
gap: Labels only from detected bots ; Bot behaviours simulated naively

== ddos-detection-and-mitigation | DDoS Detection & Mitigation | time-series,tabular | sub-10ms | production-grade | a=10000 k=1
obj: Detect volumetric and application-layer DDoS within seconds and drive mitigation without dropping legitimate traffic.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{DetectionDelay}
con: Terabit-scale traffic ; Mitigation decision in seconds ; Collateral damage minimised ; Always-on
sn: Baseline | Traffic baselines by destination and time | Static thresholds | Legitimate flash crowds exceed static thresholds
sn: Mitigation | Surgical signature extraction for filtering | Block whole sources or prefixes | Broad blocks drop customers
sig: Packet-rate deviation per destination | z-score vs seasonal baseline | Volumetric attack | Seasonal model
sig: Source entropy | distribution of source IPs | Spoofed or botnet | Window
sig: Header/payload pattern clustering | dominant patterns in sampled traffic | Filter signature | Sampling
noise: Source country | spoofed
noise: Packet size alone | weak
base: Rate thresholds with scrubbing on trigger.
prod: Streaming sketches for anomaly detection plus automated signature synthesis from sampled packets, with staged mitigation and rollback.
pipe: Flow and sampled packets @ routers ; Streaming sketches @ in-network ; Anomaly detector @ seasonal baseline ; Signature synthesiser @ clustering ; Mitigation controller @ BGP and ACL ; NOC @ human ; Attack library @ labels
edge: Flash crowd after a product launch | detected as DDoS and throttled | Event feeds and engagement-aware baselines
edge: Mitigation filter blocks legitimate traffic | outage for customers | Staged rollout, shadow-mode matching and rollback
off: Detection delay at fixed FPR ; Collateral drop rate
on: Time to mitigate ; Customer impact minutes
gap: Lab floods unlike real attacks ; Mitigation tested at low rates

== credential-stuffing-detection | Credential Stuffing Detection | tabular,time-series | sub-100ms | production-grade | a=5 k=2
obj: Detect automated credential-stuffing attempts on login endpoints and block them while sparing real users who forget passwords.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}
con: Login decision within 30 ms ; Low friction for real users ; Distributed low-and-slow attacks ; Privacy-safe breach corpora use
sn: Aggregates | Aggregate failure patterns across the whole login surface | Per-account lockouts | Attackers try each account once from many IPs
sn: Credentials | Breached-credential checks (k-anonymity) | Password rules only | Known-breached passwords are the vector
sig: Global failure-rate spike | failed logins per minute vs baseline | Campaign detection | Baseline
sig: Username-spread per fingerprint | distinct usernames per device fingerprint | Stuffing | Fingerprint stability
sig: Breached-credential match | hashed password in breach set | Reuse | k-anonymity
noise: IP alone | rotating proxies
noise: Time between attempts alone | randomised
base: Per-account lockout and per-IP rate limit.
prod: Streaming aggregate detectors with per-request GBDT scoring, breach-corpus checks and adaptive challenges.
pipe: Login request @ auth service ; Aggregate stream features @ Flink ; Stuffing scorer @ GBDT ; Breach-check @ k-anonymity API ; Challenge policy @ CAPTCHA or MFA ; Security review @ human ; Confirmed attacks @ labels
edge: Password manager mass logins after outage | spikes look like attack | Cohort baselines and incident feeds
edge: Attackers slow down to stay under baseline | detection delayed | Longer-window aggregate detectors
off: Detection of stuffing campaigns at fixed false challenges ; Blocked attempt precision
on: Account takeovers from stuffing ; Challenge rate for good users
gap: Labels only from detected campaigns ; Test traffic without real user failure patterns
