# Cybersecurity, part 2 (use cases 26-50)
== fake-account-creation-detection | Fake & Bulk Account Creation Detection | tabular,graph | sub-100ms | production-grade | a=1 k=2
obj: Stop automated and farmed account registrations at signup, protecting downstream trust, promos and abuse systems.
loss: \mathcal{L}=\mathrm{FL}(y,p)+\lambda\,\mathrm{GraphReg}
con: Signup decision within 50 ms ; Low friction for genuine users ; Disposable-email and SMS farms ; Privacy
sn: Cohort | Cluster-level signals across signups (same fingerprint, similar emails) | Individual signup scoring | Farmed accounts each look plausible alone
sn: Cost | Raise attacker cost with adaptive friction | Hard blocks only | Hard blocks teach attackers quickly
sig: Email pattern similarity in window | edit-distance clusters of emails in 1 hour | Scripted creation | Window before signup
sig: Device and IP signup velocity | signups per fingerprint per day | Farm | Fingerprint salt
sig: Phone number reputation | VoIP and carrier risk | SMS farms | Vendor data
noise: Username length | weak
noise: Signup hour | weak
base: Rate limits and disposable-email blocklists.
prod: Real-time GBDT with cohort features, graph clustering for farms and risk-based friction (CAPTCHA, phone verification).
pipe: Signup API @ gateway ; Cohort aggregator @ Flink ; Risk model @ GBDT ; Graph cluster lookup @ graph store ; Friction policy @ challenge ; Trust and safety review @ analyst ; Downstream abuse labels @ feedback
edge: Marketing campaign causes real signup spikes | cohort features flag genuine users | Campaign calendar integration and acquisition-source baselines
edge: Attackers use real phones in farms | phone checks pass | Behavioural post-signup monitoring and graph linking
off: Detection recall at fixed friction rate ; Cohort-level precision
on: Fake account share after 30 days ; Signup conversion
gap: Labels from accounts later banned (late and biased) ; Features computed after account activity

== voice-deepfake-and-vishing-detection | Voice Deepfake & Vishing Detection | time-series,nlp | seconds | staff-principal | a=0.3 k=300
obj: Detect synthetic or cloned voices and social-engineering call patterns in contact-centre and enterprise calls in near real time.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{SupCon}
con: Telephony codecs and 8 kHz audio ; Real-time during the call ; Consent and recording laws ; Low false positives for customers
sn: Channel | Train on codec-degraded telephony audio | Studio-quality datasets | Models trained on clean audio fail on phone lines
sn: Behaviour | Combine voice artefacts with conversation intent signals | Voice-only classifier | New TTS systems evade artefact detectors quickly
sig: Spectral artefact score | model on spectral and phase features | Synthesis traces | Codec simulation
sig: Social-engineering intent | urgency, secrecy and payment requests | Fraud script | Transcript
sig: Caller-ID and call-path anomaly | spoofing indicators | Spoofing | STIR/SHAKEN data
noise: Call duration | weak
noise: Background noise level | channel
base: Voice biometrics and caller-ID verification.
prod: Codec-robust anti-spoofing model (AASIST-style) fused with real-time transcript intent classifier and call-metadata risk, with agent prompts.
pipe: Call audio stream @ telephony ; Anti-spoofing model @ AASIST on GPU ; Streaming ASR and intent @ NLP ; Call-metadata risk @ GBDT ; Risk fusion @ ensemble ; Agent alert and step-up @ human ; Confirmed fraud @ labels
edge: New TTS model release | detector recall drops overnight | Continuous synthetic-data refresh and red-team feeds
edge: Poor mobile connection degrades audio | genuine callers flagged | Quality-aware thresholds and confidence reporting
off: EER on telephony test sets ; Fraud-call recall at fixed FP
on: Vishing losses ; Step-up rate for genuine callers
gap: Test deepfakes from the same generators as training ; Clean audio evaluation

== dark-web-threat-intel-nlp | Dark-Web & Underground Threat Intelligence | nlp,graph | batch | production-grade | a=0.01 k=20
obj: Mine forums, marketplaces and chat channels for credential leaks, access sales and planned attacks relevant to the organisation.
loss: \mathcal{L}=\mathrm{CE}_{\text{NER}}+\lambda\,\mathrm{CE}_{\text{relevance}}
con: Legal and ethical collection ; Multilingual slang ; Source reliability ; Rapid takedown of sources
sn: Relevance | Entity-linked relevance to the company, vendors and executives | Keyword alerts on brand name | Brand keywords produce huge noise
sn: Reliability | Source and actor credibility scoring | Equal trust in all posts | Many posts are scams or fake leaks
sig: Entity match with confidence | company, domain and employee matches | Relevance | Entity linking
sig: Actor reputation | past verified claims | Credibility | Actor graph
sig: Leak freshness and uniqueness | novelty vs known dumps | Value | Dedup
noise: Post length | weak
noise: Forum popularity | weak
base: Keyword monitoring services.
prod: Multilingual slang-aware NER with relevance ranking, actor-reputation graph and leak validation against internal records.
pipe: Collection @ legal crawlers and feeds ; Language detection and translation @ NLP ; Entity extraction and linking @ transformer ; Relevance and credibility scorer @ GBDT ; Leak validator @ internal hash check ; CTI analyst @ human ; Takedown actions @ response
edge: Slang and code words evolve | entity extraction misses | Continual lexicon updates and active learning
edge: Fake leaks to extort | wasted incident response | Validation against hashed internal data before escalation
off: Entity extraction F1 ; Precision of high-priority alerts
on: Time from leak post to action ; False incident escalations
gap: Gold data from sanitised English posts ; Ignoring deceptive posts

