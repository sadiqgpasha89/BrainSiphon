# Software Engineering & DevTools, part 1 (use cases 1-21): coding assistance, code review and quality, testing and verification
# Vendor-neutral. Agents work in sandboxes with short-lived scoped tokens, a human approves every merge and deployment, secrets never reach a model and developers are never ranked or scored individually.
== repo-aware-code-completion | Repository-Aware Code Completion | llm-agents,nlp | sub-100ms | foundational | a=500 k=20
obj: Suggest the next lines and functions while a developer types, using the open files and the repository's own conventions, so common code is written faster and consistent with the codebase.
con: Suggestion latency under 200 ms ; Context limited to repositories the developer can access ; Suggestions never include secrets ; Licence and similarity checks on output ; 50K developers
sn: Context | Retrieved snippets from the same repository | Generic public code only | Local APIs and styles matter
sn: Metric | Accepted and retained suggestions | Suggestions shown | Shown suggestions can be ignored
sn: Safety | Filters for secrets and restricted licences | Unfiltered output | Output can leak or infringe
sig: Cursor and file context | code around the cursor | Prompt basis | From the editor
sig: Related file retrieval | similar or imported files | Local conventions | From the code index
sig: Language and framework | detected language and libraries | Style | From the project
sig: Acceptance history aggregate | aggregate acceptance by language and kind | Tuning | Team-level
noise: Developer name | personal data
noise: Editor theme | irrelevant
noise: Keystroke timing | a monitoring artefact
base: Language-server completion and snippets, because it is the standard editor feature.
prod: A completion model with repository retrieval, a secret and licence filter, latency budgets and aggregated acceptance metrics, all running in the company boundary.
pipe: Editor context capture @ IDE plugin ; Repository retrieval @ code index ; Completion model @ private LLM endpoint ; Secret and licence filter @ rules and scanner ; Suggestion display @ IDE ; Acceptance and retention metrics @ aggregated telemetry ; Model evaluation @ monthly
edge: Private repository access | the developer lacks access to a related file | Access checks at retrieval
edge: Outdated API | suggestions use a deprecated function | Index freshness and deprecation hints
edge: Large monorepo | retrieval is slow | Scoped indexes and caching
off: Offline acceptance on held-out code ; Secret leakage tests ; Latency at p95
on: Retained accepted code ; Time to complete tasks ; Defects in suggested code
gap: Shown-suggestion metrics ; Unfiltered output ; Ignoring repository access rights

== code-explanation-onboarding-assistant | Code Explanation and Onboarding Assistant | llm-agents,nlp | seconds | foundational | a=0.2 k=60
obj: Explain what a module, function or service does, who owns it and how it is deployed, with links to the code and docs, so new engineers get productive faster.
con: Every explanation links to the code and docs it used ; Access follows repository permissions ; The assistant is read-only ; Answers within 8 s ; 10K questions per day
sn: Source | The code, docs and ownership data | Model memory | Wrong explanations mislead
sn: Evidence | Links to files and lines | A free explanation | Engineers verify quickly with links
sn: Scope | Questions about the codebase | Open chat | Off-topic chat is not the goal
sig: Code and doc retrieval | relevant files and pages | Grounding | From the index
sig: Ownership data | owning team and on-call | Routing | From the portal
sig: Recent change history | recent commits and incidents | Context | From version control
sig: Question intent | what, why, how to run or who owns | Routing | Classified
noise: Asker name | personal data
noise: Chat length | weak link
noise: Time of day | irrelevant
base: Reading code and wikis and asking colleagues, because it is how people learn systems today.
prod: A retrieval assistant over code, docs and ownership data with citations to files and lines, permission checks and a feedback path to doc owners.
pipe: Question intake @ chat or IDE ; Permission check @ identity ; Hybrid retrieval @ code and doc index ; Answer with links @ LLM with citations ; Ownership lookup @ developer portal ; Feedback to doc owners @ issue tracker ; Usage review @ monthly
edge: Stale docs | the docs disagree with the code | Prefer code and flag the conflict
edge: Restricted repository | the asker lacks access | Say so and point to the owner
edge: Generated code | the code is not meaningful to read | Detect generated files
off: Answer faithfulness on audited questions ; Retrieval accuracy ; Link correctness
on: Time to first contribution ; Questions to senior engineers ; Docs updated after feedback
gap: Answers with no links ; Ignoring access rights ; Relying on stale docs

