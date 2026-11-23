# IT Operations & Infrastructure, part 1 (use cases 1-25): incidents and observability, service desk, capacity and FinOps, change and configuration
# Vendor-neutral. Automation works with least-privilege short-lived access, a human approves every production change, credentials and personal data never reach a model and employees are never ranked or scored individually.
== alert-correlation-noise-reduction | Alert Correlation and Noise Reduction | graph,time-series | seconds | foundational | a=1 k=5
obj: Group duplicate and related alerts into a single incident using topology and timing so on-call engineers receive fewer, clearer pages without missing a real outage.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{GraphReg}
con: Suppressed alerts stay visible inside the incident ; Critical alerts always page within 60 s ; Grouping within 5 s of arrival ; Operations owners approve suppression rules ; 2M alerts per day
sn: Group | Alerts that share a cause or dependency | Alerts with similar names | Similar names can hide unrelated faults
sn: Safety | Critical and customer-facing alerts never suppressed | Maximum noise reduction | Quiet pagers can hide an outage
sn: Control | Rules owned by service teams | A model that suppresses silently | Hidden suppression erodes trust
sig: Service topology distance | dependency path between alerting services | Core | From the CMDB and traces
sig: Time proximity | alerts firing within a short window | Core | From the alert stream
sig: Alert text similarity | embedding of the alert message | Support | From a text model
sig: Recent change events | deployments and changes on affected services | Cause hint | From change records
noise: Alert id | an identifier
noise: Monitoring tool name | weak link
noise: On-call engineer name | personal data
base: Static deduplication by alert name and a fixed suppression window, because it is the default in most monitoring tools.
prod: A correlation service that clusters alerts using topology, time and change events, shows the grouped incident with every member alert and routes pages by service ownership.
pipe: Alert stream intake @ monitoring tools ; Deduplication @ rules ; Topology and time clustering @ graph model ; Incident creation @ ITSM ; Owner routing @ service catalogue ; Page decision @ policy ; Noise review @ monthly
edge: Missing topology | the dependency map is out of date | Fall back to time and text signals and flag the gap
edge: Alert storm | thousands of alerts arrive within a minute | Rate-limited grouping with a top-level incident
edge: New service | there is no alert history for the service | Conservative grouping until history exists
off: Cluster purity ; Missed critical alert rate ; Alert reduction ratio
on: Pages per on-call shift ; Time to acknowledge ; Missed incidents
gap: Name-based deduplication ; Silent suppression ; Noise reduction as the only goal

== incident-root-cause-assistant | Incident Root Cause Assistant | llm-agents,graph | seconds | advanced | a=0.3 k=60
obj: Assemble evidence from metrics, logs, traces and recent changes and propose ranked root cause hypotheses with the supporting data for the incident commander to test.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Every hypothesis cites metrics, logs or changes ; The assistant is read-only on production ; Hypotheses within 3 minutes of an incident ; The commander decides every action ; 20K incidents per year
sn: Evidence | Linked telemetry and change events | A model narrative | Stories can be plausible and wrong
sn: Role | Ranked hypotheses to test | An automatic fix | Fixes without diagnosis can worsen outages
sn: Label | Causes confirmed in problem records | First guess in the ticket | Early guesses are often wrong
sig: Change proximity | changes shortly before the first symptom | Cause | From change records
sig: Dependency health | state of upstream and downstream services | Cause | From telemetry and the CMDB
sig: Anomaly onset order | which signal changed first | Direction | From time-series
sig: Past similar incidents | earlier incidents with similar symptoms | Hint | From problem records
noise: Incident number | an identifier
noise: Responder name | personal data
noise: Chat message count | weak link
base: Responders searching dashboards and chat history by hand, because it is the current practice.
prod: A retrieval and analysis agent that links change events, dependency state and similar incidents into ranked hypotheses with cited evidence, delivered into the incident channel.
pipe: Incident declared @ ITSM ; Telemetry and change retrieval @ read-only tools ; Onset ordering and dependency analysis @ analytics ; Hypothesis ranking @ LLM with citations ; Post to incident channel @ chat ; Responder feedback @ UI ; Accuracy review @ quarterly
edge: Multiple causes | two faults overlap in time | Present separate hypotheses with evidence for each
edge: Sparse telemetry | the affected system has little monitoring | State the gap and suggest data to collect
edge: Misleading change | an unrelated change occurred just before | Cross-check with dependency paths
off: Top three hypothesis accuracy on confirmed causes ; Evidence faithfulness ; Retrieval recall
on: Time to identify the cause ; Mean time to restore ; Misdiagnosed incidents
gap: Narrative without evidence ; Automatic fixes ; First guess as the label

== metric-anomaly-detection | Metric Anomaly Detection | time-series | seconds | foundational | a=10 k=3
obj: Detect abnormal behaviour in service and infrastructure metrics against seasonal baselines and raise alerts that carry context, with fewer false alarms than static thresholds.
loss: \mathcal{L}=\|x-\mathrm{Dec}(\mathrm{Enc}(x))\|^2
con: Detection within 60 s of onset ; False alert rate under 1 per service per week ; Alerts show the baseline and deviation ; Owners tune sensitivity ; 5M metric series
sn: Baseline | Seasonal baselines by hour and day | A fixed threshold | Load changes through the day and week
sn: Label | Incidents and confirmed anomalies | Every alert fired | Alerts include noise
sn: Cost | A missed outage costs more than a false alert | Equal weights | The costs differ
sig: Deviation from seasonal baseline | residual after seasonal fit | Core | From time-series
sig: Rate of change | slope over recent minutes | Core | From metrics
sig: Related metric movement | correlated metrics also moving | Confidence | From the same service
sig: Deployment marker | recent releases on the service | Context | From change records
noise: Host name | an identifier
noise: Metric unit label | an artefact
noise: Dashboard folder | irrelevant
base: Static thresholds on key metrics, because they are the standard configuration.
prod: A per-series detector with seasonal baselines, multi-metric confirmation and release awareness that publishes alerts with context to the alert pipeline.
pipe: Metric ingestion @ time-series database ; Seasonal baseline fit @ forecasting ; Anomaly scoring @ detector ; Multi-metric confirmation @ rules ; Alert with context @ alert pipeline ; Owner feedback @ UI ; Threshold review @ monthly
edge: New metric | too little history exists for a baseline | Use static limits until the baseline is ready
edge: Planned event | a promotion or migration changes load | Calendar-aware suppression with owner input
edge: Gradual drift | slow degradation stays inside the band | Trend detection over longer windows
off: Detection of seeded anomalies ; False alert rate ; Time to detect
on: Incidents detected by anomaly ; Alert precision ; Customer-reported outages
gap: Fixed thresholds only ; Alert count as success ; Ignoring release events