== ioc-extraction-and-enrichment | IOC Extraction & Enrichment | nlp | batch | foundational | a=0.1 k=10
obj: Extract indicators of compromise and TTPs from reports and feeds, deduplicate them and score confidence for blocking and hunting.
loss: \mathcal{L}=\mathrm{CE}_{\text{BIO}}+\lambda\,\mathrm{CE}_{\text{type}}
con: Defanged indicators ; Contextual validity (benign infrastructure) ; Expiry of indicators ; High volume feeds
sn: Context | Distinguish malicious indicators from mentioned benign ones | Regex all IPs and domains | Reports mention many benign domains
sn: Decay | Indicator confidence decays over time | Permanent blocklists | Stale indicators cause false blocks
sig: Indicator context window | sentence role (victim, attacker, benign) | Classification | Parsing
sig: Multi-source corroboration | sources reporting the indicator | Confidence | Source independence
sig: Infrastructure reputation | hosting and ASN risk | Prior | Data feeds
noise: Report length | weak
noise: Vendor logo | none
base: Regex extraction with static scoring.
prod: Transformer NER with role classification, corroboration scoring and time-decayed confidence feeding blocklists with TTL.
pipe: Report and feed intake @ ingestion ; Defang and extract @ parser ; Role classifier @ transformer ; Corroboration scorer @ source graph ; Confidence with decay @ scoring ; Blocklist publisher @ TIP ; Analyst review @ human
edge: Shared hosting IPs listed as malicious | collateral blocking of legitimate sites | Shared-infrastructure checks and expiry
edge: Defanging variants break parsers | indicators missed | Normalisation rules library and tests
off: Extraction F1 and role precision ; Blocklist false-positive rate
on: Detections from IOCs ; Stale-IOC false blocks
gap: Evaluating extraction without role context ; Ignoring decay

== threat-actor-attribution-clustering | Threat Actor Attribution & Campaign Clustering | graph,nlp | batch | staff-principal | a=0.01 k=30
obj: Cluster intrusion sets and campaigns by shared infrastructure, tooling and TTPs to support attribution confidence levels.
loss: \mathcal{L}=\mathrm{Contrastive}(\text{same campaign})+\lambda\,\mathrm{ClusterCompactness}
con: Evidence-based confidence statements ; False-flag awareness ; Analyst review ; Slow-changing ground truth
sn: Evidence | Weighted overlaps of infrastructure, code and TTP | Single-indicator attribution | Single indicators are often shared or planted
sn: Confidence | Graded confidence with alternative hypotheses | One-name attribution | Attribution is probabilistic and contested
sig: Infrastructure overlap | shared IPs, certificates and registrants | Campaign link | Time-bounded
sig: Code and tooling similarity | binary and script similarity | Toolset reuse | Library reuse
sig: TTP sequence similarity | ATT&CK technique ordering | Behaviour | Mapping
noise: Language strings in malware | easily planted
noise: Compile timestamps | forgeable
base: Manual analyst clustering in spreadsheets.
prod: Heterogeneous evidence graph with learned edge weights, constrained clustering and confidence-graded analyst workflow.
pipe: Incident and CTI data @ platform ; Evidence extraction @ parsers ; Evidence graph @ property graph ; Link scorer @ GBDT ; Constrained clustering @ community detection ; Analyst assessment @ human ; Peer review @ intel team
edge: Shared offensive tooling across unrelated actors | shared offensive tooling merges unrelated actors into one cluster and creates a false attribution | Tool-sharing priors and discounting of common frameworks
edge: False-flag artefacts | wrong attribution | Evidence reliability weighting and uncertainty statements
off: Cluster purity on analyst-vetted campaigns ; Calibration of confidence labels
on: Analyst time saved ; Attribution reviews with revised outcomes
gap: Ground truth is analyst opinion ; Ignoring deception

== malware-family-clustering | Malware Family Clustering | tabular,graph | batch | production-grade | a=0.1 k=20
obj: Group millions of samples into families by behaviour and code to speed triage and track variants.
loss: \mathcal{L}=\mathrm{Triplet}(a,p,n)+\lambda\,\mathrm{ClusterEntropy}
con: Obfuscation and packing ; Scalable nearest neighbours ; Evolving families ; Analyst-readable cluster summaries
sn: Features | Behavioural and unpacked-code features | Raw hash or byte similarity | Packers randomise bytes
sn: Evaluation | Cluster purity versus expert family labels | Silhouette score | Internal metrics don't reflect family correctness
sig: Unpacked-code embedding | embedding of disassembled functions | Family similarity | Unpacking success
sig: API call sequence signature | n-gram of behaviours | Behaviour | Sandbox coverage
sig: Import and string features | import table, strings | Static | Obfuscation
noise: File hash | unique per sample
noise: Compile time | forgeable
base: Fuzzy hashing (ssdeep) clustering.
prod: Metric-learning embeddings on unpacked code and behaviour with HNSW neighbours and incremental clustering for new variants.
pipe: Sample intake @ feeds ; Unpacker and sandbox @ analysis ; Embedding model @ transformer ; ANN index @ HNSW ; Incremental clusterer @ online ; Analyst labelling @ human ; Family label updates @ labels
edge: New packer defeats unpacking | samples look like unique noise | Packer detection and routing to dynamic unpacking
edge: Benign installers mixed into the corpus | contaminated clusters | Goodware filtering before clustering
off: Cluster purity and completeness vs expert labels ; Neighbour recall
on: Triage time per new sample ; Variant detection speed
gap: Labels from AV vendor names which are inconsistent ; Time-agnostic evaluation

