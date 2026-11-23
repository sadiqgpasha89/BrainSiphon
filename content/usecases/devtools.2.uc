# Software Engineering & DevTools, part 2 (use cases 22-50): CI/CD and release, application security and supply chain, issues and team productivity, platform and internal tools, coding agent governance
# Vendor-neutral. Agents work in sandboxes with short-lived scoped tokens, a human approves every merge and deployment, secrets never reach a model and developers are never ranked or scored individually.
== build-failure-root-cause-agent | Build Failure Root Cause Agent | llm-agents,nlp | seconds | advanced | a=0.3 k=60
obj: Read failed build and deployment logs, find the first real error and the likely cause, and suggest the fix with links to the log lines and recent changes.
con: Every diagnosis cites log lines and commits ; The agent is read-only on pipelines ; Suggestions go to the author as comments ; Diagnosis within 60 s ; 200K failed builds per month
sn: Evidence | The first failing step and log lines | A summary of the whole log | Cascading errors hide the cause
sn: Label | Causes confirmed by engineers or later fixes | Error text | The same error can have many causes
sn: Role | A suggestion to the author | An automatic retry or rollback | Actions need owners
sig: First error signature | normalised first failure | Core | From logs
sig: Recent dependency and config changes | changes since the last green build | Cause | From version control
sig: Infrastructure health | runner and registry status | Context | From monitoring
sig: Past similar failures | earlier fixes for similar errors | Hint | From history
noise: Developer name | personal data
noise: Build number | an identifier
noise: Log timestamp format | an artefact
base: Engineers reading logs and searching chat history, because it is the current practice.
prod: A diagnosis agent with log parsing, first-error detection and retrieval of similar past fixes that comments on the pull request with evidence and a confidence level.
pipe: Failure event @ CI ; Log parsing and first error @ parser ; Change and history retrieval @ read-only tools ; Diagnosis @ LLM with citations ; Comment on pull request @ code host ; Author feedback @ UI ; Accuracy tracking @ weekly
edge: Multiple errors | several unrelated failures exist | Group and rank by first occurrence
edge: Missing logs | the log was truncated | State the gap and request artifacts
edge: Infrastructure outage | many builds fail together | Incident correlation
off: Cause accuracy on audited failures ; Evidence faithfulness ; Time saved
on: Time to fix a broken build ; Re-run rate ; Builds blocked on one cause
gap: Whole-log summaries ; Automatic retries ; Uncited diagnoses

== ci-queue-resource-optimisation | CI Queue and Resource Optimisation | reinforcement-learning,time-series | seconds | advanced | a=1 k=5
obj: Allocate runners and order jobs so developer wait time falls and compute cost stays within budget, protecting release builds from starvation.
con: Release and hotfix jobs always have priority ; Budget caps on compute ; Scheduling decision within 1 s ; Fairness across teams ; 500K jobs per day
sn: Objective | Wait time for developers and cost within budget | Runner utilisation | High utilisation creates long queues
sn: Fairness | Equal access across teams | First-come first-served | Large jobs can starve small ones
sn: Safety | Priority lanes for releases | One queue | Incidents need fast builds
sig: Queue depth and wait time | pending jobs and waiting time | State | From the scheduler
sig: Job duration forecast | predicted runtime | Packing | From history
sig: Runner pool capacity | available runners by type | Constraint | From infrastructure
sig: Priority class | release, hotfix or regular | Order | From policy
noise: Developer name | personal data
noise: Job name wording | weak link
noise: Branch name | an artefact
base: A first-in first-out queue with static runner pools, because it is the default.
prod: A scheduler with duration predictions, priority lanes and autoscaling that is tested in simulation on replayed queues before use.
pipe: Job intake @ CI scheduler ; Duration prediction @ gradient boosting ; Priority and fairness rules @ policy ; Packing and scaling @ optimiser ; Runner allocation @ runner manager ; Metrics @ observability ; Simulation test @ replay
edge: Surge after a release | many jobs arrive | Burst capacity and priority lanes
edge: Runner outage | capacity is lost | Fast rescheduling
edge: Wrong duration estimate | jobs run longer than their predicted duration | Re-estimation and preemption rules
off: Wait time in replay ; Cost in replay ; Starvation incidents
on: Median wait time ; Compute cost ; Release build delays
gap: Utilisation as the goal ; One queue for everything ; No simulation before use

== deployment-risk-prediction | Deployment Risk Prediction | tabular | seconds | advanced | a=0.5 k=5
obj: Estimate the risk of a deployment from the change, the service and the timing so teams add canaries, approvals or delay when risk is high, without blocking safe changes.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Risk shown with the drivers ; Policy decides gates not the model alone ; Calibrated probabilities ; Score within 2 s ; 100K deployments per month
sn: Label | Deployments followed by a rollback, incident or hotfix | Reverts only | Many failures are fixed forward
sn: Use | Gate choice and rollout speed | A blame score | Teams own the outcome
sn: Fairness | Features about the change and service | Features about the author | Author scores are unfair
sig: Change size and files | size and spread of the change | Risk | From the diff
sig: Service criticality and traffic | tier and request rate | Impact | From the catalogue
sig: Recent incident history | incidents in the service | Fragility | From the incident tracker
sig: Time and freeze state | time of day and freeze windows | Context | From the calendar
noise: Author name | personal data
noise: Team name | weak link
noise: Branch name | an artefact
base: Fixed change windows and approval rules by service tier, because they are the standard controls.
prod: A calibrated risk model with explanations that maps risk to rollout strategy, such as slower canary steps or an extra approver, within policy.
pipe: Deployment request @ CD system ; Feature build @ change and service data ; Risk model @ gradient boosting ; Calibration @ isotonic fit ; Policy mapping @ rules ; Rollout strategy @ CD system ; Outcome tracking @ monthly
edge: New service | the service has no incident history | Tier-based priors
edge: Emergency fix | urgent deployments are risky | Expedited path with review
edge: Label delay | failures appear late | Delay-aware training
off: Calibration ; Recall of failed deployments at the gate rate ; Stability
on: Change failure rate ; Time to deploy safe changes ; Incidents from deployments
gap: Author scoring ; Model-only gates ; Reverts as the only label

