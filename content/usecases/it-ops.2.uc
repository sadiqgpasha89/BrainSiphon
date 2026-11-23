# IT Operations & Infrastructure, part 2 (use cases 28-50): security operations, network and infrastructure, end-user computing, AIOps governance
# Vendor-neutral. Automation works with least-privilege short-lived access, a human approves every production change and containment, credentials and personal data never reach a model and employees are never ranked or scored individually.
== soc-alert-triage-agent | SOC Alert Triage Agent | llm-agents,tabular | seconds | advanced | a=0.5 k=40
obj: Enrich and triage security alerts by gathering context from identity, endpoint and network data, ranking them and drafting an investigation summary for the analyst to confirm.
con: Every summary cites the evidence gathered ; The agent is read-only and never contains or deletes ; Analysts decide on containment ; Triage within 2 minutes ; 50K alerts per day
sn: Label | Analyst dispositions after investigation | Alert severity from the tool | Severities are often wrong
sn: Role | Enrich and rank | Contain automatically | Wrong containment disrupts business
sn: Evidence | Linked logs and entity history | A narrative | Narratives can be plausible and wrong
sig: Alert rule fidelity | past true positive rate of the rule | Prior | From SIEM history
sig: Asset criticality | value of the affected asset | Impact | From the CMDB
sig: Entity history | whether similar behaviour is normal | Context | From logs
sig: Threat intelligence match | indicators seen elsewhere | Strength | From threat feeds
noise: Analyst name | personal data
noise: Alert id | an identifier
noise: Tool vendor | weak link
base: Analysts working a queue ordered by tool severity, because it is the standard practice.
prod: A triage agent that enriches alerts from approved sources, ranks by rule fidelity, asset value and entity history, writes a cited summary and routes the case with suggested next steps.
pipe: Alert intake @ SIEM ; Context enrichment @ read-only tools ; Priority scoring @ gradient boosting ; Investigation summary @ LLM with citations ; Analyst review @ case tool ; Disposition feedback @ UI ; Rule tuning @ monthly
edge: Novel attack | no rule or history matches | Escalate when evidence is thin
edge: Enrichment source down | a data source is unavailable | State the gap and keep the alert prioritised
edge: Insider activity | the behaviour is by a trusted account | Route to a restricted team with strict access
off: Rank accuracy on analyst dispositions ; Summary faithfulness ; Missed true positive rate
on: Mean time to triage ; Analyst time per alert ; True incidents missed
gap: Tool severity as truth ; Automatic containment ; Summaries without sources

== phishing-email-detection | Phishing Email Detection | nlp,graph | seconds | foundational | a=1 k=5
obj: Detect phishing and business email compromise in inbound mail from content, sender behaviour and link analysis, quarantining high-confidence cases and reporting the rest to the security team.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Quarantine only at high confidence with user release ; Verdict within 2 s of arrival ; False quarantines under 1 per 10,000 messages ; Message content access limited to the scanner ; 5M messages per day
sn: Label | Reported and confirmed phishing | Spam filter scores | Spam is not phishing
sn: Cost | A missed phish is costly and a false block is recoverable | Equal weights | The costs differ
sn: Privacy | Content analysed in the scanner with limited retention | Content in analyst tools by default | Mail contains personal data
sig: Link and domain reputation | age and reputation of destinations | Core | From threat feeds
sig: Sender behaviour | first contact and display name mismatch | Core | From mail logs
sig: Language and intent cues | urgency and payment requests | Support | From NLP
sig: Authentication results | SPF, DKIM and DMARC outcomes | Support | From headers
noise: Recipient name | personal data
noise: Message id | an identifier
noise: Mail client | weak link
base: Signature and reputation filters with user reporting, because they are the standard controls.
prod: A layered detector using sender graph, link analysis and language models with confidence tiers, user release for quarantine and a reporting feedback loop.
pipe: Message intake @ mail gateway ; Authentication and link checks @ scanner ; Content and sender model @ transformer and graph ; Verdict tier @ rules ; Quarantine or deliver @ gateway ; User report feedback @ mailbox ; Analyst review @ queue
edge: Compromised trusted sender | a known partner account is hijacked | Behaviour change signals
edge: New campaign | content is novel | Link and sender signals in place of content
edge: Legitimate urgent mail | genuine mail looks suspicious | User release and sender allow-lists with expiry
off: Detection of seeded phishing ; False quarantine rate ; Calibration
on: Phishing reaching inboxes ; Time to remove campaigns ; User reports handled
gap: Spam score as phishing label ; Equal error costs ; Content kept in analyst tools

== endpoint-threat-detection | Endpoint Threat Detection | time-series,graph | seconds | advanced | a=1 k=5
obj: Detect malicious behaviour on devices from process, file and network events and alert analysts with the process tree, using device and process signals and not employee activity profiles.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Detection within 60 s of the behaviour ; Containment only after analyst or pre-approved policy ; Device-level signals only ; False alerts under 1 per 1,000 devices per day ; 100K devices
sn: Label | Confirmed incidents and red team activity | Detection rule hits | Rules include benign tools
sn: Scope | Process and file behaviour | Employee browsing or content | Content monitoring raises privacy and legal issues
sn: Action | Alert with the process tree | Automatic wipe | Wrong containment disrupts work
sig: Process lineage anomaly | unusual parent and child processes | Core | From endpoint events
sig: Persistence and credential access behaviour | registry and credential store access | Core | From endpoint events
sig: Network destination reputation | rarity and reputation of destinations | Support | From threat feeds
sig: Device role and software baseline | normal tools on this type of device | Context | From the CMDB
noise: Employee name | personal data
noise: Hostname | an identifier
noise: Browser history | privacy-invasive
base: Signature antivirus and static rules, because they are the standard controls.
prod: A behaviour model on endpoint telemetry with device-role baselines, analyst alerts with process trees and pre-approved isolation for high-confidence cases.
pipe: Endpoint event stream @ agents ; Process tree building @ stream processing ; Behaviour model @ graph and sequence model ; Alert tiering @ rules ; Analyst review @ case tool ; Isolation by policy @ endpoint platform ; Detection tuning @ monthly
edge: Admin tools | legitimate scripts look malicious | Role-based baselines and allow-lists
edge: Offline device | telemetry is delayed | Store and forward with late alerts
edge: New operating system build | event formats change | Parser version tests
off: Detection on red team replays ; False alert rate ; Time to detect
on: Incidents detected ; Dwell time ; Analyst false alert time
gap: Content monitoring ; Rule hits as labels ; Automatic wipes