== log-template-anomaly-detection | Log Anomaly Detection | nlp,time-series | seconds | advanced | a=10 k=3
obj: Learn normal log patterns per service, flag new or rare message templates and unusual rates after releases, and surface them with sample lines to engineers.
loss: \mathcal{L}=\|x-\mathrm{Dec}(\mathrm{Enc}(x))\|^2
con: Personal data masked in logs before analysis ; Detection within 2 minutes of onset ; Anomalies show sample lines ; False flags under 5 per service per day ; 10B log lines per day
sn: Unit | Message templates | Raw lines | Variable fields hide patterns
sn: Label | Templates linked to incidents | All new templates | New templates appear after every release
sn: Privacy | Masked identifiers | Raw user data in the analysis store | Logs can contain personal data
sig: Template frequency change | rate of each template versus baseline | Core | From parsing
sig: New template appearance | templates unseen before | Core | From parsing
sig: Severity level mix | error and warning share | Support | From logs
sig: Release marker | version and deployment time | Context | From change records
noise: User identifier | personal data
noise: Process id | an identifier
noise: Timestamp format | an artefact
base: Keyword alerts on the words error and exception, because they are the common starting point.
prod: A template-based detector with masking, frequency and novelty scoring and release awareness that creates ranked anomalies with example lines.
pipe: Log ingestion @ logging platform ; Masking @ pattern and model ; Template extraction @ parser ; Frequency and novelty scoring @ detector ; Ranked anomalies @ operations console ; Engineer feedback @ UI ; Baseline refresh @ weekly
edge: Verbose logging change | a release changes log wording | Template mapping across versions
edge: Log flood | one component floods logs | Rate caps and sampling
edge: Missing logs | a collector stops sending data | Heartbeat checks on sources
off: Anomaly detection on seeded faults ; Template parsing accuracy ; Masking recall
on: Faults found from logs ; Time to detect ; Investigation time
gap: Keyword alerts only ; Raw personal data in analysis ; Novelty as the only signal

== incident-summary-stakeholder-comms | Incident Summary and Stakeholder Communication | llm-agents,nlp | seconds | foundational | a=0.1 k=10
obj: Draft status updates and executive summaries from the incident timeline in plain language for the communications lead to review and send on a fixed cadence.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: The communications lead approves every external update ; Updates cite the timeline entries ; Update drafted within 2 minutes of a request ; No unconfirmed causes stated as fact ; 5K incident updates per year
sn: Source | The incident timeline and confirmed facts | Chat speculation | Early theories are often wrong
sn: Audience | Separate technical, executive and customer versions | One message | Readers need different detail
sn: Control | Human approval before sending | Automatic posting | Public messages carry legal and trust risk
sig: Timeline events | confirmed actions and findings | Content | From the incident record
sig: Impact scope | affected services and customers | Content | From monitoring
sig: Severity and status | severity and phase | Tone and cadence | From the ITSM record
sig: Previous updates | what was already said | Consistency | From the update log
noise: Responder name | personal data
noise: Chat length | weak link
noise: Time of day | irrelevant
base: Incident commanders writing updates by hand during the incident, because it is the usual practice.
prod: A drafting assistant that builds audience-specific updates from confirmed timeline entries, flags unconfirmed statements and queues drafts for the communications lead.
pipe: Update request @ incident channel ; Timeline and impact retrieval @ ITSM and monitoring ; Draft by audience @ LLM with citations ; Unconfirmed claim check @ rules ; Lead review @ editor ; Publication @ status page ; Update log @ record store
edge: Conflicting facts | sources disagree on impact | List the conflict and ask the commander
edge: Sensitive detail | a security incident should not be described | Disclosure rules and a manual path
edge: Long incident | the timeline is very long | Rolling summaries
off: Fact faithfulness ; Unconfirmed claim detection ; Editor change rate
on: Time to first update ; Update cadence adherence ; Customer complaints about communication
gap: Posting without approval ; Speculation as fact ; One message for all readers

== on-call-runbook-assistant | On-Call Runbook Assistant | llm-agents,nlp | seconds | foundational | a=0.2 k=40
obj: Find the right runbook for an alert, summarise the steps in context and answer questions during an incident, with links to the source and no actions taken without approval.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Answers cite the runbook version and section ; Runbook steps shown, not executed ; Retrieval within 3 s ; Stale runbooks flagged ; 100K runbook pages
sn: Source | Current runbooks and service docs | Model memory | Procedures change
sn: Role | Guide the responder | Execute steps | Execution needs approval and context
sn: Quality | Freshness flags | Unversioned copies | Outdated steps cause harm
sig: Alert and service match | runbooks linked to the alert | Retrieval | From the catalogue
sig: Runbook freshness | last review date | Trust | From the doc system
sig: Step applicability | environment and version conditions | Filtering | From runbook metadata
sig: Past usage outcomes | whether a runbook helped before | Ranking | From incident records
noise: Responder name | personal data
noise: Page length | weak link
noise: Chat history length | weak link
base: Searching a wiki by keywords during the incident, because it is the current method.
prod: A retrieval assistant over versioned runbooks with alert-based lookup, condition checks and freshness warnings that feeds back missing or wrong steps to owners.
pipe: Alert context @ alert pipeline ; Runbook retrieval @ hybrid search ; Applicability filter @ metadata rules ; Step summary with links @ LLM with citations ; Responder questions @ chat ; Gap report to owner @ doc system ; Freshness review @ monthly
edge: No runbook | the alert has no linked procedure | Escalate and suggest a new runbook draft
edge: Conflicting runbooks | two runbooks give different steps | Show both and flag to owners
edge: Outdated step | a step no longer matches production | Freshness warning and owner ticket
off: Retrieval accuracy ; Answer faithfulness ; Stale runbook detection
on: Time to find a runbook ; Escalations from missing procedures ; Runbook coverage
gap: Model memory of procedures ; Execution without approval ; Unversioned runbooks