== automated-canary-analysis | Automated Canary Analysis | time-series | seconds | advanced | a=10 k=3
obj: Compare the canary version with the baseline on error rates, latency and business metrics and recommend promotion, hold or rollback with confidence, for the release owner to confirm.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Decision recommended within 10 minutes of rollout step ; Rollback is always a one-click human action ; Statistical tests with multiple-testing control ; Metrics selected per service ; 5K services
sn: Test | Matched comparison of canary and baseline | Before and after comparison | Traffic changes confuse before and after
sn: Metrics | Service and business signals | Errors only | Some failures show as lower conversions
sn: Control | A human confirms promotion | Automatic promotion only | Edge cases need judgement
sig: Error rate difference | canary versus baseline errors | Core | From metrics
sig: Latency percentile difference | p95 and p99 changes | Core | From metrics
sig: Business metric change | conversions or throughput | Impact | From analytics
sig: Traffic and sample size | requests in each group | Confidence | From load balancers
noise: Release author | personal data
noise: Version label | an identifier
noise: Dashboard colour | irrelevant
base: Engineers watching dashboards during rollouts, because it is the typical practice.
prod: A statistical canary analyser with matched traffic, multiple-metric tests and a recommendation with plots, wired to the rollout tool with human confirmation.
pipe: Metric collection @ observability ; Traffic matching @ load balancer ; Statistical comparison @ canary analyser ; Recommendation @ rules ; Release owner confirmation @ CD system ; Action @ rollout tool ; Outcome review @ weekly
edge: Low traffic | not enough requests | Longer observation and a wider decision window
edge: Seasonal load | a spike affects only one group | Traffic matching
edge: Slow failures | problems appear after hours | Extended watch for critical services
off: Detection rate of seeded faults ; False rollback rate ; Time to decision
on: Bad releases caught in canary ; Rollbacks after full rollout ; Time in rollout
gap: Before-and-after comparisons ; Error-only metrics ; Automatic promotion without limits

== release-notes-generation | Release Notes Generation | llm-agents,nlp | batch | foundational | a=0.1 k=10
obj: Draft release notes from merged pull requests, issues and labels, grouped for customers and for operators, with links to the sources, for the product owner to approve.
con: Every line links to a pull request or issue ; Breaking changes and migrations always listed ; Product owner approves ; No internal names or secrets ; Notes for 500 releases per year
sn: Accuracy | Notes tied to merged changes | A summary of commit text | Commit text can be wrong or internal
sn: Audience | Separate customer and operator notes | One list | Different readers need different detail
sn: Safety | Filter for internal and security details | Everything shown | Notes can leak details
sig: Merged change list | pull requests in the release | Content | From the code host
sig: Labels and change types | feature, fix or breaking | Grouping | From labels
sig: Linked issues | the problem each change solves | Wording | From the tracker
sig: Security flags | changes under embargo | Filter | From the security tracker
noise: Author name | personal data
noise: Branch name | an artefact
noise: Commit hash | an identifier
base: Product owners writing notes by hand from a list of merges, because it is the usual approach.
prod: A drafting pipeline that groups changes by type and audience, writes plain notes with links, runs filters for internal text and routes the draft to the product owner.
pipe: Release scope query @ code host ; Grouping and labelling @ rules ; Note drafting @ LLM ; Filter for internal and embargoed text @ rules ; Owner review @ editor ; Publication @ docs site ; Feedback @ monthly
edge: Missing labels | changes lack a type | Infer with a flag for review
edge: Embargoed fix | a security fix must not be described | Embargo filter and manual note
edge: Large release | thousands of changes | Highlights with a full link list
off: Link correctness ; Breaking change recall ; Editor change rate
on: Time to publish notes ; Support tickets about changes ; Missed breaking changes
gap: Notes from commit text only ; One list for all readers ; No embargo filter

== build-time-prediction-cache-optimisation | Build Time Prediction and Cache Optimisation | time-series,tabular | batch | foundational | a=1 k=3
obj: Predict build times and find the targets that dominate them, then recommend cache and parallelisation changes that cut waiting time safely.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Prediction within 15% for 80% of builds ; Cache changes never alter build outputs ; Owners approve configuration changes ; Daily analysis of 2M builds
sn: Correctness | Reproducible builds with verified cache keys | Faster at any cost | Wrong cache hits ship wrong software
sn: Target | The critical path of the build | Total CPU time | Wall time follows the critical path
sn: Action | Specific target changes | A speed chart | Teams need steps
sig: Target duration history | time per build target | Critical path | From build tools
sig: Dependency graph | the build graph | Path | From build files
sig: Cache hit rate by target | share of cache hits | Opportunity | From the cache
sig: Change footprint | files changed | Rebuild scope | From version control
noise: Developer name | personal data
noise: Build number | an identifier
noise: Branch name | an artefact
base: Developers noticing slow builds and fixing them ad hoc, because it is the common practice.
prod: A build analyser that predicts durations, ranks critical-path targets and suggests cache and splitting changes, tested against output hashes.
pipe: Build event ingestion @ build system ; Critical path analysis @ graph analysis ; Duration model @ gradient boosting ; Recommendation @ rules and model ; Output hash validation @ test builds ; Pull request with change @ code host ; Savings tracking @ monthly
edge: Non-hermetic builds | cache keys miss inputs | Hermeticity checks
edge: Rare targets | little data exists | Wider estimates
edge: Infrastructure noise | builds are slow on busy machines | Machine tags
off: Prediction error ; Critical path accuracy ; Output equality after changes
on: Median build time ; Cache hit rate ; Compute cost
gap: Speed at any cost ; CPU time as the target ; Unverified cache keys

== vulnerability-triage-prioritisation | Vulnerability Triage and Prioritisation | tabular,graph | batch | advanced | a=0.5 k=6
obj: Rank scanner findings by reachability, exploitability, exposure and business impact so teams fix the vulnerabilities that can actually be attacked first.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{RankLoss}
con: Ranking with the evidence for each finding ; Critical exposed findings alerted within 1 hour ; Security team sets the policy ; Weekly run for 3M findings
sn: Priority | Reachability, exploitability and exposure | CVSS score alone | Many high scores are not reachable
sn: Evidence | Call path or exposure proof | A score | Teams need proof to act
sn: Policy | Service-level fix deadlines | Model-set deadlines | Policies belong to security leadership
sig: Reachability of vulnerable code | whether the code path is used | Core | From call graphs
sig: Exploit availability | known exploits and active exploitation | Urgency | From threat feeds
sig: Internet exposure and data sensitivity | where the service runs and what it holds | Impact | From the catalogue
sig: Fix availability | patched version or mitigation | Action | From advisories
noise: Scanner name | irrelevant
noise: Finding id | an identifier
noise: Repository age | weak link
base: CVSS severity thresholds with deadlines by band, because they are the common policy.
prod: A prioritisation model on reachability, exploit and exposure signals with call path evidence, ownership routing and tracked fix deadlines.
pipe: Scanner finding intake @ security scanners ; Reachability analysis @ call graph ; Exploit and exposure enrichment @ threat feeds and catalogue ; Priority model @ gradient boosting ; Ownership routing @ service catalogue ; Ticket @ issue tracker ; Fix tracking @ dashboard
edge: Unknown reachability | analysis cannot decide | Conservative priority and manual review
edge: Zero-day | no score exists yet | Manual escalation and exposure checks
edge: Scanner duplicates | several tools report the same flaw | Deduplication
off: Rank accuracy against confirmed exploitable cases ; Reachability precision ; Time to critical alert
on: Time to fix exploitable findings ; Findings fixed that were unreachable ; Security incidents from known flaws
gap: CVSS-only ranking ; Findings with no evidence ; Model-set deadlines