== pr-description-commit-message-drafting | Pull Request Description and Commit Message Drafting | llm-agents,nlp | seconds | foundational | a=0.1 k=10
obj: Draft pull request descriptions and commit messages from the diff, linked issues and conventions so reviewers understand a change quickly, with the author editing before submission.
con: The author reviews every draft ; Descriptions list files and risks from the diff ; Linked issues are real references ; Draft within 5 s ; 200K pull requests per month
sn: Accuracy | A description that matches the diff | A plausible summary | A wrong summary misleads review
sn: Role | A draft for the author | An automatic submission | The author owns the change
sn: Convention | Team templates and conventional commits | Free text | Consistency helps tooling
sig: Diff summary | files and changes by area | Content | From the diff
sig: Linked issue text | the issue the change closes | Intent | From the tracker
sig: Test changes | tests added or changed | Risk note | From the diff
sig: Template fields | required sections | Format | From the repo
noise: Author name | personal data
noise: Branch name wording | weak link
noise: Commit time | irrelevant
base: Authors writing descriptions by hand from templates, because it is the current practice.
prod: A drafting assistant that fills the team template from the diff and issue, flags missing tests and risk areas and lets the author edit before posting.
pipe: Diff and issue retrieval @ code host ; Change summarisation @ LLM ; Template fill @ rules ; Risk note @ rules and model ; Author edit @ pull request UI ; Posting @ code host ; Edit-rate review @ monthly
edge: Huge diff | the summary loses detail | Split by area and warn on size
edge: Generated files | the diff is mostly generated | Exclude generated paths
edge: Missing issue link | intent is unclear | Prompt the author
off: Faithfulness to the diff ; Author edit rate ; Reviewer rating of clarity
on: Review time ; Description edits by reviewers ; Pull requests with empty descriptions
gap: Auto-posting ; Summaries with no diff check ; Free text only

== code-migration-assistant | Code Migration and Upgrade Assistant | llm-agents | batch | advanced | a=2 k=60
obj: Plan and carry out framework, language and library upgrades across many repositories by proposing small verified changes that pass the tests, for owners to review and merge.
con: Each change is a pull request with passing tests ; Owners approve every merge ; The agent works in a sandbox with a short-lived token ; Rollback instructions in every change ; 2K repositories
sn: Verification | Tests and builds pass before review | Generated diff alone | Plausible code can break behaviour
sn: Scope | Small incremental changes | One huge rewrite | Large rewrites are hard to review
sn: Control | Owner approval and staged rollout | Automatic merge | Behaviour changes need owners
sig: Deprecated API usage | calls to removed or deprecated APIs | Work list | From static analysis
sig: Test coverage of affected code | coverage around the change | Risk | From coverage reports
sig: Build and test result | pass or fail after the change | Gate | From CI
sig: Dependency graph | which services depend on this code | Impact | From the repo graph
noise: Author name | personal data
noise: Commit time | irrelevant
noise: Branch name | an artefact
base: Codemods and manual upgrade tickets, because they are the common approach.
prod: An agent that analyses usage, applies codemods and model-written edits in a sandbox, runs the test suite, retries on failure and opens a pull request with evidence for the owner.
pipe: Usage analysis @ static analysis ; Change plan @ LLM and rules ; Edit and build in sandbox @ coding agent ; Test run @ CI ; Pull request with evidence @ code host ; Owner review @ review platform ; Rollout tracking @ dashboard
edge: Low test coverage | tests do not cover the change | Block and ask for tests first
edge: Breaking API | behaviour changes subtly | Staged rollout and canaries
edge: Flaky tests | failures are unrelated | Retry rules and flake flags
off: Pass rate of generated changes ; Review rejection rate ; Regression escapes
on: Repositories upgraded ; Engineer hours per upgrade ; Incidents from upgrades
gap: Automatic merge ; One large rewrite ; Skipping tests

== api-documentation-generation | API Documentation Generation | llm-agents,nlp | batch | foundational | a=0.5 k=10
obj: Generate and update API reference docs and examples from code, schemas and tests so documentation stays accurate, with examples executed in CI.
con: Every example runs in CI ; Documentation matches the OpenAPI or schema ; Owners review changes ; Daily refresh for 5K services
sn: Truth | The schema and the tested examples | Model-written prose alone | Docs must match behaviour
sn: Check | Executable examples | Reading by eye | Examples drift
sn: Ownership | A named owner approves | Fully automatic publishing | Docs are a contract
sig: Schema and type information | endpoints, fields and types | Content | From code
sig: Test and example results | examples that pass | Correctness | From CI
sig: Change diff | what changed since the last release | Update scope | From version control
sig: Usage logs | commonly used endpoints | Priority | Aggregated
noise: Author name | personal data
noise: File path wording | an artefact
noise: Commit time | irrelevant
base: Hand-written docs with generated references from comments, because it is the standard practice.
prod: A generator that builds reference text from schemas, writes descriptions and examples with an LLM, runs examples in CI and opens a pull request for owners.
pipe: Schema extraction @ code analysis ; Description draft @ LLM ; Example generation @ LLM ; Example execution @ CI ; Pull request @ code host ; Owner review @ review platform ; Docs publish @ docs site
edge: Breaking change | the docs and code disagree | CI blocks stale docs
edge: Poor schema | fields lack descriptions | Prompt owners for input
edge: Secrets in examples | an example uses a real token | Secret scan before publishing
off: Example pass rate ; Schema agreement ; Reviewer edit rate
on: Doc freshness ; Support questions about APIs ; Time to document a change
gap: Prose with no tests ; Publishing without owners ; Examples with real secrets

