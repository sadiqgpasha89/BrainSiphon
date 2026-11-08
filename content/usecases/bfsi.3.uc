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
edge: Cloud cover | no usable imagery | Fallback to hazard-only estimates
edge: Flood with no visible roof damage | structure harmed below the roofline | Depth-based vulnerability overlay
edge: Mixed footprints | multiple policies per building | Policy-level allocation
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

== medical-claims-coding-and-payment-integrity | Medical Claims Coding & Payment Integrity | nlp,tabular | seconds | production-grade | a=0.3 k=15
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
edge: Legitimate complex case | unusual but valid | Peer-adjusted thresholds
edge: Late claims | Claims submitted late are edited after payment and the history is rewritten | Apply a policy window for retrospective edits and version the claim record
off: Precision of denials ; Overturn rate
on: Savings net of reversals ; Provider abrasion
gap: Reviewed claims only ; Rule leakage

== longevity-and-mortality-forecasting | Longevity & Mortality Forecasting | time-series | batch | staff-principal | a=1 k=2
obj: Forecast mortality improvement by age and cohort for pension and annuity pricing and reserving.
loss: \mathcal{L}=\mathrm{Poisson}(\hat{y},y)+\lambda\,\mathrm{Pinball}(\hat{q}_{0.95},y)
con: Align with actuarial standards ; Uncertainty bands ; Annual refresh ; Documented assumptions
sn: Improvement | Mortality improvement trends by cohort | Level of mortality | Reserves depend on future change
sn: Shock | Pandemic effects treated explicitly | Averaging through | One-off shocks bias trends
sn: Portfolio | Own experience versus population | Population only | Annuitants live longer
sig: Age-period-cohort effects | log mortality decomposition | Structure | Identifiability
sig: Population improvement | national trend | Anchor | Revisions
sig: Portfolio experience ratio | actual over expected deaths | Own adjustment | Credibility
sig: Cause-of-death mix | cardio and cancer shares | Driver | Data lag
noise: Policy ID | arbitrary
noise: Broker | irrelevant
noise: Month of death | seasonal noise
base: Standard mortality tables with an improvement scale, because they are widely accepted.
prod: Bayesian cohort model with credibility-weighted portfolio experience and scenarios for medical change and shocks.
pipe: Population data @ statistics offices ; Portfolio deaths @ policy admin ; Mortality model @ Bayesian model ; Credibility blender @ actuarial rules ; Scenario generator @ simulations ; Pricing and reserving feeds @ actuarial systems ; Documentation @ model risk
edge: Pandemic years | spikes distort trend | Exclusion or dummy periods
edge: Data lag | latest year incomplete | Nowcasting
edge: Small portfolio | experience volatile | Credibility limit
off: Out-of-sample log mortality error ; Coverage
on: Reserve movement from assumptions ; Pricing margin
gap: Back-test in stable years ; Revisions

== agent-policy-document-assistant | Insurance Agent Policy Document Assistant | llm-agents,nlp | seconds | production-grade | a=4 k=60 s=4 t=600
obj: Answer agents' and brokers' questions about product features, exclusions and underwriting rules from the insurer's current documents, with citations.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Answer cites the clause and version ; No quote or coverage promise ; Escalation to a human underwriter ; Jurisdiction-aware
sn: Version | Policy wording version by date and jurisdiction | Latest text for all | Wrong version creates liability
sn: Scope | Information, not binding advice | Coverage decisions | Only the insurer decides cover
sn: Evidence | Clause citation | Paraphrase | Paraphrase changes meaning
sig: Citation validity | claim supported by clause | Core | Verification
sig: Version match | version in force at date | Currency | Metadata
sig: Escalation precision | correct refusals | Safety | Over-refusal
sig: Retrieval recall | clause in top k | Quality | Gold
noise: Brochure marketing text | not binding
noise: Agent name | irrelevant
noise: Question length | weak
base: Search over PDFs and a helpdesk, because agents use them.
prod: Version-aware hybrid retrieval, clause-level answers with citations, verifier and abstention with handoff to underwriters.
pipe: Document ingest @ clause parser ; Version index @ hybrid search ; Question router @ classifier ; Answer composer @ LLM with citations ; Verifier @ entailment ; Agent portal @ web app ; Feedback log @ warehouse
edge: Conflicting endorsements | endorsement modifies a clause | Resolve by hierarchy
edge: Out-of-scope request | asks for a coverage decision | Decline and route
edge: Injection in a document | text tries to instruct | Treat as data
off: Citation validity ; Escalation F1
on: Underwriter queries deflected ; Wrong-version incidents
gap: Test on current docs only ; Easy questions

