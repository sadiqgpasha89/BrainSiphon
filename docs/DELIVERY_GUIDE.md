# BrainSiphon delivery guide: from project scoping to deployment and monitoring

> One path, 7 phases and 69 steps, that takes any BrainSiphon use case from a named business problem to a monitored production service. Every step says who does it, who takes part, when, how, what it produces and where to read in the blueprint.

Interactive version, with your use case selected and a progress checklist: https://sadiqgpasha89.github.io/BrainSiphon/delivery

<!-- Generated from src/content/delivery.ts by `npm run guide:build`. Edit that file, not this one. -->

## Contents

- [How to use this guide](#how-to-use-this-guide)
- [The path at a glance](#the-path-at-a-glance)
- [Who is involved](#who-is-involved)
- [RACI by phase](#raci-by-phase)
- [Phase 0 · Discovery and business requirements](#phase-0--discovery-and-business-requirements)
- [Phase 1 · Architecture and design](#phase-1--architecture-and-design)
- [Phase 2 · Data](#phase-2--data)
- [Phase 3 · Model and application build](#phase-3--model-and-application-build)
- [Phase 4 · Platform, security and verification](#phase-4--platform-security-and-verification)
- [Phase 5 · Release and deployment](#phase-5--release-and-deployment)
- [Phase 6 · Operate, monitor and improve](#phase-6--operate-monitor-and-improve)
- [Meeting rhythm](#meeting-rhythm)
- [Evaluation, guardrails and governance: where each is covered](#evaluation-guardrails-and-governance-where-each-is-covered)
- [Frameworks and regulations: a crosswalk](#frameworks-and-regulations-a-crosswalk)
- [Monitoring after go-live](#monitoring-after-go-live)
- [Adapting to your team](#adapting-to-your-team)
- [Adapting to the kind of use case](#adapting-to-the-kind-of-use-case)
- [Every deliverable, in order](#every-deliverable-in-order)
- [Glossary](#glossary)

## How to use this guide

1. **Pick a use case.** Choose a domain, then follow its “Start here” path, a track or search. Take the blueprint closest to your problem, not the most impressive one.
2. **Read its blueprint once.** Top to bottom, in Pure Signal mode if time is short. The blueprint is the worked answer for that use case; this guide is the order to do the work in.
3. **Work through the phases in order.** Select your use case at the top of the guide and every step links to the exact blueprint section to read. Tick steps off as you finish them.
4. **Replace proposals with your own facts.** Blueprint content is a generated starting point unless its Validation section records a review. Every number, system name and threshold is a proposal to confirm.
5. **Do not pass a gate without its evidence.** Each phase ends in a gate with named signers. A gate lists things that must exist, not things you intend to do.
6. **Keep running Phase 6.** Go-live is the middle of the work. Monitoring, retraining and the quarterly review continue until the system is retired.

A blueprint is the worked answer for one use case. This guide is the order to do the work in, and it is the same for all of them. Wherever a step says “read”, it names the section of the blueprint to open; on the website those are links once you select a use case.

## The path at a glance

| Phase | Goal | Led by | Accountable | When | Ends with |
| --- | --- | --- | --- | --- | --- |
| **0 · Discovery and business requirements** | Agree which decision the system will support, for whom, how success is measured and whether AI is warranted at all, before anyone designs or builds anything. | Business Analyst | Executive sponsor | Weeks 1–2 | Gate 0 · Scope approved |
| **1 · Architecture and design** | Turn the approved requirements into a design that fits your enterprise, meets its non-functional targets and can be built, tested, released and rolled back. | Solution Architect | Solution Architect | Weeks 2–4 | Gate 1 · Design approved |
| **2 · Data** | Get lawful access to the data, prove it is fit for purpose, and turn it into reproducible, leak-free datasets and feature pipelines. | Data Engineer | Data owner (data steward) | Weeks 3–7 | Gate 2 · Data ready |
| **3 · Model and application build** | Build a baseline, beat it with a candidate, and turn the result into packaged, reproducible, callable software inside the user’s workflow. | Data Scientist | AI Architect | Weeks 5–10 | Gate 3 · Build complete |
| **4 · Platform, security and verification** | Prove, in an environment that resembles production, that the system meets its requirements, is secure, can be observed, and can be rolled back. | QA / Test Engineer | Delivery lead (project manager) | Weeks 8–12 | Gate 4 · Ready for release |
| **5 · Release and deployment** | Put the system in front of real traffic gradually, prove the business effect with a planned experiment, and hand a working service to operations. | MLOps Engineer | Product owner (decision owner) | Weeks 12–14, with hypercare to week 16 | Gate 5 · Live and accepted |
| **6 · Operate, monitor and improve** | Keep the service reliable, the model accurate, the cost under control and the benefit visible, for as long as the system runs. | SRE / DevOps Engineer | Product owner (decision owner) | From week 14, continuously | Gate 6 · Quarterly service review |

Week numbers follow a 16-week reference plan for a first production release by a small team. They are planning defaults to replace with your own estimate, not measurements. Phases overlap on purpose: data work starts before the design is closed, and verification starts before the build ends.

## Who is involved

Two groups. **Business partners** own the problem, the data, the rules and the money. **Delivery roles** design, build, verify and run the system. On a small team one person holds several roles (see [Adapting to your team](#adapting-to-your-team)).

### Business partners

| Partner | What they do | How you work with them | When they are needed | Decisions that are theirs |
| --- | --- | --- | --- | --- |
| **Executive sponsor** | Owns the business problem and the budget, and removes blockers the team cannot remove itself. | Approves the business case, chairs the monthly steering meeting and hears escalations within a day. | Phase 0 gate, monthly steering, the go/no-go review and every quarterly service review. | Fund, pause or stop the work. |
| **Product owner (decision owner)** | Owns the business decision the system supports: its priorities, its thresholds and whether the result is accepted. | Available to the team every week, attends demos, settles scope trade-offs and signs acceptance. | Every phase. Signs gates 0, 1, 3, 4 and 5, and owns the service in Phase 6. | Scope, the operating point (the cost of a false positive against a false negative), acceptance and go-live. |
| **Delivery lead (project manager)** | Runs the plan: who does what by when, the risks, the gate reviews and the meeting rhythm. | Keeps the plan, RACI and risk register current, and calls each gate review with the evidence attached. | From day one until operations accepts the service in Phase 5. | Sequencing and day-to-day priorities inside the agreed scope. |
| **Domain expert (subject-matter expert)** | Explains how the work is really done today and what a correct answer looks like. | Interviews and working sessions; reviews label definitions and reads the model’s worst mistakes with the data scientist. | Phase 0 interviews, Phase 2 label definition, Phase 3 error analysis, Phase 4 acceptance. | Whether a label, a rule or an output is correct in the real domain. |
| **End users and process owners** | The people who act on the system’s output every day, and the manager who owns their process. | Are observed doing the work, review the TO-BE process, run user acceptance tests and give feedback after launch. | Phase 0 process mapping, Phase 3 application design, Phase 4 acceptance testing, Phase 5 training, Phase 6 feedback. | Whether the new process is workable in practice. |
| **Data owner (data steward)** | Accountable for a source dataset: its meaning, its quality and who may use it for what. | Grants access against a stated purpose, signs the data contract and is told about every quality issue found. | Phase 0 classification, Phase 1 contracts, Phase 2 access and quality, Phase 6 change notifications. | Whether the data may be used for this purpose, and under which conditions. |
| **Risk, compliance, legal and privacy** | Interprets the laws, regulations and internal policies that apply, and reviews the model where the risk tier requires it. | Confirms the risk tier and the approval path, reviews the privacy assessment and the model documentation, and holds the evidence. | Phase 0 risk tier, Phase 2 privacy assessment, Phase 3 model review, Phase 4 compliance evidence, Phase 5 go/no-go, Phase 6 periodic review. | Whether the obligations are met, and which findings may be accepted rather than fixed. |
| **Finance (FinOps)** | Validates the business case and tracks what the system costs and returns. | Reviews the value and cost assumptions, sets the budget and receives the monthly cost and benefit numbers. | Phase 0 business case, Phase 1 cost model, Phase 5 experiment readout, Phase 6 monthly and quarterly reviews. | Whether the numbers in the business case are credible. |
| **Support and service desk** | First line for users once the system is live. | Is trained before go-live, works from the runbooks and escalates along the agreed path. | Phase 4 runbooks and training, Phase 5 hypercare and handover, Phase 6 every day. | When an issue is escalated to on-call engineering. |

### Delivery roles

| Role | Owns | Works on |
| --- | --- | --- |
| **Business Analyst** | Establishes who the system is for, what it must do and how its value is measured | Requirements, AS-IS/TO-BE process, user journeys, acceptance criteria, stakeholders, RACI and the business case. |
| **Solution Architect** | Integrates the solution into the enterprise | C4 views, integration, technology selection, APIs, application boundaries, NFRs and decision records. |
| **AI Architect** | Decides the AI/ML solution topology and model strategy | AI feasibility, model selection, RAG/agent decisions, model topology, human oversight and AI risk. |
| **Data Analyst** | Defines, profiles and explains the data and the KPIs the business will judge it by | Data profiling, business definitions, source-to-target mapping, KPI definitions, quality analysis and dashboards. |
| **Data Engineer** | Builds and maintains data pipelines and data products | Ingestion, CDC, streaming and batch, data contracts, lakehouse, transformations, feature pipelines and lineage. |
| **Data Scientist** | Develops and validates analytical and ML models | EDA, hypothesis tests, statistical validation, features, model selection, bias, calibration and experiments. |
| **ML Engineer** | Turns validated models into packaged, reproducible, callable software | Training pipelines, model packaging, reusable transforms, registry integration, batch scoring and inference interfaces. |
| **AI Engineer** | Builds AI applications, RAG, tools and agent workflows | LLM integration, prompts, tools, retrieval, agents, structured output, orchestration, evaluation and app integration. |
| **MLOps Engineer** | Industrialises model development, deployment and ongoing operations | Experiment tracking, registry, CI/CD/CT, deployment, drift monitoring, retraining, rollback and governance automation. |
| **Inference Engineer** | Optimises model execution, runtimes and serving performance | Runtime optimisation, GPU/CPU allocation, quantisation, batching, memory management and latency. |
| **Platform Engineer** | Provides the cloud, cluster, network, identity and pipeline foundations | Cloud infrastructure, Kubernetes, networking, IAM, secrets, Terraform, CI/CD infrastructure and platform services. |
| **Forward Deployed Engineer** | Bridges customer enterprise reality and the reference blueprint: integrations, VPC/auth enablement, deployment, and day-2 customer troubleshooting | Customer discovery, enterprise integration, environment configuration, deployment, user adoption, and production feedback. |
| **SRE / DevOps Engineer** | Keeps the service reliable and recoverable, and owns on-call and runbooks | SLOs, observability, incident response, reliability, disaster recovery, capacity planning and runbooks. |
| **Security Engineer** | Threat-models the system and signs off its security and privacy controls | Threat modelling, IAM, vulnerability management, encryption, privacy, data access and security sign-off. |
| **QA / Test Engineer** | Proves the system meets its requirements before and after every release | Functional, integration, contract, regression, performance, fault-injection and acceptance testing. |

### What each delivery role does in each phase

**Business Analyst**

- Phase 0: Leads discovery: users, decision owner, AS-IS and TO-BE process, journeys, requirements, acceptance criteria, RACI, baseline and the business case.
- Phase 1: Keeps requirements traceable to design decisions and settles scope trade-offs with the decision owner.
- Phase 4: Co-owns acceptance criteria with QA and arranges business user acceptance testing.
- Phase 5: Prepares the business change: training, policy changes, communications and the go-live approval.
- Phase 6: Tracks realised benefit against the baseline and the ROI measure.

**Solution Architect**

- Phase 0: Confirms the existing landscape, systems of record and constraints that bound the solution.
- Phase 1: Owns C4 views, integration contracts, technology selection, NFRs and architecture decision records.
- Phase 4: Reviews that what is built matches the integration boundaries and NFRs.
- Phase 5: Approves the cut-over and coexistence plan with the legacy path.

**AI Architect**

- Phase 0: Judges whether AI is warranted at all, and what risk and oversight the use case needs.
- Phase 1: Chooses the model topology, retrieval or agent design, human-oversight points and AI risk controls.
- Phase 3: Arbitrates model-strategy changes found during build.
- Phase 5: Signs off promotion evidence against the decision matrix.
- Phase 6: Reviews drift and incident findings against the original design assumptions.

**Data Analyst**

- Phase 0: Profiles candidate sources and writes the business definitions and KPI definitions the requirements rely on.
- Phase 2: Produces the source-to-target mapping, data-quality analysis and the baseline numbers.
- Phase 6: Maintains the analytical dashboards that show the KPIs and their movement.

**Data Engineer**

- Phase 0: Confirms data ownership, access and refresh cadence of each source.
- Phase 2: Builds ingestion (CDC, streaming, batch), data contracts, transformations, feature pipelines and lineage.
- Phase 3: Delivers point-in-time training datasets and the online/offline feature parity checks.
- Phase 6: Runs the pipelines, handles schema change and backfills without touching live keys.

**Data Scientist**

- Phase 0: Tests whether the signal plausibly exists and sets the success metric with the business.
- Phase 2: Runs exploratory analysis, leakage checks and feature engineering on matured labels.
- Phase 3: Selects and validates the model: statistics, slices, bias, calibration and experiment design.
- Phase 6: Investigates drift and decides whether a challenger is justified.

**ML Engineer**

- Phase 2: Reuses the feature transforms so training and serving share one definition.
- Phase 3: Builds the training pipeline, packages the model, integrates the registry and exposes batch and online inference interfaces.
- Phase 5: Hands a signed, reproducible model artifact to MLOps.
- Phase 6: Fixes reproducibility and packaging defects found in production.

**AI Engineer**

- Phase 1: Specifies prompts, tools, retrieval and output contracts with the architects.
- Phase 3: Builds the application layer: LLM integration, retrieval, agents, structured output, orchestration and the evaluation harness.
- Phase 4: Fixes the failures the evaluation, red-team and test suites find.
- Phase 6: Maintains prompts, indexes and tool contracts as release artifacts.

**MLOps Engineer**

- Phase 1: Defines the release path, environments and promotion gates.
- Phase 3: Automates training CI/CT, experiment tracking and the model registry.
- Phase 5: Runs shadow, canary, promotion and rollback, and collects the release evidence.
- Phase 6: Operates drift monitoring, retraining triggers and model governance automation.

**Inference Engineer**

- Phase 1: Sizes the serving plane: hardware class, batching strategy and the latency budget per stage.
- Phase 3: Optimises the runtime: compilation, quantisation, memory and batching.
- Phase 4: Load-tests against the latency and throughput targets with QA.
- Phase 6: Tunes cost per decision and capacity as traffic changes.

**Platform Engineer**

- Phase 0: Confirms hosting, region, network and identity constraints.
- Phase 1: Designs the cloud landing zone, cluster, network and identity model.
- Phase 4: Builds the infrastructure as code, secrets handling and CI/CD infrastructure.
- Phase 5: Provides the environments and the deployment mechanics.
- Phase 6: Runs the platform services and keeps them patched.

**Forward Deployed Engineer**

- Phase 0: Conducts customer discovery, identifies target infrastructure/network/auth constraints, and secures data-access enablement.
- Phase 1: Maps customer enterprise security controls, private endpoints, API gateways, and custom identity federation to solution architecture.
- Phase 2: Configures customer data sources, enterprise CDC/event pipelines, and validates compliance with customer data governance.
- Phase 3: Customises business logic, model hooks, and customer application integration points to fit enterprise workflows.
- Phase 4: Executes customer-environment pre-flight checklists, IAM policies, and integration contract validation.
- Phase 5: Leads customer-side staging and production rollout, smoke tests, failover rehearsal, and initial user onboarding.
- Phase 6: Drives day-2 customer troubleshooting, user adoption telemetry, and feeds real-world edge cases back to core engineering.

**SRE / DevOps Engineer**

- Phase 1: Sets SLOs, error budgets, recovery objectives and the observability design.
- Phase 4: Builds telemetry, alerting, runbooks and the failure drills.
- Phase 5: Gates go-live on readiness: on-call, runbooks, capacity and rollback rehearsal.
- Phase 6: Owns on-call, incident response, disaster recovery drills and capacity planning.

**Security Engineer**

- Phase 0: Classifies the data and establishes the compliance obligations that apply.
- Phase 1: Threat-models the design and specifies identity, encryption, privacy and data-access controls.
- Phase 4: Runs vulnerability management and penetration or red-team tests, then gives security sign-off.
- Phase 5: Confirms controls are in place in production before go-live.
- Phase 6: Handles vulnerabilities, access reviews and security incidents.

**QA / Test Engineer**

- Phase 0: Turns the acceptance criteria into testable statements.
- Phase 1: Writes the test strategy across functional, integration, contract, performance and fault-injection levels.
- Phase 4: Executes and automates the suites, reports defects and runs regression.
- Phase 5: Gives the test-evidence verdict for go-live.
- Phase 6: Maintains the regression suite from production incidents.

## RACI by phase

**R** does the work (owns at least one step). **A** answers for the phase result. **C** takes part in a step, or calls or signs the gate. **I** is kept informed. A dot means no part in that phase. Derived from the steps below.

| Party | 0 Scope | 1 Design | 2 Data | 3 Build | 4 Verify | 5 Release | 6 Operate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Executive sponsor | A | I | I | I | I | C | C |
| Product owner (decision owner) | C | C | C | C | C | A/R | A/R |
| Delivery lead (project manager) | R | C | C | C | A | R | I |
| Domain expert (subject-matter expert) | C | I | C | C | C | I | I |
| End users and process owners | C | I | · | C | C | C | C |
| Data owner (data steward) | C | C | A | I | I | I | I |
| Risk, compliance, legal and privacy | C | C | C | C | R | C | C |
| Finance (FinOps) | C | C | · | · | I | C | C |
| Support and service desk | I | I | · | I | C | C | C |
| Business Analyst | R | C | C | C | R | R | R |
| Solution Architect | C | A/R | I | I | C | C | I |
| AI Architect | R | R | I | A | C | C | C |
| Data Analyst | R | C | R | I | I | C | C |
| Data Engineer | C | R | R | C | C | I | C |
| Data Scientist | C | C | R | R | C | R | R |
| ML Engineer | I | R | C | R | C | C | C |
| AI Engineer | I | C | C | R | C | I | C |
| MLOps Engineer | I | R | C | R | R | R | R |
| Inference Engineer | I | R | · | R | C | I | R |
| Platform Engineer | C | C | C | C | R | C | C |
| Forward Deployed Engineer | C | C | C | C | C | C | C |
| SRE / DevOps Engineer | I | C | I | I | R | R | R |
| Security Engineer | R | R | C | C | R | C | R |
| QA / Test Engineer | C | R | I | C | R | C | C |

## Phase 0 · Discovery and business requirements

**Goal.** Agree which decision the system will support, for whom, how success is measured and whether AI is warranted at all, before anyone designs or builds anything.

- **When:** Weeks 1–2
- **Led by:** Business Analyst
- **Accountable:** Executive sponsor
- **Kept informed:** MLOps Engineer, ML Engineer, AI Engineer, Inference Engineer, SRE / DevOps Engineer, Support and service desk
- **Before you start:** A sponsor has named a problem and can give you access to the people who do the work today.

| Step | What | Owner | When | Output |
| --- | --- | --- | --- | --- |
| 0.1 | Pick the use case and read its blueprint once, end to end | Delivery lead (project manager) | Week 1, day 1 | A one-page note: what we adopt from the blueprint, and what differs here. |
| 0.2 | Name the sponsor, the decision owner and every stakeholder | Business Analyst | Week 1, days 1–2 | Stakeholder map with a named decision owner. |
| 0.3 | Answer the eight discovery questions with evidence | Business Analyst | Week 1, days 2–5 | Discovery log: eight questions, each with a confirmed answer, its owner and its evidence. |
| 0.4 | Map the AS-IS process and design the TO-BE process | Business Analyst | Week 1, days 3–5 | AS-IS and TO-BE process maps and user journeys, agreed with the people who run them. |
| 0.5 | Measure the baseline | Data Analyst | Weeks 1–2 | Baseline report with KPI definitions. Measured, not estimated. |
| 0.6 | Decide whether AI is warranted at all | AI Architect | Week 2 | AI go/no-go recommendation with the completed decision matrix. |
| 0.7 | Classify the data and confirm the risk tier | Security Engineer | Week 2 | Data classification, confirmed risk tier and the approval path. |
| 0.8 | Write the requirements and acceptance criteria | Business Analyst | Week 2 | Approved requirements, testable acceptance criteria and a scope boundary. |
| 0.9 | Agree the RACI, the team and the plan | Delivery lead (project manager) | Week 2 | RACI, staffing plan, dated delivery plan and risk register. |
| 0.10 | Build the business case | Business Analyst | Week 2 | Business case with an ROI measurement plan. |

### 0.1 Pick the use case and read its blueprint once, end to end

- **Owner:** Delivery lead (project manager)
- **With:** Business Analyst, Solution Architect, AI Architect, Forward Deployed Engineer
- **When:** Week 1, day 1
- **How:**
  1. Open the domain page, follow its “Start here” path or a track, and choose the blueprint closest to your problem.
  2. Read the summary, the signal vs. noise matrix and the problem statement. Use Pure Signal mode if time is short.
  3. Read the Validation section so you know which parts are generated starting points and which are reviewed. Treat every number as a proposal to check.
  4. Write down where your organisation differs from the blueprint: different systems, volumes, regulators or users.
- **Output:** A one-page note: what we adopt from the blueprint, and what differs here.
- **Read in the blueprint:** Signal vs. Noise (`#signal-noise`); Problem & loss (`#problem`); Validation (`#validation`)

### 0.2 Name the sponsor, the decision owner and every stakeholder

- **Owner:** Business Analyst
- **With:** Executive sponsor, Product owner (decision owner), Delivery lead (project manager)
- **When:** Week 1, days 1–2
- **How:**
  1. List everyone who uses the output, is affected by it, pays for it, approves it or will operate it.
  2. For each person record what they need from the system and what they are worried about.
  3. Confirm one named decision owner: the person who owns the business outcome and the thresholds.
  4. Book a 30-minute interview with each group for this week.
- **Output:** Stakeholder map with a named decision owner.
- **Read in the blueprint:** Phase 0 · Stakeholders and user journeys (`#disc-stakeholders`)

### 0.3 Answer the eight discovery questions with evidence

- **Owner:** Business Analyst
- **With:** Product owner (decision owner), Domain expert (subject-matter expert), End users and process owners
- **When:** Week 1, days 2–5
- **How:**
  1. Take each proposed answer in the blueprint to the person named under “confirm with”.
  2. Replace the proposal with their confirmed answer and attach the evidence the blueprint asks for.
  3. Anything still unanswered becomes a risk with an owner and a date, not a silent assumption.
- **Output:** Discovery log: eight questions, each with a confirmed answer, its owner and its evidence.
- **Read in the blueprint:** Phase 0 · The eight questions to settle first (`#disc-questions`)

### 0.4 Map the AS-IS process and design the TO-BE process

- **Owner:** Business Analyst
- **With:** End users and process owners, Domain expert (subject-matter expert), Solution Architect
- **When:** Week 1, days 3–5
- **How:**
  1. Sit with the people who do the work. Record each step, its volume, its duration and where errors happen.
  2. Mark the exact point where the system’s output changes a decision, and who acts on it.
  3. Write what happens when the system is unavailable: the manual fallback must exist on paper now.
  4. Walk the TO-BE process back with the same people and correct it.
- **Output:** AS-IS and TO-BE process maps and user journeys, agreed with the people who run them.
- **Read in the blueprint:** Phase 0 · AS-IS and TO-BE process (`#disc-process`); Phase 0 · Stakeholders and user journeys (`#disc-stakeholders`)

### 0.5 Measure the baseline

- **Owner:** Data Analyst
- **With:** Data owner (data steward), Data Engineer, Data Scientist, Business Analyst
- **When:** Weeks 1–2
- **How:**
  1. Ask the data owner for read access and confirm with the data engineer who owns each source and how often it refreshes.
  2. Write each KPI as a definition: numerator, denominator, time window and source table.
  3. Compute today’s value from real records over at least one full business cycle.
  4. Record the performance of the current process (rules or people). That is the number to beat.
- **Output:** Baseline report with KPI definitions. Measured, not estimated.
- **Read in the blueprint:** Phase 0 · Business case and ROI measurement (`#disc-case`); Metrics catalogue (`#metrics`)

### 0.6 Decide whether AI is warranted at all

- **Owner:** AI Architect
- **With:** Data Scientist, Product owner (decision owner), Domain expert (subject-matter expert)
- **When:** Week 2
- **How:**
  1. Go through the AI decision matrix: why not rules, why this paradigm, what would change the answer.
  2. Check that the signal can exist: are there labels, how many, and how long after the event do they arrive?
  3. Write the cost of a wrong output in money or harm, separately for a false positive and a false negative.
  4. If rules or a simple baseline would meet the target, recommend that and say so plainly.
- **Output:** AI go/no-go recommendation with the completed decision matrix.
- **Read in the blueprint:** Enterprise context · AI decision matrix (`#ent-decision`); Signal vs. Noise (`#signal-noise`); Agentic solution (or a reasoned “no agent”) (`#agentic`)

### 0.7 Classify the data and confirm the risk tier

- **Owner:** Security Engineer
- **With:** Risk, compliance, legal and privacy, Data owner (data steward), AI Architect
- **When:** Week 2
- **How:**
  1. Classify every source: personal, financial, health, confidential or public.
  2. List the laws, regulations and internal policies that apply, including where data must reside.
  3. Confirm the risk tier with risk and compliance, and the approval path that tier requires.
- **Output:** Data classification, confirmed risk tier and the approval path.
- **Read in the blueprint:** Security & governance · Risk tier (`#governance`); Security & governance · Approval path (`#gov-approvals`); Security & governance · Obligation to control to evidence (`#gov-regulatory`)

### 0.8 Write the requirements and acceptance criteria

- **Owner:** Business Analyst
- **With:** Product owner (decision owner), QA / Test Engineer, Solution Architect, Platform Engineer
- **When:** Week 2
- **How:**
  1. Write functional requirements as “the system shall…”, each with an acceptance criterion.
  2. Have QA rewrite every criterion as a testable given/when/then statement.
  3. Capture what drives the non-functional requirements: latency, availability, peak volume, retention, and the hosting, region and network constraints.
  4. Write an explicit out-of-scope list.
- **Output:** Approved requirements, testable acceptance criteria and a scope boundary.
- **Read in the blueprint:** Phase 0 · Requirements and acceptance criteria (`#disc-requirements`); Enterprise context · Non-functional requirements (`#ent-nfr`)

### 0.9 Agree the RACI, the team and the plan

- **Owner:** Delivery lead (project manager)
- **With:** Executive sponsor, Product owner (decision owner), Business Analyst
- **When:** Week 2
- **How:**
  1. Give every decision exactly one accountable person.
  2. Map the fourteen roles to named people. One person may hold several roles: write that down.
  3. Plan the seven phases with dates and a gate review at the end of each.
  4. Start a risk register with the ten biggest risks, each with an owner.
- **Output:** RACI, staffing plan, dated delivery plan and risk register.
- **Read in the blueprint:** Phase 0 · RACI (`#disc-raci`); Role lenses (`#role-lenses`)

### 0.10 Build the business case

- **Owner:** Business Analyst
- **With:** Finance (FinOps), Executive sponsor, Data Analyst
- **When:** Week 2
- **How:**
  1. Value: the move from baseline to target, multiplied by the unit value finance agrees.
  2. Cost: build, run (start from the capacity model), people and business change.
  3. State how the benefit will be measured after launch: the method and the data source, not only the number.
  4. Add a sensitivity line: what if only half the expected uplift arrives?
- **Output:** Business case with an ROI measurement plan.
- **Read in the blueprint:** Phase 0 · Business case and ROI measurement (`#disc-case`); Scale & capacity (with the sizing calculator) (`#scale`); Statistical validation · Measuring business value (`#xp-value`)

### Gate 0 · Scope approved

Called by: Delivery lead (project manager). Signed by: Executive sponsor, Product owner (decision owner). Every line is evidence that must exist.

- [ ] Every discovery question has a confirmed answer with a named owner.
- [ ] The baseline is measured from real records.
- [ ] The decision that AI is (or is not) warranted is recorded with its reasons.
- [ ] Requirements and acceptance criteria are approved, and the out-of-scope list exists.
- [ ] The risk tier and its approval path are confirmed by risk and compliance.
- [ ] The RACI is agreed and every role has a named person.
- [ ] The business case is approved and the next phase is funded.

### Common mistakes in Phase 0

- Starting with the model. Nothing in Phase 1 or later starts before this gate.
- Accepting an estimated baseline. Without a measured one you can never show the system helped.
- Treating the sponsor as the user. The person who pays is rarely the person who does the work.
- A scope with no out-of-scope list.
- No single named decision owner.

## Phase 1 · Architecture and design

**Goal.** Turn the approved requirements into a design that fits your enterprise, meets its non-functional targets and can be built, tested, released and rolled back.

- **When:** Weeks 2–4
- **Led by:** Solution Architect
- **Accountable:** Solution Architect
- **Kept informed:** Executive sponsor, End users and process owners, Support and service desk, Data Analyst, Domain expert (subject-matter expert)
- **Before you start:** Gate 0 is signed.

| Step | What | Owner | When | Output |
| --- | --- | --- | --- | --- |
| 1.1 | Place the system in your enterprise landscape | Solution Architect | Week 2 | C4 context and container views and an integration matrix. |
| 1.2 | Fix the non-functional requirements and the latency budget | Solution Architect | Week 2 | NFR matrix with a per-stage latency budget. |
| 1.3 | Choose the model strategy and the human-oversight points | AI Architect | Weeks 2–3 | Model strategy and oversight design, recorded as a decision record. |
| 1.4 | Design the high-level architecture and the fallback ladder | Solution Architect | Week 3 | High-level design, sequence diagram and fallback ladder. |
| 1.5 | Write the low-level design | ML Engineer | Weeks 3–4 | Low-level design: API contract, data model and event schema, reviewed by its consumers. |
| 1.6 | Design the data architecture and draft the data contracts | Data Engineer | Weeks 3–4 | Data architecture and draft data contracts. |
| 1.7 | Threat-model the design | Security Engineer | Week 3 | Threat model and security requirements. |
| 1.8 | Size capacity and cost | Inference Engineer | Week 3 | Capacity and cost model inside the business case. |
| 1.9 | Define environments, the release path and the SLOs | MLOps Engineer | Weeks 3–4 | Release and environment design, and an SLO document. |
| 1.10 | Write the test strategy | QA / Test Engineer | Week 4 | Test strategy with a traceability matrix. |
| 1.11 | Record the decisions and hold the architecture review | Solution Architect | Week 4 | Decision records and architecture review minutes with actions. |

### 1.1 Place the system in your enterprise landscape

- **Owner:** Solution Architect
- **With:** Platform Engineer, Data Engineer, Business Analyst, Forward Deployed Engineer
- **When:** Week 2
- **How:**
  1. Start from the blueprint’s context and container diagrams and replace every generic system with your real system of record.
  2. For each integration record direction, protocol, owning team and service level.
  3. Note what already exists and can be reused: a feature store, an API gateway, a model registry.
- **Output:** C4 context and container views and an integration matrix.
- **Read in the blueprint:** Enterprise context · Application and integration (`#ent-application`); Enterprise context · Business architecture (`#ent-business`); Enterprise context · Technology and security (`#ent-technology`)

### 1.2 Fix the non-functional requirements and the latency budget

- **Owner:** Solution Architect
- **With:** SRE / DevOps Engineer, Inference Engineer, Product owner (decision owner)
- **When:** Week 2
- **How:**
  1. Take the NFR matrix and replace each target with what your business needs: p99 latency, availability, recovery objectives and peak throughput.
  2. Split the latency budget across the hops of the request path so the stages add up to the p99.
  3. Mark which targets are hard (contractual or regulatory) and which are negotiable.
- **Output:** NFR matrix with a per-stage latency budget.
- **Read in the blueprint:** Enterprise context · Non-functional requirements (`#ent-nfr`); High-level design (`#hld`); Sequence diagram (`#sequence`)

### 1.3 Choose the model strategy and the human-oversight points

- **Owner:** AI Architect
- **With:** Data Scientist, AI Engineer, Product owner (decision owner)
- **When:** Weeks 2–3
- **How:**
  1. Decide the baseline first, then the production model family, from the pipeline blueprint.
  2. Decide where a person reviews or overrides the output, and what they see when they do.
  3. Record what evidence would make you change the choice later.
- **Output:** Model strategy and oversight design, recorded as a decision record.
- **Read in the blueprint:** Pipeline blueprint (`#blueprint`); Enterprise context · AI decision matrix (`#ent-decision`); Agentic solution (or a reasoned “no agent”) (`#agentic`)
- **Variation:** LLM, RAG and agent use cases: decide retrieval, fine-tuning or agent from the blueprint’s agent verdict, and specify prompts, tools and output contracts with the AI engineer.

### 1.4 Design the high-level architecture and the fallback ladder

- **Owner:** Solution Architect
- **With:** AI Architect, Platform Engineer, SRE / DevOps Engineer
- **When:** Week 3
- **How:**
  1. Adapt the high-level design: which parts are stateless, where state lives, which regions, and what residency rules pin.
  2. Define the fallback ladder: what the system returns when each dependency fails, down to a safe default.
  3. Walk the sequence diagram with the engineers and confirm the deadline is passed along every hop.
- **Output:** High-level design, sequence diagram and fallback ladder.
- **Read in the blueprint:** High-level design (`#hld`); Sequence diagram (`#sequence`); Security & governance · Guardrails (`#gov-guardrails`); Production edge cases (`#edge-cases`)

### 1.5 Write the low-level design

- **Owner:** ML Engineer
- **With:** AI Engineer, Data Engineer, QA / Test Engineer
- **When:** Weeks 3–4
- **How:**
  1. Specify the API contract (request, response, errors, idempotency), the data model, the event schema and the configuration.
  2. Treat the blueprint’s low-level design as a scaffold: mark each element adopt, change or drop.
  3. Have the consuming team review the contract before any code is written.
- **Output:** Low-level design: API contract, data model and event schema, reviewed by its consumers.
- **Read in the blueprint:** Low-level design (`#lld`)

### 1.6 Design the data architecture and draft the data contracts

- **Owner:** Data Engineer
- **With:** Data Analyst, Data owner (data steward), Solution Architect
- **When:** Weeks 3–4
- **How:**
  1. For each source record owner, refresh cadence, access path, retention and quality service level.
  2. Draft a data contract for the primary input with the team that produces it.
  3. Choose batch or streaming per feature from how fresh that feature must be, not from preference.
  4. Plan how training data will be correct as of the prediction time.
- **Output:** Data architecture and draft data contracts.
- **Read in the blueprint:** Enterprise context · Data architecture and data contract (`#ent-data`); Features & leakage (`#features`)

### 1.7 Threat-model the design

- **Owner:** Security Engineer
- **With:** Solution Architect, AI Architect, Platform Engineer, Risk, compliance, legal and privacy
- **When:** Week 3
- **How:**
  1. Walk the data flow and list the threats at every trust boundary, including the AI-specific ones the blueprint names.
  2. Give each threat a control and the evidence that will prove the control works, and check the list against the obligations risk and compliance named in Phase 0.
  3. Specify identity, secrets handling, encryption and the data-access model.
- **Output:** Threat model and security requirements.
- **Read in the blueprint:** Security & governance · AI security threats (`#gov-security`); Enterprise context · Technology and security (`#ent-technology`); Security & governance · Data governance (`#gov-data`)

### 1.8 Size capacity and cost

- **Owner:** Inference Engineer
- **With:** Platform Engineer, Finance (FinOps), SRE / DevOps Engineer
- **When:** Week 3
- **How:**
  1. Open the sizing calculator, choose the unit your workload is really sized in and enter your own volumes, at peak rather than average.
  2. Record nodes, storage and monthly cost as low, expected and high.
  3. Compare the cost per decision with the value per decision in the business case.
- **Output:** Capacity and cost model inside the business case.
- **Read in the blueprint:** Scale & capacity (with the sizing calculator) (`#scale`)

### 1.9 Define environments, the release path and the SLOs

- **Owner:** MLOps Engineer
- **With:** SRE / DevOps Engineer, Platform Engineer, QA / Test Engineer
- **When:** Weeks 3–4
- **How:**
  1. Define the environments (development, staging, production) and what is promoted between them.
  2. Write the promotion gates: tests, evaluation thresholds and approvals at each stage.
  3. Set service-level indicators, objectives and the error budget, and design what is logged, traced and measured.
  4. Decide the rollback mechanism now, while nothing is on fire.
- **Output:** Release and environment design, and an SLO document.
- **Read in the blueprint:** MLOps & LLMOps (`#mlops`); Production operations (`#operations`)

### 1.10 Write the test strategy

- **Owner:** QA / Test Engineer
- **With:** Business Analyst, ML Engineer, Data Scientist
- **When:** Week 4
- **How:**
  1. Define the test levels: unit, data, contract, integration, model evaluation, performance, fault injection and user acceptance.
  2. Trace every acceptance criterion to at least one test.
  3. Plan the test data: synthetic, or production data that has been masked.
- **Output:** Test strategy with a traceability matrix.
- **Read in the blueprint:** Evaluation (`#evaluation`); Production edge cases (`#edge-cases`); Build playbook · Test and acceptance plan (`#pb-tests`)

### 1.11 Record the decisions and hold the architecture review

- **Owner:** Solution Architect
- **With:** AI Architect, Security Engineer, Product owner (decision owner), Business Analyst
- **When:** Week 4
- **How:**
  1. Write one decision record per significant decision: context, options, decision, consequences.
  2. Decide build, buy or integrate for each component.
  3. Hold the review: walk the views, the targets, the threats and the cost. Check with the business analyst that every design decision traces to a requirement.
- **Output:** Decision records and architecture review minutes with actions.
- **Read in the blueprint:** Enterprise context · Architecture decision records (`#ent-adr`); Enterprise context · Build, buy or integrate (`#ent-buildbuy`)

### Gate 1 · Design approved

Called by: Delivery lead (project manager). Signed by: Solution Architect, AI Architect, Security Engineer, Product owner (decision owner). Every line is evidence that must exist.

- [ ] Context, container, high-level, sequence and low-level designs are reviewed.
- [ ] The stage budgets add up to the p99 latency target.
- [ ] Every non-functional requirement has a target and a test that will prove it.
- [ ] Every threat has a control and named evidence.
- [ ] Capacity and cost fit inside the business case.
- [ ] The release path, the SLOs and the rollback mechanism are defined.
- [ ] Every acceptance criterion traces to a test.
- [ ] Significant decisions are recorded.

### Common mistakes in Phase 1

- Copying the blueprint’s diagram without replacing its generic systems with your own.
- Sizing for average load instead of peak.
- No answer to “what does the user get when the model is down?”
- Leaving the rollback decision to the day of the incident.
- Choosing an agent because it is fashionable. Read the blueprint’s verdict first.

## Phase 2 · Data

**Goal.** Get lawful access to the data, prove it is fit for purpose, and turn it into reproducible, leak-free datasets and feature pipelines.

- **When:** Weeks 3–7
- **Led by:** Data Engineer
- **Accountable:** Data owner (data steward)
- **Kept informed:** Executive sponsor, Solution Architect, AI Architect, SRE / DevOps Engineer, QA / Test Engineer
- **Before you start:** Gate 0 is signed and the data architecture from step 1.6 is drafted.

| Step | What | Owner | When | Output |
| --- | --- | --- | --- | --- |
| 2.1 | Get access and sign the agreements | Data Engineer | Week 3 | Access approvals, signed data contracts and the privacy impact assessment. |
| 2.2 | Profile the data | Data Analyst | Weeks 3–4 | Data profiling report and a quality issues log. |
| 2.3 | Write the source-to-target mapping | Data Analyst | Week 4 | Source-to-target mapping that reconciles to a trusted report. |
| 2.4 | Define the label and the prediction point | Data Scientist | Week 4 | Label specification approved by the domain expert. |
| 2.5 | Build the ingestion pipelines | Data Engineer | Weeks 4–6 | Ingestion pipelines running in development, with lineage. |
| 2.6 | Add automated data-quality gates | Data Engineer | Weeks 5–6 | Automated quality checks that block bad data, and a dashboard. |
| 2.7 | Build the features, correct as of the prediction time | Data Engineer | Weeks 5–7 | Feature pipelines and feature definitions, with a test that proves no feature uses future data. |
| 2.8 | Create the training, validation and test datasets | Data Scientist | Weeks 6–7 | Versioned datasets with a dataset card, reproducible from code. |
| 2.9 | Explore the data and confirm the signal | Data Scientist | Weeks 6–7 | Exploration report with signal and leakage findings. |

### 2.1 Get access and sign the agreements

- **Owner:** Data Engineer
- **With:** Data owner (data steward), Security Engineer, Risk, compliance, legal and privacy, Forward Deployed Engineer
- **When:** Week 3
- **How:**
  1. Request access to each source with the purpose stated.
  2. Complete a privacy impact assessment wherever personal data is involved (under GDPR, a data protection impact assessment).
  3. Sign the data contract with each producing team.
  4. Use service accounts with the least privilege that works.
- **Output:** Access approvals, signed data contracts and the privacy impact assessment.
- **Read in the blueprint:** Security & governance · Data governance (`#gov-data`); Enterprise context · Data architecture and data contract (`#ent-data`); Build playbook · Before you start (`#pb-prereqs`)

### 2.2 Profile the data

- **Owner:** Data Analyst
- **With:** Data Engineer, Domain expert (subject-matter expert)
- **When:** Weeks 3–4
- **How:**
  1. For each table measure row counts, null rates, value ranges, duplicates, time coverage and late-arriving records.
  2. Compare what you find against the business definitions and take every surprise to the domain expert.
  3. Log each quality finding as an issue with an owner.
- **Output:** Data profiling report and a quality issues log.
- **Read in the blueprint:** Features & leakage (`#features`); Build playbook · Data (`#pb-data`)

### 2.3 Write the source-to-target mapping

- **Owner:** Data Analyst
- **With:** Data Engineer, Business Analyst
- **When:** Week 4
- **How:**
  1. For each target field record its source, transformation, business definition and owner.
  2. Reconcile totals against a report the business already trusts.
- **Output:** Source-to-target mapping that reconciles to a trusted report.
- **Read in the blueprint:** Enterprise context · Data architecture and data contract (`#ent-data`); Features & leakage (`#features`)

### 2.4 Define the label and the prediction point

- **Owner:** Data Scientist
- **With:** Domain expert (subject-matter expert), Data Analyst, Product owner (decision owner), AI Engineer
- **When:** Week 4
- **How:**
  1. Write precisely what is predicted, at which moment, using only what is known at that moment.
  2. Define the label and how long after the event the truth becomes known.
  3. Note any selection bias, for example outcomes that exist only for cases that were approved.
  4. Have the domain expert approve the definition.
- **Output:** Label specification approved by the domain expert.
- **Read in the blueprint:** Problem & loss (`#problem`); Statistical validation · Labels, sampling and data quality (`#xp-data`); Build playbook · Data (`#pb-data`)
- **Variation:** LLM and RAG use cases: build a golden set instead: representative inputs with expected outputs or scoring rubrics, written with the domain expert.

### 2.5 Build the ingestion pipelines

- **Owner:** Data Engineer
- **With:** Platform Engineer, MLOps Engineer
- **When:** Weeks 4–6
- **How:**
  1. Implement batch, change-data-capture or streaming ingestion as designed. Make every job idempotent and replayable.
  2. Validate the schema at the boundary and quarantine what fails.
  3. Capture lineage, keep pipeline code in version control and run it through CI.
- **Output:** Ingestion pipelines running in development, with lineage.
- **Read in the blueprint:** Pipeline blueprint (`#blueprint`); Low-level design (`#lld`); Enterprise context · Data architecture and data contract (`#ent-data`)
- **Variation:** RAG use cases: this is the corpus pipeline: collect, clean, chunk, embed and index the documents, with the same replay and lineage rules.

### 2.6 Add automated data-quality gates

- **Owner:** Data Engineer
- **With:** Data Analyst, MLOps Engineer
- **When:** Weeks 5–6
- **How:**
  1. Implement the checks in the data-quality service level: freshness, completeness, validity, uniqueness and volume.
  2. A failed check blocks everything downstream and alerts the owner.
  3. Publish a data-quality dashboard.
- **Output:** Automated quality checks that block bad data, and a dashboard.
- **Read in the blueprint:** Enterprise context · Data architecture and data contract (`#ent-data`); Metrics catalogue (`#metrics`)

### 2.7 Build the features, correct as of the prediction time

- **Owner:** Data Engineer
- **With:** Data Scientist, ML Engineer
- **When:** Weeks 5–7
- **How:**
  1. Implement the high-signal features the blueprint lists, and leave out the noisy ones it names.
  2. Compute every feature as of the prediction time. Never join in data from the future.
  3. Write each transform once and share it between training and serving.
  4. Review every feature for leakage.
- **Output:** Feature pipelines and feature definitions, with a test that proves no feature uses future data.
- **Read in the blueprint:** Features & leakage (`#features`); Signal vs. Noise (`#signal-noise`); Build playbook · Milestones with exit gates (`#pb-milestones`)

### 2.8 Create the training, validation and test datasets

- **Owner:** Data Scientist
- **With:** Data Engineer
- **When:** Weeks 6–7
- **How:**
  1. Split by time (and by entity where one entity has many rows). Do not split at random when time matters.
  2. Hold out the most recent period as the final test set and touch it once.
  3. Record the dataset version, date range, row count and label rate.
- **Output:** Versioned datasets with a dataset card, reproducible from code.
- **Read in the blueprint:** Evaluation · Offline protocol (`#ev-offline`); Statistical validation · Labels, sampling and data quality (`#xp-data`)

### 2.9 Explore the data and confirm the signal

- **Owner:** Data Scientist
- **With:** Data Analyst, Domain expert (subject-matter expert)
- **When:** Weeks 6–7
- **How:**
  1. Check that each expected signal actually separates the outcomes.
  2. Hunt for leakage: any feature that looks too good probably is.
  3. Check coverage for every segment that matters for fairness.
  4. Say whether the target looks reachable. If it does not, stop and take that back to Gate 0.
- **Output:** Exploration report with signal and leakage findings.
- **Read in the blueprint:** Signal vs. Noise (`#signal-noise`); Features & leakage (`#features`); Statistical validation · Calibration, uncertainty and slices (`#xp-model`)

### Gate 2 · Data ready

Called by: Delivery lead (project manager). Signed by: Data owner (data steward), Data Scientist, Security Engineer. Every line is evidence that must exist.

- [ ] Access is approved for this purpose and the data contracts are signed.
- [ ] Quality checks are automated and passing.
- [ ] The label definition is approved by the domain expert.
- [ ] A test proves no feature uses information from after the prediction time.
- [ ] Datasets are versioned and can be rebuilt from code.
- [ ] The signal is confirmed against the baseline, or the work has gone back to Gate 0.

### Common mistakes in Phase 2

- A random train/test split on time-dependent data.
- A feature filled in after the outcome is known.
- A one-off notebook extraction nobody can re-run.
- Defining the label without the domain expert.
- Different feature code for training and for serving.

## Phase 3 · Model and application build

**Goal.** Build a baseline, beat it with a candidate, and turn the result into packaged, reproducible, callable software inside the user’s workflow.

- **When:** Weeks 5–10
- **Led by:** Data Scientist
- **Accountable:** AI Architect
- **Kept informed:** Executive sponsor, Solution Architect, SRE / DevOps Engineer, Support and service desk, Data owner (data steward), Data Analyst
- **Before you start:** Gate 1 is signed. Model training starts when Gate 2 is signed; repository and serving work can start earlier.

| Step | What | Owner | When | Output |
| --- | --- | --- | --- | --- |
| 3.1 | Set up the repository, CI and experiment tracking | MLOps Engineer | Week 5 | Repository, CI, experiment tracking and model registry. |
| 3.2 | Run the starter kit and build the baseline | Data Scientist | Weeks 5–6 | Baseline with an evaluation report: the number every later model must beat. |
| 3.3 | Build the candidate model | Data Scientist | Weeks 6–8 | Candidate model, experiment log and error analysis. |
| 3.4 | Evaluate, calibrate and set the operating point | Data Scientist | Week 8 | Evaluation report and an operating point signed by the decision owner. |
| 3.5 | Package the model and build the training pipeline | ML Engineer | Weeks 7–9 | Reproducible training pipeline and a registered model. |
| 3.6 | Build the serving path | ML Engineer | Weeks 7–9 | Inference service running in development, with its fallbacks. |
| 3.7 | Optimise inference | Inference Engineer | Weeks 8–9 | Performance report: the latency budget is met at the planned cost. |
| 3.8 | Build the application and the human-in-the-loop | AI Engineer | Weeks 8–10 | Application integrated into the workflow, with feedback capture. |
| 3.9 | Build the evaluation harness and the guardrails | AI Engineer | Weeks 9–10 | Evaluation harness in CI and guardrails in the request path. |
| 3.10 | Write the model card | Data Scientist | Week 10 | Model card and, where required, the governance submission. |

### 3.1 Set up the repository, CI and experiment tracking

- **Owner:** MLOps Engineer
- **With:** ML Engineer, Platform Engineer, Forward Deployed Engineer
- **When:** Week 5
- **How:**
  1. Create the repository with branch protection and a code-review rule.
  2. Set up the experiment tracker and the model registry.
  3. Run linting, unit tests and data tests on every pull request.
  4. Pin dependencies and seeds so a run can be repeated.
- **Output:** Repository, CI, experiment tracking and model registry.
- **Read in the blueprint:** MLOps & LLMOps (`#mlops`); MLOps · Toolchain options (`#mlops-toolchain`)

### 3.2 Run the starter kit and build the baseline

- **Owner:** Data Scientist
- **With:** ML Engineer
- **When:** Weeks 5–6
- **How:**
  1. Check the blueprint’s starter verdict. If the kit is exact or adaptable, run it on its synthetic data to learn the path, then on your own.
  2. Build the simplest thing that could work: rules, a linear model, a seasonal-naive forecast, keyword search or a single prompt.
  3. Evaluate it with the full evaluation protocol.
- **Output:** Baseline with an evaluation report: the number every later model must beat.
- **Read in the blueprint:** Build playbook (`#playbook`); Build playbook · Milestones with exit gates (`#pb-milestones`); Pipeline blueprint (`#blueprint`); Evaluation (`#evaluation`)

### 3.3 Build the candidate model

- **Owner:** Data Scientist
- **With:** ML Engineer, AI Engineer, Domain expert (subject-matter expert)
- **When:** Weeks 6–8
- **How:**
  1. Train the model family the blueprint recommends. Tune on the validation set only and track every run.
  2. Read the worst mistakes with the domain expert and fix what they reveal in the data or the features.
  3. Stop when another week would not change the decision.
- **Output:** Candidate model, experiment log and error analysis.
- **Read in the blueprint:** Pipeline blueprint (`#blueprint`); Problem & loss (`#problem`); Build playbook · Milestones with exit gates (`#pb-milestones`)
- **Variation:** LLM, RAG and agent use cases: there may be no training. The loop is: change retrieval, prompt or tool, then re-score against the golden set.

### 3.4 Evaluate, calibrate and set the operating point

- **Owner:** Data Scientist
- **With:** Product owner (decision owner), Domain expert (subject-matter expert), AI Architect
- **When:** Week 8
- **How:**
  1. Score the untouched test set once and report the metrics with confidence intervals.
  2. Check calibration, and check every slice that matters, including fairness.
  3. Choose the threshold from the cost of a false positive against a false negative. This is the decision owner’s call, not the data scientist’s.
- **Output:** Evaluation report and an operating point signed by the decision owner.
- **Read in the blueprint:** Evaluation · Release thresholds (`#ev-thresholds`); Evaluation · Offline protocol (`#ev-offline`); Statistical validation · Calibration, uncertainty and slices (`#xp-model`)

### 3.5 Package the model and build the training pipeline

- **Owner:** ML Engineer
- **With:** MLOps Engineer, Data Scientist
- **When:** Weeks 7–9
- **How:**
  1. Turn the notebooks into one parameterised pipeline: data, features, train, evaluate, register.
  2. Prove that a run from a clean checkout reproduces the candidate’s metrics.
  3. Register the artifact with its version, data hash, code commit and metrics.
- **Output:** Reproducible training pipeline and a registered model.
- **Read in the blueprint:** MLOps & LLMOps (`#mlops`); Low-level design (`#lld`)

### 3.6 Build the serving path

- **Owner:** ML Engineer
- **With:** Inference Engineer, AI Engineer, Data Engineer
- **When:** Weeks 7–9
- **How:**
  1. Implement the API contract from the low-level design.
  2. Fetch online features through the same transforms used in training, and check online and offline values match.
  3. Add a timeout and pass the deadline along every hop.
  4. Implement the fallback ladder: cache, simpler model, rules, safe default.
- **Output:** Inference service running in development, with its fallbacks.
- **Read in the blueprint:** Low-level design (`#lld`); Sequence diagram (`#sequence`); High-level design (`#hld`)
- **Variation:** Batch use cases such as forecasting: this is the scheduled scoring job and its output tables, not an online service.

### 3.7 Optimise inference

- **Owner:** Inference Engineer
- **With:** ML Engineer, Platform Engineer
- **When:** Weeks 8–9
- **How:**
  1. Measure first: p50, p95, p99, throughput and memory.
  2. Apply batching, quantisation, compilation or different hardware, one change at a time.
  3. Confirm accuracy is unchanged after each optimisation, and compare the cost per decision with the capacity model.
- **Output:** Performance report: the latency budget is met at the planned cost.
- **Read in the blueprint:** Scale & capacity (with the sizing calculator) (`#scale`); High-level design (`#hld`)

### 3.8 Build the application and the human-in-the-loop

- **Owner:** AI Engineer
- **With:** Business Analyst, End users and process owners, ML Engineer
- **When:** Weeks 8–10
- **How:**
  1. Put the output where the user already works: the screen, the queue or the consuming API.
  2. Where a person acts on the output, show the reason and the evidence with it.
  3. Capture overrides and feedback as labelled data for later.
- **Output:** Application integrated into the workflow, with feedback capture.
- **Read in the blueprint:** Agentic solution (or a reasoned “no agent”) (`#agentic`); Phase 0 · AS-IS and TO-BE process (`#disc-process`); Sequence diagram (`#sequence`)
- **Variation:** Agent use cases: give the agent typed tools with explicit permissions and start at the lowest rung of the autonomy ladder.

### 3.9 Build the evaluation harness and the guardrails

- **Owner:** AI Engineer
- **With:** Data Scientist, QA / Test Engineer, Security Engineer
- **When:** Weeks 9–10
- **How:**
  1. Automate evaluation so it runs in CI on every model, prompt or feature change: regression set, slices and safety cases.
  2. Add input and output guardrails: validation, filters for personal data and, for LLMs, prompt-injection checks.
  3. Set thresholds that block promotion when they are missed.
- **Output:** Evaluation harness in CI and guardrails in the request path.
- **Read in the blueprint:** Evaluation (`#evaluation`); Security & governance · Guardrails (`#gov-guardrails`); Security & governance · AI security threats (`#gov-security`)

### 3.10 Write the model card

- **Owner:** Data Scientist
- **With:** AI Architect, Risk, compliance, legal and privacy
- **When:** Week 10
- **How:**
  1. Document intended use, out-of-scope use, data, metrics by slice, limitations, the operating point and the owner.
  2. Link the dataset version and the training run.
  3. Submit it to model-risk or governance review if the risk tier requires one.
- **Output:** Model card and, where required, the governance submission.
- **Read in the blueprint:** Security & governance · Model governance (`#gov-model`); Security & governance · Responsible AI (`#gov-rai`); Validation (`#validation`)

### Gate 3 · Build complete

Called by: Delivery lead (project manager). Signed by: AI Architect, Product owner (decision owner), Data Scientist. Every line is evidence that must exist.

- [ ] The candidate beats the baseline on the untouched test set by the agreed margin, or the baseline is what ships.
- [ ] The operating point is approved by the decision owner.
- [ ] The training pipeline reproduces the metrics from a clean checkout.
- [ ] Serving meets the latency budget in development.
- [ ] The fallback ladder is implemented and tested.
- [ ] The evaluation harness runs in CI.
- [ ] The model card is complete.

### Common mistakes in Phase 3

- Skipping the baseline, so nobody knows what the complex model added.
- Tuning on the test set.
- A model that only runs in a notebook.
- A threshold chosen by the data scientist alone.
- Reporting only the average metric and never the slices.
- No fallback path.

## Phase 4 · Platform, security and verification

**Goal.** Prove, in an environment that resembles production, that the system meets its requirements, is secure, can be observed, and can be rolled back.

- **When:** Weeks 8–12
- **Led by:** QA / Test Engineer
- **Accountable:** Delivery lead (project manager)
- **Kept informed:** Executive sponsor, Finance (FinOps), Data Analyst, Data owner (data steward)
- **Before you start:** Gate 1 is signed for platform work. Testing of a component starts as soon as it exists; the full run needs Gate 3.

| Step | What | Owner | When | Output |
| --- | --- | --- | --- | --- |
| 4.1 | Provision the environments as code | Platform Engineer | Weeks 8–9 | Staging and production environments created from code. |
| 4.2 | Build the deployment pipeline | MLOps Engineer | Weeks 9–10 | Deployment pipeline with promotion gates and rollback. |
| 4.3 | Instrument observability | SRE / DevOps Engineer | Weeks 9–11 | Dashboards, alerts and a prediction log. |
| 4.4 | Run functional, contract and integration tests | QA / Test Engineer | Weeks 9–11 | Test report and automated suites. |
| 4.5 | Load-test and inject faults | QA / Test Engineer | Weeks 10–11 | Performance and resilience report. |
| 4.6 | Test security and give sign-off | Security Engineer | Weeks 10–11 | Security test report and sign-off. |
| 4.7 | Review responsible AI and compliance | Risk, compliance, legal and privacy | Week 11 | Compliance evidence pack and approvals. |
| 4.8 | Run user acceptance testing | Business Analyst | Weeks 11–12 | Acceptance test report signed by the product owner. |
| 4.9 | Write the runbooks and train support | SRE / DevOps Engineer | Weeks 11–12 | Runbooks, on-call rota and trained support. |
| 4.10 | Rehearse rollback and disaster recovery | SRE / DevOps Engineer | Week 12 | Rollback and recovery rehearsal record, with timings. |

### 4.1 Provision the environments as code

- **Owner:** Platform Engineer
- **With:** SRE / DevOps Engineer, Security Engineer, Forward Deployed Engineer
- **When:** Weeks 8–9
- **How:**
  1. Define network, cluster, storage and identity as infrastructure code.
  2. Make staging mirror the production topology.
  3. Keep secrets in a secrets manager, never in code or configuration files.
  4. Tag resources for cost and set budget alarms.
- **Output:** Staging and production environments created from code.
- **Read in the blueprint:** Enterprise context · Technology and security (`#ent-technology`); High-level design (`#hld`); Scale & capacity (with the sizing calculator) (`#scale`)

### 4.2 Build the deployment pipeline

- **Owner:** MLOps Engineer
- **With:** Platform Engineer, ML Engineer
- **When:** Weeks 9–10
- **How:**
  1. Chain build, scan, test, deploy to staging and a gated promotion to production.
  2. Version and promote the model and the code together.
  3. Support shadow, canary and a one-command rollback.
- **Output:** Deployment pipeline with promotion gates and rollback.
- **Read in the blueprint:** MLOps & LLMOps (`#mlops`); MLOps · Retraining, champion/challenger and rollback (`#mlops-retraining`)

### 4.3 Instrument observability

- **Owner:** SRE / DevOps Engineer
- **With:** MLOps Engineer, Data Engineer, ML Engineer
- **When:** Weeks 9–11
- **How:**
  1. Emit structured logs with a request id, metrics for latency, errors and saturation, and traces across hops.
  2. Log every prediction with its input version, model version and output. Monitoring and audit both depend on it.
  3. Build a dashboard for each layer of the metrics catalogue.
  4. Tie each alert to an SLO, an owner and a runbook.
- **Output:** Dashboards, alerts and a prediction log.
- **Read in the blueprint:** Metrics catalogue (`#metrics`); Production operations (`#operations`); Metrics catalogue · Monitors for this system’s edge cases (`#mt-failure-monitors`)

### 4.4 Run functional, contract and integration tests

- **Owner:** QA / Test Engineer
- **With:** ML Engineer, AI Engineer, Data Engineer, Solution Architect
- **When:** Weeks 9–11
- **How:**
  1. Execute the test strategy and automate the suites into the pipeline.
  2. Run contract tests with every producer and consumer.
  3. Have the solution architect confirm that what was built matches the integration boundaries and targets.
  4. Triage defects daily and keep a regression suite.
- **Output:** Test report and automated suites.
- **Read in the blueprint:** Build playbook · Test and acceptance plan (`#pb-tests`); Low-level design (`#lld`); Phase 0 · Requirements and acceptance criteria (`#disc-requirements`)

### 4.5 Load-test and inject faults

- **Owner:** QA / Test Engineer
- **With:** Inference Engineer, SRE / DevOps Engineer
- **When:** Weeks 10–11
- **How:**
  1. Load-test at peak plus headroom, then run a soak test.
  2. Take away each dependency in turn and confirm the fallback ladder engages and the alert fires.
  3. Record whether the degraded mode stays inside the SLO.
- **Output:** Performance and resilience report.
- **Read in the blueprint:** Scale & capacity (with the sizing calculator) (`#scale`); Production edge cases (`#edge-cases`); Production operations (`#operations`)

### 4.6 Test security and give sign-off

- **Owner:** Security Engineer
- **With:** Platform Engineer, AI Engineer
- **When:** Weeks 10–11
- **How:**
  1. Scan dependencies and images.
  2. Run a penetration test or red-team exercise, including prompt injection and data exfiltration for LLM systems.
  3. Verify each control in the threat model against its evidence, and review who has access.
  4. Fix every finding or have it formally accepted by risk and compliance.
- **Output:** Security test report and sign-off.
- **Read in the blueprint:** Security & governance · AI security threats (`#gov-security`); Security & governance · Obligation to control to evidence (`#gov-regulatory`)

### 4.7 Review responsible AI and compliance

- **Owner:** Risk, compliance, legal and privacy
- **With:** Data Scientist, AI Architect, Security Engineer
- **When:** Week 11
- **How:**
  1. Check fairness metrics on the agreed slices against their thresholds.
  2. Check that explanations are adequate for the people affected.
  3. Complete the obligation, control and evidence table, and obtain the approvals the risk tier requires.
- **Output:** Compliance evidence pack and approvals.
- **Read in the blueprint:** Security & governance · Responsible AI (`#gov-rai`); Security & governance · Obligation to control to evidence (`#gov-regulatory`); Security & governance · Approval path (`#gov-approvals`)

### 4.8 Run user acceptance testing

- **Owner:** Business Analyst
- **With:** End users and process owners, Product owner (decision owner), QA / Test Engineer, Domain expert (subject-matter expert)
- **When:** Weeks 11–12
- **How:**
  1. Have real users, with the domain expert, run real scenarios in staging.
  2. Check the acceptance criteria one by one and collect usability problems.
  3. The product owner signs acceptance.
- **Output:** Acceptance test report signed by the product owner.
- **Read in the blueprint:** Phase 0 · Requirements and acceptance criteria (`#disc-requirements`); Phase 0 · Stakeholders and user journeys (`#disc-stakeholders`)

### 4.9 Write the runbooks and train support

- **Owner:** SRE / DevOps Engineer
- **With:** Support and service desk, MLOps Engineer, ML Engineer
- **When:** Weeks 11–12
- **How:**
  1. Write one runbook per failure scenario: how it is detected, who is alerted, how to mitigate, how to recover.
  2. Set the on-call rota and the escalation path.
  3. Train first- and second-line support: what the system does, known issues, how to escalate.
  4. Rehearse with a game day.
- **Output:** Runbooks, on-call rota and trained support.
- **Read in the blueprint:** Production operations (`#operations`); Production edge cases (`#edge-cases`)

### 4.10 Rehearse rollback and disaster recovery

- **Owner:** SRE / DevOps Engineer
- **With:** MLOps Engineer, Platform Engineer
- **When:** Week 12
- **How:**
  1. Roll staging back to the previous version through the real rollback path and time it.
  2. Restore from backup and compare against the recovery objectives.
  3. Record both results.
- **Output:** Rollback and recovery rehearsal record, with timings.
- **Read in the blueprint:** MLOps · Retraining, champion/challenger and rollback (`#mlops-retraining`); Production operations (`#operations`); Enterprise context · Non-functional requirements (`#ent-nfr`)

### Gate 4 · Ready for release

Called by: Delivery lead (project manager). Signed by: QA / Test Engineer, Security Engineer, SRE / DevOps Engineer, Product owner (decision owner). Every line is evidence that must exist.

- [ ] Every acceptance criterion passes.
- [ ] No critical or high defect or vulnerability is open.
- [ ] The load test meets the non-functional targets at peak.
- [ ] Every failure scenario has an alert and a runbook, and has been exercised.
- [ ] Rollback has been rehearsed and timed.
- [ ] User acceptance is signed.
- [ ] The compliance approvals are in hand.

### Common mistakes in Phase 4

- A staging environment that does not resemble production.
- Testing only the happy path.
- Alerts with no owner.
- “We will write the runbooks after go-live.”
- A rollback nobody has ever run.

## Phase 5 · Release and deployment

**Goal.** Put the system in front of real traffic gradually, prove the business effect with a planned experiment, and hand a working service to operations.

- **When:** Weeks 12–14, with hypercare to week 16
- **Led by:** MLOps Engineer
- **Accountable:** Product owner (decision owner)
- **Kept informed:** Data owner (data steward), Data Engineer, Inference Engineer, AI Engineer, Domain expert (subject-matter expert)
- **Before you start:** Gate 4 is signed.

| Step | What | Owner | When | Output |
| --- | --- | --- | --- | --- |
| 5.1 | Prepare the business change | Business Analyst | Week 12 | Users trained, communication sent, procedures updated. |
| 5.2 | Plan the cut-over and the experiment | MLOps Engineer | Week 12 | Rollout and experiment plan, written before any traffic moves. |
| 5.3 | Hold the go/no-go review | Product owner (decision owner) | Week 12 | Recorded go/no-go decision and an approved change request. |
| 5.4 | Deploy to production with no user impact | MLOps Engineer | Week 12 | Production deployment verified, with users still on the old path. |
| 5.5 | Run in shadow | MLOps Engineer | Weeks 12–13 | Shadow report: production behaves as offline evaluation predicted. |
| 5.6 | Canary, then ramp | MLOps Engineer | Weeks 13–14 | Ramp log with the decision taken at each step. |
| 5.7 | Measure the business effect | Data Scientist | Weeks 13–16, once labels mature | Experiment readout. |
| 5.8 | Run hypercare and hand over to operations | SRE / DevOps Engineer | Weeks 14–16 | Handover record: the service is accepted by operations. |
| 5.9 | Close the release | Delivery lead (project manager) | Week 16 | Release record and retrospective actions. |

### 5.1 Prepare the business change

- **Owner:** Business Analyst
- **With:** Product owner (decision owner), End users and process owners, Support and service desk, Forward Deployed Engineer
- **When:** Week 12
- **How:**
  1. Train the users and update the procedures and policies that change.
  2. Send the communication: what changes, when, and who to call.
  3. Define the hypercare period and who is in it.
- **Output:** Users trained, communication sent, procedures updated.
- **Read in the blueprint:** Phase 0 · AS-IS and TO-BE process (`#disc-process`); Enterprise context · Operating architecture (`#ent-operating`)

### 5.2 Plan the cut-over and the experiment

- **Owner:** MLOps Engineer
- **With:** Data Scientist, Solution Architect, Product owner (decision owner)
- **When:** Week 12
- **How:**
  1. Take the rollout design for this kind of system from the blueprint’s statistical validation section.
  2. Fix the success metric, the guardrail metrics and the stopping rules before the first user is exposed.
  3. Size the sample and the duration from the power calculation.
  4. Plan how the new path coexists with the legacy one, and have the solution architect approve it.
- **Output:** Rollout and experiment plan, written before any traffic moves.
- **Read in the blueprint:** Evaluation · Online evaluation (`#ev-online`); Statistical validation · Experimental design (`#xp-design`); Statistical validation · Metrics, power and stopping (`#xp-metrics`)

### 5.3 Hold the go/no-go review

- **Owner:** Product owner (decision owner)
- **With:** Executive sponsor, AI Architect, SRE / DevOps Engineer, Security Engineer, QA / Test Engineer, MLOps Engineer, Risk, compliance, legal and privacy
- **When:** Week 12
- **How:**
  1. Walk the Gate 4 evidence. Each signer says go or no-go and why.
  2. Confirm who decides a rollback and on which criteria.
  3. Raise the change request through your organisation’s change process.
- **Output:** Recorded go/no-go decision and an approved change request.
- **Read in the blueprint:** Security & governance · Approval path (`#gov-approvals`); Validation (`#validation`)

### 5.4 Deploy to production with no user impact

- **Owner:** MLOps Engineer
- **With:** Platform Engineer, SRE / DevOps Engineer, ML Engineer
- **When:** Week 12
- **How:**
  1. Deploy the signed artifact handed over by the ML engineer, with traffic off or behind a flag.
  2. Run smoke tests in production.
  3. Confirm dashboards, alerts and logs are receiving data.
- **Output:** Production deployment verified, with users still on the old path.
- **Read in the blueprint:** MLOps & LLMOps (`#mlops`); Production operations (`#operations`)

### 5.5 Run in shadow

- **Owner:** MLOps Engineer
- **With:** Data Scientist, SRE / DevOps Engineer
- **When:** Weeks 12–13
- **How:**
  1. Score real traffic without acting on the result.
  2. Compare with the legacy decisions and the offline expectation: score distribution, latency, errors, and online against offline feature values.
  3. Cover at least one full business cycle.
- **Output:** Shadow report: production behaves as offline evaluation predicted.
- **Read in the blueprint:** Statistical validation · Experimental design (`#xp-design`); Build playbook · Milestones with exit gates (`#pb-milestones`); Metrics catalogue (`#metrics`)

### 5.6 Canary, then ramp

- **Owner:** MLOps Engineer
- **With:** SRE / DevOps Engineer, Product owner (decision owner), Data Scientist
- **When:** Weeks 13–14
- **How:**
  1. Let a small share of traffic act on the model and watch the guardrails.
  2. Increase in steps (for example 1%, 5%, 25%, 50%, 100%) and only when the stopping rules allow.
  3. Roll back automatically on a guardrail breach.
- **Output:** Ramp log with the decision taken at each step.
- **Read in the blueprint:** Statistical validation · Metrics, power and stopping (`#xp-metrics`); MLOps · Retraining, champion/challenger and rollback (`#mlops-retraining`); Production operations (`#operations`)
- **Variation:** Batch use cases: the equivalent is shadow runs, then a holdout group that keeps the old plan while the rest use the new one.

### 5.7 Measure the business effect

- **Owner:** Data Scientist
- **With:** Data Analyst, Product owner (decision owner), Finance (FinOps)
- **When:** Weeks 13–16, once labels mature
- **How:**
  1. Analyse the experiment exactly as planned: the effect on the north-star metric against control, with its confidence interval.
  2. Check the guardrails and the slices.
  3. Wait for the labels to mature before declaring a result, and report it honestly, including a null result.
- **Output:** Experiment readout.
- **Read in the blueprint:** Statistical validation · Measuring business value (`#xp-value`); Statistical validation · Metrics, power and stopping (`#xp-metrics`); Metrics catalogue (`#metrics`)

### 5.8 Run hypercare and hand over to operations

- **Owner:** SRE / DevOps Engineer
- **With:** Support and service desk, MLOps Engineer, Delivery lead (project manager)
- **When:** Weeks 14–16
- **How:**
  1. Review the service every day for the first two to four weeks and triage issues the same day.
  2. Hand over runbooks, dashboards, contacts and known issues.
  3. Operations formally accepts the service.
- **Output:** Handover record: the service is accepted by operations.
- **Read in the blueprint:** Build playbook · The first 30 days after launch (`#pb-30`); Production operations (`#operations`)

### 5.9 Close the release

- **Owner:** Delivery lead (project manager)
- **With:** Executive sponsor, Product owner (decision owner), MLOps Engineer
- **When:** Week 16
- **How:**
  1. Publish release notes.
  2. Archive the release evidence: versions of code, data and model, test results and approvals.
  3. Hold a retrospective and move its actions, and the open risks, into the backlog.
- **Output:** Release record and retrospective actions.
- **Read in the blueprint:** Validation (`#validation`); MLOps & LLMOps (`#mlops`)

### Gate 5 · Live and accepted

Called by: Delivery lead (project manager). Signed by: Product owner (decision owner), SRE / DevOps Engineer, Executive sponsor. Every line is evidence that must exist.

- [ ] The planned share of traffic has been served inside the SLO for the agreed period.
- [ ] No guardrail metric was breached.
- [ ] The experiment readout is delivered.
- [ ] Rollback stayed available throughout the ramp.
- [ ] Operations has accepted the handover.
- [ ] The release evidence is archived.

### Common mistakes in Phase 5

- A big-bang release to everyone at once.
- Declaring success before the labels have matured.
- Changing the success metric after seeing the data.
- Nobody owns the rollback decision.
- Skipping user training.

## Phase 6 · Operate, monitor and improve

**Goal.** Keep the service reliable, the model accurate, the cost under control and the benefit visible, for as long as the system runs.

- **When:** From week 14, continuously
- **Led by:** SRE / DevOps Engineer
- **Accountable:** Product owner (decision owner)
- **Kept informed:** Solution Architect, Data owner (data steward), Delivery lead (project manager), Domain expert (subject-matter expert)
- **Before you start:** Gate 5 is signed. This phase does not end: it repeats until the system is retired.

| Step | What | Owner | When | Output |
| --- | --- | --- | --- | --- |
| 6.1 | Watch service health | SRE / DevOps Engineer | Continuously, reviewed daily | SLO report. |
| 6.2 | Monitor data quality and drift | MLOps Engineer | Every pipeline run, reviewed daily | Drift and data-quality dashboard with alerts. |
| 6.3 | Monitor model performance | Data Scientist | As labels mature, reviewed weekly | Weekly model performance review. |
| 6.4 | Track business value and adoption | Business Analyst | Monthly, with a quarterly value review | Benefit report against the baseline. |
| 6.5 | Control the cost | Inference Engineer | Monthly | Cost report and optimisation actions. |
| 6.6 | Handle incidents and learn from them | SRE / DevOps Engineer | Whenever an alert fires | Incident record and review actions. |
| 6.7 | Retrain, challenge and roll back | MLOps Engineer | On a trigger: drift, a performance drop, a schedule or a data change | Retraining record: a new champion, or a documented rejection. |
| 6.8 | Keep security and compliance current | Security Engineer | Continuous scanning, quarterly access review, periodic model review | Compliance evidence log. |
| 6.9 | Collect feedback and manage the backlog | Product owner (decision owner) | Every sprint | Prioritised backlog. |
| 6.10 | Review the service: continue, change or retire | Product owner (decision owner) | Quarterly | Quarterly service review decision. |

### 6.1 Watch service health

- **Owner:** SRE / DevOps Engineer
- **With:** Platform Engineer, Support and service desk, Forward Deployed Engineer
- **When:** Continuously, reviewed daily
- **How:**
  1. Track the indicators against their SLOs and the remaining error budget.
  2. On-call responds by severity, following the runbook.
  3. Review capacity against growth, and keep the platform patched.
- **Output:** SLO report.
- **Read in the blueprint:** Production operations (`#operations`); Metrics catalogue (`#metrics`)

### 6.2 Monitor data quality and drift

- **Owner:** MLOps Engineer
- **With:** Data Engineer, Data Scientist
- **When:** Every pipeline run, reviewed daily
- **How:**
  1. Check input schema, freshness, volume and null rates on every run.
  2. Compare feature and prediction distributions with the training data.
  3. Receive upstream change notices through the data contracts and handle schema changes and backfills without touching live keys.
- **Output:** Drift and data-quality dashboard with alerts.
- **Read in the blueprint:** Metrics catalogue (`#metrics`); Metrics catalogue · Monitors for this system’s edge cases (`#mt-failure-monitors`); MLOps & LLMOps (`#mlops`)

### 6.3 Monitor model performance

- **Owner:** Data Scientist
- **With:** MLOps Engineer, Data Analyst
- **When:** As labels mature, reviewed weekly
- **How:**
  1. Once labels arrive, compare the live metric with the offline expectation. Use proxy metrics until then.
  2. Check slices, fairness and calibration.
  3. Watch the human override rate: a rising rate means users have stopped trusting the output.
- **Output:** Weekly model performance review.
- **Read in the blueprint:** Evaluation · After launch (`#ev-continuous`); Metrics catalogue (`#metrics`); Statistical validation · Calibration, uncertainty and slices (`#xp-model`)

### 6.4 Track business value and adoption

- **Owner:** Business Analyst
- **With:** Data Analyst, Product owner (decision owner), Finance (FinOps)
- **When:** Monthly, with a quarterly value review
- **How:**
  1. Report the north-star metric and its drivers against the Phase 0 baseline.
  2. Report adoption: is the system used, ignored or overridden?
  3. Compare the realised benefit with the business case.
- **Output:** Benefit report against the baseline.
- **Read in the blueprint:** Phase 0 · Business case and ROI measurement (`#disc-case`); Statistical validation · Measuring business value (`#xp-value`); Metrics catalogue (`#metrics`)

### 6.5 Control the cost

- **Owner:** Inference Engineer
- **With:** Platform Engineer, Finance (FinOps)
- **When:** Monthly
- **How:**
  1. Compare the unit cost per decision with the capacity model.
  2. Right-size as traffic changes. For LLM systems watch token spend.
  3. Keep budget alerts active.
- **Output:** Cost report and optimisation actions.
- **Read in the blueprint:** Scale & capacity (with the sizing calculator) (`#scale`); Production operations (`#operations`)

### 6.6 Handle incidents and learn from them

- **Owner:** SRE / DevOps Engineer
- **With:** Support and service desk, Product owner (decision owner), QA / Test Engineer, ML Engineer
- **When:** Whenever an alert fires
- **How:**
  1. Classify the severity, follow the runbook and tell the people affected.
  2. Mitigate first (fall back or roll back), then fix.
  3. Hold a blameless review within five working days.
  4. Add a regression test for every incident and update the runbook.
- **Output:** Incident record and review actions.
- **Read in the blueprint:** Production operations (`#operations`); Production edge cases (`#edge-cases`)

### 6.7 Retrain, challenge and roll back

- **Owner:** MLOps Engineer
- **With:** Data Scientist, ML Engineer, AI Engineer, AI Architect
- **When:** On a trigger: drift, a performance drop, a schedule or a data change
- **How:**
  1. The trigger starts the training pipeline.
  2. Evaluate the challenger against the champion with the same protocol as the first release.
  3. Promote through the same gates (shadow, canary) and roll back on regression.
  4. Have the AI architect check drift findings against the original design assumptions.
- **Output:** Retraining record: a new champion, or a documented rejection.
- **Read in the blueprint:** MLOps · Retraining, champion/challenger and rollback (`#mlops-retraining`); Evaluation · After launch (`#ev-continuous`); MLOps & LLMOps (`#mlops`)
- **Variation:** LLM systems: prompts, indexes and tool contracts are release artifacts too. A change to any of them goes through the same evaluation and promotion.

### 6.8 Keep security and compliance current

- **Owner:** Security Engineer
- **With:** Risk, compliance, legal and privacy, Platform Engineer
- **When:** Continuous scanning, quarterly access review, periodic model review
- **How:**
  1. Patch, and manage vulnerabilities as they are found.
  2. Review access every quarter.
  3. Repeat the model validation at the interval the risk tier requires, and keep the audit evidence current.
- **Output:** Compliance evidence log.
- **Read in the blueprint:** Security & governance · Risk tier (`#governance`); Security & governance · Obligation to control to evidence (`#gov-regulatory`)

### 6.9 Collect feedback and manage the backlog

- **Owner:** Product owner (decision owner)
- **With:** End users and process owners, Support and service desk, Business Analyst
- **When:** Every sprint
- **How:**
  1. Turn user feedback and support tickets into backlog items.
  2. Prioritise against value.
  3. Take each change back through the phases at a depth that matches its risk.
- **Output:** Prioritised backlog.
- **Read in the blueprint:** Role lenses (`#role-lenses`); Phase 0 · Requirements and acceptance criteria (`#disc-requirements`)

### 6.10 Review the service: continue, change or retire

- **Owner:** Product owner (decision owner)
- **With:** Executive sponsor, AI Architect, Finance (FinOps)
- **When:** Quarterly
- **How:**
  1. Review value, cost, risk and incidents together.
  2. Check that the design assumptions still hold, using “what would change it” in the decision matrix.
  3. Decide: continue, invest, re-scope or decommission.
  4. If retiring: settle data retention, archive the model and tell the users.
- **Output:** Quarterly service review decision.
- **Read in the blueprint:** Enterprise context · AI decision matrix (`#ent-decision`); Phase 0 · Business case and ROI measurement (`#disc-case`); Validation (`#validation`)

### Gate 6 · Quarterly service review

Called by: Product owner (decision owner). Signed by: Product owner (decision owner), Executive sponsor. Every line is evidence that must exist.

- [ ] The SLOs were met, or the error-budget policy was applied.
- [ ] Model performance is inside the agreed band, or a retrain has been done.
- [ ] The realised benefit is reported against the baseline.
- [ ] Incidents are reviewed and their actions closed.
- [ ] Cost is inside the budget.
- [ ] The compliance evidence is current.

### Common mistakes in Phase 6

- Monitoring uptime only. A model can be up, fast and wrong.
- No way for the true outcomes to flow back, so performance is never measured.
- Automatic retraining with no evaluation gate.
- So many alerts that people stop reading them.
- Nobody owns the model once the project team has moved on.

## Meeting rhythm

| Meeting | When | Who | Purpose |
| --- | --- | --- | --- |
| **Daily stand-up** | Every working day, 15 minutes, Phases 1–5 | The delivery team | What moved, what is blocked, who helps. |
| **Weekly delivery and risk review** | Weekly, all phases up to handover | Delivery lead, product owner and the lead of each active phase | Progress against the plan, the top risks and decisions needed this week. |
| **Demo** | Every two weeks from Phase 2 | The team, product owner, end users and domain expert | Show working results and collect corrections early. |
| **Gate review** | At the end of every phase | The gate’s signers, called by the delivery lead | Check the evidence on the gate’s list and sign, or record what is missing. |
| **Steering meeting** | Monthly | Sponsor, product owner, delivery lead, finance | Budget, scope changes and escalations. |
| **Architecture review** | End of Phase 1, and on any significant design change | Solution architect, AI architect, security engineer, platform engineer | Approve the design and record the decisions. |
| **Go/no-go review** | Phase 5, before production traffic | Product owner, sponsor, SRE, security, QA, MLOps, risk and compliance | Decide the release on the Gate 4 evidence, and confirm who can order a rollback. |
| **Hypercare review** | Daily for the first two to four weeks live | SRE, MLOps, support, product owner | Catch and fix early problems quickly. |
| **Model performance review** | Weekly in Phase 6 | Data scientist, MLOps engineer, data analyst | Live metrics, drift, slices and whether a retrain is justified. |
| **Operations and cost review** | Monthly in Phase 6 | SRE, platform engineer, inference engineer, finance | SLOs, the error budget, capacity and spend. |
| **Post-incident review** | Within five working days of an incident | Everyone involved, led by SRE | Blameless account of what happened, and actions that prevent a repeat. |
| **Service and value review** | Quarterly in Phase 6 | Product owner, sponsor, AI architect, finance | Gate 6: continue, invest, re-scope or retire. |

## Evaluation, guardrails and governance: where each is covered

The concerns people ask about by name. Each row lists the steps that deal with it and the blueprint sections that hold the detail. It is an index over the steps above, not extra work.

| Concern | The question it answers | Guide steps | Read in the blueprint |
| --- | --- | --- | --- |
| **Evaluation** | Does it work, and how do we know? | 2.8, 3.2, 3.4, 3.9, 5.5, 5.7, 6.3 | Evaluation (`#evaluation`); Evaluation · Release thresholds (`#ev-thresholds`); Evaluation · Online evaluation (`#ev-online`); Statistical validation (`#experimentation`); Metrics catalogue (`#metrics`) |
| **Guardrails** | What must it never do, and what stops it? | 1.4, 3.6, 3.8, 3.9, 4.5, 5.6 | Security & governance · Guardrails (`#gov-guardrails`); Agentic solution (or a reasoned “no agent”) (`#agentic`); Production edge cases (`#edge-cases`) |
| **Governance and approvals** | Who allowed this, and on what evidence? | 0.7, 1.11, 3.10, 4.7, 5.3, 6.8, 6.10 | Security & governance · Risk tier (`#governance`); Security & governance · Approval path (`#gov-approvals`); Security & governance · Model governance (`#gov-model`); Security & governance · Obligation to control to evidence (`#gov-regulatory`); Validation (`#validation`) |
| **Responsible AI** | Is it fair, explainable and overseen by people? | 1.3, 2.9, 3.4, 4.7, 6.3 | Security & governance · Responsible AI (`#gov-rai`); Statistical validation · Calibration, uncertainty and slices (`#xp-model`); Enterprise context · AI decision matrix (`#ent-decision`) |
| **Security** | How could it be attacked or misused, and what prevents that? | 0.7, 1.7, 4.1, 4.6, 6.8 | Security & governance · AI security threats (`#gov-security`); Enterprise context · Technology and security (`#ent-technology`); Security & governance · Guardrails (`#gov-guardrails`) |
| **Privacy and data** | May we use this data, and is it fit to use? | 0.7, 1.6, 2.1, 2.6 | Security & governance · Data governance (`#gov-data`); Enterprise context · Data architecture and data contract (`#ent-data`); Statistical validation · Labels, sampling and data quality (`#xp-data`) |
| **Monitoring** | How will we know when it stops working? | 1.9, 4.3, 6.1, 6.2, 6.3 | Metrics catalogue (`#metrics`); Metrics catalogue · Monitors for this system’s edge cases (`#mt-failure-monitors`); Production operations (`#operations`); Evaluation · After launch (`#ev-continuous`) |
| **Reliability and rollback** | What happens when something fails? | 1.4, 4.5, 4.9, 4.10, 5.6, 6.6 | Production operations (`#operations`); MLOps · Retraining, champion/challenger and rollback (`#mlops-retraining`); Production edge cases (`#edge-cases`) |
| **Cost** | What does a decision cost, and is it worth it? | 1.8, 3.7, 6.5 | Scale & capacity (with the sizing calculator) (`#scale`); Phase 0 · Business case and ROI measurement (`#disc-case`) |

## Frameworks and regulations: a crosswalk

What the main AI frameworks ask for, and where this guide and the blueprints already do it. Each blueprint adds the obligations of its own industry in its governance section.

| Framework | What it is | What it asks for | Guide steps | Read in the blueprint |
| --- | --- | --- | --- | --- |
| **EU AI Act (Regulation (EU) 2024/1689)** | Law. Applies when a system is placed on the EU market or its output is used in the EU. | Classify the system by risk. A high-risk system needs a risk management system, data governance, technical documentation, logging, information for those who deploy it, human oversight, and accuracy, robustness and cybersecurity (Articles 9 to 15). Systems that talk to people or generate content carry transparency duties (Article 50). | 0.7, 1.3, 1.7, 3.10, 4.7, 6.8 | Security & governance · Risk tier (`#governance`); Security & governance · Guardrails (`#gov-guardrails`); Security & governance · Responsible AI (`#gov-rai`); Security & governance · Model governance (`#gov-model`); Security & governance · Obligation to control to evidence (`#gov-regulatory`) |
| **NIST AI Risk Management Framework 1.0** | Voluntary framework, widely used as a common language for AI risk. | Four functions. Govern: policies, roles and accountability. Map: context, intended use and who is affected. Measure: test and track the risks. Manage: prioritise, respond and keep monitoring. Its Generative AI Profile adds the risks specific to LLM systems. | 0.6, 0.7, 0.9, 3.4, 4.7, 6.3, 6.10 | Enterprise context · AI decision matrix (`#ent-decision`); Security & governance · Risk tier (`#governance`); Evaluation (`#evaluation`); Metrics catalogue (`#metrics`) |
| **ISO/IEC 42001:2023** | Management-system standard an organisation can be certified against. | Run AI through a management system: an AI policy, defined roles, risk and impact assessment, controls across the lifecycle, internal audit, management review and continual improvement. | 0.9, 1.11, 3.10, 5.9, 6.8, 6.10 | Security & governance · Model governance (`#gov-model`); Security & governance · Approval path (`#gov-approvals`); MLOps & LLMOps (`#mlops`); Validation (`#validation`) |
| **GDPR data protection impact assessment (Article 35)** | Law. Applies when personal data of people in the EU is processed. | Before processing that is likely to put people at high risk, describe the processing, assess whether it is necessary and what could go wrong for the people concerned, and record the measures that reduce those risks. | 0.7, 2.1, 4.7 | Security & governance · Data governance (`#gov-data`); Enterprise context · Data architecture and data contract (`#ent-data`); Security & governance · Obligation to control to evidence (`#gov-regulatory`) |
| **OWASP Top 10 for LLM Applications (2025)** | Community security list. For any system with a language model or agent. | Ten risks to design and test against, itemised in the next table. | 1.7, 3.9, 4.6 | Security & governance · AI security threats (`#gov-security`); Security & governance · Guardrails (`#gov-guardrails`); Agentic solution (or a reasoned “no agent”) (`#agentic`) |

### OWASP Top 10 for LLM Applications, item by item

| Item | Risk | Control used here | Guide steps |
| --- | --- | --- | --- |
| LLM01 | **Prompt injection** | Treat retrieved text and tool output as untrusted data, keep tools typed and narrow, and replay planted-instruction attacks on every release. | 1.7, 3.9, 4.6 |
| LLM02 | **Sensitive information disclosure** | Mask personal data in tool results, logs and traces, scope caches to the caller, and filter outputs. | 0.7, 3.9 |
| LLM03 | **Supply chain** | Pin and scan base models and dependencies, sign artifacts and keep a bill of materials. | 4.2, 4.6 |
| LLM04 | **Data and model poisoning** | Record provenance for datasets and documents, validate at ingestion, audit labels and keep a holdout the pipeline cannot write to. | 2.5, 2.6, 2.8 |
| LLM05 | **Improper output handling** | Validate model output against a schema before anything downstream uses it, and never execute it directly. | 1.5, 3.9 |
| LLM06 | **Excessive agency** | Least-privilege tools, approval for every write action, and an autonomy ladder climbed one gate at a time. | 1.3, 3.8 |
| LLM07 | **System prompt leakage** | Keep secrets and authorisation rules out of prompts; enforce permissions in code, where a leaked prompt changes nothing. | 1.7, 3.9 |
| LLM08 | **Vector and embedding weaknesses** | Filter retrieval by tenant and permission, version the index with its embedding model, and validate what is ingested. | 2.5, 3.6 |
| LLM09 | **Misinformation** | Check that answers are grounded in cited sources, abstain or escalate when they are not, and score against a golden set. | 2.4, 3.4, 3.9 |
| LLM10 | **Unbounded consumption** | Budgets for steps, tokens and cost enforced outside the model, with rate limits and spend alerts. | 3.8, 6.5 |

A reading map, not legal advice. Which of these apply to your system, and how, is settled with risk and compliance in step 0.7. Article numbers and item names refer to the published texts named here; check the current version before relying on them.

## Monitoring after go-live

Uptime is one layer of seven. A model can be available, fast and wrong, so each layer has its own owner and its own response. The blueprint’s Metrics catalogue lists the specific metrics, targets and alerts for the use case.

| Layer | What to watch | Owner | How often | What to do when it moves |
| --- | --- | --- | --- | --- |
| **Service health** | Latency (p50, p95, p99), error rate, availability, saturation, fallback rate | SRE / DevOps Engineer | Continuous, with paging | Follow the runbook: fall back, scale or roll back. |
| **Data quality** | Freshness, volume, schema, null rates, late-arriving records | Data Engineer | Every pipeline run | Quarantine the batch, backfill, and notify the producing team through the data contract. |
| **Drift** | Feature distributions and prediction distributions against the training data | MLOps Engineer | Daily | Investigate the cause, then start a retraining evaluation if it is real. |
| **Model quality** | The live metric once labels mature, calibration, gaps between slices, human override rate | Data Scientist | Weekly, as labels arrive | Recalibrate, retrain, or change the threshold with the decision owner. |
| **Business value** | The north-star metric, its drivers and adoption, against the Phase 0 baseline | Business Analyst | Monthly | Change the process or the priorities, and report the realised benefit. |
| **Cost** | Cost per decision, spend against budget, token spend for LLM systems | Inference Engineer | Monthly, with budget alerts | Right-size, cache, batch or move to a cheaper model. |
| **Security and compliance** | Access anomalies, vulnerabilities, guardrail hits, age of the audit evidence | Security Engineer | Continuous scanning, quarterly review | Patch, revoke access or open a security incident. |

## Adapting to your team

- **On your own (learning or a portfolio project).** You hold every role. Use the blueprint’s synthetic starter kit as your data. Keep Phase 0 to one page but do not skip it. Treat each gate as a self-review checklist and write the evidence down anyway: that write-up is what you show people.
- **A small team (three to five people).** Four hats: product (business analyst, product owner), data (data analyst, data engineer), model (data scientist, ML engineer, AI engineer) and platform (MLOps, platform, SRE, inference). Security and QA are named people, even if part-time. Use the combined role lens on the blueprint to see everything one hat covers. Run every phase, with lighter documents. This is the team the 16-week reference plan assumes.
- **A full programme (ten people or more).** One named person per role, and every partner formally engaged. Run the phases as written, with formal gate reviews and the full meeting rhythm.

Whatever the size: one person may hold several roles, but nobody signs a gate for their own work. The reviewer is always someone else.

## Adapting to the kind of use case

The phases and gates stay the same. What changes is where the effort goes. Each blueprint names its pattern at the top of the page.

| Kind of use case | What changes |
| --- | --- |
| **Scoring models on tabular, graph or anomaly data** | The guide applies as written. The effort concentrates on labels, features that are correct as of the prediction time, and the operating point. |
| **Forecasting and other batch systems** | There is no online serving path: step 3.6 builds a scheduled job. Evaluate with a rolling-origin backtest. Release with shadow runs and a holdout rather than a canary. Monitor forecast error once the actual values arrive. |
| **Recommenders and ranking** | Offline metrics only narrow the choice; the decision comes from an online experiment. Plan for feedback loops and position bias in Phase 2, and log what was shown as well as what was clicked. |
| **LLM, RAG and agents** | Phase 2 builds the corpus, the index and a golden evaluation set. Phase 3 may involve no training: you iterate on retrieval, prompts and tools against the golden set. The evaluation harness and guardrails (step 3.9) carry most of the risk. Monitor groundedness, refusals and token cost, and raise agent autonomy one rung at a time. |
| **Computer vision and language models that need labelling** | Add annotation guidelines, a labelling budget and an agreement check between annotators to Phase 2. Label quality is usually the ceiling on model quality. |
| **Bandits and reinforcement learning** | Design the exploration policy and its safety limits in Phase 1. Evaluate on logged data (replay or off-policy estimation) before any live traffic, then ramp with tight guardrails. |
| **Optimisation and planning with a solver** | The “model” is the formulation: objective and constraints. Validate that every constraint holds and compare solution quality with the current plan. There is no retraining; instead decide how often to re-solve and what triggers it. |

## Executable delivery templates and implementation packages

Standardized, downloadable deliverables covering project discovery, production architecture contracts, data pipelines, and serving templates.

| Code | Phase | Deliverable Title | Owner | File Location | Description |
| --- | --- | --- | --- | --- | --- |
| `BS-TMPL-SCOPE-01` | p0 | **Client Discovery Questionnaire** | Business Analyst | `delivery/templates/phase-0-scope/01-client-discovery-questionnaire.md` | 40-point standardized client interview questionnaire covering business context, decision cadence, stakeholders, and latency expectations. |
| `BS-TMPL-SCOPE-02` | p0 | **Business Requirements Document (BRD)** | Business Analyst | `delivery/templates/phase-0-scope/02-business-requirements-document.md` | Production-grade BRD template with problem formulation, user stories, numerical targets, and acceptance criteria. |
| `BS-TMPL-SCOPE-03` | p0 | **Stakeholder Interview Guide** | Business Analyst | `delivery/templates/phase-0-scope/03-stakeholder-interview-guide.md` | Role-specific interview scripts for Sponsors, Operators, Risk Officers, and Engineers. |
| `BS-TMPL-SCOPE-04` | p0 | **Process Mapping AS-IS vs TO-BE** | Solution Architect | `delivery/templates/phase-0-scope/04-process-mapping-as-is-to-be.md` | Framework for mapping current manual workflows to AI-augmented workflows with quantitative cycle times. |
| `BS-TMPL-SCOPE-05` | p0 | **Requirements Traceability Matrix (RTM)** | Solution Architect | `delivery/templates/phase-0-scope/05-requirements-traceability-matrix.md` | Matrix linking business objectives to ML metrics, system NFRs, implementation artifacts, and test cases. |
| `BS-TMPL-SCOPE-06` | p0 | **KPI Baseline & Financial ROI Workbook** | Finance (FinOps) | `delivery/templates/phase-0-scope/06-kpi-baseline-roi-workbook.md` | Financial model calculating cost of false positives vs false negatives, payback period, and 3-year net ROI. |
| `BS-TMPL-SCOPE-07` | p0 | **Data Access & Security Pre-Flight Checklist** | Risk, compliance, legal and privacy | `delivery/templates/phase-0-scope/07-data-access-security-checklist.md` | Pre-flight checklist for data governance, PII identification, IAM access, and environment boundaries. |
| `BS-TMPL-SCOPE-08` | p0 | **AI Suitability Assessment Framework** | Data Scientist | `delivery/templates/phase-0-scope/08-ai-suitability-assessment.md` | Decision tree and scoring matrix proving AI/ML necessity versus deterministic rules, heuristics, or solvers. |
| `BS-TMPL-SCOPE-09` | p0 | **PoC vs MVP vs Production Scope Boundary Matrix** | Delivery lead (project manager) | `delivery/templates/phase-0-scope/09-poc-mvp-prod-decision-matrix.md` | Strict boundaries and exit gates defining deliverables across PoC, MVP, and full production services. |
| `BS-TMPL-SCOPE-10` | p0 | **Discovery Charter & Gate 0 Sign-Off** | Delivery lead (project manager) | `delivery/templates/phase-0-scope/10-discovery-charter-signoff.md` | Formal charter document with named signers and approval gates authorizing Phase 1 architecture. |
| `BS-TMPL-DESIGN-01` | p1 | **C4 Architecture Model Suite** | Solution Architect | `delivery/templates/phase-1-design/01-c4-architecture-suite.md` | Standard C4 Context, Container, Component, and Deployment topology diagrams. |
| `BS-TMPL-DESIGN-02` | p1 | **Nominal & Failure Sequence Diagrams** | Solution Architect | `delivery/templates/phase-1-design/02-sequence-diagrams-failure-flows.md` | Explicit sequence diagrams modeling timeouts, circuit breaking, fallback degradation, and dead-letter queues. |
| `BS-TMPL-DESIGN-03` | p1 | **OpenAPI 3.1 Specification Template** | Inference Engineer | `delivery/templates/phase-1-design/03-openapi-3.1-specification-template.yaml` | Production REST contract including error schemas, latency headers, and health probes. |
| `BS-TMPL-DESIGN-04` | p1 | **AsyncAPI 3.0 Specification Template** | Data Engineer | `delivery/templates/phase-1-design/04-asyncapi-3.0-specification-template.yaml` | Kafka and event streaming contract with schema evolution rules and DLQ channels. |
| `BS-TMPL-DESIGN-05` | p1 | **OpenDataContract Specification Template** | Data Engineer | `delivery/templates/phase-1-design/05-open-data-contract-template.yaml` | Standard data contract governing table schemas, freshness SLAs, nullability, and quality assertions. |
| `BS-TMPL-DESIGN-06` | p1 | **Architecture Decision Record (ADR) Template** | Solution Architect | `delivery/templates/phase-1-design/06-architecture-decision-record-template.md` | Standard ADR structure capturing context, options, decision, trade-offs, and consequences. |
| `BS-TMPL-DESIGN-07` | p1 | **Measurable NFR Matrix** | Platform Engineer | `delivery/templates/phase-1-design/07-nfr-matrix-template.md` | Quantifiable SLOs for P50/P95/P99 latency, throughput, availability, RTO/RPO, and degradation budgets. |
| `BS-TMPL-DESIGN-08` | p1 | **STRIDE & OWASP LLM Threat Model** | Security Engineer | `delivery/templates/phase-1-design/08-stride-threat-model-template.md` | Comprehensive security threat matrix with architectural controls and verification tests. |
| `BS-TMPL-DATA-01` | p2 | **Source-to-Target Mapping (STTM)** | Data Engineer | `delivery/templates/phase-2-data/source-to-target-mapping.md` | Field-level transformation specification with null handling, point-in-time leakage prevention, JSON/Avro schemas, and backfill protocols. |
| `BS-TMPL-DATA-02` | p2 | **Production Streaming Ingestion Pipeline** | Data Engineer | `delivery/templates/phase-2-data/streaming-ingestion-pipeline.py` | Kafka/Flink streaming consumer with sliding window aggregations, watermark tracking, and DLQ routing. |
| `BS-TMPL-DATA-03` | p2 | **Batch Ingestion & Feature Store Loader** | Data Engineer | `delivery/templates/phase-2-data/batch-ingestion-pipeline.py` | Distributed batch ETL loader with partition validation, schema enforcement, and point-in-time snapshot joins. |
| `BS-TMPL-DATA-04` | p2 | **Automated Data Quality & Validation Suite** | Data Engineer | `delivery/templates/phase-2-data/data-quality-suite.py` | Data quality testing framework (Great Expectations style) asserting null bounds, distribution checks, and contract adherence. |
| `BS-TMPL-DATA-05` | p2 | **Dead-Letter Queue (DLQ) & Poison Message Handler** | Data Engineer | `delivery/templates/phase-2-data/dead-letter-queue-handler.py` | Resilient poison-pill quarantine, alert dispatcher, and backfill replay utility for malformed messages. |
| `BS-TMPL-BUILD-01` | p3 | **FastAPI Low-Latency Serving Template** | Inference Engineer | `delivery/templates/phase-3-build/fastapi-inference-service.py` | Microservice scaffolding with P99 < 15ms latency enforcement, health endpoints, and circuit breakers. |
| `BS-TMPL-BUILD-02` | p3 | **MLflow Experiment Tracking & Registry Pipeline** | ML Engineer | `delivery/templates/phase-3-build/mlflow-tracking-registry.py` | Standardized model lineage, hyperparameter logging, PR-AUC tracking, artifact signing, and stage promotion. |
| `BS-TMPL-BUILD-03` | p3 | **OAuth2 & mTLS Zero-Trust Serving Middleware** | Security Engineer | `delivery/templates/phase-3-build/oauth2-jwt-middleware.py` | Inference authorization middleware with JWT validation, RBAC claims inspection, and rate limiting. |
| `BS-TMPL-BUILD-04` | p3 | **Production Model Card Specification** | Data Scientist | `delivery/templates/phase-3-build/model-card-template.md` | Comprehensive model documentation covering architecture, slice evaluation, TreeSHAP interpretability, and ethical guardrails. |
| `BS-TMPL-BUILD-05` | p3 | **Production Dataset Card Specification** | Data Engineer | `delivery/templates/phase-3-build/dataset-card-template.md` | Dataset lineage document detailing sampling method, label delay windows, censoring handling, and PII redaction. |
| `BS-TMPL-VRFY-01` | p4 | **Master Test Strategy & Verification Pyramid** | QA / Test Engineer | `delivery/templates/phase-4-verify/master-test-strategy.md` | Complete multi-tier testing framework spanning unit, contract, load/stress, adversarial perturbations, and release gates. |
| `BS-TMPL-VRFY-02` | p4 | **User Acceptance Testing (UAT) Plan** | Business Analyst | `delivery/templates/phase-4-verify/uat-plan-template.md` | Business operator test scenarios, blind evaluation rubrics, and formal gate acceptance criteria. |
| `BS-TMPL-VRFY-03` | p4 | **Independent Model Validation Report (SR 11-7 / EU AI Act)** | Risk, compliance, legal and privacy | `delivery/templates/phase-4-verify/independent-model-validation-report.md` | Independent supervisory audit template assessing conceptual soundness, mathematical rigor, stress testing, and fairness. |
| `BS-TMPL-REL-01` | p5 | **Production Release Checklist (Gate 5 Go-Live)** | Platform Engineer | `delivery/templates/phase-5-release/production-release-checklist.md` | Comprehensive pre-deployment checklist, multi-stakeholder sign-off matrix, canary milestones, and hypercare schedule. |
| `BS-TMPL-REL-02` | p5 | **Rehearsed Rollback Plan & Rapid Recovery Guide** | Platform Engineer | `delivery/templates/phase-5-release/rehearsed-rollback-plan.md` | Step-by-step automated and manual rollback runbook with < 60s RTO execution commands and zero data loss safeguards. |
| `BS-TMPL-REL-03` | p5 | **Phase Gate Evidence Pack Template** | Forward Deployed Engineer | `delivery/templates/phase-5-release/phase-gate-evidence-pack.md` | Standardized evidence bundle structure compiling signed test logs, architecture reviews, and regulatory audit trails. |
| `BS-TMPL-OPS-01` | p6 | **SRE Operational Runbook & Incident Response Guide** | Platform Engineer | `delivery/templates/phase-6-operate/sre-operational-runbook-template.md` | Tier 1 incident response playbooks for P99 latency breach, feature staleness, score collapse, and service degradation. |
| `BS-TMPL-OPS-02` | p6 | **Blameless Post-Incident Review (PIR) Template** | Platform Engineer | `delivery/templates/phase-6-operate/post-incident-review-pir-template.md` | Structured post-mortem document with 5 Whys analysis, timeline reconstruction, and tracked CAPA corrective actions. |
| `BS-TMPL-OPS-03` | p6 | **Quarterly Service Review & Realized ROI Tracker** | Business Analyst | `delivery/templates/phase-6-operate/service-review-roi-tracker.md` | Executive performance scorecard measuring actual dollar benefit vs baseline, cost per 1k decisions, and technical debt backlog. |

## Every deliverable, in order

**Phase 0 · Discovery and business requirements**

- [ ] 0.1 A one-page note: what we adopt from the blueprint, and what differs here. (Delivery lead (project manager))
- [ ] 0.2 Stakeholder map with a named decision owner. (Business Analyst)
- [ ] 0.3 Discovery log: eight questions, each with a confirmed answer, its owner and its evidence. (Business Analyst)
- [ ] 0.4 AS-IS and TO-BE process maps and user journeys, agreed with the people who run them. (Business Analyst)
- [ ] 0.5 Baseline report with KPI definitions. Measured, not estimated. (Data Analyst)
- [ ] 0.6 AI go/no-go recommendation with the completed decision matrix. (AI Architect)
- [ ] 0.7 Data classification, confirmed risk tier and the approval path. (Security Engineer)
- [ ] 0.8 Approved requirements, testable acceptance criteria and a scope boundary. (Business Analyst)
- [ ] 0.9 RACI, staffing plan, dated delivery plan and risk register. (Delivery lead (project manager))
- [ ] 0.10 Business case with an ROI measurement plan. (Business Analyst)
- [ ] Gate 0 · Scope approved, signed by Executive sponsor, Product owner (decision owner)

**Phase 1 · Architecture and design**

- [ ] 1.1 C4 context and container views and an integration matrix. (Solution Architect)
- [ ] 1.2 NFR matrix with a per-stage latency budget. (Solution Architect)
- [ ] 1.3 Model strategy and oversight design, recorded as a decision record. (AI Architect)
- [ ] 1.4 High-level design, sequence diagram and fallback ladder. (Solution Architect)
- [ ] 1.5 Low-level design: API contract, data model and event schema, reviewed by its consumers. (ML Engineer)
- [ ] 1.6 Data architecture and draft data contracts. (Data Engineer)
- [ ] 1.7 Threat model and security requirements. (Security Engineer)
- [ ] 1.8 Capacity and cost model inside the business case. (Inference Engineer)
- [ ] 1.9 Release and environment design, and an SLO document. (MLOps Engineer)
- [ ] 1.10 Test strategy with a traceability matrix. (QA / Test Engineer)
- [ ] 1.11 Decision records and architecture review minutes with actions. (Solution Architect)
- [ ] Gate 1 · Design approved, signed by Solution Architect, AI Architect, Security Engineer, Product owner (decision owner)

**Phase 2 · Data**

- [ ] 2.1 Access approvals, signed data contracts and the privacy impact assessment. (Data Engineer)
- [ ] 2.2 Data profiling report and a quality issues log. (Data Analyst)
- [ ] 2.3 Source-to-target mapping that reconciles to a trusted report. (Data Analyst)
- [ ] 2.4 Label specification approved by the domain expert. (Data Scientist)
- [ ] 2.5 Ingestion pipelines running in development, with lineage. (Data Engineer)
- [ ] 2.6 Automated quality checks that block bad data, and a dashboard. (Data Engineer)
- [ ] 2.7 Feature pipelines and feature definitions, with a test that proves no feature uses future data. (Data Engineer)
- [ ] 2.8 Versioned datasets with a dataset card, reproducible from code. (Data Scientist)
- [ ] 2.9 Exploration report with signal and leakage findings. (Data Scientist)
- [ ] Gate 2 · Data ready, signed by Data owner (data steward), Data Scientist, Security Engineer

**Phase 3 · Model and application build**

- [ ] 3.1 Repository, CI, experiment tracking and model registry. (MLOps Engineer)
- [ ] 3.2 Baseline with an evaluation report: the number every later model must beat. (Data Scientist)
- [ ] 3.3 Candidate model, experiment log and error analysis. (Data Scientist)
- [ ] 3.4 Evaluation report and an operating point signed by the decision owner. (Data Scientist)
- [ ] 3.5 Reproducible training pipeline and a registered model. (ML Engineer)
- [ ] 3.6 Inference service running in development, with its fallbacks. (ML Engineer)
- [ ] 3.7 Performance report: the latency budget is met at the planned cost. (Inference Engineer)
- [ ] 3.8 Application integrated into the workflow, with feedback capture. (AI Engineer)
- [ ] 3.9 Evaluation harness in CI and guardrails in the request path. (AI Engineer)
- [ ] 3.10 Model card and, where required, the governance submission. (Data Scientist)
- [ ] Gate 3 · Build complete, signed by AI Architect, Product owner (decision owner), Data Scientist

**Phase 4 · Platform, security and verification**

- [ ] 4.1 Staging and production environments created from code. (Platform Engineer)
- [ ] 4.2 Deployment pipeline with promotion gates and rollback. (MLOps Engineer)
- [ ] 4.3 Dashboards, alerts and a prediction log. (SRE / DevOps Engineer)
- [ ] 4.4 Test report and automated suites. (QA / Test Engineer)
- [ ] 4.5 Performance and resilience report. (QA / Test Engineer)
- [ ] 4.6 Security test report and sign-off. (Security Engineer)
- [ ] 4.7 Compliance evidence pack and approvals. (Risk, compliance, legal and privacy)
- [ ] 4.8 Acceptance test report signed by the product owner. (Business Analyst)
- [ ] 4.9 Runbooks, on-call rota and trained support. (SRE / DevOps Engineer)
- [ ] 4.10 Rollback and recovery rehearsal record, with timings. (SRE / DevOps Engineer)
- [ ] Gate 4 · Ready for release, signed by QA / Test Engineer, Security Engineer, SRE / DevOps Engineer, Product owner (decision owner)

**Phase 5 · Release and deployment**

- [ ] 5.1 Users trained, communication sent, procedures updated. (Business Analyst)
- [ ] 5.2 Rollout and experiment plan, written before any traffic moves. (MLOps Engineer)
- [ ] 5.3 Recorded go/no-go decision and an approved change request. (Product owner (decision owner))
- [ ] 5.4 Production deployment verified, with users still on the old path. (MLOps Engineer)
- [ ] 5.5 Shadow report: production behaves as offline evaluation predicted. (MLOps Engineer)
- [ ] 5.6 Ramp log with the decision taken at each step. (MLOps Engineer)
- [ ] 5.7 Experiment readout. (Data Scientist)
- [ ] 5.8 Handover record: the service is accepted by operations. (SRE / DevOps Engineer)
- [ ] 5.9 Release record and retrospective actions. (Delivery lead (project manager))
- [ ] Gate 5 · Live and accepted, signed by Product owner (decision owner), SRE / DevOps Engineer, Executive sponsor

**Phase 6 · Operate, monitor and improve**

- [ ] 6.1 SLO report. (SRE / DevOps Engineer)
- [ ] 6.2 Drift and data-quality dashboard with alerts. (MLOps Engineer)
- [ ] 6.3 Weekly model performance review. (Data Scientist)
- [ ] 6.4 Benefit report against the baseline. (Business Analyst)
- [ ] 6.5 Cost report and optimisation actions. (Inference Engineer)
- [ ] 6.6 Incident record and review actions. (SRE / DevOps Engineer)
- [ ] 6.7 Retraining record: a new champion, or a documented rejection. (MLOps Engineer)
- [ ] 6.8 Compliance evidence log. (Security Engineer)
- [ ] 6.9 Prioritised backlog. (Product owner (decision owner))
- [ ] 6.10 Quarterly service review decision. (Product owner (decision owner))
- [ ] Gate 6 · Quarterly service review, signed by Product owner (decision owner), Executive sponsor

## Glossary

- **ADR.** Architecture decision record: a short note of a decision, the options considered and the consequences.
- **Baseline.** The performance of the current process, or of the simplest model. The number any new model must beat.
- **Canary.** Releasing to a small share of traffic first, and widening only if the guardrails hold.
- **Champion and challenger.** The model in production and the candidate that must beat it under the same evaluation.
- **Data contract.** An agreement with a data-producing team on schema, meaning, quality and notice of change.
- **Drift.** A change in the input data or in the relationship between inputs and outcomes since the model was trained.
- **Error budget.** The amount of unreliability an SLO allows. When it is spent, reliability work comes before features.
- **Fallback ladder.** The ordered list of what the system returns as dependencies fail, ending in a safe default.
- **Gate.** A review at the end of a phase where named people sign that listed evidence exists.
- **Golden set.** A fixed set of inputs with expected outputs or scoring rubrics, used to evaluate LLM systems.
- **Guardrail metric.** A measure that must not get worse while you improve the main one.
- **HLD and LLD.** High-level design (components and flows) and low-level design (contracts, schemas, code structure).
- **Hypercare.** The first weeks after go-live, with daily review and the build team still on hand.
- **Label maturity.** The delay between a prediction and knowing the true outcome.
- **Leakage.** A feature that contains information not available at prediction time. It inflates offline results and fails in production.
- **NFR.** Non-functional requirement: latency, availability, throughput, security, recovery.
- **North-star metric.** The single business outcome the system exists to move.
- **Operating point.** The threshold at which a score becomes a decision, chosen from the cost of each kind of error.
- **Point-in-time correct.** Each training row uses feature values exactly as they were at the moment of prediction.
- **RACI.** Responsible (does it), Accountable (answers for it), Consulted (takes part), Informed (is told).
- **Rollback.** Returning production to the previous version by a rehearsed path.
- **Runbook.** Step-by-step instructions for detecting, mitigating and recovering from one kind of failure.
- **Shadow.** Running the new system on real traffic without acting on its output.
- **SLI and SLO.** Service-level indicator (what is measured) and objective (the target for it).
- **UAT.** User acceptance testing: real users confirm the system meets the acceptance criteria.