== binary-code-similarity | Binary Code Similarity & Vulnerability Matching | graph,nlp | batch | staff-principal | a=0.01 k=40
obj: Find known vulnerable functions inside stripped binaries and firmware across compilers and architectures at scale.
loss: \mathcal{L}=\mathrm{Contrastive}(f_a,f_b)\ \text{(cross-architecture, cross-optimisation)}
con: Cross-architecture matching ; Millions of functions ; Stripped symbols ; Low false positives for patch decisions
sn: Invariance | Semantics-based embeddings invariant to compiler and optimisation | Instruction-sequence matching | Optimisation level changes instruction sequences
sn: Patch awareness | Distinguish patched from vulnerable variants | Binary similarity score alone | A patched function is highly similar to the vulnerable one
sig: Control-flow-graph embedding | GNN over CFG | Structure | Disassembly quality
sig: Constants and string references | immediate values and strings | Anchors | Stripped binaries
sig: Patch-diff features | differences in guard conditions | Patched status | Reference pairs
noise: Function address | meaningless
noise: Symbol names | stripped
base: Exact function hashing and BinDiff.
prod: CFG GNN with instruction-semantic embeddings, ANN retrieval over function corpora and a patch-aware verifier.
pipe: Binary ingestion @ firmware or package ; Disassembly @ Ghidra or IDA ; Function embedding @ GNN ; ANN search @ vector index ; Patch verifier @ diff model ; Security engineer @ human ; Confirmed matches @ labels
edge: Heavy obfuscation or virtualisation | embeddings fail | Dynamic analysis fallback and confidence thresholds
edge: Compiler version shifts code layout | cross-version recall drops | Training on diverse compiler matrices
off: Recall@k across architectures ; Patched/unpatched discrimination accuracy
on: Vulnerable components found in firmware ; Time to SBOM
gap: Evaluation only on same-compiler pairs ; Treating patched variants as true matches

== email-attachment-sandbox-triage | Attachment Sandbox Triage | computer-vision,tabular | seconds | production-grade | a=2 k=300
obj: Decide which attachments need expensive sandbox detonation, and classify them quickly using static and visual document features.
loss: \mathcal{L}=\mathrm{CE}(y,p)+\lambda\,\mathrm{CostAwareDetonation}
con: Sandbox cost and queue limits ; Delivery delay budget ; Evasive documents ; Zero-day documents
sn: Triage | Predict detonation value to spend sandbox capacity wisely | Detonate everything | Capacity limits delays and cost
sn: Rendering | Render documents and use visual models for lure detection | Metadata only | Visual lures (fake invoice) are strong signals
sig: Macro and embedded-object flags | VBA, OLE, scripts | Active content | Parsing
sig: Rendered-page lure score | CNN on rendered first page | Social engineering | Rendering fidelity
sig: Sender reputation and file prevalence | rarity of the file | Zero-day proxy | Data
noise: File name | trivial to change
noise: File size | weak
base: AV scan plus detonate all executable attachments.
prod: Static plus visual features with cost-aware sandbox scheduling and fast verdict caching by content hash.
pipe: Attachment extraction @ mail gateway ; Static parser @ document analysis ; Visual lure model @ CNN ; Detonation scheduler @ cost-aware policy ; Sandbox @ VM fleet ; Verdict cache @ hash store ; Analyst feedback @ labels
edge: Sandbox-evasive malware waits for user interaction | malware that waits for user interaction never detonates and gets a benign verdict | Interaction simulation and multi-stage analysis
edge: Queue backlog during attack waves | delivery delays | Priority scheduling and holding policies
off: Detonation-worthy recall at fixed capacity ; Verdict latency
on: Malicious attachments delivered ; Mail delay time
gap: Training on labelled detonation outcomes only (selection bias) ; Static datasets without evasion

== dlp-content-classification | DLP Content Classification | nlp,computer-vision | sub-100ms | production-grade | a=30 k=20
obj: Classify sensitive content (PII, source code, financial data) in documents and messages to enforce data-loss policies with low false positives.
loss: \mathcal{L}=\sum_k\mathrm{BCE}(y_k,p_k)
con: Inline latency ; Multilingual ; Images and scans ; Policy explainability for users
sn: Context | Content plus context (destination, user role) | Regex pattern matching | Regex flags every 16-digit number
sn: Adaptation | Per-tenant tuning from feedback | Global rules | Sensitivity definitions differ by company
sig: Pattern with validation | Luhn-valid card numbers, IBAN checksums | Precision | Validators
sig: Document type classifier | contract, resume, source code | Sensitivity | Taxonomy
sig: Destination risk | external or personal cloud | Exfiltration | Policy
noise: Document author | weak
noise: Last modified time | weak
base: Regex and dictionary DLP policies.
prod: Validated pattern detectors plus document-type and NER models with policy engine considering user, destination and data type.
pipe: Content capture @ endpoint or CASB ; OCR and extraction @ document parser ; Detectors @ validators plus NER ; Document classifier @ transformer ; Policy engine @ rules ; User prompt or block @ UI ; Incident feedback @ labels
edge: Test data in staging environments triggers incidents | realistic test data in staging triggers a flood of incidents that are not real leaks | Environment context and synthetic-data tagging
edge: Scanned documents with poor OCR | sensitive content missed | OCR quality scoring and conservative handling
off: Precision and recall per data type ; Latency overhead
on: Prevented leaks ; User override rate
gap: Training on synthetic PII ; Ignoring image-based content

== data-exfiltration-detection | Data Exfiltration Detection | time-series,graph | batch | staff-principal | a=50 k=2
obj: Detect abnormal data movement by users, services and endpoints toward external destinations, separating exfiltration from legitimate transfers.
loss: \mathcal{L}=\sum_t\left[\log\sigma_t+\frac{(x_t-\mu_t)^2}{2\sigma_t^2}\right]+\lambda\,\mathrm{GraphReg}
con: Encrypted transfers ; Cloud SaaS egress ; Legitimate bulk transfers ; Privacy
sn: Baselines | Per-entity transfer volume and destination baselines | Static byte thresholds | Roles have different normal volumes
sn: Destination | New or rare destinations weight | Total bytes only | Exfiltration goes to unusual places
sig: Volume z-score vs personal baseline | outbound bytes vs 30-day baseline | Spike | Window
sig: Destination rarity | first-seen external destination | Unknown dropoff | Graph
sig: Sensitive-source ratio | share of data from sensitive stores | Impact | Classification
noise: Protocol alone | weak
noise: Time zone only | weak
base: Byte threshold alerts per host.
prod: Entity baselines with destination graph rarity and sensitive-source weighting, with timeline explanations for analysts.
pipe: Egress logs @ proxy and cloud audit ; Entity baseline model @ stream stats ; Destination rarity graph @ graph store ; Exfil scorer @ GBDT ; Sensitivity join @ DLP tags ; Analyst triage @ human ; Case outcomes @ labels
edge: Scheduled backup to a new cloud region | flagged as exfiltration | Change-management feed and approved destination registry
edge: Slow-drip exfiltration over weeks | below thresholds | Cumulative-volume detectors and low-and-slow rules
off: Recall of simulated exfil at fixed alerts/day ; Precision of top alerts
on: Mean time to detect exfil ; Data volume leaked before containment
gap: Synthetic exfil unlike real incidents ; Baselines contaminated by earlier exfil