== commercial-submission-intake-and-risk-extraction | Commercial Insurance Submission Intake & Risk Extraction | nlp,llm-agents | seconds | production-grade | a=0.1 k=500
obj: Read broker submissions (emails, ACORD forms, spreadsheets, loss runs) and extract structured risk data so underwriters can quote faster.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Fields link to source ; Underwriter confirms before quote ; Broker data confidentiality ; Quote turnaround 4 hours
sn: Completeness | Missing information requests | Guessing missing fields | Wrong inputs price wrongly
sn: Loss runs | Parsed claims history | Summaries | Totals hide patterns
sn: Triage | Appetite fit before effort | Quoting everything | Out-of-appetite wastes time
sig: Field confidence | calibrated per field | Routing | Calibration
sig: Appetite match | class, size and geography fit | Triage | Appetite rules change
sig: Loss run totals | sum of paid and incurred | Underwriting | Parsing
sig: Missing data count | required fields absent | Follow-up | Definition
noise: Email signature | cosmetic
noise: Broker font | cosmetic
noise: Attachment names | unreliable
base: Manual re-keying by underwriting assistants, because it is the current process.
prod: Document classification and extraction with schema, appetite triage, missing-info agent and underwriter confirmation.
pipe: Submission mailbox @ email gateway ; Document classifier @ layout model ; Extractor @ LLM with schema ; Appetite triage @ rules plus boosting ; Missing info drafter @ LLM ; Underwriter desk @ workbench ; Quote system @ rating engine
edge: Scanned loss runs | Scanned loss runs have poor OCR and the claim totals come out wrong | Gate on image quality, compare parsed totals with printed totals and request a clean copy when they differ
edge: Multiple locations | schedule in a spreadsheet | Row-level extraction
edge: Conflicting values | two documents differ | Flag both
off: Field accuracy ; Triage precision
on: Time to first quote ; Underwriter keying time
gap: Clean test submissions ; Broker overlap

== contact-centre-call-qa-and-summarisation | Contact-Centre Call QA & Summarisation | nlp,llm-agents | seconds | production-grade | a=1 k=120 s=3 t=500
obj: Transcribe, summarise and score calls against the quality and compliance checklist so supervisors review the right calls and agents spend less time on notes.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{CE}(\hat{y},y)
con: Summary faithful to the transcript ; Mandatory disclosures detected ; Customer data redacted ; Supervisor sees evidence
sn: Coverage | All calls scored | 2% sampling | Sampling misses breaches
sn: Checklist | Specific checklist items with spans | Overall score | Scores hide breaches
sn: Summary | Faithful short note | Fluent but invented | Invented details cause errors
sig: Disclosure detection | required statement spans | Compliance | ASR errors
sig: Summary faithfulness | claims supported by transcript | Quality | Check
sig: Sentiment shift | start versus end | Escalation | Weak
sig: Silence and talk ratio | dead air share | Quality | Noise
noise: Call length | weak
noise: Agent accent | unfair
noise: Hold music | noise
base: Random sampling of calls scored by supervisors, because that is the standard.
prod: ASR with redaction, a checklist classifier with evidence spans, a summary generator with a faithfulness check and a risk-based review list.
pipe: Call recording @ telephony platform ; Speech to text @ ASR service ; PII redaction @ NER ; Checklist scorer @ encoder classifier ; Summariser @ LLM ; Supervisor queue @ QA tool ; CRM note @ CRM
edge: Noisy audio | poor transcript | Confidence gating
edge: Dialects and languages | Accuracy is lower for some dialects and languages and those callers get worse scoring | Monitor accuracy per language and dialect and route low-confidence calls to a human reviewer
edge: Customer with vulnerability | A caller showing signs of vulnerability is scored only on the script checklist | Add a vulnerability flag to the checklist and send flagged calls to a specialist reviewer
off: Item F1 ; Summary faithfulness
on: QA coverage ; After-call work time
gap: Supervisor labels inconsistent ; ASR on clean audio