== secret-detection-in-code | Secret Detection in Code and Logs | nlp,tabular | seconds | foundational | a=1 k=5
obj: Detect API keys, tokens and credentials in commits, logs and chat before they spread, block pushes and start rotation with the owner.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Block high-confidence secrets at push within 2 s ; Rotation ticket created automatically ; False blocks under 1 per 1,000 pushes ; Secret values never stored in findings ; 10M commits per year
sn: Label | Confirmed live secrets | Pattern matches | Many matches are test values
sn: Action | Block, rotate and notify | Report only | A leaked secret needs rotation not a report
sn: Privacy | Hashes of secrets in findings | Raw values in tickets | Findings can leak the secret again
sig: Pattern and entropy match | format and randomness of the string | Core | From scanners
sig: Provider validation | whether the provider says the key is live | Confirmation | From provider checks
sig: File context | test file, config or code | Likelihood | From the path
sig: Commit history | where the secret first appeared | Scope | From version control
noise: Developer name | personal data
noise: Commit message | weak link
noise: Branch name | an artefact
base: Regex-based scanners in the pipeline, because they are the standard control.
prod: A scanner with pattern, entropy and learned context, provider-side validation, push protection and an automated rotation workflow.
pipe: Push and commit capture @ code host ; Candidate detection @ patterns and entropy ; Context classifier @ model ; Live validation @ provider check ; Block or allow @ push protection ; Rotation ticket @ issue tracker ; History scan @ repositories
edge: Test credentials | strings look like secrets | Allow-lists with expiry
edge: Secrets in binaries | files are not text | Binary scanning
edge: Old leak | the secret is in history | History scan and rotation
off: Recall on seeded secrets ; Precision of blocks ; Time to rotation
on: Live secrets leaked ; Time to rotate ; Developer friction from false blocks
gap: Raw secrets in findings ; Reports without rotation ; Pattern-only detection

== dependency-upgrade-agent | Dependency Upgrade Agent | llm-agents | batch | advanced | a=1 k=40
obj: Propose dependency upgrades that fix vulnerabilities and age, run tests in a sandbox and open pull requests with the changelog risks, for owners to merge.
con: Each upgrade is a pull request with passing tests ; Owners approve every merge ; Major upgrades need a risk summary ; The agent never pushes to protected branches ; 100K dependency updates per year
sn: Safety | Tests and staged rollout | Version bump alone | Updates can break behaviour
sn: Scope | Grouped small updates | One huge update | Large updates are hard to review
sn: Evidence | Changelog and API diff | A version number | Owners need the risk
sig: Vulnerability fixed | advisories resolved by the update | Priority | From advisories
sig: Semantic version change | patch, minor or major | Risk | From metadata
sig: Test pass result | test outcomes after the change | Gate | From CI
sig: Usage of changed APIs | calls to changed functions | Impact | From code analysis
noise: Developer name | personal data
noise: Package popularity alone | weak link
noise: Branch name | an artefact
base: Automated update bots that open version bump pull requests, because they are common.
prod: An agent that groups updates, reads changelogs and API diffs, adapts code where needed, runs tests in a sandbox and presents a risk summary to owners.
pipe: Update discovery @ package registries ; Changelog and API diff analysis @ LLM and tools ; Code adaptation @ coding agent ; Sandbox tests @ CI ; Pull request with risks @ code host ; Owner review @ review platform ; Rollout monitoring @ observability
edge: Breaking API | the update changes behaviour | Adaptation and extra tests
edge: Yanked version | a release is withdrawn | Registry checks
edge: Transitive conflict | two updates require incompatible versions of one library | Resolver checks and grouping
off: Merge-ready rate ; Regression rate after merge ; Vulnerabilities closed
on: Time to fix vulnerable dependencies ; Dependency age ; Incidents from updates
gap: Version bump bots with no tests ; One huge update ; No changelog check

== sast-false-positive-reduction | Static Analysis False Positive Reduction | tabular,nlp | seconds | foundational | a=0.5 k=5
obj: Reduce noise from static analysis by ranking findings by the likelihood that engineers will confirm them, using code context and past triage decisions, while keeping all findings available.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}
con: Hidden findings stay one click away ; Recall of true vulnerabilities above 98% at the shown threshold ; Security team reviews threshold changes ; Weekly retraining ; 5M findings per quarter
sn: Label | Triage outcomes by security engineers | Developer dismissals | Dismissals can be rushed
sn: Safety | Recall of true issues at a fixed review load | Fewer alerts | Fewer alerts can hide real flaws
sn: Control | Thresholds owned by security | A model that hides alerts silently | Hidden alerts must be visible
sig: Rule and language | the analysis rule and language | Base rate | From the scanner
sig: Data flow evidence | whether tainted data reaches the sink | Core | From analysis
sig: Code context embedding | semantic context | Support | From a code model
sig: Past triage decisions | outcomes for similar findings | Prior | From the tracker
noise: Developer name | personal data
noise: Finding id | an identifier
noise: File name | an artefact
base: Scanner severity and manual triage by security engineers, because it is the standard process.
prod: A ranking model trained on security triage outcomes with a recall-focused threshold, a hidden-findings view and drift monitoring by rule.
pipe: Finding intake @ static analysis ; Feature build @ code context ; Ranker @ gradient boosting ; Threshold policy @ rules ; Developer view @ pull request ; Triage feedback @ security tracker ; Recall audit @ monthly
edge: New rule | no triage history exists | Show all findings for new rules
edge: Label drift | triage standards change | Versioned labels
edge: Framework change | a new framework changes patterns | Retraining triggers
off: Recall of true vulnerabilities ; Reduction in alerts shown ; Calibration
on: Alerts per pull request ; True vulnerabilities missed ; Developer dismissal rate
gap: Hiding alerts silently ; Developer dismissals as truth ; Alert reduction as the goal

== malicious-package-detection | Malicious Package Detection | nlp,graph | batch | advanced | a=0.5 k=5
obj: Detect suspicious new package versions in registries and in build dependencies, such as typosquats and install-time scripts that fetch payloads, and block them before they enter builds.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Block high-confidence malicious packages at the proxy ; Analyst reviews borderline cases ; Allow-list for trusted publishers ; New version scan within 5 minutes ; 5M package versions per day
sn: Label | Packages confirmed malicious by registry removal and analysts | Download counts | Popularity does not show safety
sn: Action | Block at the proxy with review | Warn only | Warnings are ignored in automation
sn: Cost | Rare false blocks with a fast exception path | No blocking | Attacks spread through builds
sig: Name similarity to popular packages | typosquat distance | Core | From the registry
sig: Install script behaviour | network calls and obfuscation | Core | From sandbox analysis
sig: Publisher change and maintainer history | new maintainers or sudden releases | Takeover | From registry data
sig: Dependency graph position | who depends on it | Impact | From the graph
noise: Package description wording | weak link
noise: Download count alone | weak link
noise: README length | weak link
base: Vulnerability scanning of known issues and manual allow-lists, because they are the common controls.
prod: A scoring pipeline combining metadata, code and sandbox behaviour with a registry proxy that blocks and quarantines, plus an exception process.
pipe: New version feed @ registries ; Metadata and static analysis @ scanners ; Sandbox run @ isolated environment ; Risk scoring @ model ; Proxy decision @ artifact proxy ; Analyst review @ security console ; Feedback @ weekly
edge: Legitimate obfuscation | a build tool obfuscates code | Publisher trust and allow-lists
edge: Account takeover | a trusted package turns malicious | Maintainer change signals
edge: Delayed payload | the attack triggers later | Re-scan of installed versions
off: Detection of known malicious packages ; False block rate ; Time to detection after publish
on: Malicious packages blocked ; Time to block ; Developer exceptions
gap: Known-vulnerability scanning only ; Warn-only controls ; Popularity as trust