== privileged-access-anomaly-detection | Privileged Access Anomaly Detection | graph,time-series | seconds | advanced | a=1 k=5
obj: Flag unusual use of privileged accounts, service identities and administrative sessions against role baselines and change records, for security analysts to investigate with context.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Scope limited to privileged and service identities ; Alerts reviewed by security with HR involvement only through formal process ; Evidence links in every alert ; Alert within 5 minutes ; 50K privileged identities
sn: Label | Confirmed misuse and red team actions | Alerts ignored by analysts | Ignored alerts are not negatives
sn: Context | Linked change records and tickets | Behaviour alone | Approved work looks unusual
sn: Fairness | Role-based baselines | Individual personality profiles | Profiling employees is intrusive and unreliable
sig: Session activity versus role baseline | commands and systems accessed | Core | From session logs
sig: Change record link | whether a ticket authorises the work | Authorisation | From ITSM
sig: Time and location context | on-call, travel and working hours | Context | From the schedule
sig: Credential events | new keys, privilege grants and password resets | Risk | From the identity provider
noise: Employee name | personal data
noise: Session id | an identifier
noise: Manager name | personal data
base: Quarterly access reviews and manual log checks, because they are the common controls.
prod: A detector on privileged sessions with role baselines and change record linking that opens cases for analysts, with strict access to the alerts and a formal process for any people actions.
pipe: Session and identity log ingestion @ privileged access tool ; Change record join @ ITSM ; Role baseline model @ time-series and graph ; Alert tiering @ rules ; Analyst case @ restricted queue ; Formal escalation @ policy ; Detection review @ quarterly
edge: Emergency work | on-call staff act without a ticket | Break-glass records and after-the-fact matching
edge: New admin role | no baseline exists | Peer-role baselines
edge: Shared account | actions cannot be tied to a person | Remove shared accounts and use individual identities
off: Detection of seeded misuse ; False alert rate ; Alert context completeness
on: Misuse found ; Unreviewed privileged sessions ; Access without change records
gap: Individual profiling ; Alerts as discipline evidence ; Ignored alerts as negatives

== access-recertification-recommendations | Access Recertification Recommendations | tabular,graph | batch | foundational | a=0.5 k=4
obj: Recommend which entitlements reviewers should keep or revoke in access reviews, from peer groups, usage and risk, with evidence to cut rubber-stamping.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{RankLoss}
con: Reviewers make every decision ; High-risk entitlements always shown ; Each recommendation shows its evidence ; Reviews completed in 14 days ; 1M entitlements per cycle
sn: Evidence | Usage and peer group comparison | Approval rates | Many reviewers approve everything
sn: Role | A recommendation | An automatic revoke | Revokes need a decision maker
sn: Risk | Sensitive entitlements highlighted | Equal weight | Some access carries much more risk
sig: Last used date | days since the entitlement was used | Core | From system logs
sig: Peer group coverage | share of peers holding the access | Core | From identity data
sig: Entitlement sensitivity | risk class of the access | Priority | From the catalogue
sig: Toxic combination | conflicting entitlements | Risk | From policy rules
noise: Employee name | personal data
noise: Manager name | personal data
noise: Entitlement description | weak link
base: Spreadsheet-based reviews where managers approve lists, because it is the common process.
prod: A recommendation service that ranks entitlements by risk and usage with peer evidence, supports reviewers in a workflow and tracks revoke outcomes.
pipe: Entitlement extraction @ identity governance ; Usage and peer analysis @ analytics ; Recommendation ranking @ learned ranker ; Reviewer workflow @ review tool ; Revocation @ identity provider ; Outcome tracking @ BI ; Quality audit @ quarterly
edge: Seasonal access | people use access once a year | Seasonal usage windows
edge: New role | the new role has no peer group to compare against | Role template comparison
edge: Reviewer fatigue | reviewers approve all items | Sampling and attestation quality checks
off: Agreement with auditor findings ; Recommendation precision ; Reviewer override rate
on: Excess access removed ; Review completion time ; Audit findings
gap: Approval rates as signals ; Automatic revokes ; Equal weight for all access