== privileged-access-session-anomaly | Privileged Access Session Anomaly Detection | time-series,nlp | sub-100ms | production-grade | a=5 k=5
obj: Monitor privileged sessions (SSH, RDP, DB consoles) for risky commands and behaviour changes and terminate or alert in real time.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}
con: Real-time command analysis ; Admin productivity ; Session recording privacy ; Break-glass handling
sn: Commands | Command semantics and sequence rather than keywords | Keyword blocklists | Attackers rename tools and chain benign commands
sn: Context | Ticket and change linkage | Anomaly alone | Admins do unusual things during incidents legitimately
sig: Command risk embedding | embedding of command and arguments | Risk | Tokenisation
sig: Ticket linkage | session tied to approved ticket | Legitimacy | ITSM
sig: Target criticality | critical server tier | Impact | CMDB
noise: Session duration | weak
noise: Admin username | personal
base: Command blocklists and session recording.
prod: Sequence model on commands enriched with ticket/change context and asset criticality, with graded responses (alert, step-up, terminate).
pipe: Session proxy @ PAM ; Command parser @ shell AST ; Sequence risk model @ transformer ; Context join @ ticket and CMDB ; Response policy @ graded actions ; Security approver @ human ; Review outcomes @ labels
edge: Incident response changes admin behaviour dramatically | false alerts during emergencies | Break-glass mode with heightened logging not blocking
edge: Command obfuscation via encoded payloads | base64 or encoded payloads hide the real command so the risk is missed | Decoding and deobfuscation layer
off: Recall of simulated attack sessions ; Alert rate per admin-hour
on: Risky command terminations ; Admin friction hours
gap: Lab attack sessions are too clean ; Context not included in evaluation

== zero-trust-adaptive-authentication | Zero-Trust Adaptive Authentication | tabular | sub-100ms | production-grade | a=10 k=2
obj: Continuously score session risk and adapt authentication requirements per request using device, user and resource signals.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{FrictionCost}
con: Decision under 30 ms ; Policy transparency ; Friction budget ; Privacy
sn: Continuous | Re-evaluate risk throughout the session | Login-time only | Risk changes after login
sn: Policy | ML risk plus explicit policy rules | ML decides everything | Compliance needs deterministic controls
sig: Device posture score | patch level, EDR status | Trust | Agent
sig: Resource sensitivity | application criticality | Stakes | Catalogue
sig: Behavioural drift in session | action sequence deviation | Hijack | Session baseline
noise: Screen resolution | weak
noise: Browser language | weak
base: Static conditional access rules.
prod: Streaming risk engine blending GBDT risk score with policy rules, continuous evaluation and just-in-time step-up.
pipe: Access request @ policy enforcement point ; Signal collector @ device and identity ; Risk scorer @ GBDT ; Policy decision @ rules plus risk ; Step-up or deny @ IdP ; Audit @ SIEM ; Outcome labels @ incidents
edge: Device posture agent crashes | healthy devices appear untrusted | Grace states and posture-staleness handling
edge: Executives frequently trigger step-up | pressure to weaken policy | Risk-tiered policy with transparent exceptions
off: Compromise detection at fixed step-up rate ; Decision latency
on: Compromised sessions contained ; Step-up friction
gap: Labels from confirmed incidents only ; Ignoring friction costs in evaluation

== device-posture-risk-scoring | Device Posture & Vulnerability Risk Scoring | tabular | batch | foundational | a=1 k=3
obj: Score every managed device's security posture and likelihood of compromise to drive remediation and access policy.
loss: \mathcal{L}=\mathrm{BCE}(\text{compromise},p)
con: Millions of devices ; Heterogeneous agents ; Explainable remediation ; Privacy
sn: Outcome | Predict compromise or incident likelihood | Compliance checklist score | Compliant devices still get compromised
sn: Actionability | Rank remediations by risk reduction | Flat list of findings | Teams need the highest-leverage fix first
sig: Unpatched exploited vulnerabilities | count of KEV-listed vulns | Exploit risk | Scan freshness
sig: Security tooling health | EDR and disk-encryption status | Defences | Agent state
sig: User behaviour risk | risky downloads, admin use | Exposure | Telemetry
noise: Device name | none
noise: OS build only | confounded
base: Compliance checklist score.
prod: Gradient-boosted posture model trained on incident outcomes with SHAP-driven remediation ranking.
pipe: Device telemetry @ agents ; Feature builder @ Spark ; Posture model @ GBDT ; Remediation ranker @ SHAP and rules ; Policy integration @ conditional access ; IT ops @ human ; Incident outcomes @ labels
edge: Agent outage makes devices look unprotected | mass false risk | Agent-health separation and freshness flags
edge: Rare incidents give few labels | compromise labels are very rare so the model is unstable and overfits noisy proxies | Proxy labels from detection events and hierarchical priors
off: AUC for compromise ; Remediation leverage
on: Incidents per 1000 devices ; Time to remediate high-risk devices
gap: Labels reflect detection capability not true compromise ; Using post-incident posture data