== security-fix-suggestion-agent | Security Fix Suggestion Agent | llm-agents | seconds | advanced | a=0.3 k=40
obj: Suggest code fixes for confirmed security findings, with an explanation, a test that shows the flaw is closed and a pull request for the owner to review.
con: Fixes only for confirmed findings ; Each fix includes a test that fails before and passes after ; Owner and security review required ; The agent works in a sandbox ; 20K findings per quarter
sn: Verification | A failing then passing test | A plausible patch | Plausible patches can leave the flaw open
sn: Scope | Minimal changes | Broad refactors | Large changes hide risk
sn: Control | Human review | Auto-merge | Security fixes need accountability
sig: Finding type and location | rule and code location | Context | From the scanner
sig: Code context | surrounding code and framework | Fix design | From the repository
sig: Test outcome | test before and after | Gate | From CI
sig: Fix pattern library | approved fix patterns | Template | From security guidance
noise: Developer name | personal data
noise: Finding id | an identifier
noise: Branch name | an artefact
base: Developers fixing findings by hand using guidance pages, because it is the usual process.
prod: A fix agent with an approved pattern library, a sandbox that proves the flaw and the fix with tests and a pull request that includes the explanation and risk.
pipe: Confirmed finding intake @ security tracker ; Code context retrieval @ repository ; Fix proposal @ coding agent ; Test generation and run @ sandbox ; Pull request @ code host ; Owner and security review @ review platform ; Closure verification @ rescan
edge: Framework-specific fix | the generic pattern fails | Framework pattern library
edge: Fix breaks behaviour | the proposed fix makes existing tests fail | Retry with constraints or hand to a human
edge: Unconfirmed finding | a false positive reaches the agent | Gate on confirmation
off: Fix verification rate ; Reviewer acceptance ; Re-open rate
on: Time to fix ; Fixes accepted ; Security regressions
gap: Fixing unconfirmed findings ; Patches without tests ; Auto-merge

== issue-triage-labelling | Issue Triage and Labelling | nlp | seconds | foundational | a=0.2 k=5
obj: Classify new issues by type, component and priority and suggest the owner so reports reach the right team fast.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Suggested labels with confidence ; Security issues routed privately and at once ; Maintainers can override ; Triage within 30 s ; 500K issues per year
sn: Label | Labels set by maintainers after triage | Reporter labels | Reporters choose wrongly
sn: Safety | Security and data loss issues escalated | Normal queue only | Some reports are urgent
sn: Role | A suggestion | An automatic close | Closing needs a human
sig: Issue text and stack traces | description and errors | Component | From the report
sig: Affected version and platform | version metadata | Routing | From the report
sig: Similar past issues | closed issues with similar text | Owner hint | From the tracker
sig: Severity cues | crash, data loss or security terms | Priority | From text
noise: Reporter name | personal data
noise: Issue number | an identifier
noise: Time of day | irrelevant
base: Maintainers reading and labelling each issue by hand, because it is the current practice.
prod: A classifier and retrieval service for labels, component and owner suggestions with a rule layer for security terms and a maintainer override loop.
pipe: Issue intake @ tracker ; Text and trace parsing @ NLP ; Label classifier @ transformer ; Security rule layer @ rules ; Owner suggestion @ ownership data ; Maintainer review @ tracker ; Accuracy tracking @ monthly
edge: Vague report | the text lacks detail | Ask for details automatically
edge: Multiple problems | one issue has several bugs | Split suggestion
edge: Non-English issue | the model is weaker | Multilingual models
off: Label accuracy ; Security recall ; Owner accuracy
on: Time to first response ; Misrouted issues ; Maintainer triage time
gap: Reporter labels as truth ; Automatic closing ; No security rule layer

== duplicate-issue-detection | Duplicate Issue Detection | nlp | seconds | foundational | a=0.1 k=5
obj: Find existing issues that describe the same problem and link them so reports and fixes are not duplicated and users see known workarounds.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{RankLoss}
con: Suggest duplicates and never close automatically ; Show the existing issue and workaround ; Precision above 85% for suggested duplicates ; Suggestions within 2 s ; 1M issues indexed
sn: Match | Same root problem | Same words | Different words can describe one bug
sn: Action | A suggestion to the reporter and maintainer | Auto-close | Wrong closes frustrate users
sn: Value | Fewer duplicate fixes and better reports | Fewer issues | The goal is better outcomes
sig: Semantic similarity | embedding similarity of texts | Core | From a text model
sig: Error signature match | same stack trace or message | Strong evidence | From extraction
sig: Version and platform | same product and version | Context | From metadata
sig: Issue state | open, fixed or won't fix | Filter | From the tracker
noise: Reporter name | personal data
noise: Issue age alone | weak link
noise: Comment count | weak link
base: Keyword search by the reporter before filing, because it is the standard practice.
prod: A hybrid search that shows likely duplicates while the reporter types, with maintainer confirmation and linking, and a duplicate cluster view.
pipe: Draft issue text @ tracker form ; Embedding and signature search @ index ; Candidate ranking @ learned ranker ; Suggestion display @ tracker UI ; Maintainer confirmation @ tracker ; Link creation @ tracker ; Feedback @ monthly
edge: Similar symptoms | different causes share symptoms | Show candidates and let humans decide
edge: Fixed issues | the old issue is fixed in a newer version | Version-aware messages
edge: Short reports | little text exists | Ask for details
off: Precision at five ; Recall of known duplicates ; Maintainer acceptance
on: Duplicate issues filed ; Time to first fix ; Triage effort
gap: Auto-closing duplicates ; Word-match search ; Ignoring versions