== postmortem-drafting-assistant | Postmortem Drafting Assistant | llm-agents,nlp | batch | foundational | a=0.1 k=10
obj: Draft blameless postmortems from the incident timeline, changes and metrics, with contributing factors and action items for the incident owner to edit and approve.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Blameless wording with no individual blame ; Each statement links to evidence ; Owner approves before publication ; Action items assigned to teams ; Draft within 1 hour of closing 500 incidents per year
sn: Tone | System and process causes | Names of people at fault | Blame discourages honest reporting
sn: Evidence | Timeline and metrics links | Recollection | Memory is incomplete
sn: Output | Action items with owners | A narrative only | Learning needs follow-up
sig: Timeline of events | detection, response and recovery steps | Content | From the incident record
sig: Contributing changes | changes before the incident | Factors | From change records
sig: Impact metrics | duration and affected users | Content | From monitoring
sig: Related past actions | open items from similar incidents | Pattern | From the action tracker
noise: Responder name | personal data
noise: Chat length | weak link
noise: Time of day | irrelevant
base: Engineers writing postmortems by hand from memory and chat logs, because it is the usual practice.
prod: A drafting pipeline that builds the timeline and factors with citations, proposes action items by team, checks for blame language and routes the draft to the owner.
pipe: Incident close event @ ITSM ; Timeline assembly @ read-only tools ; Factor and action drafting @ LLM with citations ; Blame language check @ rules ; Owner review @ editor ; Publication @ wiki ; Action tracking @ issue tracker
edge: Missing data | the timeline has gaps | Mark the gaps for the owner to fill
edge: Hidden factor | the true cause is not in the data | Prompt questions for responders
edge: Repeated incident | the same action is already open | Link to the open item
off: Evidence link accuracy ; Blame language detection ; Owner edit rate
on: Time to publish a postmortem ; Action item completion ; Repeat incidents
gap: Individual blame ; Narrative without actions ; Recollection as evidence

== it-helpdesk-chat-agent | IT Helpdesk Chat Agent | llm-agents,nlp | seconds | foundational | a=0.3 k=40
obj: Answer common employee IT questions and guide troubleshooting from approved knowledge articles, creating a ticket with context and handing over to a human when the issue is not resolved.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Answers cite knowledge articles ; Identity verified before account actions ; Handover to a human within 2 turns when unsure ; Personal data minimised in transcripts ; 200K chats per month
sn: Source | Approved knowledge articles | Model memory | Procedures and policies change
sn: Role | Resolve common issues and escalate | Resolve everything | Complex issues need people
sn: Quality | Resolution confirmed by the employee | Chat closed by timeout | Silent closes hide failures
sig: Intent and category | what the employee needs | Routing | From classification
sig: Article match | the best knowledge article | Grounding | From retrieval
sig: Device and application context | device type and software | Filtering | From the asset record
sig: Employee confirmation | whether the fix worked | Outcome | From the chat
noise: Employee name | personal data
noise: Chat length | weak link
noise: Time of day | weak link
base: A static FAQ and a ticket form, because they are the common starting point.
prod: A grounded chat agent with article retrieval, device context and guided steps that creates complete tickets and hands over with the transcript when unresolved.
pipe: Chat intake @ messaging channel ; Identity check @ SSO ; Intent and retrieval @ classifier and search ; Guided answer @ LLM with citations ; Ticket on failure @ ITSM ; Human handover @ agent console ; Outcome survey @ chat
edge: Ambiguous problem | the description fits several issues | Ask one clarifying question
edge: Outdated article | the fix no longer works | Flag the article for review
edge: Sensitive request | the employee asks for another user data | Refuse and explain the process
off: Resolution accuracy ; Answer faithfulness ; Handover precision
on: Chat resolution rate ; Ticket volume ; Employee satisfaction
gap: Closing by timeout ; Answers without sources ; Unverified account actions

== ticket-classification-routing | Ticket Classification and Routing | nlp,tabular | seconds | foundational | a=0.2 k=5
obj: Classify incoming tickets by category, priority and owning team and suggest the first response so tickets reach the right resolver without manual sorting.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Suggestions shown with confidence ; Security and outage tickets routed to specialists at once ; Agents can override ; Classification within 5 s ; 500K tickets per year
sn: Label | The team that resolved the ticket | The category chosen at creation | Requesters choose wrongly
sn: Safety | Rules for security and outage keywords | Model only | Urgent tickets must not wait
sn: Metric | Reassignment rate | Accuracy alone | Misroutes cost hours
sig: Ticket text | description and subject | Core | From the ticket
sig: Requester context | department and location | Routing | From the directory
sig: Affected configuration item | the item named or detected | Routing | From the CMDB
sig: Similar resolved tickets | earlier tickets and resolvers | Hint | From history
noise: Requester name | personal data
noise: Ticket number | an identifier
noise: Channel alone | weak link
base: Requesters choosing a category from a menu and dispatchers reassigning, because it is the usual flow.
prod: A text classifier with a rule layer for urgent cases, resolver-based labels, confidence thresholds and an override loop for agents.
pipe: Ticket intake @ ITSM ; Text parsing @ NLP ; Category and team classifier @ transformer ; Urgency rules @ rules ; Routing @ ITSM ; Agent override @ console ; Accuracy review @ monthly
edge: Multiple issues | one ticket describes several problems | Suggest splitting the ticket
edge: Vague ticket | the text has little detail | Request details automatically
edge: New service | the model has not seen the service | Rules until training data exists
off: Routing accuracy on resolver labels ; Urgent recall ; Calibration
on: Reassignment rate ; Time to first touch ; Resolution time
gap: Requester category as truth ; Model-only urgency ; Accuracy without reassignment

== access-request-fulfilment-agent | Access Request Fulfilment Agent | llm-agents,tabular | seconds | advanced | a=0.5 k=40
obj: Handle routine access requests by checking policy and role, routing approvals and provisioning low-risk access through workflow, with a full audit record.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Provisioning only after required approvals ; Privileged access never granted by the agent ; Every request logged with the policy checked ; Low-risk fulfilment within 10 minutes ; 100K requests per year
sn: Policy | Role-based access rules | Free-form approval | Manual exceptions weaken control
sn: Scope | Low-risk standard access | Privileged or sensitive access | These need human decisions
sn: Evidence | An audit record per request | A chat transcript | Auditors need structured records
sig: Role and entitlement match | whether the role allows the access | Core | From the directory
sig: Risk tier of the target | sensitivity of the system | Routing | From the catalogue
sig: Existing access | what the user already holds | Conflict checks | From identity systems
sig: Approval state | whether approvers agreed | Gate | From workflow
noise: Requester name | personal data
noise: Request wording | weak link
noise: Time of day | irrelevant
base: Ticket forms with manual approval and manual provisioning, because it is the usual process.
prod: A workflow agent that interprets requests, checks policy and separation of duties, routes approvals and calls provisioning only for low-risk entitlements.
pipe: Request intake @ service portal ; Policy and role check @ identity governance ; Separation of duty check @ rules ; Approval routing @ workflow ; Provisioning @ identity provider ; Confirmation @ requester ; Audit record @ append-only store
edge: Conflicting duties | the access would break separation of duties | Block and explain the policy
edge: Missing approver | the approver has left | Fall back to the manager chain
edge: Impersonation | a request claims authority it lacks | Identity verification and out-of-band checks
off: Policy decision accuracy ; Separation of duty detection ; Audit completeness
on: Fulfilment time ; Manual handling share ; Access violations found in review
gap: Agent-granted privileged access ; Approval by chat ; Missing audit records

