# Engineering, Design & Projects, part 1 (use cases 1-27): design and simulation, drawings and BIM, construction delivery, site safety and quality
# Vendor-neutral. Licensed engineers verify and sign every output, agents never issue or seal drawings, designs and bids stay inside the company boundary and site analytics never identify or score individual workers.
== generative-design-exploration | Generative Design Exploration | tabular,reinforcement-learning | batch | advanced | a=0.5 k=10
obj: Generate and rank design options against stated loads, materials, cost and manufacturing limits so engineers explore more alternatives, then verify and choose with their own analysis.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}
con: Options meet every stated constraint before ranking ; Engineers verify the chosen option by independent analysis ; Each option shows its assumptions ; Generation of 500 options in 1 hour ; Licensed engineer approves the design
sn: Objective | Weight, cost and safety factor within limits | A single metric | One metric can hide failure modes
sn: Constraint | Hard code and manufacturing limits | Soft preferences | Limits cannot be traded
sn: Role | Option generator | The designer | Responsibility stays with the engineer of record
sig: Load cases | forces, moments and conditions | Core | From the design brief
sig: Material properties | strength and stiffness | Core | From the materials database
sig: Manufacturing constraints | process and tolerance limits | Constraint | From standards
sig: Cost model | material and process cost | Objective | From cost data
noise: Designer name | personal data
noise: File name | weak link
noise: Colour scheme | irrelevant
base: Engineers sketching a few options by hand and testing the best, because it is the usual practice.
prod: A generative tool that searches within hard constraints, evaluates options with validated solvers and presents ranked designs with assumptions for the engineer to verify.
pipe: Brief and constraint capture @ design tool ; Option generation @ optimiser ; Solver evaluation @ finite element tools ; Constraint filter @ rules ; Ranked options @ viewer ; Engineer verification @ independent analysis ; Design record @ document system
edge: Unrealistic geometry | the option cannot be manufactured | Manufacturability checks
edge: Missing load case | an important case is absent | Checklist of load cases by code
edge: Solver mismatch | the fast solver differs from the validated one | Validate top options with the full solver
off: Constraint satisfaction ; Solver agreement on top options ; Option diversity
on: Design iteration time ; Material use ; Late design changes
gap: A single metric ; Soft limits ; Unverified options

== simulation-surrogate-modelling | Simulation Surrogate Modelling | tabular,time-series | seconds | advanced | a=1 k=3
obj: Train fast surrogate models on validated simulations so engineers can explore parameters in seconds, with uncertainty estimates and automatic fallback to the full solver outside the trained range.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Prediction error under 3% within the trained range ; Uncertainty shown for every prediction ; Fallback to the full solver outside the range ; Models revalidated after solver changes ; Prediction within 1 s
sn: Training data | Validated high-fidelity runs | Mixed-quality runs | Poor runs teach wrong physics
sn: Range | An explicit validity range | Extrapolation | Surrogates fail outside their data
sn: Use | Exploration and screening | Final verification | Final checks use the full solver
sig: Input parameter vector | geometry and load parameters | Core | From the design space
sig: Solver output fields | stress, temperature or flow results | Target | From simulations
sig: Mesh and solver settings | numerical settings | Quality | From run metadata
sig: Distance to training data | how far the query is from known runs | Uncertainty | From the model
noise: Run id | an identifier
noise: User name | personal data
noise: Cluster name | an artefact
base: Running the full solver for each design point, because it is the verified method.
prod: A surrogate service with uncertainty, range checks and automatic fallback that is retrained when solver versions or materials change.
pipe: Simulation database @ solver outputs ; Quality filter @ rules ; Surrogate training @ neural or Gaussian process model ; Uncertainty calibration @ validation set ; Range check and fallback @ service ; Engineer query @ design tool ; Revalidation @ solver update
edge: Out of range query | the design is outside trained data | Automatic fallback to the solver
edge: Solver upgrade | physics settings change | Retrain and revalidate
edge: Sparse corner cases | rare parameter mixes lack data | Adaptive sampling
off: Error versus the solver ; Uncertainty calibration ; Fallback rate
on: Time per design study ; Solver hours ; Surrogate errors found late
gap: Extrapolation without checks ; Surrogates for final verification ; Unvalidated training runs

== cad-design-rule-checking | CAD Design Rule Checking | graph,tabular | seconds | foundational | a=0.2 k=5
obj: Check CAD models against company rules and manufacturability limits, such as minimum wall thickness and hole spacing, and explain violations in the design tool.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{GraphReg}
con: Rule checks run in the design tool within 30 s ; Violations show the rule and the geometry ; Rule owners manage the rule library ; Designers can request exceptions ; 20K models per year
sn: Rule | Written company and standard rules | Learned guesses | Rules need authority and traceability
sn: Role | Check and explain | Auto-fix silently | Silent fixes change design intent
sn: Quality | Low false violation rate | Many warnings | Warnings get ignored
sig: Feature geometry | walls, holes and radii | Core | From the CAD model
sig: Rule thresholds | limits by process and material | Core | From the rule library
sig: Process selected | casting, machining or printing | Rule set | From the design
sig: Past exceptions | approved deviations | Context | From records
noise: Designer name | personal data
noise: Part number | an identifier
noise: Model colour | irrelevant
base: Manual design reviews with checklists, because they are the usual control.
prod: A rule engine on CAD geometry with a managed rule library, clear violation explanations and an exception workflow, with optional learned suggestions flagged as advisory.
pipe: Model export @ CAD tool ; Feature extraction @ geometry kernel ; Rule evaluation @ rule engine ; Violation report @ design tool ; Exception request @ workflow ; Rule maintenance @ library owners ; Quality review @ quarterly
edge: Complex freeform surface | features are hard to extract | Manual review flag
edge: Conflicting rules | two standards disagree | Rule owner decision
edge: New process | the new manufacturing process has no written design rules | Block release until rules are defined
off: Rule detection accuracy ; False violation rate ; Rule coverage
on: Violations found in review ; Late design changes ; Review time
gap: Learned rules without authority ; Silent auto-fixes ; Ignored warnings

