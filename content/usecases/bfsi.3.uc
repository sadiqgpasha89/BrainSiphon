# BFSI: Banking, Financial Services & Insurance, part 3 (use cases 40-50): catastrophe, reinsurance, health claims, longevity, intake, customer operations
== catastrophe-loss-estimation-from-imagery | Catastrophe Loss Estimation from Imagery | computer-vision,tabular | batch | staff-principal | a=0.02 k=3000
obj: Estimate insured damage within days of a catastrophe from aerial and satellite imagery combined with the policy book, so reserves and claims staffing are set early.
loss: \mathcal{L}=\mathcal{L}_{\text{seg}}+\lambda\,\mathrm{Huber}(\hat{y},y)
con: Estimates within 72 hours of imagery ; Property-level results aggregated for reserving ; Uncertainty reported ; Imagery licence terms respected
sn: Damage | Damage grade per building footprint | Pixel-level change on the whole scene | Debris and flooding change pixels without damaging insured structures
sn: Exposure | Join damage to insured values and deductibles | Damage counts alone | Loss depends on sums insured and policy terms
sn: Validation | Calibrate against early claims and surveys | Trusting model output | Imagery cannot see interior or water damage
sig: Footprint damage grade | classifier over pre and post imagery per footprint | Core input | Cloud and angle effects
sig: Hazard intensity | wind speed or flood depth at the location | Physical driver | Hazard maps are modelled
sig: Construction class | roof and wall type from the policy | Vulnerability | Data quality
sig: Sum insured and deductible | policy terms | Converts damage to loss | Terms change at renewal
noise: Scene brightness | sensor effect
noise: Image tile boundary | artefact
noise: Satellite name | irrelevant
base: Catastrophe model loss estimates from the vendor, because insurers use them for early views.
prod: Building damage segmentation and grading fused with hazard footprints and policy terms, calibrated on early claims with intervals by region.
pipe: Imagery acquisition @ satellite and aerial providers ; Footprint matcher @ geospatial join ; Damage grader @ vision model on GPU ; Loss converter @ vulnerability curves ; Calibration @ early claims regression ; Cat team dashboard @ BI ; Estimate archive @ lakehouse
edge: Cloud cover | Cloud cover leaves no usable imagery for the affected area | Fall back to hazard-only estimates and update when clear imagery arrives
edge: Flood with no visible roof damage | structure harmed below the roofline | Depth-based vulnerability overlay
edge: Mixed footprints | Several policies sit in one building and the damage cannot be assigned to one | Allocate damage at policy level using floor area or sum insured
off: Damage grade accuracy ; Loss error versus final claims
on: Early estimate error ; Claims staffing accuracy
gap: Training on one event type ; Final claims differ from early claims

== reinsurance-treaty-allocation | Reinsurance Treaty Allocation Optimisation | reinforcement-learning,tabular | batch | staff-principal | a=0.05 k=30
obj: Choose how risks are ceded across reinsurance treaties to reduce capital and volatility at an acceptable premium.
loss: \min_{x}\;\sum_{k}\mathrm{Premium}_k\,x_k+\lambda\,\mathrm{Var}(\text{net loss})+\mu\,\mathrm{Capital}(x)
con: Treaty limits and counterparty credit limits ; Board risk appetite ; Annual renewal cycle ; Explainable trade-offs
sn: Net result | Net loss distribution after recoveries | Gross loss | Reinsurance changes the tail
sn: Credit | Reinsurer default risk | Treating recoveries as certain | Recoveries are credit exposure
sn: Basis | Basis risk between loss and trigger | Perfect hedge assumption | Parametric covers can miss
sig: Loss distribution by line | simulated gross losses | Input | Model risk
sig: Treaty terms | attachment, limit, reinstatement | Structure | Complexity
sig: Reinsurer credit | rating and spread | Counterparty | Changes
sig: Capital relief | solvency capital change | Benefit | Model dependent
noise: Broker | irrelevant
noise: Treaty name | label
noise: Renewal month | weak
base: Last year's programme with price adjustments, because it is typical.
prod: Stochastic simulation with a constrained optimiser over treaty options, a credit adjustment and scenario comparison for the board.
pipe: Exposure and loss sims @ catastrophe and actuarial models ; Treaty library @ structured terms ; Optimiser @ stochastic program ; Credit adjustment @ spreads ; Scenario report @ BI ; Board pack @ document ; Decision log @ audit store
edge: Hard market | A hard reinsurance market raises prices sharply and the planned programme becomes too expensive | Re-solve with price-shock scenarios and show the board the capital relief per extra premium unit
edge: Aggregate vs per-event | covers behave differently | Explicit structure modelling
edge: Model update | A catastrophe model update changes the loss distribution and the optimal allocation moves | Report sensitivity of the allocation to model versions and avoid reacting to small shifts
off: Net loss tail error ; Capital change accuracy
on: Reinsurance spend per unit of capital relief ; Earnings volatility
gap: Optimising against one simulation set ; Historical prices