== data-loss-prevention-classification | Data Loss Prevention Classification | nlp,tabular | seconds | advanced | a=1 k=5
obj: Classify documents and messages by sensitivity to improve data loss prevention rules, blocking or warning on risky sharing with the content analysed in the control and not in analyst tools.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Block only at high confidence with a user override path ; Content stays inside the control ; Policy owners approve rule changes ; Decision within 500 ms ; 20M events per day
sn: Label | Data owner classifications and audited samples | Pattern hits | Patterns include false matches
sn: Action | Warn, block or encrypt by sensitivity | Block everything risky | Over-blocking pushes users to workarounds
sn: Privacy | Minimal metadata in alerts | Content copies in analyst consoles | Content copies spread sensitive data
sig: Content classifier output | predicted sensitivity class | Core | From the classifier
sig: Destination type | internal, partner or personal | Risk | From the event
sig: Sender role and data access | role-based access level | Context | From identity
sig: Volume and pattern | size of the transfer | Risk | From events
noise: Employee name | personal data
noise: File name | weak link
noise: Message id | an identifier
base: Pattern and keyword rules for card and ID numbers, because they are the standard configuration.
prod: A classifier that adds learned sensitivity classes to rules with confidence tiers, user override with justification and policy owner review of outcomes.
pipe: Event and content capture @ DLP control ; Classification @ transformer ; Policy decision @ rules ; Warn, block or allow @ control ; User justification @ prompt ; Metadata alert @ SIEM ; Rule review @ monthly
edge: Encrypted files | content cannot be read | Metadata and destination rules
edge: Legitimate partner sharing | external sharing is required | Approved partner lists
edge: Screenshots | text is in images | Image text extraction
off: Classification accuracy on audited samples ; Block precision ; Override rate
on: Sensitive data leaving the company ; False blocks ; Policy exceptions
gap: Pattern-only rules ; Blocking everything risky ; Content copies in analyst tools

== cloud-misconfiguration-detection | Cloud Misconfiguration Detection | tabular,graph | batch | foundational | a=0.5 k=4
obj: Find risky cloud settings such as public storage, open ports and weak identity rules and rank them by exposure and data sensitivity, opening fixes through infrastructure code.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{RankLoss}
con: Exposed critical findings alerted within 1 hour ; Fixes proposed as code changes ; Owners approve ; Findings cite the resource and rule ; 2M resources
sn: Priority | Exposure and data sensitivity | Rule severity alone | Severity ignores exposure
sn: Fix | A pull request to infrastructure code | A console change | Console fixes drift
sn: Evidence | The setting and the attack path | A rule name | Owners need to see why
sig: Internet exposure | whether the resource is reachable | Core | From network analysis
sig: Data sensitivity | classification of stored data | Impact | From the data catalogue
sig: Identity permissions | wildcard and cross-account access | Risk | From identity analysis
sig: Compliance mapping | control the finding breaks | Context | From policy
noise: Resource id | an identifier
noise: Scanner name | weak link
noise: Owner name | personal data
base: Periodic scans with severity-ordered lists, because they are the standard tooling.
prod: A posture engine that adds exposure and data context to scanner findings, ranks them and opens fix pull requests for owners.
pipe: Resource and setting collection @ cloud APIs ; Rule evaluation @ policy as code ; Exposure and data join @ graph ; Priority model @ gradient boosting ; Fix pull request @ code host ; Owner review @ workflow ; Closure check @ rescan
edge: Intentional exposure | a public site is meant to be public | Exception register with expiry
edge: Multi-account sprawl | accounts have no owner | Account ownership process
edge: Short-lived resources | resources vanish before scan | Event-driven checks
off: Rank accuracy on confirmed exposures ; Rule coverage ; Fix acceptance
on: Exposed critical resources ; Time to fix ; Repeat findings
gap: Severity-only ranking ; Console-only fixes ; Findings with no context

== network-anomaly-detection | Network Anomaly Detection | time-series,graph | seconds | advanced | a=1 k=4
obj: Detect abnormal traffic patterns, failing links and unusual flows from flow, device and DNS data, separating performance faults from security events and routing both to the right team.
loss: \mathcal{L}=\|x-\mathrm{Dec}(\mathrm{Enc}(x))\|^2
con: Detection within 2 minutes ; Flow data summarised with no payload inspection ; False alerts under 5 per site per week ; Operations and security alerts routed separately ; 100B flow records per day
sn: Baseline | Seasonal baselines per link and service | Fixed limits | Load varies by hour and site
sn: Class | Performance, misconfiguration or security | One anomaly stream | Different teams act on each
sn: Privacy | Flow metadata only | Payload capture | Payloads contain personal data
sig: Link utilisation and error rates | bandwidth, loss and errors | Core | From device telemetry
sig: Flow volume and destination rarity | traffic by pair | Core | From flow logs
sig: DNS query patterns | domain rarity and failure rates | Support | From DNS logs
sig: Topology and change events | recent network changes | Context | From the CMDB
noise: IP address alone | personal data
noise: Device name | an identifier
noise: Vendor | weak link
base: Static threshold alerts on interface utilisation, because they are the usual setup.
prod: A detector with per-link baselines and flow analytics that classifies anomalies as fault or security, adds topology context and routes to network or security teams.
pipe: Telemetry and flow ingestion @ network collectors ; Baseline fit @ forecasting ; Anomaly scoring @ detector ; Fault or security classification @ rules and model ; Routing @ ITSM and SIEM ; Engineer feedback @ UI ; Baseline refresh @ weekly
edge: Planned traffic | backups or migrations spike flows | Calendar-aware suppression
edge: Encrypted traffic | content is hidden | Metadata and behaviour features
edge: Collector loss | flow data is missing | Heartbeat checks
off: Detection of seeded faults ; Fault versus security classification ; False alert rate
on: Network incidents detected early ; Time to isolate faults ; Alerts per site
gap: Fixed thresholds ; Payload capture ; One stream for all teams