== materials-selection-assistant | Materials Selection Assistant | tabular,nlp | seconds | foundational | a=0.2 k=5
obj: Recommend candidate materials from requirements such as strength, temperature, corrosion, cost and supply, with data sources, for engineers to validate before use.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}
con: Each material cites its data source ; Safety-critical selections need test data ; Engineers decide ; Supply and restricted substance checks included ; 50K materials
sn: Data | Verified material datasheets and tests | Web snippets | Unverified data can be wrong
sn: Constraint | Requirements and regulations together | Properties alone | Restricted substances block use
sn: Role | Shortlist | Final choice | Safety-critical choices need testing
sig: Required property ranges | strength, temperature and corrosion needs | Core | From requirements
sig: Material property data | measured properties | Core | From the materials database
sig: Regulatory flags | restricted substances | Constraint | From compliance data
sig: Supply and cost | availability and price | Practicality | From procurement
noise: Designer name | personal data
noise: Supplier brand | weak link
noise: Datasheet layout | an artefact
base: Handbook look-ups and supplier advice, because they are the common approach.
prod: A retrieval and ranking assistant over verified material data with regulation and supply filters that outputs a cited shortlist and the tests still needed.
pipe: Requirement capture @ form ; Property filter @ materials database ; Regulatory and supply filter @ rules ; Ranking @ scoring model ; Cited shortlist @ LLM with sources ; Engineer validation @ testing ; Selection record @ document system
edge: Conflicting data | two sources give different values | Show both and flag
edge: Novel material | little data exists | Mark as untested
edge: Supply shock | a material becomes unavailable | Alternatives list
off: Property retrieval accuracy ; Regulatory flag recall ; Shortlist relevance
on: Time to shortlist ; Late material changes ; Test failures
gap: Unverified web data ; Properties without regulation ; Final choice by the model

== tolerance-stack-up-analysis | Tolerance Stack-Up Analysis | tabular | batch | advanced | a=1 k=3
obj: Analyse how part tolerances combine in assemblies, estimate the share of assemblies that miss fit requirements and suggest which tolerances to tighten or relax at least cost.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Both worst-case and statistical results shown ; Engineers approve tolerance changes ; Cost impact shown for each change ; Analysis of 5,000 assemblies per year ; Sensitivity ranking for every requirement
sn: Method | Worst case and statistical methods | One method | Worst case alone is costly and statistics alone can hide risk
sn: Data | Measured process capability | Nominal tolerances | Real processes differ from drawings
sn: Action | Cost-aware tolerance changes | Tightening everything | Tight tolerances raise cost
sig: Tolerance chain | dimensions that stack in a fit | Core | From CAD
sig: Process capability | measured spread of parts | Core | From inspection data
sig: Fit requirement | allowed gap or interference | Constraint | From the design
sig: Cost per tolerance grade | cost of tighter limits | Objective | From manufacturing
noise: Designer name | personal data
noise: Part colour | irrelevant
noise: File version | an artefact
base: Spreadsheet worst-case stack-ups, because they are the standard method.
prod: A tolerance analyser that combines CAD chains with measured process capability, runs Monte Carlo and worst-case checks and ranks tolerance changes by cost and yield effect.
pipe: Chain extraction @ CAD ; Process data join @ quality system ; Monte Carlo and worst case @ simulation ; Sensitivity ranking @ analytics ; Cost trade-off @ optimiser ; Engineer review @ design review ; Result record @ document system
edge: Non-normal process | measured parts are skewed | Empirical distributions
edge: Assembly sequence | order changes the fit | Sequence-aware models
edge: Wear in use | tolerances change over time | Life-stage analysis
off: Predicted versus measured fit rate ; Sensitivity accuracy ; Cost estimate error
on: Assemblies out of fit ; Tolerance cost ; Rework
gap: Worst case only ; Nominal data ; Tightening everything

== requirements-traceability-assistant | Requirements Traceability Assistant | nlp,graph | batch | advanced | a=0.2 k=20
obj: Link requirements to design elements, tests and changes, find gaps and conflicts and propose trace links for engineers to confirm.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{RankLoss}
con: Links proposed and confirmed by engineers ; Gaps shown with the requirement text ; Changes show downstream impact ; Weekly scan of 100K requirements ; Audit export in standard formats
sn: Link | Confirmed trace links | Text similarity | Similar text may not mean satisfaction
sn: Role | Propose and find gaps | Declare compliance | Compliance needs engineers
sn: Value | Impact analysis | A link count | Counts can hide gaps
sig: Text similarity | requirement and design element text | Candidate | From a text model
sig: Existing trace links | confirmed links | Truth | From the requirements tool
sig: Test coverage | tests linked to the requirement | Gap | From the test system
sig: Change history | updates to requirements and design | Impact | From version control
noise: Author name | personal data
noise: Document template | an artefact
noise: Requirement id format | an identifier
base: Manual traceability matrices in spreadsheets, because they are the common tool.
prod: A linking service that suggests trace links, flags uncovered or conflicting requirements, shows change impact and exports audit-ready traceability.
pipe: Requirement and design extraction @ tools ; Candidate link search @ embeddings ; Link ranking @ learned ranker ; Engineer confirmation @ requirements tool ; Gap and conflict report @ analytics ; Change impact view @ dashboard ; Audit export @ report
edge: Vague requirement | the text cannot be tested | Flag for rewriting
edge: Duplicate requirements | wording differs for the same need | Duplicate clusters
edge: Late change | a requirement changes near release | Impact alert to owners
off: Link precision at five ; Gap detection recall ; Engineer acceptance
on: Untraced requirements ; Time to impact analysis ; Audit findings
gap: Similarity as compliance ; Declared compliance ; Link counts as quality

== engineering-knowledge-assistant | Engineering Knowledge Assistant | llm-agents,nlp | seconds | foundational | a=0.2 k=40
obj: Answer engineering questions from company standards, past design reports, lessons learned and calculations with citations, respecting project and client access rights.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Every answer cites document, revision and page ; Access follows project and client permissions ; Superseded documents are labelled ; Answer within 5 s ; 5M documents indexed
sn: Source | Released documents and standards | Model memory | Standards and designs change
sn: Access | Client-segregated indexes | One shared index | Client information must stay separate
sn: Trust | Citations with revision | Unsourced answers | Engineers must verify
sig: Document relevance | semantic and keyword match | Core | From hybrid search
sig: Document status and revision | released, draft or superseded | Filter | From the document system
sig: Access rights | project and client permissions | Gate | From identity
sig: Discipline and project type | context of the question | Ranking | From metadata
noise: Asker name | personal data
noise: Chat length | weak link
noise: File format | an artefact
base: Folder browsing and keyword search on shared drives, because they are the current tools.
prod: A retrieval assistant over released documents with permission filters, status labels and citations that logs questions and flags gaps for knowledge owners.
pipe: Question intake @ chat ; Permission check @ identity ; Hybrid retrieval @ search index ; Status filter @ document system ; Answer with citations @ LLM ; Engineer verification @ engineer ; Gap report @ knowledge owners
edge: Superseded standard | an old standard appears | Status labels and warnings
edge: Cross-client leak risk | similar projects for different clients | Segregated indexes
edge: Poor scans | drawings are image-only | Text extraction and quality flags
off: Retrieval accuracy ; Answer faithfulness ; Access violation tests
on: Time to find information ; Repeated design errors ; Questions to senior engineers
gap: Model memory of standards ; One shared index ; Unlabelled superseded files