== knowledge-article-generation | Knowledge Article Generation from Tickets | llm-agents,nlp | batch | foundational | a=0.1 k=10
obj: Draft knowledge articles from solved tickets and chat transcripts, remove personal data and route them to subject matter experts for review before publication.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Personal data removed from drafts ; Expert approves every article ; Articles link to the source tickets ; Duplicate articles flagged ; 20K drafts per year
sn: Source | Verified resolutions | Every closed ticket | Many closes are workarounds
sn: Privacy | Redacted drafts | Raw transcripts | Tickets contain personal data
sn: Quality | Expert review and usage feedback | Auto-publish | Wrong articles mislead users
sig: Resolution steps | the fix recorded in the ticket | Content | From the ticket
sig: Recurrence count | how often the issue appears | Priority | From history
sig: Existing article match | similar published articles | Dedup | From the knowledge base
sig: Resolution confirmation | whether the requester confirmed the fix | Quality | From the ticket
noise: Requester name | personal data
noise: Agent name | irrelevant
noise: Ticket number | an identifier
base: Agents writing articles after solving issues when time allows, because it is the usual practice.
prod: A drafting pipeline that selects recurring confirmed fixes, writes redacted articles with steps and checks, finds duplicates and queues them to experts.
pipe: Candidate ticket selection @ ITSM ; Redaction @ pattern and model ; Article drafting @ LLM ; Duplicate check @ search ; Expert review @ workflow ; Publication @ knowledge base ; Usage feedback @ monthly
edge: Incorrect fix | the recorded fix was a workaround | Require confirmation signals
edge: Outdated product | the article covers a retired version | Version tags
edge: Sensitive content | the ticket shows a security issue | Route to security review
off: Redaction recall ; Article accuracy on expert review ; Duplicate detection
on: Knowledge coverage of top issues ; Deflection rate ; Articles with negative feedback
gap: Auto-publishing ; Raw transcripts in articles ; Every closed ticket as source

== ticket-resolution-time-prediction | Ticket Resolution Time Prediction | tabular | seconds | foundational | a=0.5 k=3
obj: Predict resolution time for new tickets so planners can balance queues, set realistic expectations and spot tickets at risk, without scoring individual agents.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Estimates shown as ranges ; Team-level queue views only ; No individual agent ranking ; Prediction within 2 s ; 500K tickets per year
sn: Target | Active working time and waiting time separately | Elapsed time | Waiting on customers distorts elapsed time
sn: Level | Queue and team planning | Individual agent performance | Individual rankings distort behaviour
sn: Use | Expectation setting and planning | A commitment | Estimates are not promises
sig: Category and priority | type and urgency | Core | From the ticket
sig: Queue load | open tickets in the target queue | Core | From the ITSM
sig: Similar ticket durations | durations of similar tickets | Core | From history
sig: Dependency on other teams | whether other teams must act | Delay | From the ticket
noise: Agent name | personal data
noise: Requester name | personal data
noise: Ticket number | an identifier
base: Fixed targets by priority, because they are the standard service level design.
prod: A quantile regression model with queue context that shows ranges, flags at-risk tickets and feeds capacity planning at queue level.
pipe: Ticket and queue data @ ITSM ; Feature build @ batch ; Duration model @ gradient boosting ; Range output @ quantile regression ; Planner view @ dashboard ; Queue rebalancing @ team leads ; Calibration check @ monthly
edge: Rare category | few similar tickets exist | Wider ranges and category pooling
edge: Holiday period | staffing changes | Calendar features
edge: Process change | a new workflow alters durations | Change flags and recent windows
off: Calibration of ranges ; Error by category ; Rank stability
on: Tickets breaching targets ; Planning accuracy ; Customer chasing
gap: Agent rankings ; Elapsed time as the target ; Estimates as commitments

== joiner-mover-leaver-orchestration | Joiner Mover Leaver Orchestration | llm-agents,tabular | batch | advanced | a=0.5 k=20
obj: Coordinate account, device and access changes when people join, move or leave, from HR events and policy, with approvals and verification so access matches the role at all times.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Leaver access removed within 1 hour of the HR event ; Privileged access removed by human-approved steps ; HR data used only for role and dates ; Every step verified and logged ; 30K events per year
sn: Trigger | Authoritative HR events | Manager emails | Emails are late and incomplete
sn: Control | Verification after each step | Assumed completion | Silent failures leave access open
sn: Scope | Role-based bundles | Copying another person access | Copying spreads excess access
sig: HR event type and date | join, move or leave event | Trigger | From HR system
sig: Role and department | target role | Entitlement | From HR and identity
sig: Current entitlements | access held now | Delta | From identity systems
sig: Device and licence assignments | assets assigned | Recovery | From asset records
noise: Employee name | personal data
noise: Manager comments | personal data
noise: Ticket wording | weak link
base: Manual tickets raised by managers and processed by several teams, because it is the usual process.
prod: A workflow orchestrator that turns HR events into role-based tasks, executes low-risk steps, routes approvals for the rest and verifies completion with exceptions to owners.
pipe: HR event intake @ HR system ; Role delta calculation @ identity governance ; Task plan @ workflow ; Low-risk provisioning @ identity provider ; Approval for sensitive steps @ approvers ; Verification @ scans ; Exception queue @ ITSM
edge: Late HR data | the event arrives after the leaving date | Emergency revocation path
edge: Dual role | a person holds two roles | Union of role bundles with review
edge: Device not returned | the laptop is missing | Recovery workflow and remote lock
off: Entitlement delta accuracy ; Completion verification ; Time to revoke
on: Orphaned accounts ; Time to full access on day one ; Audit findings on leavers
gap: Manager emails as triggers ; Assumed completion ; Copying access from peers