== wifi-experience-optimisation | Wi-Fi Experience Optimisation | time-series,tabular | seconds | foundational | a=1 k=4
obj: Tune channel, power and access point placement recommendations from client experience data so wireless issues fall, using access point and client-class aggregates and not named users.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Client data aggregated by access point and device class ; Changes applied in staged groups ; Rollback on experience regression ; Recommendations weekly for 10K access points ; Network team approves
sn: Target | Client throughput and connection success | Signal strength alone | Strong signal can still be congested
sn: Level | Access point and area | Named users | Individual tracking is not needed
sn: Change | Staged with rollback | Network-wide | A bad setting affects everyone
sig: Client connection failures | failed associations and roams | Core | From controllers
sig: Channel utilisation and interference | airtime use | Core | From access points
sig: Client density | clients per access point | Load | From controllers
sig: Floor plan and placement | location of access points | Planning | From site plans
noise: User name | personal data
noise: Device MAC address | personal data
noise: SSID label | weak link
base: Periodic site surveys and automatic radio management, because they are the standard tools.
prod: A recommendation engine on aggregated client experience that proposes channel, power and placement changes, tests them in groups and reports the effect.
pipe: Controller telemetry @ wireless controllers ; Aggregation to access point @ batch ; Experience model @ gradient boosting ; Change proposal @ optimiser ; Staged rollout @ controller ; Experience check @ analytics ; Review @ network team
edge: Event days | density spikes in one area | Event schedules
edge: Interference from neighbours | outside networks cause issues | Channel plans and shielding advice
edge: Firmware bug | a client driver fails on one device class | Device class issue tracking
off: Experience metric accuracy ; Gains in staged tests ; Rollback frequency
on: Wi-Fi tickets ; Connection success rate ; Throughput at peak
gap: Signal strength as the target ; Per-user tracking ; Network-wide changes

== hardware-failure-prediction | Hardware Failure Prediction | tabular,time-series | batch | foundational | a=1 k=3
obj: Predict disk, memory and power supply failures from device telemetry so teams replace parts during planned windows and avoid unplanned outages.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Prediction lead time of at least 7 days ; Replacements scheduled by owners ; Data kept on devices protected during returns ; Calibrated risk scores ; 500K devices
sn: Label | Confirmed failures and replacements | Alerts only | Alerts include false warnings
sn: Action | Planned replacement or migration | Replace at a fixed age | Fixed-age replacement wastes parts
sn: Cost | Missed failures cost outages | Equal weights | The costs differ
sig: SMART and error counters | disk reallocated sectors and errors | Core | From device telemetry
sig: Temperature and power trend | thermal and power drift | Support | From sensors
sig: Age and model | hardware batch and age | Prior | From the CMDB
sig: Workload intensity | read and write load | Wear | From monitoring
noise: Serial number | an identifier
noise: Rack name | weak link
noise: Vendor support level | weak link
base: Vendor health alerts and scheduled refresh by age, because they are the usual practice.
prod: A survival model on telemetry that produces calibrated failure risk with lead time and opens replacement tasks in planned windows.
pipe: Telemetry collection @ device agents ; Feature build @ batch ; Failure model @ survival model ; Calibration @ isotonic fit ; Replacement task @ ITSM ; Window scheduling @ change process ; Outcome tracking @ monthly
edge: New hardware model | there is no failure history | Vendor priors and wide risk bands
edge: Correlated batch failure | many devices share a defect | Batch-level alerts
edge: Missing telemetry | agents stop reporting | Data quality alerts
off: Lead time at the alert rate ; Calibration ; Recall of failures
on: Unplanned hardware outages ; Spare parts cost ; Replacement lead time
gap: Fixed-age replacement ; Alerts as labels ; Equal error costs

== data-centre-energy-optimisation | Data Centre Energy Optimisation | reinforcement-learning,time-series | seconds | advanced | a=1 k=5
obj: Recommend cooling and airflow set points and workload placement that lower energy use while keeping temperatures inside equipment limits, tested in simulation and rolled out by facility engineers.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Inlet temperatures never exceed vendor limits ; Set point changes limited to 1 degree per hour ; Facility engineers approve changes ; Decision within 60 s ; 40 halls
sn: Objective | Energy use within temperature limits | Lowest temperature | Over-cooling wastes energy
sn: Safety | Hard limits and rollback | Unbounded control | Equipment damage is costly
sn: Evaluation | A physics-based simulator and replay | Live trials only | Live tests risk equipment
sig: Inlet temperature by rack | temperature at servers | Constraint | From sensors
sig: IT load | power drawn by servers | State | From power meters
sig: Outside weather | temperature and humidity | Driver | From weather feeds
sig: Cooling unit state | fan, valve and compressor state | Action | From building systems
noise: Rack name | an identifier
noise: Vendor | weak link
noise: Operator name | personal data
base: Fixed set points and rule-based economiser modes, because they are the standard control.
prod: A control recommender that learns the hall response in simulation, proposes small set point moves with limits and shows the energy effect for engineers to approve.
pipe: Sensor data @ building systems ; Simulator calibration @ physics model ; Policy search @ optimiser ; Limit check @ rules ; Engineer approval @ console ; Set point change @ building system ; Energy tracking @ analytics
edge: Sensor failure | a temperature sensor drifts | Cross-checks and fail-safe
edge: Hot spot | one rack runs hot | Local limits and alerts
edge: Extreme weather | conditions leave the training range | Safe default controls
off: Temperature limit compliance in simulation ; Energy saving in replay ; Prediction error
on: Power usage effectiveness ; Temperature excursions ; Cooling energy
gap: Lowest temperature as the goal ; Live-only trials ; No hard limits