== engineering-drawing-digitisation | Engineering Drawing Digitisation | computer-vision,nlp | batch | advanced | a=0.3 k=10
obj: Convert scanned drawings and pipe and instrument diagrams into structured data on symbols, lines, tags and title block fields, with quality checks for engineers to confirm.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Every extracted item links back to its place on the drawing ; Low-confidence items queued for review ; Symbol recall above 97% ; Processing of 1M sheets ; Controlled originals unchanged
sn: Label | Verified digitised drawings | Raw OCR output | OCR misreads symbols and tags
sn: Review | Checks by connectivity and tag consistency | Visual spot checks | Errors hide in connections
sn: Output | Structured data and linked images | Images only | Data is needed for downstream use
sig: Symbol detections | symbol classes and positions | Core | From a vision model
sig: Line connectivity | pipes and signal lines connecting symbols | Core | From line tracing
sig: Tag text | equipment tags and notes | Core | From OCR
sig: Title block fields | revision and approval state | Control | From extraction
noise: Drawer name | personal data
noise: Scan resolution | an artefact
noise: Paper size | weak link
base: Manual redrawing and data entry by drafters, because it is the usual practice.
prod: A vision pipeline that detects symbols, traces connectivity, reads tags and checks consistency, with a review tool and export to engineering data models.
pipe: Scan intake @ document system ; Cleaning and deskew @ image tools ; Symbol and line detection @ vision model ; Tag OCR @ OCR ; Consistency checks @ rules ; Reviewer correction @ review UI ; Export @ engineering data model
edge: Poor scan | faded or stained drawings | Quality flags and manual review
edge: Legacy symbols | old standards use other symbols | Symbol library by era
edge: Overlapping lines | connections are ambiguous | Connectivity review queue
off: Symbol recall and precision ; Connectivity accuracy ; Tag accuracy
on: Time to digitise ; Review corrections ; Errors found in later use
gap: Raw OCR as truth ; Images without data ; Spot checks only

== bim-clash-detection-prioritisation | BIM Clash Detection and Prioritisation | graph,tabular | batch | advanced | a=0.5 k=5
obj: Rank model clashes between disciplines by real impact and likely fix owner so coordination meetings resolve the important ones first and ignore harmless overlaps.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{RankLoss}
con: Every clash stays in the register ; Critical clashes flagged within 1 day of the model update ; Coordinators decide ; Owner suggestion shown with evidence ; 100K clashes per project
sn: Label | Clashes that led to design changes or site rework | Clashes marked resolved | Many are closed without change
sn: Priority | Impact on cost, schedule and safety | Overlap volume | Large overlaps can be harmless
sn: Control | Coordinator decisions | Automatic assignment | Fixes affect several disciplines
sig: Element types in clash | systems involved | Core | From the model
sig: Clash depth and tolerance context | penetration and allowances | Severity | From geometry
sig: Space and access criticality | impact on maintenance and egress | Impact | From the model
sig: Construction sequence | whether the work is soon | Urgency | From the schedule
noise: Modeller name | personal data
noise: Clash id | an identifier
noise: Model file name | an artefact
base: Batches of clashes grouped by location and reviewed in weekly meetings, because it is the usual process.
prod: A ranking model on clash features that groups related clashes, estimates impact and the owner and feeds the coordination meeting with a short prioritised list.
pipe: Model federation @ BIM platform ; Clash detection @ geometry engine ; Grouping @ clustering ; Impact ranking @ learned ranker ; Owner suggestion @ rules ; Coordination meeting @ BIM coordinators ; Resolution tracking @ issue tracker
edge: Model lag | one discipline model is outdated | Model freshness flags
edge: Soft clash | clearance zones overlap | Clearance rule sets
edge: Late design change | new clashes appear near construction | Sequence-aware alerts
off: Rank accuracy against rework outcomes ; Grouping quality ; Critical recall
on: Clashes resolved before construction ; Rework from clashes ; Meeting time
gap: Overlap volume as severity ; Closed as resolved ; Automatic assignment

== quantity-takeoff-from-drawings | Quantity Takeoff from Drawings and Models | computer-vision,tabular | batch | foundational | a=0.3 k=5
obj: Measure quantities such as areas, lengths and counts from models and drawings and compare them with estimates, with estimators confirming the results.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Quantities link to model elements or drawing regions ; Estimators confirm before use in a bid ; Differences against the estimate flagged ; Takeoff of 5,000 sheets per project ; Units and scales checked
sn: Source | Model elements where available | Image measurements first | Models are exact when they are complete
sn: Check | Compare with the estimate and past projects | Trust the first result | Scale errors are common
sn: Control | Estimator confirmation | Automatic pricing | Bids carry commercial risk
sig: Element quantities | areas, volumes and counts | Core | From the model
sig: Drawing scale and units | scale bar and units | Check | From the drawing
sig: Assembly definitions | materials per element | Mapping | From the cost database
sig: Historic ratios | quantities per floor area | Sanity check | From past projects
noise: Estimator name | personal data
noise: Sheet number | an identifier
noise: Drawing style | an artefact
base: Manual measurement on screen by estimators, because it is the current practice.
prod: A takeoff pipeline that reads model quantities or measures drawings with scale checks, maps to cost items and flags gaps to ratios for estimator review.
pipe: Model and drawing intake @ document system ; Element extraction @ BIM and vision ; Scale and unit check @ rules ; Cost item mapping @ cost database ; Ratio sanity check @ analytics ; Estimator review @ estimating tool ; Quantity export @ bid system
edge: Incomplete model | elements are missing | Drawing-based fallback and gap report
edge: Revisions | quantities change between issues | Revision comparison
edge: Unit mix | metric and imperial are mixed | Unit checks
off: Quantity error against audited takeoffs ; Mapping accuracy ; Scale error detection
on: Takeoff time ; Estimate corrections ; Bid errors
gap: Unchecked scale ; Automatic pricing ; Image-only measurement