== legacy-modernisation-planner | Legacy Code Modernisation Planner | llm-agents,graph | batch | advanced | a=1 k=100
obj: Analyse old codebases such as COBOL, PL/SQL and large Java monoliths to map business rules, dependencies and test gaps and propose a staged modernisation plan for architects to approve.
con: Every extracted rule links to source lines ; Behaviour proved by characterisation tests before changes ; Architects approve each stage ; Analysis of 10M lines within a week ; 200 applications
sn: Truth | Behaviour captured in tests | Code reading alone | Old code has hidden behaviour
sn: Plan | Small slices with rollback | Big-bang rewrite | Big-bang rewrites fail
sn: Evidence | Links to code and data flows | A summary | Architects need to check
sig: Call and data dependency graph | which modules call and share data | Slicing | From static analysis
sig: Change frequency and defect history | how often code changes and fails | Priority | From version control
sig: Test coverage and characterisation | tests of existing behaviour | Safety | From CI
sig: Business rule extraction confidence | confidence of extracted rules | Review | From the model
noise: Developer name | personal data
noise: Comment language | weak link
noise: File name | an artefact
base: Manual analysis by senior engineers and consultants, because it is the standard approach.
prod: A code analysis pipeline with a dependency graph, LLM-assisted rule extraction with line links, a characterisation test generator and a staged plan with risk ratings.
pipe: Code ingestion @ repositories ; Parsing and graph build @ static analysis ; Rule extraction @ LLM with source links ; Characterisation tests @ test generator ; Slice planning @ rules and model ; Architect review @ architecture board ; Progress tracking @ dashboard
edge: Missing source | binaries without source | Flag and use runtime tracing
edge: Hidden coupling | a database trigger changes behaviour | Data lineage checks
edge: Dialect differences | the parser fails | Dialect-specific grammars
off: Rule extraction accuracy on audited modules ; Dependency recall ; Characterisation test coverage
on: Analysis time ; Slices delivered ; Production defects in migrated slices
gap: Big-bang rewrites ; Rules with no source links ; Changes without characterisation tests

== developer-docs-qa | Developer Documentation Question Answering | llm-agents,nlp | seconds | foundational | a=0.1 k=60
obj: Answer engineers' questions about internal platforms, standards and runbooks from the official docs with citations and escalate gaps to doc owners.
con: Answers cite the current doc version ; The assistant is read-only ; Access follows document permissions ; Unanswered questions create doc requests ; 30K questions per day
sn: Source | Current internal docs and runbooks | Model memory | Platform details change
sn: Gaps | A logged gap for each unanswered question | A guess | Guesses create outages
sn: Trust | Citations and dates | Unsourced answers | Engineers need to verify
sig: Retrieval relevance | match between question and doc | Quality | From the index
sig: Doc freshness | last updated and review date | Trust | From the doc system
sig: Owner and channel | the owning team | Escalation | From the portal
sig: Question category | platform, security or process | Routing | Classified
noise: Asker name | personal data
noise: Chat session length | weak link
noise: Time of day | irrelevant
base: A wiki search and a chat channel where people ask each other, because it is the current routine.
prod: A retrieval assistant over docs and runbooks with citations and dates, permission checks, gap detection and routing to owners.
pipe: Question intake @ chat ; Permission-aware retrieval @ doc index ; Answer with citations @ LLM with controlled content ; Freshness check @ rules ; Gap logging @ issue tracker ; Owner notification @ messaging ; Quality review @ monthly
edge: Conflicting docs | two pages disagree | Show both and flag the conflict
edge: Outdated runbook | the page is stale | Freshness warnings and owner pings
edge: Sensitive question | the answer is a secret | Refuse and point to the secrets process
off: Answer faithfulness on audited questions ; Retrieval recall ; Gap detection precision
on: Questions answered without humans ; Doc gaps closed ; Time to find an answer
gap: Uncited answers ; Guessing on missing docs ; Ignoring doc permissions

== pull-request-review-assistant | Pull Request Review Assistant | llm-agents,nlp | seconds | advanced | a=0.5 k=40
obj: Comment on pull requests with likely bugs, missing tests and style problems, each backed by evidence from the diff and repository, while human reviewers keep the approval decision.
con: Every comment cites the lines and the reason ; The assistant cannot approve or merge ; Comment precision above 70% on audited samples ; Review within 3 minutes ; 300K pull requests per month
sn: Role | A first pass with evidence | The approver | Approval carries accountability
sn: Quality | Precision of comments that developers act on | Number of comments | Noisy comments train people to ignore the tool
sn: Context | Repository conventions and history | Generic advice | Local rules matter
sig: Static analysis findings | linter and analyser results on the diff | Evidence | From CI
sig: Changed code risk indicators | complexity, ownership and churn | Priority | From version control
sig: Test coverage delta | coverage change | Gap | From CI
sig: Similar past defects | earlier bugs in similar code | Context | From the issue tracker
noise: Author name | personal data
noise: Pull request title wording | weak link
noise: Time of day | irrelevant
base: Linters and human review, because they are the standard checks.
prod: A review agent that runs analysers, retrieves repository context and posts a few high-confidence comments with evidence, tracking the share that developers accept.
pipe: Pull request event @ code host ; Analyser run @ CI ; Context retrieval @ code index ; Comment drafting @ LLM ; Confidence filter @ rules ; Comment posting @ code host ; Acceptance tracking @ aggregated metrics
edge: Large diff | comments spread thin | Prioritise by risk and summarise
edge: Wrong advice | the comment is incorrect | Feedback buttons and filters
edge: Generated code | the diff is not meaningful | Skip generated paths
off: Comment precision on audited samples ; Recall of seeded bugs ; Acceptance rate
on: Bugs found before merge ; Review cycle time ; Comments dismissed as noise
gap: Approving merges ; Comment volume as success ; Generic advice