== sd-wan-path-selection | SD-WAN Path Selection | time-series,reinforcement-learning | sub-100ms | advanced | a=10 k=3
obj: Choose network paths per application class using latency, loss and cost so critical applications keep their targets while lower-cost links carry tolerant traffic.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Critical applications keep latency under 150 ms ; Failover within 2 s ; Policy by application class set by network owners ; Cost caps per link ; 5K sites
sn: Objective | Application targets within a cost cap | Lowest latency everywhere | Low latency costs more
sn: Safety | Failover rules and hold times | Path flapping | Constant switching hurts applications
sn: Control | Policies from network owners | Model-chosen classes | Business priority is a human decision
sig: Path latency and loss | measured quality per link | State | From probes
sig: Application class | priority and tolerance | Policy | From the catalogue
sig: Link cost and capacity | price and headroom | Constraint | From contracts
sig: Time pattern | busy hours | Prediction | From history
noise: Site name | weak link
noise: Provider name | weak link
noise: Device id | an identifier
base: Static path preferences with failover, because they are the standard design.
prod: A path selector using probe data and predicted quality with hold times and cost caps, tested in simulation on replayed measurements.
pipe: Probe data @ SD-WAN edges ; Quality forecast @ time-series model ; Policy and cost rules @ policy engine ; Path decision @ controller ; Hold time check @ rules ; Quality tracking @ analytics ; Policy review @ quarterly
edge: Provider outage | a link goes down | Fast failover
edge: Probe bias | probes differ from real traffic | Application-level measures
edge: Flapping | quality oscillates | Hysteresis and hold times
off: Application target attainment in replay ; Cost in replay ; Switching rate
on: Application quality complaints ; WAN cost ; Failover time
gap: Lowest latency everywhere ; Constant switching ; Model-set priorities

== certificate-expiry-dependency-risk | Certificate Expiry and Dependency Risk | graph,tabular | batch | foundational | a=0.2 k=3
obj: Find certificates, keys and tokens that will expire or are weak, map the services that depend on them and open renewal tasks with owners before they cause outages.
con: Renewal tasks at least 30 days ahead ; Every certificate has an owner ; Private keys never stored in findings ; Weekly scan of 500K certificates ; Critical expiry alerts by page
sn: Source | Discovery from endpoints and logs | A manual register | Registers miss new certificates
sn: Priority | Service criticality and dependants | Days left alone | A critical service with 20 days matters more
sn: Action | Automated renewal where possible | Reminders only | Reminders are missed
sig: Days to expiry | time left | Core | From scans
sig: Dependant services | services that rely on the certificate | Impact | From the CMDB
sig: Algorithm and key strength | weak settings | Risk | From scans
sig: Renewal automation state | whether renewal is automated | Action | From the certificate tool
noise: Certificate subject wording | weak link
noise: Issuer brand | weak link
noise: Owner name | personal data
base: Spreadsheets of certificates with calendar reminders, because they are the usual approach.
prod: A discovery and ranking service that finds all certificates, links dependants, opens renewal tasks by risk and tracks the move to automated renewal.
pipe: Certificate discovery @ scanners and logs ; Dependency mapping @ CMDB ; Risk ranking @ rules and model ; Renewal task @ ITSM ; Automated renewal @ certificate manager ; Expiry watch @ monitoring ; Coverage review @ monthly
edge: Unknown certificates | certificates have no owner | Orphan queue and owner search
edge: Pinned certificates | clients pin a certificate | Pinning inventory
edge: Internal CA expiry | the issuing certificate expires | Root and intermediate tracking
off: Discovery recall ; Dependency accuracy ; Warning lead time
on: Certificate outages ; Certificates without owners ; Automated renewal share
gap: Spreadsheet registers ; Days-left-only ranking ; Private keys in findings

== device-health-prediction | Device Health Prediction | tabular,time-series | batch | foundational | a=0.5 k=3
obj: Predict laptop and workstation problems such as battery, disk and boot failures from device telemetry so the service desk fixes them before employees lose work, using device-level data only.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Device-level telemetry only with no content or browsing ; Employee notified before any action ; Calibrated risk scores ; Weekly scoring of 100K devices ; Service desk schedules repairs
sn: Label | Repairs and replacements within 30 days | Tickets raised | Many users never raise tickets
sn: Scope | Hardware and system health | Application content and web use | Content monitoring is intrusive
sn: Action | Proactive repair offer | Forced replacement | Employees decide the timing
sig: Battery and disk health | capacity and error counters | Core | From device agents
sig: Boot and crash frequency | boot time and crash counts | Core | From device logs
sig: Device age and model | purchase date and model | Prior | From asset records
sig: Patch and driver state | out-of-date drivers | Cause | From management tools
noise: Employee name | personal data
noise: Browsing data | privacy-invasive
noise: Serial number | an identifier
base: Reactive repair when employees raise tickets, because it is the current practice.
prod: A scoring model on device health counters that offers repairs to employees ahead of failure and feeds lifecycle planning.
pipe: Device telemetry @ management agent ; Feature build @ batch ; Failure model @ gradient boosting ; Calibration @ isotonic fit ; Employee notice @ chat ; Repair task @ ITSM ; Outcome tracking @ monthly
edge: New model | there is no history | Vendor priors
edge: Remote devices | telemetry arrives late | Store and forward
edge: False alarm | the device is fine | Short feedback loop and thresholds
off: Calibration ; Recall of failures ; Lead time
on: Unplanned device failures ; Time without a device ; Employee satisfaction
gap: Content monitoring ; Forced replacement ; Tickets as labels