== medical-claims-coding-and-payment-integrity | Medical Claims Coding & Payment Integrity | nlp,tabular | seconds | advanced | a=0.3 k=15
obj: Check submitted health claims for coding errors, unbundling and duplicate billing before payment.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{CE}(\hat{y},y)
con: Providers can appeal ; Edits follow published rules ; Reviewers see rule or evidence ; Payment within statutory time
sn: Rules | Explicit coding rules as the first layer | Model only | Rules are auditable and widely accepted
sn: Pattern | Provider billing pattern against peers | Single claim view | Abuse appears at provider level
sn: Appeal | Reversal rate on denials | Savings claimed | Reversed denials cost trust
sig: Code pair conflict | procedure pairs that should not bill together | Unbundling | Rule version
sig: Provider peer deviation | share of high-level codes versus peers | Upcoding | Peer set
sig: Duplicate key | same member, provider, date, code | Duplicates | Near duplicates
sig: Diagnosis procedure fit | likelihood of procedure given diagnosis | Medical necessity | Coding practice varies
noise: Provider name | irrelevant
noise: Claim form layout | cosmetic
noise: Submission time | weak
base: Standard edit rules from a vendor, because payers use them.
prod: Rule engine plus a model on provider and claim features that scores likely overpayment, with evidence for the reviewer.
pipe: Claim intake @ clearinghouse ; Rule edits @ coding rules engine ; Overpayment model @ boosting ; Review queue @ payment integrity tool ; Provider notice @ document service ; Appeal tracker @ case tool ; Outcome log @ warehouse
edge: New code set | A new code set year changes procedure and diagnosis codes and old rules misfire | Track rule updates by effective date and re-test the model on the new code set before go-live
edge: Legitimate complex case | An unusual but valid claim is flagged as a coding error | Use peer-adjusted thresholds by specialty and send flagged cases to a clinician reviewer
edge: Late claims | Claims submitted late are edited after payment and the history is rewritten | Apply a policy window for retrospective edits and version the claim record
off: Precision of denials ; Overturn rate
on: Savings net of reversals ; Provider abrasion
gap: Reviewed claims only ; Rule leakage