== defect-prone-change-prediction | Defect-Prone Change Prediction | tabular | batch | foundational | a=0.5 k=5
obj: Estimate which changes are most likely to cause defects from the size, files, history and tests so reviewers and testers spend extra care there, with no scoring of authors.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Change-level risk with drivers ; No author-level scores ; Used for review depth and test choice only ; Calibrated probabilities ; 500K changes per month
sn: Label | Changes later linked to a bug fix | Revert counts only | Many bugs are fixed without reverts
sn: Fairness | Features about the code and process | Features about the author | Author scoring harms trust and is unfair to newcomers
sn: Use | Review depth and test priority | Performance ratings | Not an intended use
sig: Change size and spread | lines and files touched | Risk | From the diff
sig: File defect history | past bug fixes in the files | Risk | From the tracker
sig: Test changes and coverage | tests added with the change | Mitigation | From CI
sig: Code complexity delta | complexity change | Risk | From analysis
noise: Author name | personal data
noise: Author tenure | an unfair proxy
noise: Commit time | weak link
base: Large changes get extra review by policy, because it is the common rule.
prod: A calibrated change-risk model on code and process features that sets review depth and test selection, with a fairness check against author features.
pipe: Change data extraction @ version control ; Feature build @ code metrics ; Risk model @ gradient boosting ; Calibration @ isotonic fit ; Review policy @ rules ; Dashboard for teams @ BI ; Outcome tracking @ monthly
edge: New repository | no defect history | Language-level priors
edge: Mass refactor | size is large but safe | Refactor flags
edge: Label lag | bugs appear after months | Delay-aware training
off: Calibration ; Recall at review capacity ; Stability across repositories
on: Escaped defects ; Review time on high-risk changes ; Incidents from changes
gap: Author-level scoring ; Reverts as the only label ; Ignoring label delay

== reviewer-recommendation | Reviewer Recommendation | graph,tabular | seconds | foundational | a=0.3 k=4
obj: Suggest reviewers for a pull request by code ownership, expertise and current review load so reviews are fast, knowledge spreads and nobody is overloaded.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{RankLoss}
con: Suggestions respect ownership files and conflicts ; Review load balanced across the team ; Authors can choose anyone ; Suggestions within 2 s ; 100K pull requests per month
sn: Goal | Fast, quality review with spread knowledge | Always the top expert | Always picking the expert overloads them
sn: Load | Open reviews and capacity | Expertise only | Load causes delays
sn: Fairness | Equal growth opportunities | Only senior reviewers | Juniors need review experience
sig: File ownership and expertise | prior work on the files | Match | From version control
sig: Open review load | pending reviews | Balance | From the code host
sig: Availability | time zone and leave | Feasibility | From calendars
sig: Review history | past reviews of similar changes | Fit | From the code host
noise: Reviewer name | personal data in the model
noise: Seniority title | weak link
noise: Photo | irrelevant
base: Ownership files and authors choosing by habit, because it is the standard flow.
prod: A ranking service that blends ownership and expertise with load and availability, adds one learning reviewer and shows reasons for each suggestion.
pipe: Pull request event @ code host ; Ownership and expertise graph @ graph store ; Availability and load lookup @ calendars and code host ; Ranker @ learned ranker ; Suggestion display @ pull request UI ; Author choice captured @ code host ; Review time tracking @ weekly
edge: Single owner | only one person knows the code | Cross-training suggestions
edge: Time zones | the best reviewer is asleep | Availability-aware suggestions
edge: New team | the team has no review history yet | Ownership files only
off: Rank accuracy against chosen reviewers ; Time to first review ; Load spread
on: Time to first review ; Review load balance ; Knowledge spread
gap: Always choosing the top expert ; Ignoring load ; Seniority-only choices