== iot-anomaly-detection | IoT Device Anomaly Detection | time-series,tabular | sub-100ms | production-grade | a=1440 k=1
obj: Detect compromised or malfunctioning IoT devices from network and telemetry patterns with models light enough for gateways.
loss: \mathcal{L}=\|x-\mathrm{Dec}(\mathrm{Enc}(x))\|^2
con: Gateway CPU limits ; Millions of device types ; Intermittent connectivity ; Sparse labels
sn: Profiles | Per-device-type behavioural profiles | One global model | Device behaviours differ completely by type
sn: Fingerprint | Passive device identification | Trust declared device type | Declared type is spoofable
sig: Destination set deviation | new endpoints contacted | Compromise | Device profile
sig: Traffic periodicity change | change in cadence | Malfunction or botnet | Spectral
sig: Firmware version and CVE exposure | known vulnerabilities | Risk | Inventory
noise: MAC address | spoofable
noise: Signal strength | environment
base: Static allow-lists of destinations per device.
prod: Per-type lightweight autoencoder or isolation forest at the gateway, with cloud-side fleet-level clustering and fingerprinting.
pipe: Network taps and telemetry @ gateway ; Device fingerprinting @ passive ML ; Profile model @ per-type ; Anomaly scorer @ edge model ; Quarantine action @ NAC ; Security operations @ human ; Fleet learning @ cloud
edge: Firmware update changes behaviour | flagged as anomalous | Update-window awareness with profile refresh
edge: Network outage disconnects devices | missing data looks anomalous | Connectivity separation in features
off: Detection of injected anomalies ; False alarms per device-month
on: Compromised devices quarantined ; Alert noise
gap: Injected attacks unlike real botnets ; Single vendor test fleet

== ics-ot-intrusion-detection | ICS/OT Intrusion Detection | time-series,graph | sub-100ms | staff-principal | a=3600 k=1
obj: Detect malicious commands and process manipulation in industrial control networks using protocol-aware and physics-based models without disrupting operations.
loss: \mathcal{L}=\|x_t-\hat x_t\|^2+\lambda\,\mathrm{PhysicsResidual}
con: Passive monitoring only ; Deterministic protocols (Modbus, DNP3) ; Safety-critical ; Very low false positives
sn: Physics | Process-physics residual models | IT-style network anomaly only | Attacks that manipulate setpoints look like normal traffic
sn: Allow-lists | Learned communication allow-lists | Generic signatures | OT communications are highly regular
sig: Command-sequence deviation | unexpected function codes | Unauthorised control | Protocol parsing
sig: Sensor-physics residual | residual from process model | Spoofed sensors | Model
sig: New communicator | previously unseen device pair | Lateral movement | Baseline
noise: Packet timing jitter | network
noise: Vendor banner | none
base: Allow-listing with protocol-aware IDS.
prod: Protocol parser plus communication-graph allow-list model and physics-informed residual detectors per process unit.
pipe: SPAN or tap capture @ passive sensors ; Protocol dissector @ DPI ; Communication graph model @ allow-list ; Process residual model @ physics-informed ; Alert correlation @ rules ; OT security operator @ human ; Incident labels @ feedback
edge: Planned maintenance changes setpoints | residual alerts flood | Maintenance-mode integration with approvals
edge: Legacy device with proprietary protocol | a proprietary legacy protocol cannot be parsed so the device has no visibility at all | Protocol learning from traffic and manual profiles
off: Detection of replayed attack scenarios ; False alarms per week
on: Time to detect OT anomalies ; Operator disruption events
gap: Testbed attacks lacking plant realism ; Overfitting to one plant

== security-log-parsing-llm | Security Log Parsing & Normalisation with LLMs | nlp,llm-agents | batch | production-grade | a=1000 k=1
obj: Convert heterogeneous vendor logs to a common schema (OCSF/ECS) automatically, adapting to new formats with minimal engineer effort.
loss: \mathcal{L}=\mathrm{CE}_{\text{field mapping}}+\lambda\,\mathrm{SchemaViolation}
con: Trillions of log lines ; Cost per line near zero ; Deterministic outputs ; New log sources weekly
sn: Cost | LLM generates the parser once, deterministic code runs at scale | LLM per log line | Per-line LLM calls cost far too much at trillion scale
sn: Validation | Test generated parsers on samples with field-level checks | Trust generated mappings | Silent field misassignments corrupt detections
sig: Field-extraction accuracy | accuracy on labelled samples | Quality | Sample coverage
sig: Schema coverage | share of required fields mapped | Completeness | Schema
sig: Parser drift alarms | parse-failure rate over time | Format changes | Monitoring
noise: Log line length | weak
noise: Timestamp precision | weak
base: Hand-written Grok and regex parsers.
prod: LLM-generated and human-reviewed parsers compiled to deterministic code, with sampling-based validation and drift monitoring.
pipe: New log source samples @ onboarding ; Parser generator @ LLM ; Test harness @ field checks ; Parser compile and deploy @ pipeline ; Streaming parse @ deterministic engine ; Engineer review @ human ; Drift monitor @ metrics
edge: Vendor changes log format after update | parser silently mis-assigns fields | Parse-failure and field-distribution drift monitors
edge: Sparse sample misses rare formats | a sparse onboarding sample misses rare log formats and leaves many lines unparsed | Fallback raw store and incremental parser updates
off: Field-level accuracy on held-out logs ; Parse success rate
on: Time to onboard a log source ; Detection coverage on normalised data
gap: Test on logs similar to training ; No rare-format evaluation