== sla-breach-prediction | SLA Breach Prediction | tabular,time-series | seconds | foundational | a=1 k=3
obj: Predict which open tickets will breach their service level and alert queue owners early enough to rebalance work, using queue and ticket signals and not individual performance.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Alerts at least 2 hours before a breach ; Team-level actions only ; Calibrated probabilities ; Score refresh every 5 minutes ; 50K open tickets
sn: Label | Tickets that breached the target | Tickets closed late for any reason | Customer holds are not breaches
sn: Action | Queue rebalancing and escalation | Chasing individual agents | Individual pressure harms quality
sn: Pause rules | Clock pauses applied correctly | Elapsed time | Pauses change the clock
sig: Time remaining versus predicted work | clock and estimated effort | Core | From the ITSM
sig: Queue load and staffing | open items and available people | Core | From the queue
sig: Waiting state | waiting on customer or vendor | Pause | From the ticket
sig: Priority and category | urgency and type | Context | From the ticket
noise: Agent name | personal data
noise: Requester name | personal data
noise: Ticket number | an identifier
base: Colour-coded timers on tickets, because they are the standard feature.
prod: A risk model on open tickets with queue context that raises early alerts to queue owners with suggested rebalancing steps.
pipe: Open ticket stream @ ITSM ; Feature build @ queue and ticket data ; Breach model @ gradient boosting ; Calibration @ isotonic fit ; Queue owner alert @ chat ; Rebalancing @ team leads ; Outcome review @ weekly
edge: Surge of tickets | queue volume jumps after an outage | Surge mode with wider alerts
edge: Clock pauses | tickets pause and resume often | Pause-aware features
edge: Missing priority | tickets lack priority | Default rules and data quality flags
off: Calibration ; Recall at the alert budget ; Lead time before breach
on: SLA breaches ; Breaches caught early ; Overtime hours
gap: Individual agent pressure ; Late-closed as breach ; Ignoring clock pauses

== infrastructure-capacity-forecasting | Infrastructure Capacity Forecasting | time-series | batch | foundational | a=1 k=4
obj: Forecast compute, storage and network demand by service with uncertainty ranges so capacity is ordered or reserved before headroom runs out.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Forecast horizon of 12 months ; Ranges at the 50th and 95th percentiles ; Headroom policy owned by service owners ; Weekly refresh for 20K resources
sn: Target | Peak demand by service | Average usage | Peaks cause outages
sn: Drivers | Business events and growth plans | History only | Launches change the trend
sn: Decision | Order lead time and headroom policy | A point forecast | Planners need ranges
sig: Utilisation history | CPU, memory, storage and network use | Core | From monitoring
sig: Growth drivers | users and transactions | Core | From business data
sig: Planned launches and migrations | events that change demand | Shock | From planning
sig: Seasonality | weekly and yearly patterns | Core | Calendar
noise: Host name | an identifier
noise: Vendor name | irrelevant
noise: Team name | weak link
base: Linear extrapolation of last year usage with a fixed buffer, because it is the usual method.
prod: A hierarchical forecast by service with business drivers and launch events that produces ranges, headroom risk and recommended order dates.
pipe: Utilisation history @ monitoring ; Driver data @ planning ; Hierarchical forecast @ time-series model ; Scenario adjustment @ planner ; Headroom risk @ analytics ; Order recommendation @ planning tool ; Accuracy review @ quarterly
edge: New product | no history exists | Analogue services and wide ranges
edge: Migration to cloud | demand moves between platforms | Platform-level scenarios
edge: Unexpected viral demand | demand surges far beyond the forecast range | Burst capacity plans
off: Error by service tier ; Calibration of ranges ; Peak capture rate
on: Capacity shortfalls ; Idle capacity cost ; Emergency purchases
gap: Averages as the target ; Point forecasts ; Ignoring launches

== cloud-cost-anomaly-detection | Cloud Cost Anomaly Detection | time-series,tabular | batch | foundational | a=1 k=3
obj: Detect unusual spend by account, service and tag, explain the likely cause and route the alert to the owning team before the monthly bill closes.
loss: \mathcal{L}=\|x-\mathrm{Dec}(\mathrm{Enc}(x))\|^2
con: Alerts within 24 hours of the spend ; Each alert names the resource and owner ; Budget owners set thresholds ; False alerts under 10 per week ; 2M billing lines per day
sn: Baseline | Seasonal spend by service and tag | Month over month totals | Usage patterns vary through the month
sn: Action | Owner alert with cause and resource | A finance report | Reports arrive after the spend
sn: Label | Confirmed waste or errors | Every spike | Planned launches cause spikes
sig: Spend deviation by service | residual versus baseline | Core | From billing
sig: New resource types | services not used before | Cause | From inventory
sig: Usage change | quantity versus unit price change | Cause | From billing
sig: Deployment and launch calendar | planned events | Context | From planning
noise: Account name | an identifier
noise: Invoice number | an identifier
noise: Region name alone | weak link
base: Monthly bill review and budget alerts on total spend, because they are the standard tools.
prod: A daily detector on tagged billing lines with cause attribution that raises alerts with the resource, owner and recent changes to the owning team.
pipe: Billing line ingestion @ billing export ; Tag and owner join @ inventory ; Baseline and deviation @ detector ; Cause attribution @ rules and model ; Owner alert @ chat and ticket ; Owner feedback @ UI ; Threshold review @ monthly
edge: Untagged resources | the owner is unknown | Fallback owner by account
edge: Planned launch | spend rises on purpose | Calendar and owner confirmation
edge: Billing delay | data arrives late | Late data handling and recheck
off: Detection of seeded cost spikes ; Cause attribution accuracy ; Alert precision
on: Cost spikes caught before month end ; Waste recovered ; Time to owner response
gap: Total-spend budgets only ; Monthly review only ; Spikes treated as errors

== rightsizing-recommendations | Rightsizing Recommendations | tabular,time-series | batch | foundational | a=0.5 k=3
obj: Recommend smaller or different instance types and storage settings from observed utilisation, with the savings and the performance risk, for service owners to approve.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}
con: Recommendations use peak and percentile usage ; Owners approve every change ; Savings shown with risk ; Changes applied through infrastructure code ; 200K resources
sn: Evidence | Percentile peaks over a full business cycle | Average usage | Averages miss peaks
sn: Risk | Latency headroom and failure domains | Savings only | Savings can cause incidents
sn: Action | A pull request to infrastructure code | A console change | Manual changes drift from code
sig: Utilisation percentiles | p95 and p99 of CPU and memory | Core | From monitoring
sig: Burst and seasonal pattern | peaks by period | Risk | From time-series
sig: Instance catalogue and price | options and prices | Savings | From the provider
sig: Dependency criticality | service tier | Risk | From the catalogue
noise: Instance id | an identifier
noise: Owner name | personal data
noise: Region alone | weak link
base: Vendor rightsizing reports reviewed occasionally, because they are the default.
prod: A recommendation engine with percentile and seasonality analysis, risk tiers and automatic pull requests to infrastructure code that owners approve.
pipe: Utilisation collection @ monitoring ; Percentile and season analysis @ analytics ; Option pricing @ provider catalogue ; Risk tier @ rules ; Pull request @ code host ; Owner approval @ review ; Savings tracking @ billing
edge: Short history | a new resource lacks history | Defer until enough data exists
edge: Memory-bound workloads | CPU is low while memory is high | Multi-resource analysis
edge: Month-end peak | demand peaks once a month | Full-cycle windows
off: Recommendation safety on replay ; Savings accuracy ; Owner acceptance
on: Realised savings ; Incidents after rightsizing ; Resources oversized
gap: Average utilisation ; Console changes ; Savings without risk