== technical-debt-prioritisation | Technical Debt Prioritisation | tabular,llm-agents | batch | advanced | a=0.2 k=6
obj: Combine code metrics, incident history and change frequency to rank debt items by expected cost of delay so teams fix what hurts most, with the engineers deciding the plan.
con: Each item shows its evidence ; Cost estimates with ranges ; Teams decide the roadmap ; Quarterly run for 5K services
sn: Value | Cost of delay measured in incidents and change effort | Code smell counts | Counts do not show business cost
sn: Evidence | Linked incidents and change data | A debt score | Teams need reasons
sn: Control | Team ownership of the plan | A central mandate | Local context matters
sig: Churn and change failure | changes per month and failure rate | Cost | From version control and CI
sig: Incident links | incidents tied to the code | Cost | From the incident tracker
sig: Complexity and test coverage | complexity and coverage | Fragility | From analysis
sig: Dependency age | outdated dependencies | Risk | From scanners
noise: Developer name | personal data
noise: Repository age alone | weak link
noise: File count | weak link
base: Static analysis tools' debt scores and ad hoc team lists, because they are the typical approach.
prod: A ranking of debt items with cost of delay estimates, linked evidence and a proposed fix size, presented to team leads for roadmap planning.
pipe: Metrics and incident data @ engineering systems ; Evidence join @ service catalogue ; Cost model @ regression ; Ranking @ rules and model ; Team review @ planning meeting ; Ticket creation @ issue tracker ; Outcome tracking @ quarterly
edge: Hidden coupling | debt in one service hurts another | Dependency-aware costs
edge: Incident noise | incidents have other causes | Cause tags and review
edge: Strategic change | the service is being retired | Roadmap flags
off: Agreement with team-led rankings ; Cost estimate error ; Incident reduction after fixes
on: Incidents tied to known debt ; Change failure rate ; Time on rework
gap: Smell counts as value ; Central mandates ; Debt scores without evidence

== duplicate-code-detection | Duplicate and Near-Duplicate Code Detection | graph,nlp | batch | foundational | a=0.1 k=5
obj: Find duplicated and near-duplicated logic across repositories and suggest shared libraries or removal, so bugs are fixed once and code size falls.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{GraphReg}
con: Clusters shown with the files and differences ; Owners decide whether to merge ; Generated code and licences excluded ; Weekly scan of 50M lines
sn: Match | Semantic and structural similarity | Text equality only | Renamed code hides duplicates
sn: Value | Duplicates that change together | Any duplicate | Some duplication is cheaper than coupling
sn: Action | A clustered proposal | A list of pairs | Owners need clusters
sig: Token and syntax tree similarity | structural similarity | Clone detection | From parsers
sig: Embedding similarity | semantic similarity | Recall | From a code model
sig: Co-change history | files that change together | Value | From version control
sig: Ownership | owning teams | Routing | From the portal
noise: Developer name | personal data
noise: Comment text | weak link
noise: Formatting | an artefact
base: Copy-paste detectors in static analysis, because teams use them already.
prod: A clone detector with embeddings and co-change evidence that clusters duplicates, estimates the saving and creates refactoring proposals for owners.
pipe: Code indexing @ repositories ; Similarity detection @ parsers and embeddings ; Clustering @ graph clustering ; Co-change check @ version history ; Proposal draft @ LLM ; Owner review @ issue tracker ; Outcome tracking @ quarterly
edge: Generated code | duplicates are generated | Path exclusions
edge: Licensed code | a file is from a third party | Licence exclusions
edge: Intentional copies | services must stay independent | Allow-list
off: Precision of clone clusters ; Recall on seeded clones ; Proposal acceptance
on: Lines removed ; Bugs fixed in many places ; Time to fix shared logic
gap: Text-equality detectors ; Treating all duplicates as bad ; Pair lists with no clusters

== architecture-drift-detection | Architecture Drift Detection | graph | batch | advanced | a=0.1 k=5
obj: Compare the real dependencies in code and runtime traces with the intended architecture rules and report violations so architects can fix drift before it hardens.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{GraphReg}
con: Rules written as checks in CI ; Violations linked to code and owners ; Architects approve exceptions ; Daily scan of 3K services
sn: Rules | Architecture rules as code | Diagrams only | Diagrams drift
sn: Evidence | Static and runtime dependencies | One source | Each misses some links
sn: Action | Exceptions with expiry | Permanent waivers | Waivers become the new drift
sig: Static dependency graph | imports and calls | Structure | From code analysis
sig: Runtime call graph | calls seen in traces | Reality | From tracing
sig: Rule violations | edges that break rules | Drift | From the checker
sig: Violation age | how long it has existed | Priority | From history
noise: Developer name | personal data
noise: Diagram style | an artefact
noise: Module name wording | weak link
base: Architecture review boards and diagrams, because they are the current governance.
prod: A graph-based checker that merges static and runtime dependencies, evaluates rules as code in CI and reports violations with owners and expiring exceptions.
pipe: Code and trace ingestion @ repositories and tracing ; Dependency graph build @ graph store ; Rule evaluation @ architecture rules ; Violation report @ CI and dashboard ; Exception workflow @ architecture board ; Owner tickets @ issue tracker ; Trend tracking @ monthly
edge: Dynamic calls | static analysis misses links | Runtime trace merge
edge: Legitimate exception | a rule needs a workaround | Time-limited exceptions
edge: Rule gaps | a new pattern appears | Rule review
off: Violation precision ; Recall on seeded violations ; Time to fix
on: Open violations ; New violations per month ; Architecture review effort
gap: Diagram-only governance ; One dependency source ; Permanent waivers