== detection-rule-generation-sigma-llm | Detection Rule Generation (Sigma) with LLMs | llm-agents,nlp | seconds | staff-principal | a=5 k=10 s=4 t=400
obj: Translate threat reports and attack techniques into tested detection rules, validated against telemetry for coverage and false positives.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{TTP})+\lambda\,\mathrm{InvalidRule}
con: Rules must compile and run on target SIEMs ; Test on benign baseline ; Detection engineer review ; Version control
sn: Validation | Replay against attack simulations and benign data | Accept syntactically valid rules | Valid rules can be noisy or never fire
sn: Portability | Backend-specific compilation and tests | Generic rule text | SIEM query dialects differ
sig: Rule syntax validity | compiles on target backend | Basics | Backend tests
sig: Attack-simulation hit rate | fires on emulated technique | Coverage | Emulation
sig: Benign false-positive rate | hits on baseline logs | Quality | 30-day baseline
noise: Rule description length | none
noise: Number of rules generated | volume not value
base: Manual rule writing from reports.
prod: Technique-to-rule agent with backend compilers, attack-emulation tests, benign-baseline false-positive checks and PR-based review.
pipe: Threat report intake @ CTI ; Technique mapper @ LLM ; Rule generator @ LLM with schema ; Backend compiler @ Sigma converters ; Test harness @ emulation and baseline ; Detection engineer @ human ; Deployment @ rule CI
edge: Generated rule matches common admin tooling | a generated rule matches normal administrator tooling and floods the SOC with alerts | False-positive gating on baseline and allow-listing
edge: Rule logic references fields not present in logs | silently never fires | Field-availability checks per data source
off: Compile rate and attack-hit rate ; FP rate on baseline
on: Time from report to deployed detection ; Detections that fire in production
gap: Evaluating compile success only ; Baseline telemetry unrepresentative

== alert-correlation-and-deduplication | Alert Correlation & Deduplication | graph,time-series | sub-100ms | production-grade | a=500 k=2
obj: Group related alerts into incidents and deduplicate repeats, cutting analyst queue size by an order of magnitude.
loss: \mathcal{L}=\mathrm{Triplet}(\text{alert pairs})+\lambda\,\mathrm{ClusterPurity}
con: Streaming grouping within seconds ; Explainable groupings ; Cross-tool alerts ; No cross-customer leakage
sn: Entities | Group by shared entities and time with learned similarity | Exact string deduplication | Alerts differ in text but share a host and process
sn: Chains | Kill-chain stage awareness | Flat grouping | Chains show escalation
sig: Shared entity overlap | host, user, IP overlap | Incident link | Entity resolution
sig: Temporal proximity | time gap | Same incident | Window
sig: Technique adjacency | ATT&CK stage ordering | Chain | Mapping
noise: Alert ID | none
noise: Vendor name | none
base: Time-window grouping by source IP.
prod: Streaming entity-resolution with learned pair similarity and incremental clustering into incidents with kill-chain annotations.
pipe: Alert stream @ Kafka ; Entity resolver @ identity mapping ; Pair similarity model @ GBDT ; Incremental clusterer @ streaming ; Incident builder @ case system ; Analyst @ human ; Merge or split feedback @ labels
edge: Shared service account links unrelated alerts | giant incidents | Entity weight down for high-degree shared accounts
edge: Clock skew between tools | clock skew between tools reorders alerts so incident timelines and groupings are wrong | Time normalisation and uncertainty windows
off: Cluster purity vs analyst groupings ; Reduction in queue size
on: Alerts per incident ; Analyst handling time
gap: Analyst groupings inconsistent ; Evaluating on pre-grouped data

== incident-response-playbook-agent | Incident Response Playbook Agent | llm-agents | seconds | staff-principal | a=20 k=15 s=8 t=400
obj: Execute and adapt incident-response playbooks (contain, collect, notify) with human approval gates for destructive actions.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{case})+\lambda\,\mathrm{UnsafeAction}
con: Destructive actions need approval ; Idempotent steps ; Complete audit ; Time-critical
sn: Safety | Action risk tiers with approvals | Fully autonomous containment | A wrong isolation can take down production
sn: Determinism | Playbook steps as typed tools with preconditions | Free-form commands | Free-form commands are unauditable
sig: Action risk tier | read, reversible, destructive | Gate | Classification
sig: Precondition checks | state verified before action | Safety | Tool checks
sig: Rollback availability | action has rollback | Risk | Metadata
noise: Agent narrative | none
noise: Number of steps | weak
base: Static SOAR playbooks.
prod: Agent that selects and parameterises playbook steps as typed tools, with risk-tiered approvals, dry-run previews and rollback plans.
pipe: Incident context @ case system ; Planner agent @ LLM ; Typed response tools @ EDR IdP firewall ; Risk gate @ approval policy ; Dry-run previewer @ simulation ; Incident commander @ human ; Audit log @ immutable
edge: Misidentified host leads to isolation of a production server | a wrongly identified host is isolated and a production service goes down | Asset-criticality preconditions and mandatory approval for critical assets
edge: Tool returns stale state | action based on wrong facts | State freshness checks before action
off: Playbook step accuracy on replayed incidents ; Unsafe-action rate
on: Mean time to contain ; Analyst hours saved
gap: Replay incidents lacking messy reality ; Measuring speed over safety

== red-team-attack-simulation-rl | Automated Red-Team Attack Simulation | reinforcement-learning,graph | batch | staff-principal | a=0.01 k=10
obj: Use RL agents in a safe emulation environment to discover attack paths and test detection coverage continuously.
loss: \max_\pi\;\mathbb{E}\!\left[\sum_t \gamma^t\,(r_{\text{progress}}-\lambda\,\mathrm{detection}_t)\right]
con: Safe, isolated or production-safe techniques ; Detection feedback loop ; Reproducibility ; Authorised scope only
sn: Realism | Environment built from real topology and controls | Toy network simulators | Findings in toys don't transfer
sn: Purpose | Measure detection gaps | Count compromised hosts | The value is in what defenders missed
sig: Technique success probability | success per technique and control | Reward | Environment
sig: Detection events triggered | alerts raised per step | Coverage | SIEM feedback
sig: Path cost | steps to target | Efficiency | Graph
noise: Host display name | none
noise: Episode seed | none
base: Manual red-team engagements twice a year.
prod: RL/planning agents over a digital twin of the environment with ATT&CK-mapped actions, replayed safely against detection stacks.
pipe: Environment twin @ topology and controls ; Attack-technique library @ ATT&CK actions ; Planner agent @ RL policy ; Safe emulation @ breach-and-attack tool ; Detection feedback @ SIEM ; Security engineer @ human ; Gap tracker @ detections backlog
edge: Emulated action causes real outage | production impact | Isolated range for risky steps and approval for production-safe steps
edge: Agent exploits simulator bugs | unrealistic results | Environment validation against manual red-team
off: Gap discovery rate vs manual team ; Coverage of ATT&CK techniques
on: Detection gaps closed ; Time to validate new detections
gap: Rewarding unrealistic exploits ; Single environment validation