== specification-compliance-checking | Specification Compliance Checking | nlp,graph | batch | advanced | a=0.3 k=20
obj: Check submitted designs and product data against specification clauses and codes and list clauses that are met, unmet or unclear, with citations for reviewers to decide.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Each finding cites the clause and the source evidence ; Reviewers decide compliance ; Unclear items never marked compliant ; Review within 1 hour for 500 documents ; Code editions tracked
sn: Output | Met, unmet or unclear with evidence | A compliance pass | Compliance is a professional judgement
sn: Source | Current code and specification editions | Model memory | Codes change by edition
sn: Safety | Unclear defaults to review | Assume compliant | Silent passes are dangerous
sig: Clause requirement | the numeric or textual requirement | Core | From the specification
sig: Evidence extraction | values in the submission | Core | From documents
sig: Edition and jurisdiction | code version in force | Applicability | From project data
sig: Match confidence | confidence of the extraction | Review routing | From the model
noise: Submitter name | personal data
noise: Document layout | an artefact
noise: Company logo | irrelevant
base: Reviewers reading specifications and submissions side by side, because it is the standard practice.
prod: A checker that extracts requirements and evidence, compares them with units and editions and produces a cited table of met, unmet and unclear items.
pipe: Specification and submission intake @ document system ; Requirement and value extraction @ NLP and tables ; Unit normalisation @ rules ; Comparison @ rules and LLM ; Cited result table @ report ; Reviewer decision @ review tool ; Feedback @ monthly
edge: Ambiguous clause | the wording has several readings | Mark unclear and ask the reviewer
edge: Unit conversion | values use mixed units | Normalisation with checks
edge: Superseded code | the wrong edition applies | Edition lookup by project
off: Extraction accuracy ; Unmet item recall ; Citation faithfulness
on: Review time ; Non-compliance found late ; Resubmission rate
gap: Silent compliance passes ; Model memory of codes ; Assumed compliant

== as-built-deviation-detection | As-Built Deviation Detection | computer-vision,graph | batch | advanced | a=0.5 k=5
obj: Compare laser scans and photos of completed work with the design model and flag deviations beyond tolerance for the site engineer to inspect.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{GraphReg}
con: Deviations shown with location and measured distance ; Tolerance limits from the specification ; Site engineer confirms ; Scan registration error under 5 mm ; 50 scans per week
sn: Truth | Surveyed control points | Visual alignment only | Misaligned scans create false deviations
sn: Threshold | Specification tolerances | One limit for all | Tolerances differ by element
sn: Action | Inspection by an engineer | Automatic rework orders | Rework has cost and contract effects
sig: Point-to-model distance | scan deviation from the model | Core | From registration
sig: Element type and tolerance class | what is being checked | Threshold | From the model
sig: Registration quality | residual error | Quality | From the survey
sig: Visibility and occlusion | whether the element was seen | Confidence | From scan coverage
noise: Surveyor name | personal data
noise: Scan file name | an artefact
noise: Weather | weak link
base: Manual spot measurements by surveyors, because they are the standard method.
prod: A comparison pipeline that registers scans to the model, computes deviations by element tolerance and creates inspection tasks with images and distances.
pipe: Scan capture @ laser scanner ; Registration to control points @ survey software ; Model comparison @ geometry engine ; Tolerance check @ rules ; Inspection task @ site app ; Engineer decision @ site engineer ; Result record @ document system
edge: Temporary works | objects block the view | Occlusion masks
edge: Model out of date | design changed on site | Revision matching
edge: Poor registration | survey control targets moved between scans | Quality gate before analysis
off: Deviation detection against surveys ; Tolerance classification accuracy ; Registration error
on: Deviations found before handover ; Rework cost ; Inspection time
gap: Visual alignment as truth ; One tolerance for all ; Automatic rework orders

== engineering-change-impact-analysis | Engineering Change Impact Analysis | graph,nlp | seconds | advanced | a=0.5 k=5
obj: Estimate which drawings, parts, tests, suppliers and schedules a proposed change affects so change boards decide with the full impact.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{GraphReg}
con: Impacted items shown with the path from the change ; Change board decides ; Cost and schedule effect shown as ranges ; Analysis within 2 minutes ; 1M linked items
sn: Source | Linked product and document structure | Text search | Text misses indirect links
sn: Output | Impact list with confidence | A single number | Boards need the list
sn: Control | Board approval | Automatic approval | Changes carry cost and safety effects
sig: Item dependency graph | parts, drawings and tests linked | Core | From the PLM
sig: Change type and size | scope of the change | Scale | From the request
sig: Supplier and lead time data | procurement impact | Impact | From procurement
sig: Past change outcomes | similar changes and results | Prior | From history
noise: Requester name | personal data
noise: Change number | an identifier
noise: Document template | an artefact
base: Engineers tracing impact by hand with part lists and email, because it is the usual practice.
prod: A graph-based analysis that walks dependencies from the change, estimates cost and schedule ranges and lists items and owners for the change board.
pipe: Change request @ PLM ; Dependency traversal @ graph database ; Text link suggestion @ NLP ; Cost and schedule estimate @ models ; Impact report @ change board pack ; Board decision @ change board ; Outcome feedback @ quarterly
edge: Missing links | the structure is incomplete | Flag unlinked items
edge: Cascading change | changes trigger further changes | Multi-level traversal
edge: Supplier lock-in | tooling cannot change quickly | Supplier constraint flags
off: Impact recall against past changes ; Cost estimate error ; Owner accuracy
on: Late discovered impacts ; Change cycle time ; Rework from changes
gap: Text-only impact ; Single number impact ; Automatic approval