== dead-code-unused-dependency-detection | Dead Code and Unused Dependency Detection | graph,tabular | batch | foundational | a=0.2 k=5
obj: Find code, feature flags and dependencies that are no longer used by combining static analysis with production usage data, and propose safe removals for owners to approve.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{GraphReg}
con: Removal proposals include runtime evidence over 90 days ; Owners approve every removal ; Reflection and plugin entry points handled ; Weekly scan of 40M lines
sn: Evidence | Static reachability plus production usage | Static analysis alone | Reflection and plugins hide real use
sn: Risk | A staged removal with rollback | Deleting at once | Rare paths still run at month end
sn: Value | Removed maintenance and attack surface | Lines deleted | Lines do not show value
sig: Static reachability | whether code is reachable from entry points | Core | From analysis
sig: Runtime coverage in production | executed code over 90 days | Evidence | From profiling
sig: Dependency import usage | declared versus used packages | Dependencies | From build tools
sig: Feature flag state | flags fully on or off for months | Flag cleanup | From the flag service
noise: Developer name | personal data
noise: File age alone | weak link
noise: Comment text | weak link
base: Developers removing code they happen to notice, because it is the common practice.
prod: A reachability analysis merged with production coverage and flag state that ranks removals by risk and saving and opens staged pull requests for owners.
pipe: Static analysis @ repositories ; Production coverage join @ profiling data ; Flag and dependency check @ flag service and build tools ; Removal ranking @ rules ; Removal pull request @ code host ; Owner review @ review platform ; Post-removal monitoring @ observability
edge: Rare scheduled job | the code runs once a year | Calendar-aware windows and owner checks
edge: Reflection use | code is called by name | Reflection hints and conservative marking
edge: Plugin entry points | external callers exist | Public API lists
off: Precision of removal proposals ; Regressions after removal ; Saved maintenance
on: Lines and dependencies removed ; Vulnerable unused dependencies removed ; Incidents from removals
gap: Static analysis alone ; Immediate deletion ; Lines deleted as the goal

== unit-test-generation-agent | Unit Test Generation Agent | llm-agents | batch | advanced | a=1 k=40
obj: Generate unit tests for untested code that compile, pass, increase coverage and catch real changes in behaviour, then offer them in a pull request for engineers.
con: Tests must compile, pass and fail when behaviour is broken ; Engineers review each pull request ; Agent runs in a sandbox ; No tests that only assert the current output blindly ; 3K repositories
sn: Quality | Tests that fail when the code is mutated | Coverage numbers | Coverage can be gamed by empty assertions
sn: Review | Human review of intent | Auto-merge | Tests encode behaviour
sn: Scope | Pure and well-bounded functions first | Everything | Hard-to-test code needs refactoring
sig: Coverage gap | uncovered branches | Target | From coverage tools
sig: Mutation score | share of injected faults caught | Quality | From mutation testing
sig: Compile and run result | pass or fail | Gate | From the sandbox
sig: Function purity and dependencies | testability | Feasibility | From analysis
noise: Developer name | personal data
noise: File name wording | weak link
noise: Commit time | irrelevant
base: Developers writing tests by hand and template generators, because they are the standard methods.
prod: An agent that proposes tests, runs them in a sandbox, checks mutation score and flakiness and opens a pull request with the evidence.
pipe: Coverage gap analysis @ coverage tools ; Test drafting @ coding agent ; Compile and run in sandbox @ sandbox ; Mutation check @ mutation tool ; Pull request @ code host ; Engineer review @ review platform ; Flake monitoring @ CI
edge: Hidden dependencies | tests need a database | Fakes or skip with a note
edge: Tests that mirror bugs | they assert wrong behaviour | Review prompts and spec links
edge: Flaky output | tests fail intermittently | Repeat runs before opening
off: Mutation score of generated tests ; Pass and stability rate ; Reviewer acceptance
on: Coverage of critical code ; Escaped defects ; Test maintenance cost
gap: Coverage as the goal ; Auto-merge ; Assertions of current output only

== flaky-test-detection | Flaky Test Detection and Quarantine | time-series,tabular | batch | foundational | a=1 k=4
obj: Identify tests that fail intermittently, estimate their cost and quarantine or fix them so CI results are trusted and engineers stop re-running pipelines.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Flaky classification with evidence from reruns ; Quarantine with an owner and a deadline ; Quarantined tests still run and report ; Daily analysis of 20M test results
sn: Label | Tests that pass and fail on the same code | Failures after changes | Those are real failures
sn: Action | Owner ticket with a deadline | Silent skip | Silent skips hide risk
sn: Cost | Developer time lost to flakes | Failure counts | Cost sets priority
sig: Pass-fail flip rate on same commit | outcome changes without code change | Core | From CI
sig: Time and resource correlation | failures with load or time | Cause | From CI
sig: Test age and dependencies | external services and timing use | Cause | From analysis
sig: Rerun outcomes | pass after retry | Evidence | From CI
noise: Developer name | personal data
noise: Test name wording | weak link
noise: Branch name | an artefact
base: Retry-on-failure and manual flaky lists, because they are the common handling.
prod: A flip-rate detector with cause hints and quarantine rules that keep tests running in the background and open tickets with deadlines.
pipe: Test result ingestion @ CI ; Flip detection @ statistics ; Cause hints @ rules and model ; Quarantine decision @ policy ; Owner ticket @ issue tracker ; Dashboards @ BI ; Outcome tracking @ weekly
edge: Infrastructure outage | many tests fail at once | Outage correlation to avoid false flakes
edge: New test | too few runs exist to judge | Minimum run counts
edge: Long-lived quarantine | tests stay quarantined | Deadlines and escalation
off: Precision and recall of flake labels ; Time saved in CI ; Quarantine duration
on: Reruns per pipeline ; CI trust surveys ; Time to fix flakes
gap: Silent skips ; Treating every failure as a flake ; No owner or deadline