== adversarial-ml-robustness | Adversarial Robustness for Deployed Models | computer-vision,tabular | batch | staff-principal | a=0.01 k=10
obj: Measure and improve robustness of production classifiers (fraud, malware, vision) to evasion, poisoning and extraction attacks.
loss: \min_\theta\;\mathbb{E}\!\left[\max_{\|\delta\|\le\epsilon}\mathcal{L}(f_\theta(x+\delta),y)\right]
con: Utility-robustness trade-off ; Realistic threat models ; Feature-space constraints ; Continuous testing
sn: Threat model | Constraints realistic to the domain (valid emails, valid files) | Pixel Lp-ball attacks on tabular models | Unrealistic attacks mislead robustness estimates
sn: Evaluation | Adaptive attacks | Fixed benchmark attacks | Defences fail against adaptive attackers
sig: Robust accuracy under constrained attack | accuracy under domain attack | Resilience | Attack realism
sig: Decision margin distribution | margins on validation | Fragility | Calibration
sig: Poisoning sensitivity | effect of injected samples | Training risk | Simulation
noise: Clean accuracy alone | hides vulnerability
noise: Model size | weak
base: Standard training with input validation.
prod: Domain-constrained adversarial training, randomised ensembles, input-integrity checks and continuous red-team evaluation in CI.
pipe: Model and data registry @ MLOps ; Attack library @ domain-constrained ; Robust trainer @ adversarial training ; Evaluator @ adaptive attacks ; Release gate @ robustness thresholds ; Security review @ human ; Monitoring @ drift and attack signals
edge: Attacker adapts to the deployed defence | robustness estimates are stale | Periodic adaptive red-teaming and bug-bounty feedback
edge: Robust training reduces accuracy on rare classes | business metric drops | Robustness-utility Pareto reporting
off: Robust accuracy under adaptive domain attacks ; Clean accuracy retention
on: Evasion incidents ; Detection recall after attacker adaptation
gap: Non-adaptive attacks only ; Unrealistic perturbation budgets

== llm-prompt-injection-detection | LLM Prompt-Injection & Jailbreak Detection | nlp,llm-agents | sub-100ms | staff-principal | a=10 k=4
obj: Detect direct and indirect prompt injection and jailbreaks in LLM application inputs and retrieved content before they reach the model or tools.
loss: \mathcal{L}=\mathrm{FL}(y,p)+\lambda\,\mathrm{Calibration}
con: Added latency under 30 ms ; Multilingual and encoded attacks ; Low false positives on legitimate prompts ; Defence in depth ; Covers indirect injection in retrieved documents, emails, web pages and MCP tool responses ; Classifier paired with structural isolation because no single layer is trusted
sn: Layers | Layered defences: input classifier, privilege separation, output checks | Prompt-only defences | Classifiers alone are routinely bypassed
sn: Indirect | Treat retrieved and tool content as untrusted | Filtering user input only | Most severe attacks arrive in documents and web pages
sn: Isolation | Spotlighting untrusted context with random delimiters and a deterministic policy engine on every outbound tool call | A better classifier as the only defence | Adversarial suffixes, base64 and homoglyph encodings and multi-turn crescendo attacks keep bypassing standalone classifiers
sn: Exfiltration | Blocking markdown image and link exfiltration and unauthorised API arguments in outbound calls | Scanning only the final text reply | An injected instruction can leak data through a rendered image URL or a tool argument with no visibly malicious text
sig: Instruction-likeness of untrusted content | classifier on imperative text in data | Indirect injection | Segmentation
sig: Policy violation attempt score | jailbreak taxonomy classifier | Direct attack | Red-team data
sig: Tool-call privilege anomaly | call outside user's intent | Exploitation | Intent model
sig: Untrusted-source provenance | per-chunk tag: user, retrieved document, email, web page or tool output | Indirect injection | Provenance must be attached at retrieval, not inferred later
sig: Outbound-call policy violations | tool calls whose arguments or destinations fall outside the allow-list for the user intent | Exploitation after a successful injection | Allow-lists must derive from the user request, never from model output
noise: Prompt length | weak
noise: Language | weak
base: Keyword and regex filters for known jailbreak phrases.
prod: Small fine-tuned encoder classifier on user and retrieved text, with privilege separation, output validators and canary tokens for exfiltration. Quantised DeBERTa-v3 or Llama-Guard class model on the ingress path, spotlighting of untrusted context with random delimiters or datamarking, and a deterministic policy engine on every outbound tool call.
pipe: Input and retrieved content @ app ; Normaliser @ decode and strip ; Injection classifier @ small encoder ; Privilege-separation layer @ tool permissions ; Output validator @ policy check ; Security logging @ SIEM ; Red-team feedback @ retraining
edge: Attack encoded in base64 or another language | classifier misses | Decode and translate pipeline with multilingual training data
edge: Benign prompts that discuss security flagged | harmless prompts discussing security topics are flagged and legitimate users get blocked | Context-aware thresholds and appeal-free allow with logging
edge: Payload hidden in a retrieved document or MCP tool response | the classifier only saw the user prompt and the model follows the embedded instruction | Classify retrieved and tool content on the ingress path, spotlight it and enforce the outbound policy engine
edge: Multi-turn crescendo attack | each turn looks benign on its own | Score the conversation trajectory and restrict tool privileges as risk accumulates
off: Attack detection rate at 0.1% FPR ; Robustness to encoded variants
on: Successful injection incidents ; False block rate
gap: Static public jailbreak datasets ; Ignoring indirect injection