== engineering-document-classification-control | Engineering Document Classification and Control | nlp,computer-vision | batch | foundational | a=0.2 k=5
obj: Classify incoming project documents by type, discipline and revision, check metadata against naming rules and route them to the right reviewers and folders.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Low-confidence items go to document controllers ; Controlled revisions never overwritten ; Metadata checked against naming standards ; Classification of 50K documents per month ; Audit trail for every move
sn: Label | Document controller classifications | File names | Names are inconsistent
sn: Control | Document controller approval for controlled sets | Automatic release | Release is a controlled act
sn: Metric | Misfiled rate | Classification accuracy alone | Misfiles cause rework
sig: Title block and header text | document number and revision | Core | From extraction
sig: Content type | drawing, report, calculation or certificate | Core | From a classifier
sig: Discipline | structural, mechanical or electrical | Routing | From classification
sig: Naming rule check | match to standard | Quality | From rules
noise: Sender name | personal data
noise: File size | weak link
noise: Email subject wording | weak link
base: Document controllers sorting and renaming files by hand, because it is the usual process.
prod: A classification and metadata service with confidence routing and rule checks that proposes filing and reviewer lists and leaves controlled releases to document controllers.
pipe: Document intake @ transmittal ; Text and layout extraction @ OCR ; Type and discipline classifier @ transformer ; Naming and revision check @ rules ; Routing proposal @ workflow ; Controller approval @ document system ; Audit log @ append-only store
edge: Missing title block | metadata cannot be read | Controller queue
edge: Revision clash | two documents claim the same revision | Hold and alert
edge: Mixed language | documents use several languages | Multilingual models
off: Classification accuracy ; Revision extraction accuracy ; Misfile rate
on: Document handling time ; Misfiled documents ; Rework from wrong revisions
gap: File name as label ; Automatic release ; Overwriting controlled revisions

== schedule-delay-risk-forecasting | Schedule Delay Risk Forecasting | time-series,tabular | batch | advanced | a=1 k=4
obj: Forecast project completion dates as ranges from progress, float and risk drivers and name the activities most likely to cause delay, for project managers to act on.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Forecast shown as a range with probabilities ; Critical path drivers named ; Baselines changed only through change control ; Weekly refresh for 500 projects ; Project manager owns the response
sn: Method | Monte Carlo schedule risk with learned durations | Planned dates | Plans are optimistic
sn: Label | Actual activity durations and delays | Reported percent complete | Percent complete is optimistic
sn: Use | Early warning and recovery planning | A commitment | Forecasts are not promises
sig: Progress and float | completion and slack | Core | From the schedule
sig: Duration performance | actual versus planned durations | Core | From updates
sig: Weather and site constraints | days lost to weather | Risk | From weather data
sig: Supplier and permit status | deliveries and approvals | Risk | From project records
noise: Planner name | personal data
noise: Activity description wording | weak link
noise: Report date | an artefact
base: Critical path method with a planner judgement on contingency, because it is the standard method.
prod: A forecast that combines schedule logic, learned duration performance and risk drivers, outputs completion ranges and shows the activities and risks that move the date.
pipe: Schedule and progress data @ scheduling tool ; Duration model @ gradient boosting ; Monte Carlo simulation @ forecaster ; Driver attribution @ sensitivity analysis ; Dashboard @ project controls ; Manager review @ weekly ; Accuracy tracking @ quarterly
edge: Re-baselined schedule | the plan changes mid-project | Baseline version tracking
edge: Optimistic reporting | progress is overstated | Cross-checks with site data
edge: Early project | little progress exists | Reference class forecasts
off: Calibration of date ranges ; Delay driver accuracy ; Forecast error
on: Late completion ; Time to detect delay ; Recovery plan effectiveness
gap: Planned dates as forecasts ; Percent complete as truth ; Forecasts as commitments

== cost-overrun-prediction | Cost Overrun Prediction | tabular,time-series | batch | advanced | a=1 k=4
obj: Predict final project cost and the likelihood of overrun from commitments, progress and change orders, naming drivers so cost managers can act early.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Forecast shown as a range ; Drivers named by cost code ; Cost managers own the forecast ; Calibrated overrun probabilities ; Monthly refresh for 2,000 projects
sn: Label | Final cost compared with the approved budget | Mid-project forecasts | Forecasts can be wrong
sn: Level | Project and cost code | Individual manager comparison | Individual rankings distort reporting
sn: Method | Earned value with learned adjustments | Linear extrapolation | Cost rarely grows linearly
sig: Earned value indicators | cost and schedule performance indices | Core | From cost control
sig: Committed cost and change orders | commitments and approved changes | Core | From the ledger
sig: Productivity rates | actual versus planned | Driver | From site data
sig: Market price indices | material and labour inflation | Driver | From indices
noise: Manager name | personal data
noise: Invoice number | an identifier
noise: Report layout | an artefact
base: Earned value analysis with manual contingency, because it is the standard method.
prod: A forecasting model that adjusts earned value with change order patterns and price indices, outputs overrun probabilities and ranks cost codes by risk.
pipe: Cost and commitment data @ cost system ; Feature build @ batch ; Overrun model @ gradient boosting ; Calibration @ isotonic fit ; Driver attribution @ explanations ; Cost manager review @ monthly ; Outcome tracking @ project close
edge: Large claim | one dispute shifts final cost | Scenario adjustments
edge: Currency swings | prices move with exchange rates | Currency features
edge: New client | there is no history | Pooled priors
off: Calibration ; Forecast error by project stage ; Driver accuracy
on: Cost overrun rate ; Time to detect overruns ; Contingency use
gap: Linear extrapolation ; Individual manager comparison ; Mid-project forecasts as labels

== site-progress-monitoring | Site Progress Monitoring | computer-vision,graph | batch | advanced | a=0.5 k=5
obj: Compare site photos, drone and scan data with the model and schedule to estimate progress by element and area, using scene-level data and never identifying workers.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{GraphReg}
con: Progress by element and area only ; Faces and people blurred at capture ; Site manager confirms progress claims ; Weekly capture of 100 sites ; Imagery retention limited
sn: Unit | Building elements and areas | Workers or crews | Worker tracking raises legal and trust issues
sn: Truth | Verified inspections | Percent complete reports | Reports can be optimistic
sn: Privacy | Blur people at capture | Store identifiable images | Images can identify workers
sig: Element visibility and state | installed, partial or absent | Core | From imagery
sig: Model element match | which element is visible | Core | From registration
sig: Schedule activity link | activity linked to elements | Comparison | From the schedule
sig: Capture quality | lighting and coverage | Confidence | From metadata
noise: Worker identity | personal data
noise: Photographer name | personal data
noise: Camera model | weak link
base: Site managers estimating progress during walks, because it is the usual practice.
prod: A progress pipeline that registers images to the model, classifies element states, blurs people at the edge and updates a progress view for schedule review.
pipe: Image and scan capture @ site cameras and drones ; People blurring @ edge model ; Registration to model @ vision ; Element state classifier @ vision model ; Progress mapping @ schedule link ; Site manager review @ app ; Progress report @ project controls
edge: Occlusion | scaffolding hides work | Coverage confidence
edge: Similar elements | hidden details are alike | Multi-view checks
edge: Lighting | low light reduces accuracy | Quality gates
off: Element state accuracy ; Progress error against inspections ; Blur recall
on: Progress reporting time ; Disputes over progress ; Schedule surprises
gap: Worker tracking ; Percent complete as truth ; Identifiable image storage