== autoscaling-policy-optimisation | Autoscaling Policy Optimisation | reinforcement-learning,time-series | seconds | advanced | a=1 k=5
obj: Tune autoscaling thresholds and schedules to meet latency targets at lower cost, evaluated in simulation on replayed traffic and rolled out with guardrails.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Latency objectives never traded for cost ; Minimum capacity floors enforced ; Policy tested in simulation before rollout ; Decision within 30 s ; 5K services
sn: Objective | Latency target within a cost budget | Utilisation alone | High utilisation hurts latency
sn: Safety | Floors, ceilings and rollback | Unbounded scaling | Runaway scaling costs money
sn: Evaluation | Replay of historical traffic | Live experiments only | Live tests risk customers
sig: Request rate and trend | load and slope | State | From load balancers
sig: Latency percentile | p95 and p99 | Constraint | From metrics
sig: Startup time of instances | warm-up duration | Lag | From the platform
sig: Cost per instance hour | price | Cost | From billing
noise: Instance id | an identifier
noise: Team name | weak link
noise: Cluster name | an identifier
base: Threshold rules on CPU utilisation, because they are the default autoscaler.
prod: A policy tuner that proposes thresholds and schedules from replayed traffic, with floors and ceilings, staged rollout and automatic rollback on latency regression.
pipe: Traffic replay @ historical metrics ; Simulator @ load model ; Policy search @ optimiser ; Guardrail check @ rules ; Staged rollout @ platform ; Latency watch @ observability ; Review @ monthly
edge: Flash traffic | load jumps faster than scaling | Burst buffers and pre-scaling
edge: Slow start | instances take minutes to warm | Lead time in the model
edge: Dependency limit | a database caps scaling | Dependency-aware limits
off: Latency attainment in replay ; Cost in replay ; Scaling oscillation
on: Latency target attainment ; Compute cost ; Scaling incidents
gap: CPU as the only signal ; Live-only tuning ; No capacity floors

== storage-tiering-optimisation | Storage Tiering Optimisation | tabular,time-series | batch | foundational | a=1 k=3
obj: Predict data access patterns and move cold data to cheaper tiers with policy rules, keeping retrieval times and retention obligations intact.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Calibration}
con: Retention and legal hold rules always win ; Retrieval time targets met ; Owners approve tiering policies ; Moves logged ; 50 PB under management
sn: Label | Objects accessed within a set window | Object age | Old data can be hot
sn: Safety | Legal hold and retention checks | Cost only | Moves can break obligations
sn: Cost | Retrieval fees counted | Storage price only | Wrong moves cost more
sig: Access recency and frequency | last access and counts | Core | From storage logs
sig: Object type and size | file class | Context | From metadata
sig: Retention class | policy and hold state | Constraint | From the data catalogue
sig: Owner and project state | active or closed | Context | From the catalogue
noise: Object name | weak link
noise: Bucket name | an identifier
noise: Owner name | personal data
base: Age-based lifecycle rules, because they are the standard feature.
prod: An access prediction model feeding lifecycle policies with retention checks, fee-aware moves and owner approval for new rules.
pipe: Access log ingestion @ storage logs ; Feature build @ batch ; Access model @ gradient boosting ; Retention check @ catalogue rules ; Lifecycle rule proposal @ policy ; Owner approval @ workflow ; Savings and retrieval tracking @ monthly
edge: Seasonal data | data is used once a year | Seasonal features
edge: Compliance hold | data is under legal hold | Hold flag blocks moves
edge: Restore surge | many objects are needed at once | Retrieval budget alerts
off: Prediction of future access ; Retention rule compliance ; Cost saved in replay
on: Storage cost ; Retrieval delays ; Rule violations
gap: Age-only rules ; Ignoring retrieval fees ; No hold checks

== idle-resource-detection | Idle Resource Detection | tabular | batch | foundational | a=0.5 k=3
obj: Find unused servers, volumes, snapshots and test environments from activity and ownership data and propose scheduled shutdown or deletion with owner confirmation.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Calibration}
con: Owners confirm before deletion ; Resources stopped before deleted ; Backups taken before deletion ; Proposals include last activity ; 1M resources
sn: Evidence | Activity across network, CPU and logins | CPU alone | Some systems are idle until needed
sn: Action | Stop, wait, then delete | Immediate deletion | Wrong deletion loses data
sn: Owner | A confirmed owner | Untagged resources | Without an owner nobody can approve
sig: Activity over 30 days | network, CPU and logins | Core | From monitoring
sig: Tags and ownership | owner and purpose | Routing | From inventory
sig: Dependencies | whether others reference the resource | Risk | From the CMDB
sig: Cost | monthly cost | Priority | From billing
noise: Resource id | an identifier
noise: Owner name | personal data
noise: Region alone | weak link
base: Periodic clean-up days led by engineers, because they are the common practice.
prod: A detector that ranks idle candidates with dependency checks, notifies owners with a deadline and schedules stop, snapshot and delete steps through infrastructure code.
pipe: Inventory and activity join @ cloud APIs ; Idle scoring @ model ; Dependency check @ CMDB ; Owner notice @ chat ; Stop and snapshot @ infrastructure code ; Delete after wait @ approved change ; Savings tracking @ billing
edge: Disaster recovery systems | standby systems look idle but are needed for recovery | Tag and allow-list
edge: Batch jobs | resources run rarely | Schedule-aware rules
edge: Owner absent | no response arrives | Escalate to the manager chain
off: Precision of idle proposals ; Restore rate after stop ; Savings realised
on: Idle spend ; Wrongly stopped systems ; Time to clean
gap: CPU-only evidence ; Deleting without backups ; Untagged resources with no owner