== test-selection-prioritisation | Test Selection and Prioritisation | tabular | seconds | advanced | a=1 k=5
obj: Choose and order the tests most likely to fail for a given change so developers get failures sooner and pipelines run fewer tests safely.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{RankLoss}
con: Catch at least 99% of failing changes within the selected tests ; Full suite still runs before release ; Selection within 5 s ; Safety net of random tests ; 200M test executions per month
sn: Metric | Failures caught per minute of test time | Tests skipped | Skipped tests may hide failures
sn: Safety | A full run before release | Selection only | Selection can miss rare failures
sn: Label | Real failures linked to the change | Flaky failures | Flakes mislead the model
sig: Files changed and test mapping | tests linked to changed files | Core | From coverage maps
sig: Historical failure rate | past failures of the test | Prior | From CI
sig: Change risk | risk indicators of the change | Context | From the risk model
sig: Test runtime | time to run the test | Cost | From CI
noise: Developer name | personal data
noise: Test name wording | weak link
noise: Branch name | an artefact
base: Run all tests on every change or fixed subsets by directory, because they are the common setups.
prod: A selection model on change and history features with a random safety sample, a full run at merge or release and monitoring of the miss rate.
pipe: Change analysis @ code host ; Coverage mapping @ test impact analysis ; Failure model @ gradient boosting ; Selection and ordering @ rules ; CI run @ pipeline ; Miss monitoring @ full runs ; Retraining @ weekly
edge: Test environment changes | failures occur with no code link | Environment tags and full runs
edge: New tests | the new tests have no failure history | Always select new tests
edge: Cross-service impact | changes break other services | Dependency-aware selection
off: Failure catch rate at the time budget ; Miss rate on full runs ; Time saved
on: CI time ; Time to first failure ; Escaped failures
gap: Selection with no full run ; Learning from flaky failures ; Skipped-test counts as success

== test-gap-analysis | Test Gap Analysis from Changes and Coverage | tabular | batch | foundational | a=0.5 k=5
obj: Find recently changed or high-risk code that has little test coverage so teams add tests where they matter most.
con: Gaps ranked by change risk and coverage ; Links to the exact functions ; Teams decide what to test ; Weekly run for 5K repositories
sn: Value | Untested code that changes often | Low coverage everywhere | Cold code does not need first attention
sn: Evidence | Coverage and change history | Coverage alone | Coverage needs context
sn: Action | A short ranked list for each team | A report of everything | Teams need focus
sig: Coverage by function | tested share | Gap | From coverage tools
sig: Churn | changes per period | Importance | From version control
sig: Defect history | bugs in the function | Risk | From the tracker
sig: Criticality | service tier | Priority | From the catalogue
noise: Developer name | personal data
noise: Language alone | weak link
noise: File size | weak link
base: Coverage percentage targets by repository, because they are the common governance.
prod: A ranking of untested hot code with links to functions and suggested test types, delivered to team backlogs.
pipe: Coverage and change data @ CI and version control ; Risk join @ service catalogue ; Gap ranking @ rules and model ; Test suggestions @ LLM ; Team backlog @ issue tracker ; Progress tracking @ BI ; Review @ monthly
edge: Generated code | coverage is misleading | Exclusions
edge: Integration-only coverage | unit coverage looks low | Test type tags
edge: Large refactor | churn is inflated | Refactor flags
off: Defect capture in top-ranked gaps ; Ranking stability ; Team acceptance
on: Escaped defects in high-churn code ; Coverage of risky code ; Test effort per defect avoided
gap: Coverage percentage targets ; Ignoring change history ; Whole-repository reports