== ai-agent-tool-permission-guardrails | AI Agent Tool-Permission & Policy Guardrails | llm-agents,tabular | sub-100ms | staff-principal | a=20 k=4
obj: Authorise every agent tool call against user intent, data sensitivity and least privilege in real time, blocking unsafe or out-of-scope actions.
loss: \mathcal{L}=\mathrm{BCE}(\text{unsafe},p)+\lambda\,\mathrm{Latency}
con: Under 20 ms per tool call ; Deterministic policy where required ; Audit of every decision ; Human approval for high-risk
sn: Authority | Capability tokens scoped to task and user | Agent inherits user's full permissions | A hijacked agent should not have full access
sn: Policy | Deterministic policy engine with ML as advisor | ML-only authorisation | Authorisation must be explainable and testable
sig: Intent-action consistency | does action match user request | Hijack detection | Intent model
sig: Data sensitivity of arguments | classification of data in args | Exfiltration risk | DLP
sig: Action reversibility tier | read, write, delete, external send | Risk | Metadata
noise: Tool name alone | insufficient
noise: Agent confidence | uncalibrated
base: Static allow-lists of tools per agent.
prod: Policy decision point combining capability scopes, intent-consistency model and sensitivity checks with human approval for high-risk calls.
pipe: Agent tool call @ SDK hook ; Capability check @ token scopes ; Intent-consistency model @ small LLM or encoder ; Sensitivity classifier @ DLP ; Policy decision @ OPA rules ; Human approval @ high-risk path ; Decision audit @ log
edge: Legitimate multi-step task looks like out-of-scope action | agent blocked unnecessarily | Task-plan declaration and scoped delegation
edge: Policy engine outage | agents either unsafe or unavailable | Fail-closed for risky actions and cached safe-action list
off: Unsafe action block rate and benign pass rate on red-team traces ; Decision latency
on: Blocked unsafe actions ; Task completion rate
gap: Red-team traces generated by builders ; Ignoring multi-agent delegation chains

== model-extraction-and-abuse-detection-api | Model Extraction & Abuse Detection for ML APIs | tabular,time-series | sub-100ms | production-grade | a=2 k=2
obj: Detect model-extraction, scraping and membership-inference attempts on prediction APIs from query patterns while preserving customer experience.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}
con: Query-pattern analysis in real time ; Legitimate bulk users ; Low false positives ; Privacy
sn: Patterns | Query-distribution and coverage features across accounts | Per-request anomaly | Each extraction query looks like a normal request
sn: Defence | Response perturbation and rate shaping | Hard bans only | Attackers rotate accounts
sig: Query-space coverage | diversity and boundary-probing queries | Extraction | Embeddings
sig: Account cluster similarity | related accounts' query overlap | Distributed attack | Graph
sig: Confidence-score request pattern | repeated requests for probabilities | Distillation | API usage
noise: Request size | weak
noise: Client library version | weak
base: Rate limits and API-key quotas.
prod: Streaming behavioural model on query embeddings with account-graph clustering and adaptive response shaping (rounding, noise).
pipe: API gateway @ prediction service ; Query embedding logger @ stream ; Behaviour model @ GBDT ; Account-graph clustering @ graph ; Response shaper @ rounding or noise ; Abuse team @ human ; Confirmed incidents @ labels
edge: Legitimate research customer runs bulk queries | flagged as extraction | Customer tiers, contracts and explicit approval
edge: Attackers spread queries across thousands of accounts | per-account detection fails | Cross-account clustering of query distributions
off: Detection rate of simulated extraction at fixed FPR ; Extraction fidelity under defences
on: Extraction attempts blocked ; Customer friction
gap: Simulated extraction attacks too naive ; Ignoring distributed attacks

== cyber-risk-quantification | Cyber Risk Quantification | tabular | batch | staff-principal | a=0.01 k=10
obj: Estimate annualised loss exposure from cyber events by combining threat likelihood, control strength and asset impact, to justify security investments.
loss: \mathrm{ALE}=\sum_i \lambda_i\,\mathbb{E}[L_i],\quad \lambda_i\sim\mathrm{Poisson},\ L_i\sim\mathrm{LogNormal}
con: Sparse loss data ; Expert elicitation ; Defensible assumptions ; Board-level communication
sn: Quantification | Frequency-severity models with uncertainty | Qualitative heat maps | Heat maps hide magnitudes and compounding
sn: Controls | Control effectiveness estimated from telemetry | Checklist maturity scores | Maturity scores don't map to loss reduction
sig: Control coverage and efficacy | detection and prevention rates by control | Frequency reduction | Telemetry
sig: Asset value and exposure | data records and revenue at risk | Severity | Business data
sig: Industry incident frequency | external base rates | Prior | Source quality
noise: Number of controls | quantity not effectiveness
noise: Audit pass count | compliance not risk
base: Qualitative risk matrix.
prod: Bayesian frequency-severity model with expert-elicited priors updated from telemetry and incidents, producing loss exceedance curves.
pipe: Asset and control data @ GRC ; Telemetry-derived efficacy @ SIEM metrics ; Frequency-severity model @ Bayesian ; Monte Carlo simulation @ loss exceedance ; Scenario comparator @ investment options ; CISO and board @ human ; Incident outcomes @ calibration
edge: Black-swan events outside historical data | tail underestimated | Scenario analysis and heavy-tailed severity distributions
edge: Overconfident expert priors | narrow uncertainty | Calibration training and wide default priors
off: Calibration of predicted vs realised losses ; Back-test of loss exceedance
on: Risk reduced per dollar invested ; Decision usage by leadership
gap: Few incidents to validate ; Treating model output as precise