== longevity-and-mortality-forecasting | Longevity & Mortality Forecasting | time-series | batch | staff-principal | a=1 k=2
obj: Forecast mortality improvement by age and cohort for pension and annuity pricing and reserving.
loss: \mathcal{L}=\mathrm{Poisson}(\hat{y},y)+\lambda\,\mathrm{Pinball}(\hat{q}_{0.95},y)
con: Methods and assumptions align with actuarial standards for reserving and pricing ; Every forecast is shown with uncertainty bands ; Assumptions refreshed once a year with a documented change log ; Every adjustment is justified in writing for the actuary
sn: Improvement | The trend in mortality improvement by age and cohort | The current level of mortality | Reserves depend on how fast mortality changes in future, not where it is today
sn: Shock | One-off shocks such as pandemics treated explicitly | Averaging through the shock years | A shock biases the trend if it is treated as a permanent change or ignored
sn: Portfolio | The portfolio's own experience relative to the population | Population mortality only | Annuitants live longer than the general population, so population rates under-price the liability
sig: Age-period-cohort effects | decomposition of log mortality into age, period and cohort terms | Gives the structure for projection | The three effects are not fully identifiable, so impose a documented constraint
sig: Population improvement | national mortality improvement rate by age band over the last 10 years | Anchors the projection to a published trend | Revisions change past values
sig: Portfolio experience ratio | actual deaths divided by expected deaths for the portfolio | Adjusts the population to the portfolio | Credibility is low for small portfolios, so blend
sig: Cause-of-death mix | share of deaths due to cardiovascular disease and cancer by age | Drivers of future improvement | Data lag by one to two years
noise: Policy ID | An identifier with no relation to mortality
noise: Broker | The sales channel does not change mortality once the product is known
noise: Month of death | Seasonal noise that does not matter for annual rates
base: Standard mortality tables with an improvement scale, because they are widely accepted.
prod: Bayesian cohort model with credibility-weighted portfolio experience and scenarios for medical change and shocks.
pipe: Population data @ statistics offices ; Portfolio deaths @ policy admin ; Mortality model @ Bayesian model ; Credibility blender @ actuarial rules ; Scenario generator @ simulations ; Pricing and reserving feeds @ actuarial systems ; Documentation @ model risk
edge: Pandemic years | Excess deaths in pandemic years distort the trend | Exclude those years or add dummy period effects and document the choice
edge: Data lag | The latest year of death data is incomplete when the forecast is made | Nowcast the latest year from provisional counts and revise when final data arrive
edge: Small portfolio | A small portfolio's own experience is volatile and unreliable | Apply a credibility limit that blends it with the population rate
off: Out-of-sample log mortality error ; Coverage
on: Reserve movement from assumptions ; Pricing margin
gap: A back-test through stable years makes any trend model look accurate ; Revisions to published death counts mean the data used at the time differ from today's

== agent-policy-document-assistant | Insurance Agent Policy Document Assistant | llm-agents,nlp | seconds | advanced | a=4 k=60 s=4 t=600
obj: Answer agents' and brokers' questions about product features, exclusions and underwriting rules from the insurer's current documents, with citations.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Every answer cites the clause and the version of the document ; The assistant makes no quote, no coverage promise and no binding statement ; Questions about coverage decisions go to a human underwriter ; Answers respect the jurisdiction of the policy
sn: Version | The wording version in force on a date in a jurisdiction | The latest text for every case | Using the wrong version creates liability for the insurer
sn: Scope | General information about features and exclusions | Advice about whether a given loss is covered | Only the insurer decides coverage, and an assistant that implies it creates obligations
sn: Evidence | Quoted clause with a citation | A paraphrase of the wording | A paraphrase can shift the meaning, especially around exclusions
sig: Citation validity | share of statements supported by the cited clause | The core quality measure | A real clause can still not support the statement, so test entailment
sig: Version match | whether the version cited is the one in force at the policy date | Prevents answers from the wrong wording | Version metadata are often wrong
sig: Escalation precision | share of escalations that an underwriter agrees were needed | Measures safe refusal behaviour | Over-refusal makes the assistant unhelpful, so track both
sig: Retrieval recall | share of questions where the relevant clause is in the top k results | Answers depend on retrieval | Gold sets are costly to build
noise: Brochure marketing text | Not binding and often differs from the policy wording
noise: Agent name | Irrelevant to the answer
noise: Question length | Weakly related to difficulty
base: Search over PDFs and a helpdesk, because agents use them.
prod: Version-aware hybrid retrieval, clause-level answers with citations, verifier and abstention with handoff to underwriters.
pipe: Document ingest @ clause parser ; Version index @ hybrid search ; Question router @ classifier ; Answer composer @ LLM with citations ; Verifier @ entailment ; Agent portal @ web app ; Feedback log @ warehouse
edge: Conflicting endorsements | An endorsement modifies a clause and the base clause is quoted as it stood | Resolve by the document hierarchy and cite the endorsement together with the base clause
edge: Out-of-scope request | An agent asks for a coverage decision on a claim | Decline the decision, explain what the documents say and route to an underwriter
edge: Injection in a document | Text inside a document tries to instruct the assistant | Treat documents as data and enforce the allowed tools
off: Citation validity ; Escalation F1
on: Underwriter queries deflected ; Wrong-version incidents
gap: Testing only on current documents hides failures on older versions agents still sell ; Easy questions in the test set overstate performance on exclusions and endorsements