== software-licence-optimisation | Software Licence Optimisation | tabular | batch | foundational | a=0.5 k=3
obj: Match software licences to actual use, reclaim unused seats and forecast renewals so the company pays for what it needs while staying compliant with vendor terms.
con: Reclaim only after notice to the user ; Compliance position checked before changes ; Licence managers approve ; Use data kept at product level ; 5K products and 1M seats
sn: Evidence | Usage over a full cycle | Install count | Installed software may be unused
sn: Risk | Audit exposure and true-up costs | Savings only | Under-licensing is costly
sn: Level | Product and group | Individual monitoring | Individual tracking is not needed
sig: Last use and frequency | recent usage | Core | From usage tools
sig: Entitlement count | licences owned | Position | From contracts
sig: Renewal date and terms | contract timing | Planning | From the licence register
sig: Role fit | whether the role needs the product | Context | From the directory
noise: Employee name | personal data
noise: Vendor sales contact | irrelevant
noise: Invoice number | an identifier
base: Annual licence true-up exercises, because they are the usual process.
prod: A licence analytics service that computes entitlement position, finds unused seats, issues reclaim notices and plans renewals with licence managers.
pipe: Usage and install data @ management tools ; Entitlement join @ licence register ; Position calculation @ rules ; Reclaim candidates @ model ; Notice and approval @ workflow ; Reclaim @ vendor portal ; Savings tracking @ monthly
edge: Seasonal products | use happens once per quarter | Longer windows
edge: Shared accounts | usage maps to one login | Account clean-up
edge: Vendor terms | metrics differ by vendor | Rule library by vendor
off: Position accuracy against vendor audit ; Reclaim acceptance ; Savings realised
on: Licence spend ; Audit true-up costs ; Unused seats
gap: Install count as use ; Individual monitoring ; Savings without compliance checks

== digital-experience-monitoring | Digital Employee Experience Monitoring | time-series,tabular | batch | foundational | a=1 k=3
obj: Measure application responsiveness, logins and meeting quality from device and network data to find group-level problems and fix them, with data aggregated to groups and never used to rank employees.
con: Data aggregated to groups of at least 20 ; No individual dashboards ; Works council agreed data scope ; Insights reviewed by service owners ; 100K devices
sn: Level | Groups by site, device and application | Individuals | Individual scores harm trust
sn: Use | Fixing causes | Productivity measurement | Experience data does not show productivity
sn: Metric | Responsiveness and failure rates | Time online | Hours online are not experience
sig: Application response times | latency by application and site | Core | From agents
sig: Login and sign-in failures | failure rates | Core | From identity logs
sig: Meeting quality | call drops and jitter | Core | From collaboration tools
sig: Device and network health | CPU, memory and signal | Cause | From agents
noise: Employee name | personal data
noise: Application window titles | privacy-invasive
noise: Time online | not experience
base: Survey-based satisfaction reports and ticket counts, because they are the usual measures.
prod: A group-level experience index with root cause pointers by site, application and device class, with access limits and a governance review.
pipe: Experience data @ device agents ; Aggregation to groups @ batch ; Index computation @ analytics ; Cause attribution @ rules and model ; Service owner dashboard @ BI ; Fix tracking @ ITSM ; Governance review @ quarterly
edge: Small group | there are too few people | Suppress or merge groups
edge: Agent gaps | agents are not on all devices | Coverage reporting
edge: Misuse risk | managers ask for individuals | Access control and policy
off: Index validity against survey ; Cause attribution accuracy ; Aggregation privacy checks
on: Experience index ; Tickets per user ; Time to fix systemic issues
gap: Individual scores ; Productivity claims ; Window title capture

== application-rationalisation-analysis | Application Rationalisation Analysis | tabular,nlp | batch | advanced | a=0.5 k=5
obj: Group applications by function, use, cost and technical health and recommend retire, consolidate or invest options with the evidence, for business and IT owners to decide.
con: Owners decide every retirement ; Each recommendation shows use, cost and dependencies ; Data protection and retention checked ; Quarterly analysis of 5,000 applications ; No retirement without a migration plan
sn: Evidence | Usage, cost and dependencies | Application age | Old applications can be critical
sn: Scope | Function-based clusters | Name matching | Names hide overlaps
sn: Control | Owner decisions with business cases | Model decisions | Retirement affects people and processes
sig: Usage trend | active users and transactions | Core | From usage data
sig: Total cost | licence, hosting and support | Core | From finance
sig: Functional similarity | descriptions and features compared | Overlap | From text models
sig: Technical health | end-of-support and vulnerability state | Risk | From scans
noise: Application owner name | personal data
noise: Vendor brand | weak link
noise: Application age alone | weak link
base: Annual portfolio reviews by enterprise architects, because they are the usual practice.
prod: An analytics pipeline that clusters applications by function, scores overlap, cost and health and presents consolidation options with evidence to owners.
pipe: Inventory and usage @ CMDB and tools ; Cost join @ finance ; Functional clustering @ embeddings ; Option scoring @ rules ; Owner review @ workshop ; Migration plan @ project tool ; Savings tracking @ quarterly
edge: Shadow IT | unregistered applications exist | Discovery from network and expense data
edge: Hidden dependency | a legacy app feeds another | Dependency mapping
edge: Regulatory retention | data must be kept | Retention checks
off: Cluster quality ; Savings estimate error ; Owner agreement
on: Application count ; Run cost ; Security exposure from unsupported applications
gap: Age as the criterion ; Name matching ; Model-made retirement decisions