== commitment-purchase-planning | Commitment Purchase Planning | time-series,tabular | batch | advanced | a=1 k=3
obj: Plan reserved capacity and savings plan purchases from stable baseline usage forecasts, comparing terms and risk so finance approves commitments that will be used.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Commitments cover only the stable baseline ; Finance approves every purchase ; Scenarios for demand drop ; Coverage targets by service ; 12 and 36 month terms compared
sn: Baseline | The minimum steady usage | Average usage | Commitments on average cause waste
sn: Risk | Demand drop scenarios | Best case only | Commitments are hard to undo
sn: Decision | Finance and service owners | The model | Large commitments need accountable owners
sig: Stable usage floor | lowest sustained usage | Core | From billing
sig: Growth and migration plans | planned changes | Risk | From planning
sig: Price and term options | rates by term | Savings | From the provider
sig: Existing commitments | current coverage and expiry | Constraint | From billing
noise: Account name | an identifier
noise: Vendor sales contact | irrelevant
noise: Invoice number | an identifier
base: Annual reviews of coverage by finance and cloud teams, because they are the usual process.
prod: A planning model that sets baseline, tests scenarios, compares terms and presents a purchase plan with expected savings and downside to finance.
pipe: Usage history @ billing ; Baseline estimate @ time-series model ; Scenario simulation @ planner ; Option comparison @ calculator ; Plan review @ finance and owners ; Purchase @ cloud console ; Utilisation tracking @ monthly
edge: Platform migration | workloads move away | Migration-aware scenarios
edge: Price change | the provider changes rates | Re-plan triggers
edge: Overcommitment | usage falls below the commitment | Exchange and resale options
off: Baseline accuracy ; Savings in backtests ; Scenario coverage
on: Commitment utilisation ; Effective savings rate ; Unused commitments
gap: Average usage as baseline ; Best case only ; Purchase without finance approval

== change-risk-assessment | Change Risk Assessment | tabular,nlp | seconds | advanced | a=0.5 k=5
obj: Estimate the risk of a proposed change from its content, target and history so the approval route and test requirements match the risk, without blocking low-risk changes.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Risk shown with its drivers ; Policy sets the approval route not the model alone ; Calibrated probabilities ; Score within 3 s ; 200K changes per year
sn: Label | Changes that caused incidents or rollbacks | Changes marked failed in the form | Forms are filled in inconsistently
sn: Use | Route and test depth | A blame score | Teams own the outcome
sn: Fairness | Features of the change and service | Features of the requester | Requester scores are unfair
sig: Target criticality | tier of the affected services | Impact | From the CMDB
sig: Change type and size | standard, normal or emergency and scope | Risk | From the record
sig: Past failure rate for the service | failures in recent changes | Risk | From history
sig: Concurrent changes | overlapping changes | Conflict | From the calendar
noise: Requester name | personal data
noise: Team name | weak link
noise: Change number | an identifier
base: Fixed risk questionnaires on the change form, because they are the standard method.
prod: A calibrated risk model with explanations that sets the approval path and test requirements within policy, with a human override and monthly calibration reviews.
pipe: Change submission @ ITSM ; Feature build @ change and CMDB data ; Risk model @ gradient boosting ; Calibration @ isotonic fit ; Policy routing @ rules ; Approval @ CAB ; Outcome tracking @ monthly
edge: New service | no change history exists | Tier-based priors
edge: Emergency change | urgent changes are risky | Expedited path with after-the-fact review
edge: Incomplete record | the form lacks detail | Request detail before scoring
off: Calibration ; Recall of failed changes at the review rate ; Stability
on: Change failure rate ; Time to approve low-risk changes ; Incidents caused by changes
gap: Requester scoring ; Model-only approval ; Self-reported form labels

== configuration-drift-detection | Configuration Drift Detection | tabular,graph | batch | foundational | a=0.5 k=3
obj: Compare running configuration with the approved baseline from infrastructure code, detect drift and classify it as harmless, risky or unauthorised for owners to fix or accept.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{GraphReg}
con: Drift reports within 1 hour of detection ; Security-relevant drift alerted to security ; Owners decide to revert or accept ; Remediation through code, not consoles ; 500K configuration items
sn: Baseline | Declared state in version control | Last seen state | The last seen state may already be wrong
sn: Class | Risk by setting and target | All drift equal | Some drift is harmless
sn: Action | Revert through code review | Direct console edits | Console edits create more drift
sig: Setting difference | declared versus actual value | Core | From scans
sig: Setting sensitivity | security or availability relevance | Risk | From policy
sig: Change record link | whether a change explains the drift | Authorisation | From ITSM
sig: Time since drift | how long it persisted | Priority | From scans
noise: Resource name | an identifier
noise: Scanner name | weak link
noise: Owner name | personal data
base: Periodic audits with scripts per platform, because they are the common practice.
prod: A scanner that diffs actual state against code, links drift to change records, scores risk and opens revert pull requests or exception requests for owners.
pipe: State collection @ cloud and device APIs ; Baseline diff @ infrastructure code ; Change record match @ ITSM ; Risk classification @ rules and model ; Revert pull request @ code host ; Owner review @ workflow ; Drift trend @ weekly
edge: Auto-managed settings | the platform changes values itself | Ignore lists by setting
edge: Emergency fix | engineers fix production by hand | Fast path to record and reconcile
edge: Missing baseline | no code exists for the resource | Import into code
off: Drift detection recall ; Risk classification accuracy ; False drift rate
on: Unmanaged drift ; Time to reconcile ; Incidents from drift
gap: Last seen state as baseline ; Equal treatment of all drift ; Console remediation

== cmdb-reconciliation | CMDB Reconciliation and Dependency Mapping | graph,nlp | batch | advanced | a=0.5 k=5
obj: Keep the configuration database accurate by matching discovered assets, cloud resources and traffic flows to records, proposing merges, owners and dependencies for data stewards to approve.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{GraphReg}
con: Stewards approve merges and deletions ; Match confidence shown ; Dependencies derived from observed traffic ; Daily reconciliation of 5M items ; Orphans reported weekly
sn: Truth | Discovery and traffic data compared with the record | Manual updates | Manual records go stale
sn: Control | Steward approval | Automatic overwrite | Wrong merges damage incident response
sn: Value | Accurate owners and dependencies | A complete asset list | Operations need relationships
sig: Identifier match | serial, hostname and address match | Core | From discovery
sig: Observed network flows | who talks to whom | Dependency | From flow logs
sig: Cloud tags and ownership | owner and service tags | Ownership | From cloud APIs
sig: Record age and last seen | freshness | Staleness | From the CMDB
noise: Asset description | weak link
noise: Vendor name alone | weak link
noise: Created by | personal data
base: Periodic discovery scans and manual clean-up projects, because they are the usual approach.
prod: A reconciliation service that matches discovery, cloud and flow data to CMDB records with confidence, proposes merges and dependencies and tracks data quality by owner team.
pipe: Discovery and cloud ingest @ scanners and APIs ; Entity matching @ model and rules ; Dependency inference @ flow analysis ; Steward review queue @ ITSM ; Merge and update @ CMDB ; Data quality dashboard @ BI ; Quality review @ monthly
edge: Duplicate hostnames | two systems share a name | Use multiple identifiers
edge: Ephemeral workloads | containers appear and vanish | Service-level records
edge: Shadow systems | unknown systems appear | Orphan queue with owner search
off: Match accuracy on audited records ; Dependency recall ; Steward acceptance
on: CMDB accuracy ; Incidents with wrong owner ; Time to find dependencies
gap: Automatic overwrite ; Manual-only updates ; Asset counts as quality