== commercial-submission-intake-and-risk-extraction | Commercial Insurance Submission Intake & Risk Extraction | nlp,llm-agents | seconds | advanced | a=0.1 k=500
obj: Read broker submissions (emails, ACORD forms, spreadsheets, loss runs) and extract structured risk data so underwriters can quote faster.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Every extracted field links to its source page or cell ; An underwriter confirms the data before any quote is issued ; Broker data kept confidential and separated by broker ; Initial response to the broker within 4 hours
sn: Completeness | A request to the broker for missing information | Guessing the missing fields | Wrong inputs lead to a wrong price, and the error surfaces at claim time
sn: Loss runs | The parsed claims history by year and cause | A summary total | Totals hide patterns such as repeated small losses or one large loss
sn: Triage | A quick check of appetite before any effort | Quoting every submission | Out-of-appetite risks waste scarce underwriter time
sig: Field confidence | calibrated probability that each extracted field is correct | Routes uncertain fields to review | Calibrate per field type, as amounts and dates differ
sig: Appetite match | match of class, size and geography to the underwriting appetite rules | Fast triage | Appetite rules change often, so version them
sig: Loss run totals | sum of paid and incurred losses parsed from the loss runs | A key underwriting input | Parsing errors change the total, so compare with the printed total
sig: Missing data count | number of required fields absent from the submission | Drives the follow-up request | The definition of required varies by class
noise: Email signature | Cosmetic text that is not risk data
noise: Broker font | Cosmetic and has no meaning for the risk
noise: Attachment names | Unreliable as brokers name files in different ways
base: Manual re-keying by underwriting assistants, because it is the current process.
prod: Document classification and extraction with schema, appetite triage, missing-info agent and underwriter confirmation.
pipe: Submission mailbox @ email gateway ; Document classifier @ layout model ; Extractor @ LLM with schema ; Appetite triage @ rules plus boosting ; Missing info drafter @ LLM ; Underwriter desk @ workbench ; Quote system @ rating engine
edge: Scanned loss runs | Scanned loss runs have poor OCR and the claim totals come out wrong | Gate on image quality, compare parsed totals with printed totals and request a clean copy when they differ
edge: Multiple locations | A schedule of locations arrives as a spreadsheet and is read as one risk | Extract at row level and attach each location to its own risk record
edge: Conflicting values | Two documents give different values for the same field | Flag both with their sources and ask the broker
off: Field accuracy ; Triage precision
on: Time to first quote ; Underwriter keying time
gap: Clean test submissions are better formatted than live ones ; Broker overlap, since the same brokers appear in training and in test and the model learns their templates