== team-delivery-forecasting | Team Delivery Forecasting | time-series,tabular | batch | foundational | a=1 k=2
obj: Forecast when a set of work items will be delivered from historical flow data, with ranges, so teams and stakeholders plan with uncertainty and not point estimates, without comparing individuals.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Forecast as a range with probabilities ; Team-level data only ; No individual velocity ; Refresh daily for 2K teams
sn: Method | Monte Carlo from cycle time and throughput history | Story point sums | Points are not comparable
sn: Level | Team flow data | Individual output | Individual comparisons distort behaviour
sn: Use | Planning and risk discussion | A commitment | Forecasts are not promises
sig: Throughput history | items finished per period | Core | From the tracker
sig: Cycle time distribution | time from start to done | Core | From the tracker
sig: Work in progress | items in flight | Flow | From the tracker
sig: Scope change rate | items added over time | Risk | From the tracker
noise: Developer name | personal data
noise: Item title wording | weak link
noise: Story points | not comparable across teams
base: Estimated points divided by average velocity, because it is the common planning method.
prod: A flow-based Monte Carlo forecaster with scope change and wip inputs, producing delivery date ranges and a what-if view for planners.
pipe: Work item history @ tracker ; Distribution fitting @ statistics ; Monte Carlo simulation @ forecaster ; Scope change model @ time-series ; Range output @ planning dashboard ; Team review @ planning meeting ; Accuracy tracking @ quarterly
edge: New team | the team has too little delivery history for a stable forecast | Pooled priors and wide ranges
edge: Process change | a process change alters how work flows through the team | Change flags and a fresh window
edge: Large epic | items are not comparable | Item size classes
off: Calibration of date ranges ; Hit rate at the 85th percentile ; Forecast error
on: Missed delivery dates ; Planning surprises ; Time spent estimating
gap: Point estimates ; Individual velocity ; Story point sums

== support-ticket-to-bug-linking | Support Ticket to Bug Linking | nlp,graph | seconds | foundational | a=0.2 k=5
obj: Link customer support tickets to the engineering bugs behind them so engineering sees real customer impact and support sees fix status.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{RankLoss}
con: Customer personal data removed before linking ; Links suggested for agents to confirm ; Impact counts by bug ; Linking within 5 s ; 1M tickets per year
sn: Match | Same root problem | Same product area | Areas contain many bugs
sn: Privacy | Redacted ticket text | Customer identity in engineering tools | Engineers do not need identities
sn: Value | Impact counts and fix status | A link list | Teams need prioritisation evidence
sig: Error message and version match | reported error and version | Strong evidence | From extraction
sig: Text similarity to bug reports | embedding similarity | Candidate | From the model
sig: Product area and feature | classified area | Filter | From classification
sig: Customer tier | contract tier | Impact weighting | From the CRM
noise: Customer name | personal data
noise: Agent name | irrelevant
noise: Ticket channel | weak link
base: Support agents searching the bug tracker by keywords, because it is the usual process.
prod: A linking model with redaction, a suggestion UI for agents and an impact dashboard for product teams that shows counts by bug and tier.
pipe: Ticket intake @ support platform ; Redaction @ pattern and model ; Candidate retrieval @ embeddings ; Link ranking @ learned ranker ; Agent confirmation @ support UI ; Impact dashboard @ BI ; Fix status sync @ tracker
edge: No matching bug | the issue is new | Suggest a new bug with a draft
edge: Many tickets one bug | ticket counts for one bug jump suddenly after a release | Impact alerts
edge: Misleading link | a wrong link inflates counts | Confirmation and unlinking
off: Precision at three ; Redaction recall ; Impact count accuracy
on: Time to link ; Bugs prioritised by customer impact ; Duplicate tickets
gap: Customer identity in bug trackers ; Area-only matching ; Auto-linking without review

== team-flow-metrics-dashboard | Team Flow Metrics and Insights | tabular,time-series | batch | foundational | a=1 k=2
obj: Show team-level flow metrics such as lead time, deployment frequency and change failure rate with explanations of what moved, to support team improvement and never to rank people.
con: Metrics at team level with a minimum group size ; No individual views ; Teams own their data ; Insights reviewed by team leads ; 2K teams
sn: Level | Teams with at least 5 people | Individuals | Individual metrics are gamed and harm trust
sn: Use | Team improvement conversations | Performance reviews | Metrics are not performance ratings
sn: Interpretation | Trends with context | Targets | Targets are gamed
sig: Lead time for changes | time from commit to production | Flow | From CI and CD
sig: Deployment frequency | deployments per period | Flow | From CD
sig: Change failure rate | share of deployments with failures | Stability | From incidents
sig: Time to restore | time to fix a failure | Resilience | From incidents
noise: Developer name | personal data
noise: Lines of code | a poor proxy
noise: Commit counts | a poor proxy
base: Manually compiled engineering reports from the tracker, because they are the current practice.
prod: A metrics service with team-level aggregation, trend explanations and bottleneck hints, with access controls that block individual views.
pipe: Event ingestion @ CI, CD and trackers ; Aggregation to team level @ batch ; Metric computation @ analytics ; Trend explanation @ rules and LLM ; Team dashboard @ BI ; Team retrospectives @ monthly ; Governance review @ quarterly
edge: Small team | the group is under the minimum | Suppress or merge groups
edge: Gaming | teams change behaviour to move numbers | Balanced metrics
edge: Data gaps | a pipeline stops reporting | Data quality flags
off: Metric definition accuracy ; Aggregation privacy checks ; Insight usefulness in surveys
on: Lead time ; Change failure rate ; Team satisfaction with metrics
gap: Individual metrics ; Lines of code ; Metrics as targets

== error-grouping-log-clustering | Error Grouping and Log Clustering | nlp,time-series | seconds | foundational | a=10 k=5
obj: Group production errors and log lines into issues by cause so engineers see a few ranked problems instead of millions of events.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{GraphReg}
con: Grouping within 10 s of arrival ; Group stability across releases ; Personal data removed from messages ; Rank by user impact ; 5B events per day
sn: Group | Same root cause | Same message text | Messages contain IDs and vary
sn: Stability | Groups persist across releases | Regrouping every time | Teams lose history
sn: Rank | Users affected and trend | Event count | One user can produce millions of events
sig: Normalised stack trace | frames without variable parts | Core | From parsing
sig: Message template | message with variables masked | Grouping | From parsing
sig: Release and deployment markers | version and time | Regression | From CD
sig: Users and sessions affected | distinct affected users | Impact | Aggregated
noise: User identifier | personal data
noise: Event id | an identifier
noise: Host name | weak link
base: Group by exact message and top stack frame, because it is the standard behaviour.
prod: A grouping service using normalised traces, learned message templates and embeddings with release-aware regression flags and impact ranking.
pipe: Event ingestion @ logging and error SDKs ; Masking and normalisation @ parsers ; Grouping @ clustering ; Group assignment @ index ; Impact ranking @ analytics ; Issue creation @ tracker ; Regression flag @ release data
edge: Renamed functions | traces change after refactors | Fuzzy frame matching
edge: Very noisy errors | one error floods | Rate limits and sampling
edge: PII in messages | personal data appears in logs | Masking rules
off: Grouping purity ; Group stability ; Impact ranking accuracy
on: Distinct issues to review ; Time to find a regression ; Alert noise
gap: Exact message grouping ; Event counts as rank ; Unmasked personal data