== rfi-triage-response-drafting | RFI Triage and Response Drafting | llm-agents,nlp | seconds | foundational | a=0.2 k=20
obj: Classify requests for information, find the relevant drawings and specifications and draft a response for the design team to review, tracking time to answer.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Responses cite drawing and specification references ; Design team approves every response ; Contract deadlines tracked ; Triage within 1 minute ; 30K RFIs per year
sn: Source | Current drawings, specifications and prior RFIs | Model memory | Answers must match the contract documents
sn: Role | Draft and route | Answer on behalf of the designer | Design intent belongs to the engineer
sn: Priority | Impact on schedule | Arrival order | Some RFIs block critical work
sig: RFI text and sketch | the question and attachments | Core | From the RFI system
sig: Related documents | matching drawings and clauses | Evidence | From retrieval
sig: Schedule link | activity blocked by the RFI | Priority | From the schedule
sig: Similar past RFIs | previous answers | Hint | From history
noise: Submitter name | personal data
noise: RFI number | an identifier
noise: Email signature | irrelevant
base: Project engineers reading each RFI and searching drawings by hand, because it is the usual process.
prod: A triage and drafting assistant that links RFIs to documents and past answers, ranks by schedule impact and drafts a cited response for the responsible designer.
pipe: RFI intake @ project platform ; Classification and priority @ model ; Document retrieval @ search ; Draft response with citations @ LLM ; Designer review @ design team ; Response issue @ project platform ; Cycle time tracking @ monthly
edge: Conflicting documents | drawings and specifications disagree | Show the conflict and escalate
edge: Missing information | the RFI lacks detail | Ask the submitter for details
edge: Design change needed | the RFI reveals a design problem | Route to the engineer of record
off: Retrieval accuracy ; Draft acceptance ; Priority accuracy
on: RFI response time ; RFIs past contract deadline ; Schedule delay from RFIs
gap: Answers without citations ; Model as designer ; Arrival-order handling

== submittal-review-assistant | Submittal Review Assistant | nlp,computer-vision | batch | foundational | a=0.2 k=10
obj: Check contractor submittals such as product data and shop drawings against specifications and drawings and prepare a review note for the reviewing engineer to approve or reject.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Every note cites the specification section ; Engineer approves or rejects ; Missing items listed ; Review preparation within 1 hour for 20K submittals per year ; Stamps applied only by engineers
sn: Output | Item-by-item comparison with citations | An approval recommendation only | Reviewers need the evidence
sn: Scope | Specified properties and drawings | Everything in the file | Large files hide key items
sn: Control | Engineer stamp | Automatic stamp | Stamps carry liability
sig: Specified requirements | values and standards required | Core | From specifications
sig: Submitted product values | values in the data sheet | Core | From extraction
sig: Drawing references | locations the product is used | Context | From drawings
sig: Previous submittal decisions | similar reviews | Hint | From history
noise: Submitter name | personal data
noise: Brand logo | irrelevant
noise: Page layout | an artefact
base: Engineers comparing submittals and specifications by hand, because it is the standard practice.
prod: A comparison assistant that extracts requirements and product values, flags mismatches and gaps and drafts a review note with citations for the engineer.
pipe: Submittal intake @ project platform ; Requirement lookup @ specification index ; Value extraction @ NLP and tables ; Comparison @ rules ; Review note draft @ LLM with citations ; Engineer decision @ review tool ; Log update @ submittal register
edge: Equivalent product | a substitute is proposed | Flag for engineer judgement
edge: Missing data sheet | key values are absent | List missing items
edge: Conflicting values | data sheet pages differ | Show conflict
off: Mismatch detection recall ; Citation accuracy ; Engineer acceptance
on: Review turnaround ; Submittals returned for errors ; Late material approvals
gap: Approval recommendation without evidence ; Automatic stamps ; Whole-file review

== crew-equipment-scheduling | Crew and Equipment Scheduling | reinforcement-learning,tabular | batch | advanced | a=1 k=5
obj: Plan crews, cranes and equipment across work fronts to meet the schedule with fewer conflicts and idle time, subject to labour rules and safety limits, for planners to approve.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Labour rules and rest periods respected ; Safety limits on lifts and zones enforced ; Planners approve the plan ; Replan within 10 minutes ; 200 sites
sn: Objective | On-time completion and utilisation | Utilisation alone | High utilisation delays critical work
sn: Constraint | Safety, labour and access rules | Soft preferences | Rules cannot be traded
sn: Level | Crews and equipment as groups | Individual worker performance | Individual tracking is not needed
sig: Activity demand | work and crew type needed | Core | From the schedule
sig: Resource availability | crews and equipment by day | Core | From the resource plan
sig: Site constraints | lift zones and access | Constraint | From the site plan
sig: Weather outlook | days with limits | Risk | From forecasts
noise: Worker name | personal data
noise: Equipment brand | weak link
noise: Crew nickname | irrelevant
base: Weekly planning meetings with spreadsheets, because it is the usual practice.
prod: An optimiser with constraint rules that proposes weekly crew and equipment plans, shows conflicts and trade-offs and replans when conditions change.
pipe: Demand and availability @ schedule and resource data ; Constraint model @ rules ; Plan optimisation @ solver ; Conflict report @ planner view ; Planner approval @ weekly meeting ; Publication @ site app ; Replan on change @ trigger
edge: Equipment failure | a crane is out of service | Alternative plans
edge: Weather loss | work stops for a day | Weather-aware replanning
edge: Subcontractor delay | a crew arrives late | Reallocation options
off: Plan feasibility ; Utilisation and delay in simulation ; Planner acceptance
on: Idle equipment time ; Schedule conflicts ; Overtime hours
gap: Utilisation alone ; Soft safety limits ; Individual tracking