== contact-centre-call-qa-and-summarisation | Contact-Centre Call QA & Summarisation | nlp,llm-agents | seconds | advanced | a=1 k=120 s=3 t=500
obj: Transcribe, summarise and score calls against the quality and compliance checklist so supervisors review the right calls and agents spend less time on notes.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{CE}(\hat{y},y)
con: The summary is faithful to the transcript and adds nothing ; Mandatory disclosures are detected with the exact span ; Customer account and card data redacted from transcripts and summaries ; Supervisors see the evidence for every score
sn: Coverage | Every call scored automatically | A 2 percent random sample reviewed by people | A sample misses the rare breach, and the one missed call is the one a regulator finds
sn: Checklist | Specific checklist items marked with the spans that support them | One overall quality score | A single score hides a missed disclosure behind good tone
sn: Summary | A short note that only contains what was said | A fluent note with invented details | Invented details go into the customer record and cause errors downstream
sig: Disclosure detection | detected spans for each required statement, with confidence | Compliance depends on required statements being made | Speech recognition errors cause misses, so use fuzzy matching
sig: Summary faithfulness | share of summary claims supported by the transcript | The main quality check | Needs an entailment check, not only overlap
sig: Sentiment shift | change in sentiment between the first and last minute of the call | Highlights escalation and unresolved complaints | Weak and noisy, so use with other signals
sig: Silence and talk ratio | share of the call that is dead air and agent-to-customer talk ratio | Highlights poor service and confusion | Noisy, as silence is often legitimate
noise: Call length | Weakly related to quality once the topic is known
noise: Agent accent | Not a quality measure and scoring on it is unfair
noise: Hold music | An audio artefact and not a speech signal
base: Random sampling of calls scored by supervisors, because that is the standard.
prod: ASR with redaction, a checklist classifier with evidence spans, a summary generator with a faithfulness check and a risk-based review list.
pipe: Call recording @ telephony platform ; Speech to text @ ASR service ; PII redaction @ NER ; Checklist scorer @ encoder classifier ; Summariser @ LLM ; Supervisor queue @ QA tool ; CRM note @ CRM
edge: Noisy audio | A poor recording gives a bad transcript and wrong scores | Gate on transcript confidence and send low-confidence calls to a human
edge: Dialects and languages | Accuracy is lower for some dialects and languages and those callers get worse scoring | Monitor accuracy per language and dialect and route low-confidence calls to a human reviewer
edge: Customer with vulnerability | A caller showing signs of vulnerability is scored only on the script checklist | Add a vulnerability flag to the checklist and send flagged calls to a specialist reviewer
off: Item F1 ; Summary faithfulness
on: QA coverage ; After-call work time
gap: Supervisor labels are inconsistent between reviewers, so the ceiling is lower than it appears ; Speech recognition tested on clean audio overstates accuracy on real calls

== complaint-root-cause-mining | Complaint Root-Cause Mining | nlp | batch | advanced | a=0.2 k=10
obj: Classify complaints and cluster them by root cause so the bank fixes processes and meets regulatory complaint-handling duties.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{Contrastive}(z)
con: Every complaint maps to the regulator's official categories ; A reviewer signs off the classification and the root-cause report ; A root-cause report goes to product owners every week ; Complaint text retained and deleted according to the retention policy
sn: Cause | The root cause of the issue, such as a process defect | The topic of the complaint | A topic such as cards says nothing about what to fix, and the fix is in the cause
sn: Category | The official category and product mapped from the complaint | Free-form labels | Regulatory reporting needs fixed categories that auditors can check
sn: Trend | Emerging issues detected while still small | Counts of established categories | New issues are small at first, and counts see them only after customers are harmed
sig: Complaint embedding | encoder vector of the complaint text clustered by similarity | Groups complaints by meaning | Language and writing style affect the clusters
sig: Product and process tags | tags from the source system, such as product and channel | Context for the root cause | Tagging quality varies by team
sig: Repeat complainant | count of earlier complaints by the same customer in 12 months | Points to unresolved issues | Privacy rules limit the use
sig: Resolution outcome | whether the complaint was upheld, partly upheld or rejected | A proxy for severity | Outcomes come weeks later
noise: Complaint length | Style of the customer and not the severity of the issue
noise: Channel | A cohort effect that does not change the cause
noise: Time of day | Has no link to the cause of a complaint
base: Manual tagging and a monthly report, because it is the current process.
prod: A classifier for regulatory categories and a clustering pipeline with labelled root causes and emerging-issue alerts.
pipe: Complaint intake @ CRM ; Text processor @ redaction ; Category classifier @ encoder ; Cluster engine @ embeddings plus HDBSCAN ; Emerging issue detector @ time-series ; Owner dashboard @ BI ; Action tracker @ workflow
edge: Multi-issue complaint | One complaint contains several issues and a single label hides the other causes | Use multi-label classification and route by the highest-priority label
edge: Product launch | A product launch causes a spike in complaints that looks like a new root cause | Keep a baseline per product and compare against the launch calendar before raising an alert
edge: Language mix | Complaints in a language outside the training data are misclassified | Detect the language, use a multilingual encoder and send unsupported languages to a translator
off: Category macro-F1 ; Cluster purity
on: Time to detect new issues ; Repeat complaints
gap: Labels from stressed staff vary with workload, so the training set is noisy ; Cluster drift as products and wording change, so last year's clusters no longer match