== developer-portal-assistant | Internal Developer Portal Assistant | llm-agents,tabular | seconds | foundational | a=0.2 k=40
obj: Answer questions about services, owners, dependencies and standards from the service catalogue and docs, and create tickets or scaffold templates through approved workflows.
con: Answers come from the service catalogue and docs with links ; Write actions only through approved templates and approvals ; Access follows catalogue permissions ; Answer within 5 s ; 20K questions per day
sn: Source | The service catalogue and docs | Model memory | Ownership data changes
sn: Actions | Approved templates with approval | Free-form commands | Free-form actions can break systems
sn: Trust | Links and timestamps | Unsourced answers | Engineers verify quickly
sig: Catalogue match | the service the question is about | Grounding | From the catalogue
sig: Ownership and on-call | owner and rotation | Routing | From the portal
sig: Template eligibility | whether a template applies | Action choice | From rules
sig: Doc freshness | last update | Trust | From the doc system
noise: Asker name | personal data
noise: Chat length | weak link
noise: Time of day | irrelevant
base: A portal search and a help channel, because they are the current tools.
prod: A retrieval and workflow assistant over the catalogue with citations and a small set of approved actions that create tickets or scaffold new services after approval.
pipe: Question intake @ portal chat ; Permission check @ identity ; Catalogue and doc retrieval @ hybrid search ; Answer with links @ LLM with citations ; Approved action request @ workflow engine ; Approval @ owner ; Audit log @ append-only store
edge: Missing owner | the catalogue has no owner | Flag and ask the platform team
edge: Duplicate services | two services share a name | Ask which one
edge: Unapproved action | the user asks for a risky action | Refuse and point to the process
off: Answer faithfulness ; Action policy compliance ; Retrieval accuracy
on: Help channel questions ; Time to scaffold a service ; Catalogue gaps found
gap: Free-form command execution ; Unsourced answers ; Ignoring permissions

== governed-text-to-sql-engineers | Governed Text-to-SQL for Engineers | llm-agents,tabular | seconds | advanced | a=1 k=40
obj: Let engineers query operational and product data in plain language through a governed semantic layer with row and column access controls, showing the query and sources.
con: Queries run only on the governed semantic layer ; Read-only with row limits ; Access follows data permissions ; Every answer shows the query ; Answer within 10 s
sn: Safety | A semantic layer with access control | Raw table access | Raw access leaks data and costs money
sn: Trust | The query and definitions shown | A number with no lineage | Teams must verify
sn: Scope | Metrics the layer covers | Any question | Out-of-scope answers are guesses
sig: Metric and entity match | whether the question maps to a defined metric | Correctness | From the semantic layer
sig: Permission scope | tables and columns the user may read | Gate | From identity
sig: Query cost estimate | scan size | Safety | From the planner
sig: Result sanity checks | row counts and ranges | Quality | Rules
noise: Asker name | personal data
noise: Question wording | not substance
noise: Chat length | an artefact
base: Analysts and SQL editors with training, because they are the current way.
prod: A text-to-metrics agent over a semantic layer with permission checks, cost limits and sanity validation that shows its query and definitions and logs usage.
pipe: Question intake @ chat ; Entity resolution @ semantic layer ; Query generation @ LLM with constraints ; Permission and cost check @ policy ; Query run @ warehouse read replica ; Result validation @ rules ; Answer with query @ UI
edge: Ambiguous metric | the question has two meanings | Ask which one
edge: Expensive query | the generated query would scan a very large table | Cost block and a narrowed suggestion
edge: Restricted column | the user lacks access | Refuse and point to access request
off: Answer accuracy against analyst queries ; Permission violation rate ; Refusal accuracy for out-of-scope questions
on: Analyst requests ; Time to answer ; Disputes about numbers
gap: Raw table access ; Hidden queries ; Answers out of scope

== api-breaking-change-detection | API Breaking Change Detection | graph,tabular | batch | foundational | a=0.1 k=5
obj: Detect changes in API schemas and behaviour that would break consumers and warn authors in the pull request with the list of affected clients.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{GraphReg}
con: Breaking changes flagged in the pull request ; Affected consumers listed from traces and registries ; Owners decide on exceptions ; Check within 3 minutes ; 20K APIs
sn: Rule | Contract compatibility rules | Textual diffs | Text diffs miss semantic breaks
sn: Impact | Real consumers from traffic | All possible clients | Unused fields can change safely
sn: Control | A review gate with exceptions | An automatic block with no exception | Planned breaks need a path
sig: Schema diff classification | removed, renamed or type-changed fields | Core | From schema tools
sig: Consumer usage | clients calling the changed field | Impact | From traces
sig: Version and deprecation state | planned deprecation | Context | From the registry
sig: Contract test results | consumer contract checks | Evidence | From CI
noise: Author name | personal data
noise: Branch name | an artefact
noise: File path | weak link
base: Manual review of API changes and versioning rules, because it is the standard governance.
prod: A schema compatibility checker combined with traffic-based consumer discovery and contract tests that comments on the pull request with impact.
pipe: Schema extraction @ pull request ; Diff classification @ compatibility rules ; Consumer lookup @ tracing and registry ; Contract tests @ CI ; Impact comment @ code host ; Exception workflow @ API owners ; Release tracking @ API registry
edge: Behavioural change | the schema is unchanged but behaviour differs | Contract tests and example checks
edge: Unknown consumers | external clients exist | Public API policies
edge: Planned deprecation | the break is intended | Deprecation windows
off: Detection of seeded breaking changes ; Consumer discovery recall ; False warnings
on: Breaking changes reaching production ; Consumer incidents ; Review time on API changes
gap: Textual diffs only ; Ignoring real consumers ; Gates with no exception path

== feature-flag-risk-cleanup | Feature Flag Risk and Cleanup | tabular,graph | batch | foundational | a=0.1 k=5
obj: Find stale flags, risky flag combinations and flags that block deployments, and propose safe cleanup so code paths do not pile up.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{GraphReg}
con: Cleanup proposals include code locations ; Owners approve removal ; Flag combinations tested for conflicts ; Weekly scan of 100K flags
sn: Evidence | Evaluation data and code references | Flag age alone | Old flags may still matter
sn: Risk | Interacting flags in the same code path | Single flag checks | Combinations cause incidents
sn: Action | A staged removal | Immediate deletion | Wrong removal changes behaviour
sig: Flag evaluation variance | whether all users get the same result | Staleness | From the flag service
sig: Code references | places that read the flag | Impact | From code search
sig: Age and owner activity | time since changes | Priority | From the flag service
sig: Co-occurring flags | flags in the same function | Interaction risk | From code analysis
noise: Developer name | personal data
noise: Flag description wording | weak link
noise: Environment name | an artefact
base: Periodic flag audits by teams, because it is the usual practice.
prod: A flag analyser using evaluation data and code references to find stale flags and interaction risks and open removal pull requests for owners.
pipe: Flag evaluation data @ flag service ; Code reference search @ code index ; Stale flag detection @ rules ; Interaction analysis @ graph analysis ; Removal pull request @ code host ; Owner review @ review platform ; Cleanup tracking @ dashboard
edge: Kill-switch flags | flags are meant to stay | Flag type allow-list
edge: Per-customer flags | evaluation varies by customer | Variance by segment
edge: Seasonal flags | a flag is used once a year | Calendar-aware rules
off: Precision of stale flag proposals ; Regression rate after removal ; Interaction detection
on: Stale flags removed ; Incidents from flags ; Code paths removed
gap: Age-only cleanup ; Single-flag checks ; Immediate deletion