== it-asset-lifecycle-refresh-planning | IT Asset Lifecycle and Refresh Planning | tabular,time-series | batch | foundational | a=1 k=3
obj: Forecast device and server refresh needs from age, failure risk and support dates and plan purchases and disposal across the year within budget.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Refresh plans within the approved budget ; Data wiped and certified at disposal ; Finance approves purchases ; Scenarios by budget level ; 300K assets
sn: Basis | Risk and support dates | Age only | Some old devices are fine and some new ones fail
sn: Disposal | Certified wipe and recycling | Unlogged disposal | Data can leak from old devices
sn: Plan | Budget scenarios | A single plan | Budgets change
sig: Failure risk | predicted failure probability | Core | From device models
sig: Vendor support end dates | end of support | Constraint | From vendors
sig: Utilisation and role needs | workload needs | Fit | From monitoring
sig: Budget limits | approved spend | Constraint | From finance
noise: Employee name | personal data
noise: Asset tag | an identifier
noise: Vendor brand | weak link
base: Fixed refresh cycles by device age, because they are the common policy.
prod: A planning model that combines risk, support dates and use to schedule refresh waves, with budget scenarios and certified disposal tracking.
pipe: Asset data @ CMDB ; Risk and support join @ analytics ; Refresh scoring @ model ; Budget scenario planning @ optimiser ; Finance approval @ workflow ; Procurement and wipe @ ITSM ; Outcome tracking @ quarterly
edge: Supply delay | devices arrive late | Buffers and phased waves
edge: Remote workers | devices are hard to collect | Return logistics
edge: Budget cut | funds are reduced | Priority by risk
off: Failure prediction accuracy ; Budget fit ; Plan coverage of end-of-support assets
on: Unplanned device failures ; Unsupported assets ; Refresh cost
gap: Age-only cycles ; Unlogged disposal ; Single plan

== aiops-remediation-with-approval | AIOps Remediation with Approval | llm-agents,reinforcement-learning | seconds | staff-principal | a=0.5 k=40
obj: Propose and run approved remediation steps for known incident patterns, such as restarting a service or clearing a queue, with verification and rollback, under pre-approved runbooks and human approval for anything else.
con: Only pre-approved runbooks run automatically ; Production changes need an approver unless the runbook is certified ; Every step verified with rollback ; Remediation within 5 minutes for approved patterns ; 10K executions per year
sn: Scope | Certified runbooks with limits | Free-form commands | Free-form actions can cause outages
sn: Control | Verification after each step | Assumed success | A silent failure leaves the incident open
sn: Authority | Named approvers by tier | Model confidence | Confidence is not authority
sig: Incident pattern match | match to a certified pattern | Gate | From pattern library
sig: Blast radius | services and users affected by the action | Risk | From the CMDB
sig: Pre-check results | health checks before the step | Gate | From monitoring
sig: Post-check results | health checks after the step | Verification | From monitoring
noise: Responder name | personal data
noise: Incident number | an identifier
noise: Chat wording | weak link
base: Responders running runbook commands by hand, because it is the standard practice.
prod: A remediation orchestrator that matches incidents to certified runbooks, runs checks, applies steps with approval tiers, verifies results and rolls back on failure.
pipe: Incident pattern match @ pattern library ; Pre-checks @ monitoring ; Approval by tier @ maker-checker ; Step execution @ automation platform ; Post-checks @ monitoring ; Rollback on failure @ automation platform ; Execution log @ append-only store
edge: Pattern mismatch | the incident only looks like a known one | Stop and hand to a human
edge: Step partially fails | a step changes some systems | Rollback and a stop on the first failure
edge: Cascading restarts | repeated restarts worsen load | Rate limits and loop detection
off: Pattern match precision ; Rollback success rate ; Verification coverage
on: Mean time to restore for known patterns ; Failed remediations ; Manual toil
gap: Free-form commands ; Model confidence as approval ; Assumed success

== llm-application-observability-slo | LLM Application Observability and SLOs | llm-agents,time-series | seconds | advanced | a=1 k=40
obj: Monitor AI assistants and agents used in IT for latency, cost, grounding quality and safety events, define service level objectives and alert owners when quality or cost drifts.
con: Quality sampled and scored on a schedule ; Safety events alerted within 5 minutes ; Prompts and outputs stored with retention and redaction rules ; Owners set objectives ; 2M requests per day
sn: Metric | Task success, groundedness and safety | Latency alone | Fast wrong answers are harmful
sn: Evidence | Sampled human and automated review | User thumbs only | Thumbs are sparse and biased
sn: Privacy | Redacted traces | Raw prompts forever | Prompts contain sensitive data
sig: Groundedness score | share of claims supported by sources | Quality | From evaluators
sig: Tool error and retry rate | failed tool calls | Reliability | From traces
sig: Cost per task | tokens and calls | Efficiency | From the gateway
sig: Safety events | blocked inputs and policy hits | Safety | From the gateway
noise: User name | personal data
noise: Prompt length alone | weak link
noise: Model name alone | needs outcome data
base: Request latency and error dashboards, because they are the standard monitoring.
prod: A monitoring layer over the gateway with trace sampling, automated and human quality scoring, cost and safety dashboards and alerts against objectives.
pipe: Trace capture @ gateway ; Redaction @ pattern and model ; Quality sampling and scoring @ evaluators ; SLO calculation @ analytics ; Alerting @ observability ; Owner review @ weekly ; Model and prompt change gate @ release process
edge: Silent quality drift | a provider update changes outputs | Regression tests on a fixed set
edge: Cost spike | a loop calls tools repeatedly | Budget caps and loop detection
edge: Evaluator bias | the scorer favours one style | Human audit samples
off: Agreement of automated scores with human review ; Alert detection of seeded regressions ; Redaction recall
on: Regressions caught before users ; Cost per task ; Safety events
gap: Latency-only monitoring ; User thumbs only ; Raw prompt retention