== branch-footfall-and-staffing-forecast | Branch Footfall & Staffing Forecast | time-series | batch | foundational | a=1 k=2
obj: Forecast branch visits by hour so rosters match demand and queues stay short.
loss: \mathcal{L}=\sum_t\mathrm{Pinball}(\hat{q}_{0.9},y_t)+\lambda\,\mathrm{MSE}(\hat{y}_t,y_t)
con: Rosters are fixed three weeks ahead, so forecasts are needed for 3 to 6 weeks out ; Labour rules on hours and breaks are respected ; A service-level target for waiting time at each branch ; Every forecast explainable to a branch manager
sn: Hourly | Demand at the hour level | Daily totals | Peaks drive queues, and a day with the right total can still have a lunchtime queue
sn: Transaction mix | The visit type, such as cash, advice or loans | The visit count alone | A mortgage advice visit takes an hour and a cash deposit takes two minutes
sn: Calendar | Pay days, holidays and local events | Day of week alone | Demand peaks around pay days and holidays that a weekday pattern misses
sig: Hourly profile | median visits by hour for each day type, such as normal, pay day or holiday | The core pattern | Closures and refits distort it, so exclude them
sig: Pay day effect | days since the last typical pay day | A reliable peak driver | Pay cycles vary by employer in the area
sig: Digital trend | monthly change in digital transactions in the catchment | Branch visits decline as customers move online | The trend is slow but real
sig: Local events | markets, fairs and sports events within walking distance on the date | Spikes in footfall | The calendar needs a feed
noise: Branch name | A label that is not a driver of demand
noise: Manager | The branch manager does not change footfall
noise: Weather | A small effect once the calendar is known
base: Same week last year scaled, because managers use it.
prod: Quantile gradient boosting by branch cluster with event features, feeding a roster optimiser.
pipe: Visit counts @ queue system ; Calendar @ configuration ; Forecaster @ quantile boosting ; Roster optimiser @ solver ; Manager view @ web ; Actuals @ warehouse ; Monitor @ dashboard
edge: Branch refit | Closed or refit days in the history look like zero demand and bias the forecast | Mark closures as exclusions and impute from comparable open days
edge: Sensor outage | A sensor outage produces missing counts that look like an empty branch | Flag outages, impute from neighbouring sensors and widen the forecast intervals for those days
edge: New branch | A new branch has no history to forecast from | Start from the priors of peer branches in similar catchments and update as data arrives
off: Pinball loss ; Peak error
on: Wait time ; Overtime hours
gap: Closed days in the history look like zero demand and bias the forecast ; A calm test period hides the peaks that matter for staffing