== material-delivery-lead-time-risk | Material Delivery Lead Time Risk | tabular,time-series | batch | foundational | a=1 k=3
obj: Predict late deliveries of materials and equipment from supplier history and order status and flag orders that threaten the schedule so buyers can expedite or re-sequence.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Alerts at least 3 weeks before the needed date ; Buyers decide on expediting ; Calibrated probabilities ; Weekly scoring of 50K order lines ; Supplier ratings explained
sn: Label | Orders delivered after the need date | Orders delivered after the promised date | Promised dates may be padded
sn: Impact | Float on the linked activity | Lateness alone | Late items with float are harmless
sn: Fairness | Supplier performance reviewed by procurement | Automatic supplier penalties | Penalties need commercial review
sig: Supplier on-time history | past delivery performance | Core | From procurement
sig: Order status and milestones | fabrication and shipping steps | Core | From supplier updates
sig: Linked activity float | slack on the schedule | Impact | From the schedule
sig: Logistics conditions | port or route disruptions | Risk | From logistics feeds
noise: Buyer name | personal data
noise: Purchase order number | an identifier
noise: Supplier brand | weak link
base: Expediting lists reviewed by buyers each week, because it is the usual process.
prod: A risk model on order milestones and supplier history that ranks orders by lateness probability and schedule impact and feeds the buyer expediting list.
pipe: Order and milestone data @ procurement system ; Feature build @ batch ; Lateness model @ gradient boosting ; Calibration @ isotonic fit ; Float join @ schedule ; Expedite list @ buyer dashboard ; Outcome tracking @ monthly
edge: Single-source item | there is no alternative supplier | Early engagement flags
edge: Port disruption | shipments are delayed | Logistics feeds
edge: Unreliable updates | supplier updates are stale | Staleness features
off: Calibration ; Recall at the list size ; Lead time before need date
on: Late deliveries impacting the schedule ; Expedite cost ; Idle crews waiting for materials
gap: Promised date as label ; Lateness without float ; Automatic supplier penalties

== site-hazard-ppe-detection | Site Hazard and PPE Detection | computer-vision | seconds | advanced | a=1 k=5
obj: Detect scene-level hazards such as missing edge protection, unguarded openings, blocked exits and exclusion zone breaches from site cameras and alert the safety manager, without identifying or scoring individual workers.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: No face recognition and no individual identification ; Alerts by zone to safety managers ; Imagery retention under 30 days ; Alert within 10 s ; Works council agreement before deployment
sn: Unit | Zones and conditions | Named workers | Individual tracking is not allowed
sn: Cost | Missed hazards cost more than false alerts | Equal weights | The costs differ
sn: Action | Alert to a safety manager | Discipline records | Detection is for prevention
sig: Hazard condition classification | open edge, blocked exit or zone breach | Core | From a vision model
sig: Zone and activity context | what work is planned there | Context | From the site plan
sig: Equipment proximity | vehicle or crane near an exclusion zone | Risk | From telematics
sig: Persistence | whether the condition lasts | Confidence | From video
noise: Worker identity | personal data
noise: Camera brand | weak link
noise: Clothing colour | weak link
base: Safety walks and inspections by safety officers, because they are the standard control.
prod: A scene-level detection system with edge blurring of people, hazard classes by zone and alerts to safety managers with images and tracked follow-up.
pipe: Camera stream @ site cameras ; People blurring @ edge model ; Hazard classifier @ vision model ; Zone logic @ rules ; Safety manager alert @ app ; Corrective action @ safety log ; Review of alerts @ weekly
edge: Night work | low light lowers accuracy | Infrared or lighting requirements
edge: Weather | rain or dust blur the view | Quality gates
edge: Temporary structures | layout changes daily | Zone updates
off: Hazard recall by class ; False alert rate ; Alert latency
on: Hazards open beyond a day ; Near misses ; Time to correct hazards
gap: Individual identification ; Equal error costs ; Detection as discipline

== weld-concrete-defect-inspection | Weld and Concrete Defect Inspection | computer-vision | batch | advanced | a=0.3 k=5
obj: Detect defects in weld radiographs, ultrasonic scans and concrete surfaces and rank findings by severity for qualified inspectors to review and decide.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Qualified inspector decides acceptance ; Defect recall above 98% at the review rate ; Findings show images and measurements ; Processing of 10K inspections per year ; Calibrated confidence
sn: Label | Inspector findings and later failures | Automated pass marks | Passes can miss defects
sn: Cost | Missing a defect costs more than a recheck | Equal weights | The costs differ
sn: Role | Prioritise and highlight | Accept welds | Acceptance needs certified inspectors
sig: Defect candidate regions | cracks, porosity and voids | Core | From a vision model
sig: Defect size and location | measurements | Severity | From geometry
sig: Weld or pour metadata | process and material | Context | From inspection records
sig: Image quality | contrast and coverage | Confidence | From the image
noise: Inspector name | personal data
noise: Scanner brand | weak link
noise: File name | an artefact
base: Inspectors reading every image by eye, because it is the standard method.
prod: A detection model that marks candidate defects with measurements, orders the review queue by risk and records inspector decisions for retraining.
pipe: Image acquisition @ NDT equipment ; Quality check @ rules ; Defect detection @ vision model ; Severity ranking @ model and rules ; Inspector review @ review tool ; Decision record @ quality system ; Retraining @ quarterly
edge: Rare defect type | the type has few examples | Inspector flag and active learning
edge: Complex geometry | access limits the scan | Coverage reporting
edge: Equipment drift | scanner settings change | Calibration checks
off: Defect recall at the review rate ; False alert rate ; Calibration
on: Defects found before service ; Inspection time ; Weld repairs
gap: Automatic acceptance ; Equal error costs ; Passes as labels