== code-ownership-inference | Code Ownership Inference | graph,tabular | batch | foundational | a=0.1 k=4
obj: Infer likely owners for unowned code and services from contribution history, on-call data and reviews so ownership files are complete, for team leads to confirm.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{RankLoss}
con: Suggestions confirmed by team leads ; Teams not individuals as owners ; Ownership files updated by pull request ; Weekly scan of 100K paths
sn: Level | Teams | Individuals | People change roles and leave
sn: Evidence | Recent contributions, reviews and on-call | Authorship only | Original authors may have left
sn: Control | Lead confirmation | Automatic assignment | Ownership has accountability
sig: Recent commit share by team | recent change contributions | Core | From version control
sig: Review and incident participation | who reviews and responds | Support | From tools
sig: On-call mapping | services on call rotations | Strong evidence | From the pager
sig: Team membership | current teams | Constraint | From HR directory
noise: Developer name alone | personal data
noise: File age | weak link
noise: Commit message | weak link
base: Ownership files updated by hand and asking in chat, because it is the usual practice.
prod: A ranking of candidate owning teams per path from contribution, on-call and review data with a pull request that updates ownership files after lead confirmation.
pipe: Contribution data @ version control ; Team mapping @ directory ; On-call lookup @ pager system ; Owner ranking @ learned ranker ; Lead confirmation @ review tool ; Ownership pull request @ code host ; Coverage tracking @ weekly
edge: Reorganisation | teams are merged or renamed so ownership data goes stale | Directory sync
edge: Shared libraries | many teams use the code | Platform ownership rules
edge: Bot commits | automated changes dominate history | Bot filters
off: Agreement with confirmed owners ; Coverage of paths ; Review acceptance
on: Paths with owners ; Time to find an owner ; Misrouted alerts
gap: Individual owners ; Authorship only ; Automatic assignment

== open-source-licence-compliance-scanning | Open Source Licence Compliance Scanning | nlp,tabular | batch | foundational | a=0.2 k=5
obj: Identify licences in dependencies and copied code, flag conflicts with company policy and explain obligations so releases do not ship with licence violations.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Every finding cites the file and the licence text ; Legal decides exceptions ; Restricted licences blocked at the merge gate ; Scan of 20M files per release ; Reports exported as SPDX
sn: Source | Licence text and package metadata | Model memory of licences | Licences vary by version
sn: Authority | Legal makes decisions | The scanner | Legal interpretation needs lawyers
sn: Output | An SBOM with licence data | A list of warnings | Customers and auditors ask for SBOMs
sig: Licence text match | match to known licences | Core | From scanners
sig: Package metadata licence | declared licence | Support | From registries
sig: Link and distribution type | static or dynamic linking and distribution | Obligations | From build analysis
sig: Policy class | allowed, review or restricted | Gate | From policy
noise: Developer name | personal data
noise: File name | an artefact
noise: Package popularity | weak link
base: Scans with fixed licence lists and manual legal review, because they are the typical process.
prod: A scanner with learned licence text identification, SBOM generation, policy mapping and a legal review queue for unclear cases.
pipe: Dependency and file scan @ build pipeline ; Licence identification @ scanner and model ; Policy mapping @ rules ; SBOM generation @ SPDX or CycloneDX ; Legal review queue @ workflow ; Merge gate @ CI ; Audit export @ document store
edge: Dual licences | a package offers two licences | Choice recorded by legal
edge: Missing metadata | a package lacks licence data | Text scan and manual review
edge: Copied snippets | code is copied without notice | Code similarity checks
off: Licence identification accuracy ; SBOM completeness ; Gate precision
on: Releases with licence issues ; Legal review time ; Audit findings
gap: Model memory of licences ; Warnings with no SBOM ; Scanner-made legal decisions

== coding-agent-sandbox-permissions | Coding Agent Sandbox and Permission Policy | llm-agents,tabular | seconds | staff-principal | a=0.5 k=20
obj: Run coding agents inside isolated sandboxes with least-privilege, short-lived credentials and egress controls so agents can build and test code but cannot reach production or exfiltrate data.
con: Agents have no production credentials ; Network egress limited to approved hosts ; Credentials expire within 1 hour ; Every command logged ; 20K agent sessions per day
sn: Isolation | Disposable sandboxes per task | Developer laptops | A compromised session must not spread
sn: Credentials | Short-lived scoped tokens | Long-lived personal tokens | Leaked tokens grant wide access
sn: Network | Allow-listed egress | Open internet | Open egress allows exfiltration
sig: Sandbox policy compliance | whether commands stayed in policy | Safety | From logs
sig: Token scope and lifetime | permissions and expiry | Risk | From the credential service
sig: Egress attempts | blocked and allowed connections | Exfiltration signal | From network logs
sig: Resource usage | CPU, memory and time | Abuse signal | From the sandbox
noise: Developer name | personal data
noise: Task title wording | weak link
noise: Repository name | an identifier
base: Agents running with the developer's credentials on their machine, because it is how early tools work.
prod: A sandbox platform with per-task credentials, egress allow-lists, command logging, resource limits and automatic teardown, with policy as code reviewed by security.
pipe: Task start @ agent platform ; Sandbox provisioning @ isolated runtime ; Credential issuance @ credential broker ; Policy enforcement @ gateway ; Command and network logging @ append-only store ; Teardown @ platform ; Policy review @ monthly
edge: Prompt injection in a repository | the agent follows hostile instructions | Egress limits and no production reach
edge: Credential leak in output | a token appears in a log | Output scanning and revocation
edge: Resource abuse | the agent runs a miner or loop | Limits and timeouts
off: Escape tests ; Egress block rate on seeded attempts ; Token lifetime compliance
on: Agent sessions without incidents ; Blocked egress attempts ; Credential exposure events
gap: Developer credentials for agents ; Open internet access ; Long-lived tokens

== ai-code-provenance-review | AI-Generated Code Provenance and Review | tabular,llm-agents | seconds | advanced | a=0.1 k=10
obj: Record which changes were written or edited by AI agents and route them to the right level of review, tests and licence checks, so accountability and quality stay clear.
con: Every AI-assisted change is labelled in the pull request ; Higher-risk changes need a second human reviewer ; Licence and similarity checks run on generated code ; Human author remains accountable ; 100K labelled changes per month
sn: Accountability | A named human owner | The agent as author | Accountability cannot sit with a tool
sn: Review | Risk-based depth | The same review for all | Generated code can be large and plausible
sn: Evidence | Provenance records in commits | Self-reporting only | Self-reporting is unreliable
sig: Agent involvement marker | signed record of agent edits | Label | From the agent platform
sig: Change risk tier | size and criticality | Review depth | From the risk model
sig: Similarity to public code | match to licensed code | Licence risk | From similarity scans
sig: Test evidence | tests added and passing | Quality | From CI
noise: Author name | personal data
noise: Tool brand | weak link
noise: Commit message wording | weak link
base: Developer disclosure in pull request templates, because it is the first step many teams take.
prod: A provenance service that signs agent edits, labels changes, applies risk-based review rules and similarity and licence checks, and reports aggregate quality.
pipe: Agent edit recording @ agent platform ; Signed provenance @ commit trailer ; Risk tier @ rules and model ; Review rule application @ code host ; Licence and similarity scan @ scanners ; Merge gate @ CI ; Quality report @ monthly
edge: Mixed authorship | humans edit agent code | Line-level provenance
edge: Unlabelled agent code | the label is missing | Detection signals and policy
edge: Large generated change | the diff is huge | Size limits and split rules
off: Label recall on seeded changes ; Defect rate by provenance ; Review policy compliance
on: Defects in AI-assisted changes ; Review time ; Licence findings
gap: Disclosure by habit only ; Same review for every change ; Agent as accountable author