== ui-test-self-healing | UI Test Self-Healing | computer-vision,llm-agents | seconds | advanced | a=1 k=20
obj: Repair broken UI test locators after interface changes by finding the matching element and proposing an update, while engineers approve each change and real bugs still fail.
con: Proposed fixes are reviewed ; Tests that fail because behaviour changed are never auto-healed ; Healing events logged ; Locator repair within 30 s ; 50K UI tests
sn: Distinction | A moved element versus a broken feature | Any failure repaired | Healing a real bug hides it
sn: Control | Engineer approval for each fix | Silent updates | Silent updates mask regressions
sn: Evidence | Before and after screenshots | A passing test | A pass may be a false pass
sig: Candidate element similarity | similarity of the old and new element | Match | From the DOM and vision
sig: Layout and text context | nearby labels and structure | Match | From the page
sig: Behaviour assertion result | whether the outcome is still correct | Guard | From the test
sig: Healing history | past healing events for the test | Risk | From logs
noise: Developer name | personal data
noise: Test name wording | weak link
noise: Browser version alone | weak link
base: Manual locator updates by test engineers, because it is the typical practice.
prod: A locator repair service that proposes new selectors with screenshots, requires approval, never touches assertions and reports healing rates.
pipe: Test failure intake @ CI ; Failure type check @ rules ; Candidate search @ DOM and vision model ; Proposed fix @ pull request ; Engineer approval @ review platform ; Re-run @ CI ; Healing audit @ weekly
edge: Redesign | many elements change at once | Block and request manual update
edge: Duplicate elements | several candidates match | Ask for human choice
edge: Real regression | the feature is broken | Behaviour checks stop healing
off: Correct repair rate ; Healing of real bugs ; Time to repair
on: Test maintenance hours ; Escaped regressions ; Healed failures later found to be bugs
gap: Silent healing ; Healing assertion failures ; No screenshots as evidence

== test-failure-triage-root-cause | Test Failure Triage and Root Cause Agent | llm-agents,nlp | seconds | advanced | a=0.3 k=60
obj: Classify test failures as product bug, test bug, environment or flake and point to the likely cause with log evidence so engineers fix the right thing quickly.
con: Every classification cites log lines and diffs ; The agent cannot change code or retry production jobs ; Engineers confirm before closing ; Triage within 2 minutes ; 100K failures per day
sn: Label | The cause confirmed by engineers | Failure message text | Messages repeat across causes
sn: Evidence | Log lines and the suspect commit | A summary | Engineers need to check
sn: Scope | Likely causes with confidence | One cause | Failures often have several factors
sig: Error signature | normalised error message and stack | Clustering | From logs
sig: Suspect commit window | commits since the last pass | Cause | From version control
sig: Environment health | infrastructure alarms | Context | From monitoring
sig: Flake history | past flip rate of the test | Context | From CI
noise: Developer name | personal data
noise: Log line numbers | an artefact
noise: Branch name | an artefact
base: Engineers reading logs and re-running failed jobs, because it is the usual process.
prod: A triage agent that clusters failures, retrieves logs and recent commits, proposes a cause with evidence and routes the item to the owning team.
pipe: Failure intake @ CI ; Error clustering @ embeddings ; Log and commit retrieval @ read-only tools ; Cause proposal @ LLM with citations ; Routing @ ownership data ; Engineer confirmation @ issue tracker ; Accuracy tracking @ weekly
edge: Multiple causes | two issues overlap | Show candidate causes
edge: Truncated logs | key lines are missing | State the gap
edge: Infrastructure incident | many failures share a cause | Group by incident
off: Cause classification accuracy ; Evidence faithfulness ; Routing accuracy
on: Time to triage ; Re-runs ; Failures bounced between teams
gap: Closing without confirmation ; Uncited causes ; Single-cause assumptions

== performance-regression-detection | Performance Regression Detection | time-series | batch | advanced | a=1 k=4
obj: Detect performance regressions in benchmarks and canaries per commit despite noisy measurements, and point to the change that caused them.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Regressions above 3% detected with 95% confidence ; Culprit commit named within 10 builds ; Noise estimated per benchmark ; Daily run for 10K benchmarks
sn: Noise | A per-benchmark noise model | A fixed threshold | Noise differs by test and machine
sn: Attribution | Bisection or change-point attribution | A trend chart | Teams need the commit
sn: Cost | Machine time per benchmark | Run everything every time | Compute is limited
sig: Benchmark time series | measurements per commit | Core | From CI
sig: Machine and environment tags | hardware and load | Noise source | From the lab
sig: Change point statistics | detected shifts | Regression | From the detector
sig: Commit range | commits since the last stable result | Attribution | From version control
noise: Developer name | personal data
noise: Benchmark name wording | weak link
noise: Branch name | an artefact
base: Fixed thresholds on benchmark results with manual review, because they are the common practice.
prod: A change-point detector with per-benchmark noise models, automatic bisection and a ticket with the culprit commit and plots.
pipe: Benchmark ingestion @ CI ; Noise modelling @ statistics ; Change-point detection @ detector ; Bisection @ automated reruns ; Ticket with evidence @ issue tracker ; Owner review @ team ; Accuracy tracking @ monthly
edge: Noisy machine | a bad runner distorts results | Machine tagging and exclusion
edge: Gradual drift | no single commit stands out | Trend alerts
edge: Benchmark change | the test itself changes | Versioned benchmarks
off: Detection rate on seeded regressions ; False alarms per week ; Attribution accuracy
on: Regressions caught before release ; Time to culprit ; Performance incidents
gap: Fixed thresholds ; Trend charts with no culprit ; Ignoring machine noise