== corporate-relationship-manager-lead-prioritisation | Corporate Relationship Manager Lead Prioritisation | tabular,recommender | batch | advanced | a=0.2 k=20
obj: Rank corporate clients and prospects for relationship-manager outreach by the likelihood and value of a product need.
loss: \mathcal{L}=\mathrm{BPR}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: The reason for each ranking can be explained in plain terms to the manager ; Output sized to a capacity of 30 calls a week per manager ; Clients under conflict-of-interest restrictions never appear ; Refreshed weekly with the latest events
sn: Need | Event-driven needs such as acquisitions, expansions and rate moves | The products a client already holds | Holdings show the past and not the next need
sn: Value | Expected revenue of the opportunity | The probability of a need alone | A likely but low-value call wastes a manager's scarce time
sn: Timing | The window in which the need arises | A static list ranked once | Needs have timing, and a call a month late is useless
sig: Cash and debt events | upcoming debt maturities and large payments from the client's own accounts | A direct trigger for financing and treasury needs | Access depends on the client's accounts with the bank
sig: News and filings | acquisition, expansion or leadership news in public sources | An external trigger | Noisy, so verify the source
sig: Product gap | products held by similar clients that this client does not hold | Cross-sell potential | Fit depends on size and sector
sig: Interaction recency | days since the last meaningful contact | Prioritises neglected clients | Logging in the CRM is inconsistent
noise: Company name | A label with no information on need
noise: RM | The manager's identity biases the ranking towards past activity
noise: Email opens | Weak and often automated
base: RM judgement and a periodic target list, because it is common.
prod: A ranker over triggers and gaps with expected value and a short explanation per lead.
pipe: Client data @ CRM and transaction banking ; Trigger detection @ stream and news ; Lead ranker @ learning to rank ; Value model @ boosting ; RM list @ CRM ; Outcome capture @ warehouse ; Monitor @ dashboard
edge: Conflict wall | A client is on a restricted list and must not be contacted | Apply a compliance filter before ranking so restricted clients never appear
edge: Stale CRM | The CRM holds stale contacts so a lead goes to the wrong person | Score data quality for each record and ask the relationship manager to confirm before outreach
edge: Seasonal peaks | Year-end and other seasonal peaks in demand look like genuine product need | Add seasonal features and compare against the same period in earlier years
off: NDCG ; Hit rate
on: Pipeline created ; Win rate
gap: Past calls were not random, so outcomes reflect who was called and not who needed a product ; Weak outcome data, since closed deals are few and slow

== kyc-periodic-review-automation | KYC Periodic Review Automation & Risk Re-rating | nlp,tabular | seconds | advanced | a=0.05 k=40
obj: Automate periodic KYC refreshes by checking customer files against fresh data and re-rating risk, escalating changes to analysts.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{CE}(\hat{y},y)
con: An analyst decides every change to a high-risk rating ; Every check and its source logged with a timestamp ; Review frequency set by risk tier ; Privacy rules limit the data collected from the customer
sn: Change | Material changes since the last review | Re-collecting everything from the customer | Re-collection wastes the customer's time and the analyst's, and most files have not changed
sn: Risk | A risk rating updated from behaviour and profile | A static rating from onboarding | Risk drifts as the customer's business and activity change
sn: Evidence | Checks linked to their source | An opaque result | An auditor needs to see the source of each conclusion
sig: Ownership change | change in beneficial ownership recorded in a company registry since the last review | A key trigger for re-rating | Registries update late
sig: Adverse media hit | match of the customer or an owner in negative news with a score | Possible risk event | Precision is low for common names
sig: Activity versus profile | monthly transaction volume divided by the volume expected for the profile | Behaviour that does not fit the profile | Baselines are weak for new customers
sig: Document expiry | days until identity and address documents expire | Defines the need for refresh | Dates are entered by hand and may be wrong
noise: Customer name length | No link to risk
noise: Account number | An arbitrary identifier
noise: Branch | An administrative attribute with no risk information
base: Fixed review cycle by tier with manual checks, because it is regulation-driven.
prod: A change-detection pipeline with entity checks, a re-rating model and an analyst queue for material changes.
pipe: Customer file @ KYC platform ; Registry and media checks @ vendor APIs ; Change detector @ rules ; Re-rating model @ boosting ; Analyst queue @ case tool ; Customer outreach @ comms ; Audit log @ store
edge: Registry delay | A registry updates late so the review checks outdated ownership data | Show the source date for each check and re-run when the registry refreshes
edge: Name collisions | Common names produce false adverse media hits | Use entity resolution on date of birth and location before alerting
edge: Dormant account | A dormant account has no behaviour to compare against its profile | Apply a dormant-account policy with its own review frequency and no behaviour-based re-rating
off: Precision on escalations ; Recall of material changes
on: Review time ; Overdue reviews
gap: Labels come from past analyst decisions, so the model repeats earlier habits ; Easy cases dominate the data, so performance on hard cases is overstated