== coding-agent-prompt-injection-defence | Coding Agent Prompt Injection Defence | nlp,llm-agents | seconds | staff-principal | a=0.2 k=20
obj: Detect and neutralise hostile instructions hidden in issues, code comments, dependencies and web pages that coding agents read, so untrusted text cannot steer the agent to leak data or run harmful commands.
con: Untrusted text is separated from instructions ; High-risk tools need human approval ; Detection recall above 95% on test attacks ; No secrets in agent context ; Scan within 500 ms
sn: Boundary | Policy enforced outside the model | A system prompt that asks the model to be careful | Prompts alone can be overridden
sn: Test | Planted attacks in repositories and issues | Trust in vendor claims | Real attacks adapt
sn: Impact | Limit the tools and data an agent can reach | Perfect detection | Detection will miss some attacks
sig: Instruction-like text in data | commands inside files and web pages | Core | From the classifier
sig: Tool risk tier | the tier of the tool being called | Approval | From policy
sig: Data flow from untrusted source | whether untrusted text influences a call | Taint | From tracing
sig: Egress and file write targets | where data is sent or written | Exfiltration | From the gateway
noise: Developer name | personal data
noise: Repository name | an identifier
noise: File extension alone | weak link
base: A system prompt telling the model to ignore instructions in data, because it is the common first defence.
prod: A layered defence with taint tracking from untrusted sources to tool calls, a detector for injected instructions, approval gates for risky tools and regular red-team replay.
pipe: Untrusted input tagging @ agent platform ; Injection detector @ classifier ; Taint tracking @ agent trace ; Tool risk gate @ policy as code ; Human approval for risky calls @ approval UI ; Red-team replay @ test suite ; Incident review @ monthly
edge: Hidden text | instructions are in invisible characters | Normalisation before reading
edge: Multi-step attack | the payload builds over several calls | Taint propagation checks
edge: Trusted source compromise | a dependency README is hostile | Treat all external text as untrusted
off: Attack success rate in replay ; Detection recall ; False block rate
on: Blocked injection attempts ; Successful attacks ; Approval rate on risky calls
gap: Prompt-only defence ; No planted attack tests ; Trusting dependency text

== coding-agent-evaluation-harness | Coding Agent Evaluation Harness | llm-agents,tabular | batch | advanced | a=1 k=40
obj: Evaluate coding agents on a company's own repositories and tasks with hidden tests, cost and safety checks so model and prompt changes are judged on evidence before rollout.
con: Tasks drawn from real past changes with hidden tests ; Results by language, repository and task type ; Safety scenarios included ; Re-run on every agent change ; 2K tasks
sn: Truth | Hidden tests and reviewer judgement | Public benchmarks | Public benchmarks may be in training data
sn: Metrics | Pass rate, cost, time and safety incidents | Pass rate alone | A cheap pass rate hides risk
sn: Coverage | Task types that match real work | Easy tasks | Easy tasks inflate scores
sig: Hidden test pass rate | tests not visible to the agent | Core | From the harness
sig: Patch quality review | reviewer ratings | Quality | From reviews
sig: Cost and steps | tokens, steps and time | Efficiency | From traces
sig: Safety violations | policy breaches during runs | Safety | From the gateway
noise: Task author | irrelevant
noise: Repository name | an identifier
noise: Run id | an identifier
base: Spot checks by developers and vendor benchmark numbers, because they are the common evidence.
prod: A harness that replays real tasks in sandboxes, grades with hidden tests and reviewers, tracks cost and safety and gates rollouts on regression thresholds.
pipe: Task curation @ past changes ; Sandbox run @ agent platform ; Hidden test grading @ CI ; Reviewer sampling @ review tool ; Safety check @ policy logs ; Report and gate @ release pipeline ; Task refresh @ quarterly
edge: Leaked tests | the agent can see test files | Hidden test isolation
edge: Task staleness | tasks no longer match the codebase | Quarterly refresh
edge: Non-determinism | results vary by run | Multiple runs and intervals
off: Agreement of harness scores with later outcomes ; Variance across runs ; Safety scenario coverage
on: Regressions caught before rollout ; Cost per solved task ; Agent changes shipped with evidence
gap: Public benchmarks only ; Pass rate alone ; Single runs

== devtools-agent-action-guardrails | DevTools Agent Action Guardrails | llm-agents,tabular | seconds | staff-principal | a=0.5 k=40
obj: Control and audit every action AI agents take in repositories, pipelines and registries, enforce approval tiers and give security and audit teams a replayable record.
con: Policy enforced in a gateway outside the model ; Agents never merge to protected branches, deploy to production or change access policies ; Approvals by named roles ; Immutable action log ; Kill switch per agent ; Audit queries over 90 days answered within 5 s
sn: Enforcement | A tool gateway with policy as code | Prompt instructions | Prompts can be bypassed by crafted input
sn: Scope | Least privilege per agent and repository | Organisation-wide tokens | One mistake should not reach all repositories
sn: Evidence | An append-only log with context | A summary report | Auditors need replay
sig: Action risk tier | the tier of the target system and action | Approval routing | Policy as code
sig: Action rate per agent | actions per minute against a baseline | Runaway detection | Per agent
sig: Approval and override statistics | approvals, rejections and overrides | Governance health | From the log
sig: Post-action verification result | whether the intended state was reached | Quality of actions | Verification steps
noise: Agent name | an identifier
noise: Prompt length | not risk
noise: Model version alone | needs outcome data
base: Manual review of agent logs by team leads, because it is the minimum audit trail.
prod: A policy gateway with risk tiers, rate limits and a kill switch, an immutable action log with replay, behavioural anomaly detection on agent actions and weekly governance reports.
pipe: Tool gateway @ policy proxy ; Risk tier decision @ policy as code ; Approval workflow @ maker-checker ; Action log @ append-only store ; Behaviour monitor @ time-series model ; Replay console @ analytics ; Governance report @ weekly
edge: Agent loop | repeated pushes to one branch | Rate limits and loop detection
edge: Approver fatigue | approvals become automatic | Override statistics and rotating approvers
edge: New tool added | no tier has been defined for it | Default deny until classified
off: Policy test coverage ; Detection of seeded anomalous actions ; Replay completeness
on: Actions blocked by policy ; Incidents caused by agent actions ; Time to answer audit queries
gap: Prompt-only guardrails ; Organisation-wide tokens ; Default allow for new tools