== complaint-root-cause-mining | Complaint Root-Cause Mining | nlp | batch | production-grade | a=0.2 k=10
obj: Classify complaints and cluster them by root cause so the bank fixes processes and meets regulatory complaint-handling duties.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{Contrastive}(z)
con: Regulatory categories mapped ; Reviewer sign-off ; Weekly root-cause report ; Retention policy
sn: Cause | Root cause of the issue | Topic of the complaint | Topic does not tell what to fix
sn: Category | Official category and product | Free labels | Regulatory reporting needs fixed labels
sn: Trend | Emerging issues earlier | Counts only | New issues are small first
sig: Complaint embedding | encoder vector | Clusters | Language
sig: Product and process tags | source system tags | Context | Tagging quality
sig: Repeat complainant | earlier complaints | Severity | Privacy
sig: Resolution outcome | upheld or not | Severity | Late labels
noise: Complaint length | style
noise: Channel | cohort
noise: Time of day | none
base: Manual tagging and a monthly report, because it is the current process.
prod: A classifier for regulatory categories and a clustering pipeline with labelled root causes and emerging-issue alerts.
pipe: Complaint intake @ CRM ; Text processor @ redaction ; Category classifier @ encoder ; Cluster engine @ embeddings plus HDBSCAN ; Emerging issue detector @ time-series ; Owner dashboard @ BI ; Action tracker @ workflow
edge: Multi-issue complaint | One complaint contains several issues and a single label hides the other causes | Use multi-label classification and route by the highest-priority label
edge: Product launch | A product launch causes a spike in complaints that looks like a new root cause | Keep a baseline per product and compare against the launch calendar before raising an alert
edge: Language mix | Complaints in a language outside the training data are misclassified | Detect the language, use a multilingual encoder and send unsupported languages to a translator
off: Category macro-F1 ; Cluster purity
on: Time to detect new issues ; Repeat complaints
gap: Labels from stressed staff ; Cluster drift

== branch-footfall-and-staffing-forecast | Branch Footfall & Staffing Forecast | time-series | batch | foundational | a=1 k=2
obj: Forecast branch visits by hour so rosters match demand and queues stay short.
loss: \mathcal{L}=\sum_t\mathrm{Pinball}(\hat{q}_{0.9},y_t)+\lambda\,\mathrm{MSE}(\hat{y}_t,y_t)
con: Roster built 3 weeks ahead ; Labour rules ; Service level target ; Explainable
sn: Hourly | Hour-level demand | Daily totals | Peaks matter
sn: Transaction mix | Visit type | Count | Handling time differs
sn: Calendar | Pay days, holidays | Day of week | Peaks
sig: Hourly profile | median by day type | Core | Closures
sig: Pay day effect | days since pay | Peak | Variation
sig: Digital trend | online shift | Decline | Slow
sig: Local events | events nearby | Spikes | Calendar
noise: Branch name | label
noise: Manager | irrelevant
noise: Weather | small
base: Same week last year scaled, because managers use it.
prod: Quantile gradient boosting by branch cluster with event features, feeding a roster optimiser.
pipe: Visit counts @ queue system ; Calendar @ configuration ; Forecaster @ quantile boosting ; Roster optimiser @ solver ; Manager view @ web ; Actuals @ warehouse ; Monitor @ dashboard
edge: Branch refit | Closed or refit days in the history look like zero demand and bias the forecast | Mark closures as exclusions and impute from comparable open days
edge: Sensor outage | A sensor outage produces missing counts that look like an empty branch | Flag outages, impute from neighbouring sensors and widen the forecast intervals for those days
edge: New branch | A new branch has no history to forecast from | Start from the priors of peer branches in similar catchments and update as data arrives
off: Pinball loss ; Peak error
on: Wait time ; Overtime hours
gap: Closed days in the history ; Calm test