== patch-prioritisation-rollout | Patch Prioritisation and Rollout Planning | tabular,graph | batch | advanced | a=0.5 k=5
obj: Prioritise patches by exploit risk, exposure and business criticality and plan staged rollouts with test rings, for change approvers to confirm.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{RankLoss}
con: Actively exploited vulnerabilities patched within 7 days ; Staged rings with health gates ; Approvers confirm each wave ; Rollback plan for every wave ; 100K systems
sn: Priority | Exploitation and exposure | CVSS score alone | Many high scores are not exploited
sn: Rollout | Rings with health checks | All at once | A bad patch can take down many systems
sn: Control | Approved change windows | Automatic installation | Production changes need owners
sig: Exploit status | known exploitation | Urgency | From threat feeds
sig: Exposure | internet-facing or internal | Impact | From the CMDB
sig: System criticality | service tier | Impact | From the catalogue
sig: Ring health | results from earlier rings | Gate | From monitoring
noise: Patch vendor name | weak link
noise: Hostname | an identifier
noise: Owner name | personal data
base: Monthly patch cycles by severity band, because they are the standard cadence.
prod: A prioritisation model with exposure and exploit data, ring-based rollout plans, health gates and change records for each wave.
pipe: Patch and vulnerability intake @ scanners ; Exposure join @ CMDB ; Priority model @ gradient boosting ; Ring plan @ planner ; Change approval @ ITSM ; Rollout with health gates @ patch tool ; Compliance reporting @ BI
edge: Unpatchable system | a legacy system cannot take the patch | Compensating controls
edge: Failed ring | a patch breaks a ring | Automatic halt and rollback
edge: Zero-day | no patch exists yet | Mitigation steps and monitoring
off: Priority accuracy against exploitation ; Ring failure rate ; Time to patch critical items
on: Time to patch exploited flaws ; Failed patch rollouts ; Exposed unpatched systems
gap: CVSS-only priority ; All-at-once rollouts ; Automatic installs without approval

== iac-plan-review-agent | Infrastructure Code Plan Review | llm-agents,tabular | seconds | advanced | a=0.5 k=40
obj: Review infrastructure code and planned changes for cost, security and resilience problems and comment on the pull request with evidence, leaving apply decisions to humans.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Comments cite the plan lines and policy ; The agent never applies changes ; Policy checks run as code ; Review within 3 minutes ; 50K plans per year
sn: Evidence | The plan diff and policy results | A summary of the code | Summaries miss destructive changes
sn: Role | Comments and blocking policy checks | Applying changes | Apply needs approval and an owner
sn: Policy | Rules in code | Prompt instructions | Prompts can be bypassed
sig: Destructive actions in the plan | deletes and replacements | Risk | From plan parsing
sig: Policy violations | security and tagging breaches | Gate | From policy as code
sig: Cost delta | change in monthly cost | Impact | From the cost estimator
sig: Blast radius | resources and services affected | Impact | From the CMDB
noise: Author name | personal data
noise: Branch name | an artefact
noise: Resource naming style | weak link
base: Human review of plans with linting, because it is the common control.
prod: A review agent that parses the plan, runs policy checks, estimates cost and blast radius and comments with evidence while the approval and apply stay with humans.
pipe: Plan generation @ CI ; Plan parsing @ parser ; Policy and cost checks @ policy as code ; Blast radius lookup @ CMDB ; Review comment @ LLM with citations ; Human approval @ review ; Apply @ pipeline with approval
edge: Hidden dependency | the plan misses an implicit dependency | Dependency lookups from the CMDB
edge: Large plan | thousands of resources change | Grouped summaries with a risk-first view
edge: Provider change | a new provider version alters behaviour | Provider version checks
off: Detection of seeded destructive changes ; Policy check coverage ; Reviewer acceptance
on: Incidents from infrastructure changes ; Review time ; Policy violations merged
gap: Summaries as review ; Prompt-only policy ; Agent-applied changes

== maintenance-window-scheduling | Maintenance Window Scheduling | tabular,time-series | batch | foundational | a=1 k=3
obj: Choose maintenance windows that minimise user impact by combining traffic forecasts, change calendars and dependencies, and propose them to service owners for approval.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}
con: Windows avoid freeze periods and peak traffic ; Owners approve each window ; Dependencies scheduled in order ; Proposal within 1 hour of a request ; 20K maintenance events per year
sn: Objective | Low user impact and no conflicts | Earliest slot | The earliest slot may be at peak
sn: Constraint | Dependency order and freezes | Independent scheduling | Dependent changes can collide
sn: Control | Owner approval | Automatic booking | Owners know local constraints
sig: Traffic forecast by hour | expected load | Impact | From capacity forecasts
sig: Change calendar | other planned changes | Conflicts | From ITSM
sig: Dependency graph | upstream and downstream services | Order | From the CMDB
sig: Business blackout dates | freezes and events | Constraint | From planning
noise: Requester name | personal data
noise: Change number | an identifier
noise: Team name | weak link
base: Owners choosing weekend nights by habit, because it is the usual practice.
prod: A scheduler that scores candidate windows by forecast impact and conflicts, orders dependent work and proposes slots with notices for approval.
pipe: Request intake @ ITSM ; Traffic forecast lookup @ forecasts ; Conflict and dependency check @ rules ; Window scoring @ optimiser ; Proposal to owner @ workflow ; Notification @ chat ; Outcome review @ quarterly
edge: Global user base | no quiet hour exists | Rolling windows by region
edge: Overrun | maintenance exceeds its window | Overrun alerts and rollback triggers
edge: Conflicting freeze | an urgent change hits a freeze | Exception workflow
off: Impact in backtests ; Conflict detection ; Owner acceptance
on: User impact during maintenance ; Change conflicts ; Overrun rate
gap: Habit-based windows ; Earliest slot booking ; Ignoring dependency order