== nonconformance-report-classification | Nonconformance Report Classification | nlp,tabular | batch | foundational | a=0.2 k=5
obj: Classify nonconformance reports by cause, discipline and severity and find repeating patterns across projects and suppliers so quality managers can fix systemic causes.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Quality managers confirm classifications ; Patterns shown by supplier and process, not by individual ; Safety-related reports routed at once ; Weekly analysis of 100K reports ; No personal blame fields
sn: Label | Root causes confirmed in closure | Initial category | Initial categories are often wrong
sn: Level | Process, supplier and design | Individual workers | Blame hides real causes
sn: Action | Corrective action tracking | Report counts | Counts do not fix causes
sig: Report text and photos | description of the issue | Core | From the quality system
sig: Work package and supplier | where the issue arose | Pattern | From project data
sig: Inspection stage | when it was found | Context | From records
sig: Closure outcome | cause and corrective action | Label | From closure records
noise: Reporter name | personal data
noise: Report number | an identifier
noise: Photo count | weak link
base: Quality managers reading and categorising reports by hand, because it is the usual practice.
prod: A classifier and clustering tool that proposes cause categories and groups repeating issues by process and supplier for quality reviews.
pipe: Report intake @ quality system ; Text and image parsing @ NLP and vision ; Cause classifier @ transformer ; Pattern clustering @ analytics ; Quality manager review @ dashboard ; Corrective action @ tracker ; Effectiveness check @ quarterly
edge: Free-text vagueness | the report lacks detail | Request details
edge: Multiple causes | one report has several causes | Multi-label output
edge: Supplier change | patterns shift with a new supplier | Time windows
off: Cause classification accuracy ; Cluster quality ; Safety recall
on: Repeat nonconformances ; Time to root cause ; Rework cost
gap: Initial category as label ; Individual blame ; Report counts as quality

== drone-inspection-analysis | Drone Inspection Analysis | computer-vision | batch | advanced | a=0.3 k=5
obj: Analyse drone images of roofs, towers, stockpiles and facades to detect damage and measure change over time, for inspectors to confirm and plan repairs.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Calibration}
con: Findings link to image and location ; Inspector confirms before repair orders ; Flights follow airspace and privacy rules ; Change detection with 2 cm resolution ; 5K assets per year
sn: Label | Inspector-verified defects | Model findings from earlier runs | Errors can be copied forward
sn: Compare | Same-angle repeat captures | Different angles | Angle changes look like change
sn: Privacy | Flight plans avoiding private areas | Unrestricted capture | Drones capture people and neighbours
sig: Defect candidates | cracks, corrosion and loose items | Core | From a vision model
sig: Pose and registration | position of images over time | Alignment | From survey data
sig: Measurement scale | resolution and scale | Size | From metadata
sig: Asset history | earlier findings | Context | From records
noise: Pilot name | personal data
noise: Drone model | weak link
noise: Weather label | weak link
base: Inspectors climbing or using binoculars and cameras, because it is the standard method.
prod: A pipeline that plans repeatable flights, detects and measures defects, aligns images across visits and gives inspectors a ranked list with images.
pipe: Flight plan @ drone software ; Image capture @ drone ; Registration and mosaicking @ photogrammetry ; Defect detection @ vision model ; Change detection @ comparison ; Inspector review @ app ; Repair task @ maintenance system
edge: Glare | sun reflections hide defects | Capture time rules
edge: Obstacles | trees block the view | Coverage reports
edge: GPS error | image positions drift | Control points
off: Defect recall and precision ; Measurement error ; Registration error
on: Time to inspect ; Defects found before failure ; Inspection risk to people
gap: Model findings as labels ; Mixed-angle comparison ; Unrestricted capture

== construction-equipment-telematics-analytics | Construction Equipment Telematics Analytics | time-series,tabular | batch | foundational | a=1 k=3
obj: Use equipment telemetry to estimate utilisation, idle time, fuel use and maintenance needs by machine type and site so fleets are planned and serviced better, without scoring operators.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Analysis at machine and fleet level ; No operator ranking ; Maintenance alerts at least 7 days ahead ; Daily data from 10K machines ; Owners approve service plans
sn: Level | Machine and fleet | Operator | Operator ranking harms trust and reporting
sn: Metric | Productive hours and fuel per task | Engine hours alone | Engine hours include idling
sn: Action | Planned servicing and reallocation | Penalties | Penalties distort data
sig: Engine and hydraulic telemetry | temperatures, pressures and hours | Core | From telematics
sig: Idle and productive time | state of operation | Core | From telematics
sig: Duty cycle by task | machine use pattern | Context | From site data
sig: Service history | past repairs | Prior | From maintenance records
noise: Operator name | personal data
noise: Machine nickname | irrelevant
noise: Site manager name | personal data
base: Fixed service intervals by engine hours, because they are the standard schedule.
prod: A fleet analytics service with condition-based maintenance predictions and utilisation reports by machine type and site that planners use to reallocate and service machines.
pipe: Telemetry ingestion @ telematics gateway ; State classification @ rules and model ; Utilisation analytics @ batch ; Failure risk @ gradient boosting ; Service plan @ maintenance system ; Fleet planner review @ weekly ; Outcome tracking @ monthly
edge: Missing signals | machines lose connectivity | Store and forward
edge: Mixed fleets | machines report in different formats | Normalisation layer
edge: Harsh sites | duty cycles are extreme | Site-aware thresholds
off: Failure prediction accuracy ; Utilisation accuracy ; Lead time
on: Unplanned machine downtime ; Fuel cost ; Idle time
gap: Operator ranking ; Engine hours as productivity ; Penalties

== rework-prediction | Rework Prediction | tabular,graph | batch | advanced | a=1 k=4
obj: Predict which work packages are likely to need rework from design quality, inspection results and conditions so teams add checks before work is built.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Alerts at least 1 week before work starts ; Work package level only ; Quality managers decide on extra checks ; Calibrated probabilities ; 100K work packages
sn: Label | Rework recorded in the quality system | Reports of delay | Delays have many causes
sn: Level | Work package and design item | Individual crews | Crew ranking distorts reporting
sn: Action | Pre-work reviews and extra inspection | Penalties | Penalties hide rework
sig: Design maturity | open clashes and late revisions | Core | From the model and register
sig: Inspection history | past findings in similar work | Core | From the quality system
sig: Conditions and complexity | weather, access and congestion | Risk | From site data
sig: Subcontractor experience | track record on similar work | Context | From history
noise: Worker name | personal data
noise: Work package description wording | weak link
noise: Report date | an artefact
base: Lessons learned meetings after work is done, because they are the usual practice.
prod: A model that scores work packages for rework risk using design and inspection signals and triggers pre-work reviews for the highest risks.
pipe: Work package and quality data @ project systems ; Feature build @ batch ; Rework model @ gradient boosting ; Calibration @ isotonic fit ; Risk list @ quality dashboard ; Pre-work review @ quality manager ; Outcome tracking @ monthly
edge: New work type | there is no history | Similar work analogues
edge: Underreporting | rework is not recorded | Audit samples
edge: Design freeze | design changes late | Late revision flags
off: Calibration ; Recall at review capacity ; Lead time
on: Rework cost ; Rework hours ; Late discovered defects
gap: Crew ranking ; Delay as rework ; Penalties