== corporate-relationship-manager-lead-prioritisation | Corporate Relationship Manager Lead Prioritisation | tabular,recommender | batch | production-grade | a=0.2 k=20
obj: Rank corporate clients and prospects for relationship-manager outreach by the likelihood and value of a product need.
loss: \mathcal{L}=\mathrm{BPR}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Rank explainable ; Capacity 30 calls a week ; Client conflicts of interest respected ; Weekly refresh
sn: Need | Event-driven needs (acquisition, expansion, rate move) | Product holding | Holdings do not show need
sn: Value | Expected revenue | Probability | Low-value calls waste time
sn: Timing | Windows of need | Static lists | Needs have timing
sig: Cash and debt events | maturities, large payments | Trigger | Data access
sig: News and filings | acquisition news | Trigger | Noise
sig: Product gap | products peers hold | Cross-sell | Fit
sig: Interaction recency | days since contact | Priority | Logging
noise: Company name | label
noise: RM | bias
noise: Email opens | weak
base: RM judgement and a periodic target list, because it is common.
prod: A ranker over triggers and gaps with expected value and a short explanation per lead.
pipe: Client data @ CRM and transaction banking ; Trigger detection @ stream and news ; Lead ranker @ learning to rank ; Value model @ boosting ; RM list @ CRM ; Outcome capture @ warehouse ; Monitor @ dashboard
edge: Conflict wall | restricted client | Compliance filter
edge: Stale CRM | The CRM holds stale contacts so a lead goes to the wrong person | Score data quality for each record and ask the relationship manager to confirm before outreach
edge: Seasonal peaks | Year-end and other seasonal peaks in demand look like genuine product need | Add seasonal features and compare against the same period in earlier years
off: NDCG ; Hit rate
on: Pipeline created ; Win rate
gap: Past calls bias ; Weak outcomes

== kyc-periodic-review-automation | KYC Periodic Review Automation & Risk Re-rating | nlp,tabular | seconds | production-grade | a=0.05 k=40
obj: Automate periodic KYC refreshes by checking customer files against fresh data and re-rating risk, escalating changes to analysts.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{CE}(\hat{y},y)
con: Analyst decides on high-risk changes ; Every check logged ; Review frequency by risk tier ; Privacy rules
sn: Change | Material changes since last review | Re-collect everything | Wastes customer time
sn: Risk | Re-rate on behaviour and profile | Static rating | Risk drifts
sn: Evidence | Source-linked checks | Opaque result | Audit
sig: Ownership change | registry change | Risk | Source
sig: Adverse media hit | match on news | Risk | Precision
sig: Activity versus profile | volumes vs expected | Behaviour | Baselines
sig: Document expiry | expiry dates | Refresh need | Data
noise: Customer name length | none
noise: Account number | arbitrary
noise: Branch | admin
base: Fixed review cycle by tier with manual checks, because it is regulation-driven.
prod: A change-detection pipeline with entity checks, a re-rating model and an analyst queue for material changes.
pipe: Customer file @ KYC platform ; Registry and media checks @ vendor APIs ; Change detector @ rules ; Re-rating model @ boosting ; Analyst queue @ case tool ; Customer outreach @ comms ; Audit log @ store
edge: Registry delay | A registry updates late so the review checks outdated ownership data | Show the source date for each check and re-run when the registry refreshes
edge: Name collisions | media false hits | Entity resolution
edge: Dormant account | A dormant account has no behaviour to compare against its profile | Apply a dormant-account policy with its own review frequency and no behaviour-based re-rating
off: Precision on escalations ; Recall of material changes
on: Review time ; Overdue reviews
gap: Labels from past decisions ; Easy cases