== it-agent-evaluation-harness | IT Agent Evaluation Harness | llm-agents,tabular | batch | advanced | a=1 k=40
obj: Evaluate IT assistants and agents on real past tickets and incidents with expected outcomes, safety scenarios and cost so changes to prompts, tools and models are judged on evidence before rollout.
con: Tasks built from real tickets with approved answers ; Results by category and priority ; Safety scenarios included ; Re-run on every agent change ; 3K tasks
sn: Truth | Approved answers and expert judgement | Model-written answers | The model can grade itself wrongly
sn: Metrics | Success, safety, cost and time | Success alone | Cheap success can hide risk
sn: Coverage | Task types that match real work | Easy tickets | Easy tickets inflate scores
sig: Task success rate | tasks completed correctly | Core | From the harness
sig: Safety violations | policy breaches during runs | Safety | From gateway logs
sig: Tool call accuracy | right tool and arguments | Quality | From traces
sig: Cost and steps | tokens and steps | Efficiency | From traces
noise: Task author | irrelevant
noise: Run id | an identifier
noise: Model name alone | needs outcome data
base: Spot checks by service desk leads, because they are the common evidence.
prod: A harness that replays curated tasks in a sandbox, grades with expert answers and rules, tracks safety and cost and gates rollouts on regression thresholds.
pipe: Task curation @ ticket history ; Sandbox run @ agent platform ; Automated grading @ rules and evaluators ; Expert sampling @ review tool ; Safety check @ gateway logs ; Report and gate @ release process ; Task refresh @ quarterly
edge: Stale tasks | procedures changed since the task was written | Quarterly refresh
edge: Non-determinism | results vary by run | Multiple runs and intervals
edge: Sandbox gap | the sandbox differs from production | Production-like fixtures
off: Agreement of harness scores with later outcomes ; Variance across runs ; Safety scenario coverage
on: Regressions caught before rollout ; Cost per solved task ; Agent changes shipped with evidence
gap: Model-written answers as truth ; Success alone ; Easy-task inflation

== runbook-automation-safety-testing | Runbook Automation Safety Testing | llm-agents,tabular | batch | advanced | a=0.5 k=20
obj: Test runbooks and automation scripts in a production-like sandbox before certification, checking idempotence, blast radius and rollback so only safe automation reaches production.
con: Automation is certified only after sandbox tests pass ; Rollback tested for every runbook ; Blast radius limits declared ; Re-tested after each change ; 5K automations
sn: Evidence | Sandbox runs with fixtures | Code review only | Reviews miss runtime effects
sn: Scope | Declared target limits | Unlimited targets | One mistake could hit every host
sn: Control | Certification with owners | Self-certification | Authors miss their own risks
sig: Sandbox test results | pass and fail by scenario | Core | From the test harness
sig: Idempotence check | whether a rerun is safe | Safety | From tests
sig: Target scope | number and type of targets | Blast radius | From the script
sig: Rollback test result | whether the undo works | Safety | From tests
noise: Author name | personal data
noise: Script language | weak link
noise: Runbook title wording | weak link
base: Peer review of scripts before use, because it is the common control.
prod: A certification pipeline that runs automation in a sandbox with fault injection, checks idempotence, scope and rollback and records the certification for the orchestrator.
pipe: Change to automation @ code host ; Static checks @ linters ; Sandbox fixture build @ test platform ; Scenario and rollback tests @ harness ; Certification review @ owners ; Certified registry @ orchestrator ; Expiry and retest @ quarterly
edge: Environment mismatch | the sandbox differs from production | Production-like fixtures
edge: Untested path | an error branch has no test | Coverage requirements
edge: Secret use | a script needs a credential | Brokered short-lived credentials
off: Detection of seeded unsafe scripts ; Rollback test coverage ; Certification accuracy
on: Incidents from automation ; Certified share of automation ; Time to certify
gap: Code review only ; Self-certification ; Unlimited target scope

== it-ops-agent-action-guardrails | IT Ops Agent Action Guardrails | llm-agents,tabular | seconds | staff-principal | a=0.5 k=40
obj: Control and audit every action AI agents take on IT systems, enforce approval tiers and kill switches and give security and audit teams a replayable record.
con: Policy enforced in a gateway outside the model ; Agents never hold standing administrator access or change identity policies ; Approvals by named roles with separation of duties ; Immutable action log ; Kill switch per agent ; Audit queries over 90 days answered within 5 s
sn: Enforcement | A tool gateway with policy as code | Prompt instructions | Prompts can be bypassed by crafted input
sn: Scope | Least privilege per agent and system | A shared administrator token | One mistake should not reach every system
sn: Evidence | An append-only log with context | A summary report | Auditors need replay
sig: Action risk tier | the tier of the target system and action | Approval routing | Policy as code
sig: Action rate per agent | actions per minute against a baseline | Runaway detection | Per agent
sig: Approval and override statistics | approvals, rejections and overrides | Governance health | From the log
sig: Post-action verification result | whether the intended state was reached | Quality of actions | Verification steps
noise: Agent name | an identifier
noise: Prompt length | not risk
noise: Model version alone | needs outcome data
base: Manual review of agent logs by team leads, because it is the minimum audit trail.
prod: A policy gateway with risk tiers, rate limits and a kill switch, an immutable action log with replay, anomaly detection on agent behaviour and monthly governance reports.
pipe: Tool gateway @ policy proxy ; Risk tier decision @ policy as code ; Approval workflow @ maker-checker ; Action log @ append-only store ; Behaviour monitor @ time-series model ; Replay console @ analytics ; Governance report @ monthly
edge: Agent loop | repeated restarts of one service | Rate limits and loop detection
edge: Approver fatigue | approvals become automatic | Override statistics and rotating approvers
edge: New tool added | no tier has been defined for it | Default deny until classified
off: Policy test coverage ; Detection of seeded anomalous actions ; Replay completeness
on: Actions blocked by policy ; Incidents caused by agent actions ; Time to answer audit queries
gap: Prompt-only guardrails ; Shared administrator tokens ; Default allow for new tools
