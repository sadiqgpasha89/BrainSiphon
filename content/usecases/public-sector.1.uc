# Public Sector & Smart Cities, part 1 (use cases 1-21): citizen services, benefits tax and licensing, urban mobility
# Vendor-neutral. Models support caseworkers and never issue a denial, sanction or penalty on their own, protected characteristics and their proxies are not used, every decision about a person keeps a named human and an appeal route.
== grounded-citizen-service-assistant | Grounded Citizen Service Assistant | llm-agents,nlp | seconds | foundational | a=0.05 k=40
obj: Answer residents' questions about services, eligibility rules, fees and deadlines from official pages and forms, cite the source and hand over to a person for any case-specific decision.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Answers come only from published official sources with a date ; The assistant never decides eligibility or accepts evidence ; Handoff to a person on request or low confidence ; Works in the top 10 local languages ; Answer within 4 s
sn: Source | Official pages and forms with a last-updated date | Model memory | Out-of-date rules mislead residents
sn: Scope | General guidance and next steps | Personal decisions | Decisions need a caseworker and an appeal route
sn: Access | Plain language, many languages and accessible formats | English text only | Public services must serve everyone
sig: Source freshness | age of the page behind the answer | Trust | From the CMS
sig: Question intent | information, status, form help or complaint | Routing | Classified
sig: Language and accessibility need | language and format requested | Adaptation | From the session
sig: Confidence and coverage | whether sources cover the question | Handoff | From retrieval
noise: Resident name | irrelevant and private
noise: Device model | irrelevant
noise: Chat length | an artefact
base: A search box and a static FAQ page, because they are the current channels.
prod: A retrieval-grounded assistant over official content with citations and dates, multilingual answers, accessible output and a warm handoff to staff with a short summary.
pipe: Question intake @ web chat and messaging ; Language detection @ classifier ; Hybrid retrieval @ official content index ; Answer with citation @ LLM with controlled content ; Confidence check @ rules ; Staff handoff @ contact centre ; Quality sampling @ weekly
edge: Outdated page | the source changed | Freshness checks and review dates
edge: Case-specific question | the resident asks if they qualify | Explain the rules and offer a caseworker
edge: Distress signal | the message suggests an emergency | Immediate emergency information and human contact
off: Answer faithfulness on audited questions ; Handoff precision ; Language parity
on: Resolved contacts without staff ; Call volume ; Resident satisfaction by language
gap: Answering eligibility questions ; Undated sources ; English-only service

== government-form-completeness-check | Government Form Completeness Check | nlp,computer-vision | seconds | foundational | a=0.5 k=10
obj: Check submitted forms and attachments for missing fields, wrong documents and unreadable scans at the time of submission so applicants fix problems before a caseworker sees them.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: The check explains each problem in plain language ; No decision on the application ; Works on scans and photos ; Applicant can submit anyway with a note ; 2M submissions per year
sn: Role | A helper at the front door | A gatekeeper | Rejecting people for form errors excludes the most vulnerable
sn: Label | Cases that were returned for missing items | Staff opinions | Returns are a clear outcome
sn: Access | Help in several languages with accessible text | One format | Users have different needs
sig: Required field presence | missing or malformed fields | Completeness | From the form schema
sig: Document type match | whether the attachment is the requested type | Correctness | From the classifier
sig: Image quality | legibility of scans and photos | Readability | From the image
sig: Prior returns for the form | common errors for this form | Priority | From history
noise: Applicant name | irrelevant and private
noise: Submission time | irrelevant
noise: Browser type | irrelevant
base: Required-field validation in the form and manual checks by staff, because it is the current process.
prod: A document classifier and extraction check with plain-language fixes, an option to submit with a note and monitoring that returns by group do not diverge.
pipe: Form and attachment intake @ portal ; Field validation @ rules ; Document classification @ model ; Image quality check @ vision model ; Fix suggestions @ templates ; Submission with note @ case system ; Return-rate monitoring @ monthly
edge: Unusual document | a valid proof is not recognised | Allow submission with a flag and staff review
edge: Poor photo | the scan is blurry | Retake guidance
edge: Language mismatch | the form is in another language | Multilingual support
off: Agreement with staff completeness checks ; Fix suggestion usefulness ; Return rate by group
on: Returned applications ; Time to a complete case ; Applicant drop-off
gap: Blocking submissions ; One format only ; No group monitoring

== notice-translation-review | Official Notice Translation Review | nlp | seconds | foundational | a=0.2 k=20
obj: Translate official notices and letters into residents' languages and flag meaning drift for a reviewer so the text stays accurate and readable.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Reviewer approves legal or rights-related notices ; Key terms follow an approved glossary ; Original and translation stored together ; Back-translation check on high-risk text ; 15 languages
sn: Quality | Meaning preserved for rights and deadlines | Fluency | A fluent error about a deadline harms people
sn: Glossary | Approved terms for legal concepts | Free translation | Terms must be consistent
sn: Review | Human review for rights text | Fully automatic release | Errors in rights notices have legal impact
sig: Glossary term match | whether key terms follow the glossary | Consistency | From the glossary
sig: Back-translation difference | difference after translating back | Drift | From the check
sig: Deadline and amount extraction | dates and numbers in the text | Critical content | From extraction
sig: Notice risk class | rights, payment or information | Review routing | From the notice type
noise: Author name | irrelevant
noise: Template colour | irrelevant
noise: Letter length alone | weak link
base: Human translators for all notices, because it is the quality standard and the starting point.
prod: A glossary-constrained translation model with number and date checks, back-translation tests and a reviewer queue ranked by risk class.
pipe: Notice intake @ content system ; Machine translation @ constrained model ; Number and glossary checks @ rules ; Back-translation test @ model ; Reviewer queue @ translation tool ; Approval and publish @ content system ; Feedback @ monthly
edge: Rare language | the model is weak | Routing to human translators
edge: Legal change | a legal term changes in the glossary | Versioned glossary
edge: Date format | numbers differ by locale | Locale-aware formatting
off: Reviewer edit rate ; Critical error recall ; Glossary compliance
on: Translation cost per notice ; Time to publish ; Resident complaints about notices
gap: Fluency as the metric ; Skipping review for rights text ; No glossary

== service-request-triage | Service Request Triage (311) | nlp,computer-vision | seconds | foundational | a=0.3 k=6
obj: Classify and route non-emergency service requests such as potholes, graffiti and noise from text and photos to the right team with a priority, so residents get faster fixes.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Emergency terms route to a person immediately ; Category and priority with confidence ; Duplicates linked to one job ; Equal response by neighbourhood monitored ; 3M requests per year
sn: Label | The category and priority that the field team assigned | The resident's choice | Residents often choose the wrong category
sn: Fairness | Equal service by neighbourhood | Faster service where more requests are filed | Request volume reflects confidence in the system
sn: Safety | An immediate human route for hazards | Queue ranking alone | A hazard cannot wait
sig: Text and photo content | description and image evidence | Category | From the request
sig: Location and nearby requests | place and clusters of similar requests | Duplicate detection | From GIS
sig: Hazard terms | words and visuals indicating danger | Priority | From the lexicon and vision
sig: Asset record | the asset at the location | Routing | From the asset register
noise: Resident name | irrelevant and private
noise: Request channel alone | weak link
noise: Neighbourhood name alone | a proxy for wealth
base: Call centre agents categorising each request by hand, because it is the current process.
prod: A multimodal classifier with duplicate linking, a hazard rule layer, a response-time equity monitor by neighbourhood and a work order link.
pipe: Request intake @ app, web and phone ; Classification @ multimodal model ; Hazard rules @ rule engine ; Duplicate linking @ geospatial match ; Work order @ asset system ; Status update to resident @ messaging ; Equity monitoring @ monthly
edge: Mixed requests | one message has several issues | Split into separate jobs
edge: Photo of the wrong place | the image does not match the address | Location checks and a follow-up question
edge: Complaint surge | an event causes many reports | Clustering and a single job
off: Category accuracy ; Hazard recall ; Response time gap across neighbourhoods
on: Time to resolve ; Misrouted requests ; Response-time equity gap
gap: Prioritising by request volume ; No hazard route ; Resident category as the label

== public-service-case-routing | Public Service Case Routing and Priority | tabular,nlp | seconds | advanced | a=0.3 k=6
obj: Route incoming cases to the right team and flag those at risk of missing a legal deadline, so staff time goes to the urgent and complex.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Routing and deadline flags only ; Statutory deadlines tracked in rules not in a model ; Staff can reassign ; Fairness of waiting times monitored ; 1M cases per year
sn: Goal | The right team on the first assignment | Fastest closure | Fast closure can mean a worse decision
sn: Deadline | Rule-based legal clocks | Model-predicted urgency | The law sets the deadline
sn: Fairness | Waiting time parity across groups | The shortest cases first | That leaves the hardest cases waiting
sig: Case type and complexity indicators | type, parties and documents | Routing | From intake
sig: Days to statutory deadline | time left to a legal limit | Priority | From rules
sig: Team capacity and skills | open load and specialisms | Feasibility | From the team system
sig: Reopen and escalation history | prior returns and escalations | Complexity | From case history
noise: Applicant name | irrelevant and private
noise: Submission channel | weak link
noise: Staff name | irrelevant
base: First-in first-out queues by case type, because they are the standard process.
prod: A routing model with deadline rules, workload balancing and a parity monitor on waiting times, reviewed by team leads.
pipe: Case intake @ case system ; Feature build @ case and capacity joins ; Routing model @ classifier ; Deadline rules @ rule engine ; Assignment @ workflow ; Team lead review @ queue console ; Parity and outcome monitoring @ monthly
edge: New rule | a law changes the deadline | Versioned rules
edge: Skill gap | no team has the skill | Escalation to specialists
edge: Backlog surge | the case queues spike suddenly | Capacity alerts and overflow rules
off: First-assignment accuracy ; Deadline breach recall ; Waiting time gap across groups
on: Cases past their deadline ; Reassignments ; Waiting time parity
gap: Model-set legal deadlines ; Shortest-first queues ; No parity monitoring

== public-appointment-no-show-prediction | Public Service Appointment No-Show Prediction | tabular | batch | foundational | a=0.3 k=5
obj: Predict missed appointments at licensing, registry and advice offices so reminders and slots are managed, and never to deny or penalise anyone.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Calibration}
con: Used for reminders and overbooking limits only ; No penalties or service denial ; Reminders in the person's language and channel ; Calibrated probabilities ; 3M appointments per year
sn: Purpose | Better slot use and helpful reminders | Penalising likely no-shows | People miss appointments for reasons such as work or transport
sn: Label | Appointments missed without rebooking | Cancellations | Cancellations free the slot
sn: Fairness | Reminder quality across groups | Targeting by neighbourhood | Targeting can reinforce unequal service
sig: Lead time | days between booking and the appointment | Risk | From booking
sig: Reminder response | confirmation of reminders | Intent | From messaging
sig: Appointment type | service and slot type | Base rate | From booking
sig: Day and time | weekday and time of day | Access | From booking
noise: Person name | irrelevant and private
noise: Address | irrelevant and private
noise: Device type | weak link
base: Uniform reminders a few days before the appointment, because it is common practice.
prod: A calibrated no-show model that selects who gets extra reminders or easy rebooking, with limited overbooking and a fairness check by language and area.
pipe: Booking and attendance data @ appointment system ; Feature build @ aggregated history ; No-show model @ gradient boosting ; Reminder policy @ rules ; Message sending @ messaging ; Rebooking links @ portal ; Parity check @ monthly
edge: Public transport strike | many miss at once | Event flags and rebooking drives
edge: New service | there is no history | Priors from similar services
edge: Reminder fatigue | messages are ignored | Channel and timing tests
off: Calibration ; Lift of extra reminders ; Reminder quality parity
on: No-show rate ; Slot utilisation ; Complaints about overbooking
gap: Penalising predicted no-shows ; Cancellations as no-shows ; Neighbourhood targeting

== plain-language-rewriter | Plain Language and Accessibility Rewriter | llm-agents,nlp | seconds | foundational | a=0.1 k=10
obj: Rewrite letters, guidance and forms in plain language and accessible formats for review, so residents understand what to do and by when.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Legal meaning preserved and checked by a reviewer ; Reading level targets met ; Deadlines and amounts unchanged ; Screen reader and easy-read versions ; 5K documents per year
sn: Meaning | Preserved legal content and deadlines | Shorter text | Shortening can drop a condition
sn: Review | Policy owner approval | Automatic publishing | A rewrite can change a right
sn: Test | Comprehension tests with residents | Readability scores alone | Scores do not show understanding
sig: Reading level | grade and sentence length | Readability | From metrics
sig: Number and date preservation | whether dates and amounts match the original | Safety | From extraction
sig: Terms against glossary | consistent legal terms | Meaning | From the glossary
sig: Structure and headings | clear order of actions | Usability | From the layout
noise: Author name | irrelevant
noise: Document length alone | weak link
noise: Font choice | irrelevant
base: Style guides and manual editing by the communications team, because it is the current method.
prod: A rewriting assistant with number and term checks, readability scoring, accessible output formats and an approval workflow with resident testing.
pipe: Document intake @ content system ; Rewrite draft @ LLM with constraints ; Number and term checks @ rules ; Readability scoring @ metrics ; Reviewer approval @ editorial tool ; Accessible export @ formats ; Comprehension test @ resident panel
edge: Legal nuance | a condition is lost in the rewrite | Reviewer check and diff highlights
edge: Local terms | the glossary lacks a term | Term requests to the glossary owner
edge: Complex form | the page layout is lost in conversion | Structure-aware conversion
off: Number and date preservation ; Reviewer edit rate ; Comprehension test results
on: Contacts caused by unclear letters ; Time to publish ; Accessibility complaints
gap: Readability scores alone ; Automatic publishing ; Shortening without checks

== benefits-eligibility-screening-assistant | Benefits Eligibility Screening Assistant | tabular,llm-agents | seconds | advanced | a=0.3 k=20
obj: Help residents and caseworkers see which benefits they may qualify for from a short set of answers, with the rules shown, so eligible people apply and no automated denial occurs.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}
con: Rules-based eligibility logic with the rule text shown ; The assistant never denies a claim ; Result says may qualify not does qualify ; Caseworker handles the formal decision ; 5M screenings per year
sn: Logic | Deterministic rules from the legal text | A learned predictor | Eligibility is defined by law not by pattern
sn: Language | The assistant explains the result and next steps | The assistant deciding | Decisions need accountability and appeal rights
sn: Privacy | Answers used for the screening only | Retained profiles | Retention invites function creep
sig: Rule match per programme | which rules are met and unmet | Core result | From the rules engine
sig: Missing information | facts needed to complete the check | Follow-up question | From the engine
sig: Rule version | the date and version of the rule | Correctness | From the rules store
sig: Household circumstance flags | situations that change rules | Edge cases | Declared by the user
noise: Resident name | irrelevant and private
noise: Device type | irrelevant
noise: Time of day | irrelevant
base: A static eligibility checklist on the website, because it is the current approach.
prod: A rules engine from the legal text with a conversational layer that asks missing questions, explains each result with its rule and routes to a caseworker for any claim.
pipe: User answers @ web or assisted channel ; Rules engine @ legal rules as code ; Missing information check @ rules ; Explanation @ LLM with controlled text ; Caseworker handoff @ case system ; Rule update process @ policy team ; Accuracy audit @ quarterly
edge: Rule change | a law changes thresholds | Versioned rules and tests
edge: Contradictory answers | the resident gives inconsistent facts | Ask to confirm and do not guess
edge: Complex household | several rules interact in one household | Route to a caseworker
off: Rule engine accuracy against legal test cases ; Explanation faithfulness ; Handoff precision
on: Take-up of eligible benefits ; Incorrect applications ; Caseworker time per case
gap: Learned eligibility ; Denials by the assistant ; Retaining profiles

== benefit-application-document-extraction | Benefit Application Document Extraction | computer-vision,nlp | batch | foundational | a=0.5 k=10
obj: Extract fields from payslips, bank statements, leases and IDs submitted with benefit applications so caseworkers review structured data rather than retyping.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Every extracted value links to its place in the image ; Caseworker confirms values before use ; Low-confidence fields flagged ; Documents deleted per retention rules ; 5M documents per year
sn: Truth | Values confirmed by caseworkers | OCR text only | OCR can misread digits
sn: Safety | Human confirmation | Auto-fill with no check | Wrong values change entitlements
sn: Privacy | Minimal fields and short retention | Full document storage | Documents are sensitive
sig: Field confidence | confidence per extracted value | Review priority | Calibrated
sig: Document type | the classified document type | Template choice | From the classifier
sig: Cross-field consistency | totals and dates agreeing | Error check | Rules
sig: Image quality | resolution and skew | Reliability | From the image
noise: Applicant name | irrelevant for extraction quality
noise: Scan device | an artefact
noise: File name | an artefact
base: Manual typing of documents into the case system, because it is the current process.
prod: A document understanding model with field-level confidence, cross-field checks, a confirmation screen with the source highlight and strict retention.
pipe: Document intake @ portal and scanning ; Type classification @ model ; Field extraction @ document model ; Consistency checks @ rules ; Caseworker confirmation @ case system ; Retention enforcement @ storage policy ; Accuracy review @ weekly
edge: Handwritten forms | the model is less accurate | Lower confidence and manual entry
edge: Foreign documents | the template is unknown | Document type abstention
edge: Fraudulent edits | a document is altered | Tamper checks that route to review not rejection
off: Field accuracy by document type ; Calibration ; Confirmation edit rate
on: Data entry time ; Errors found after processing ; Time to decision
gap: Auto-fill with no confirmation ; Long document retention ; OCR-only evaluation

== improper-payment-risk-review-queue | Improper Payment Risk Review Queue | tabular | batch | advanced | a=0.3 k=6
obj: Rank payments and claims for post-payment review by the likelihood of error or overpayment so limited audit staff check where errors are likely, with no benefit stopped on a score alone.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Scores select cases for human review only ; No payment is stopped or reduced on a score ; Error and fraud kept separate ; Fairness audited across groups ; Review capacity 20K cases per month
sn: Label | Errors confirmed by random sample audits | Cases flagged by earlier rules | Earlier rules bias the labels
sn: Action | Review by a trained officer with a right to reply | Automatic suspension | Wrongful suspensions harm people and have been unlawful in several countries
sn: Fairness | Equal review rates for equal risk | Higher review of poor areas | Review volume reflects the targeting
sig: Income and circumstance mismatch | differences between declared and registry data | Error indicator | From data matching
sig: Late change reports | delay in reporting changes | Overpayment risk | From case history
sig: Payment pattern anomalies | unusual changes in payments | Error type | From payments
sig: Past audit outcome | results of earlier reviews | Prior | From audits
noise: Applicant name | irrelevant and private
noise: Postcode text | a proxy for protected groups
noise: Nationality | prohibited
base: Rules-based data matching alerts and random audits, because they are the current controls.
prod: A calibrated review-priority model trained on random audit samples, an officer workflow with a right to reply and a regular fairness and error-rate audit.
pipe: Payment and case data @ benefits systems ; Data matching @ registry joins ; Review priority model @ gradient boosting ; Calibration @ isotonic fit ; Review queue @ audit workflow ; Officer decision with reply @ case system ; Fairness audit @ quarterly
edge: Biased labels | past flags drive new flags | Random audit samples for training
edge: Policy change | rules differ by period | Rule version features
edge: Feedback loop | reviewed cases dominate the data | Holdout reviews on unflagged cases
off: Precision at the review capacity ; Calibration ; Review rate parity across groups
on: Errors recovered ; Wrongful reviews ; Review hit rate
gap: Automatic suspension ; Flag-based labels ; Proxy features for protected groups

== tax-return-error-detection | Tax Return Error Detection | tabular | batch | advanced | a=0.5 k=8
obj: Detect likely errors and omissions in returns before processing so taxpayers can correct them and audits focus on real risk.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Prompt to the taxpayer about a possible error rather than a penalty ; Auditors review any enforcement case ; Selection based on random audits ; Fairness audited ; 30M returns per year
sn: Label | Errors confirmed in random audits | Past audit selections | Past selections bias the model
sn: Action | A correction prompt or review | An automatic assessment | Assessments need a person and appeal rights
sn: Fairness | Equal error detection across income groups | Focus on low-income returns | Complex high-income returns hold more tax at risk
sig: Third-party data mismatch | differences with employer and bank reports | Error | From information returns
sig: Deduction pattern | claims relative to peers | Anomaly | From returns
sig: Prior year change | change from last year | Plausibility | From history
sig: Complexity indicators | forms and credits claimed | Risk | From returns
noise: Taxpayer name | irrelevant and private
noise: Address | irrelevant and private
noise: Preparer name | irrelevant for the model
base: Rule-based checks and prior audit selection scores, because they are the current methods.
prod: A calibrated risk model on random audit data with taxpayer prompts for likely mistakes, a review queue for complex cases and fairness monitoring.
pipe: Return and third-party data @ tax system ; Feature build @ matches and history ; Error model @ gradient boosting ; Calibration @ isotonic fit ; Taxpayer prompt or review queue @ workflow ; Officer decision @ case system ; Fairness audit @ annual
edge: Law change | a deduction rule changes | Versioned rules and retraining
edge: Late third-party data | information returns arrive after filing | Waiting rules and a re-score
edge: Selection bias | audited returns differ from the population | Random sampling
off: Precision at audit capacity ; Calibration ; Detection parity by income group
on: Tax corrected before refund ; Taxpayer corrections after prompts ; Audit yield
gap: Past audit labels ; Automatic assessments ; Targeting low-income returns only

== tax-compliance-outreach-prioritisation | Tax Compliance Outreach Prioritisation | tabular | batch | foundational | a=0.2 k=5
obj: Choose who receives reminders, letters or help with late filing and payment so outreach improves compliance at the lowest cost, with support first and enforcement only through officers.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{Calibration}
con: Outreach is a nudge or an offer of help ; Enforcement decisions by officers ; Experiments to confirm what works ; Message language matches the taxpayer ; 10M taxpayers
sn: Goal | Compliance that results from outreach | Predicted non-compliance | A prediction does not show who responds
sn: Method | Randomised tests of letters and timing | Targeting by risk alone | Some people comply anyway
sn: Fairness | Equal quality of help | More enforcement tone for some groups | Tone should not depend on group
sig: Past filing and payment behaviour | timeliness of filings and payments | Base rate | From tax records
sig: Notice response history | response to earlier reminders | Uplift | From outreach tests
sig: Debt size and age | amount and age of debt | Value | From accounts
sig: Contact preference and language | channel and language | Delivery | From records
noise: Taxpayer name | irrelevant and private
noise: Occupation text | weak link
noise: Postcode text | a proxy
base: A single reminder letter to every late filer, because it is the common process.
prod: An uplift model from randomised outreach tests that selects message and timing, with a support offer for people in difficulty and fairness monitoring.
pipe: Account and notice data @ tax system ; Uplift model @ causal model ; Message selection @ rules ; Outreach send @ messaging ; Randomised holdout @ experiment platform ; Officer follow-up @ case system ; Impact evaluation @ quarterly
edge: Message fatigue | the response rate falls over time | Frequency limits and rotation
edge: Hardship case | payment is not possible | Support route and payment plans
edge: Law change | the filing deadlines move to new dates | Versioned rules
off: Uplift on randomised holdouts ; Calibration ; Parity of message tone
on: Compliance after outreach ; Cost per collected unit ; Complaints about letters
gap: Risk scores without tests ; Enforcement tone by group ; One-size reminders

== licence-inspection-targeting | Business Licence Inspection Targeting | tabular | batch | foundational | a=0.2 k=5
obj: Rank businesses for health, safety and licence inspections by the likelihood of serious violations so inspectors visit where harm is most likely, with random visits kept for fairness.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: A share of inspections stays random ; Scores rank visits and never trigger a penalty ; Inspectors decide findings ; Fairness audited by area and business type ; 100K businesses
sn: Label | Serious violations found in inspections | Complaints | Complaints depend on who complains
sn: Selection | A mix of risk-ranked and random visits | Risk-ranked only | Risk-only data cannot show model errors
sn: Fairness | Equal scrutiny for equal risk | More visits in poor areas | More visits find more issues and feed a loop
sig: Past violation history | serious findings in earlier inspections | Prior | From inspections
sig: Business type and size | type, size and activity | Base risk | From licences
sig: Complaint signals | verified complaints | Trigger | From service requests
sig: Time since last inspection | months since the last visit | Coverage | From inspections
noise: Owner name | irrelevant and private
noise: Neighbourhood name | a proxy
noise: Licence number | an identifier
base: Inspection cycles by business type, because they are the regulatory baseline.
prod: A calibrated risk model with a reserved random sample, inspector route planning and parity audits by area and business type.
pipe: Licence and inspection data @ regulatory systems ; Feature build @ aggregated history ; Violation risk model @ gradient boosting ; Random sample reserve @ rules ; Route planning @ optimiser ; Inspector visit @ field app ; Parity audit @ quarterly
edge: New business | the business has no inspection history | Type-based priors and a first-visit rule
edge: Complaint wave | complaints rise for a type | Complaint verification before use
edge: Feedback loop | visits shape the data | Random visits to measure bias
off: Violations found per inspection ; Calibration ; Detection parity across areas
on: Serious violations found ; Time since the last inspection of high-risk sites ; Complaints about scrutiny
gap: Risk-only sampling ; Complaint-only labels ; Penalties from scores

== benefits-caseload-forecasting | Benefits Office Caseload Forecasting | time-series | batch | foundational | a=1 k=2
obj: Forecast applications, calls and appointments by office and week so staffing, outreach and processing times match demand.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Weekly forecast for 26 weeks ; Interval output ; Policy changes and deadlines as inputs ; Aggregated data only ; 400 offices
sn: Driver | Economic indicators, policy changes and deadlines | History only | Demand reacts to events
sn: Granularity | Office and service line | National totals | Staffing is local
sn: Use | Staffing and processing time targets | A report | Planners need a staffing number
sig: Past applications and calls | weekly counts by service | Anchor | From case systems
sig: Policy and deadline calendar | rule changes and filing deadlines | Shifts | From the calendar
sig: Local employment indicators | unemployment and claims data | Demand driver | From statistics
sig: Seasonality | week of year | Pattern | Aligned
noise: Staff name | irrelevant
noise: Office code | an identifier
noise: Report format | an artefact
base: Same week last year scaled by recent trend, because it is a common planning rule.
prod: A hierarchical forecaster with policy and economic covariates, scenario ranges and a staffing translator that converts demand to hours.
pipe: Counts extraction @ case systems ; Feature build @ calendar and statistics joins ; Citizen forecast model @ gradient boosting ; Citizen hierarchical reconciliation @ rules ; Citizen scenario ranges @ simulation ; Staffing plan @ planning tool ; Citizen accuracy review @ monthly
edge: Policy surge | new rules create sudden demand | Scenario inputs from policy teams
edge: Economic shock | new claims jump for several weeks | Wider intervals and fast refresh
edge: System outage | counts drop for technical reasons | Outage flags
off: Forecast error by office ; Coverage of intervals ; Surge detection lead time
on: Processing time ; Overtime ; Backlog size
gap: History-only forecasts ; National-only planning ; Ignoring deadlines

== traffic-signal-timing-optimisation | Traffic Signal Timing Optimisation | reinforcement-learning | seconds | advanced | a=1 k=4
obj: Adapt traffic signal timings to current flow so delays and emissions fall, within safety rules and with priority for buses, cyclists and pedestrians where policy requires it.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Minimum green, clearance and pedestrian times enforced in the controller ; Plans tested in simulation before use ; Operators can revert at once ; Aggregated detector data only ; 800 junctions
sn: Objective | Weighted person delay with priority rules | Vehicle throughput | Throughput can harm pedestrians and transit
sn: Safety | Hard timing limits in the controller | Learned limits | A learned limit can shorten a pedestrian crossing
sn: Evaluation | Matched periods and simulation | Before and after totals | Traffic changes day to day
sig: Detector counts and occupancy | flow and occupancy by approach | State | From detectors
sig: Queue length estimate | estimated queue per approach | Delay | From detector models
sig: Transit and pedestrian demand | buses and crossing requests | Priority | From AVL and buttons
sig: Time of day and events | calendar and event flags | Context | From calendars
noise: Controller name | an identifier
noise: Operator name | irrelevant
noise: Log timestamp format | an artefact
base: Fixed-time plans by time of day, because they are the standard configuration.
prod: A model-based or reinforcement learning controller recommending timing plans from detector data with hard safety clips and a simulated test before field trials.
pipe: Detector capture @ traffic controllers ; State estimation @ queue model ; Plan optimiser @ controller policy ; Safety clip @ rules ; Plan deployment with approval @ traffic management centre ; Performance evaluation @ matched periods ; Retraining @ monthly
edge: Detector failure | counts are missing | Fallback to the fixed plan
edge: Incident | a crash changes flow | Incident detection and manual override
edge: Special event | demand is outside history | Event plans and operator approval
off: Delay in simulation ; Safety clip rate ; Matched-period gains
on: Person delay ; Bus travel time ; Pedestrian wait time
gap: Learned safety limits ; Vehicle throughput as the only objective ; Raw before-and-after comparisons

== traffic-flow-forecasting | Traffic Flow Forecasting | time-series,graph | batch | advanced | a=96 k=2
obj: Forecast traffic flow and travel times on city roads for the next hours from detectors and aggregated probe data so operators and travellers plan around congestion.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: 5-minute resolution up to 2 hours with hourly values up to 24 hours ; Aggregated and anonymised data only ; Intervals reported ; Updates every 5 minutes ; 20K road links
sn: Structure | A road network graph | Independent link forecasts | Congestion propagates along roads
sn: Privacy | Aggregated speeds and counts | Individual vehicle traces | Traces can reveal where people go
sn: Use | Operator decisions and public information | A forecast only | Operators need advice such as plan changes
sig: Upstream flow and speed | conditions on neighbouring links | Propagation | From the graph
sig: Event and incident flags | known events and incidents | Shocks | From operations
sig: Weather | rain, snow and visibility | Capacity effect | From weather data
sig: Time and calendar | hour, day type and holidays | Pattern | From the calendar
noise: Detector name | an identifier
noise: Operator name | irrelevant
noise: Log format | an artefact
base: Historical average speed by link and time, because it is the common baseline.
prod: A spatio-temporal graph model with event and weather covariates, interval outputs and an operator dashboard that suggests control measures.
pipe: Detector and probe aggregation @ traffic data platform ; Cleaning and gap fill @ batch ; Graph feature build @ road network ; Forecast model @ graph neural network ; Interval estimate @ quantile heads ; Operator dashboard @ traffic centre ; Accuracy tracking @ weekly
edge: Detector outage | data for a corridor is missing | Imputation limits and a flag
edge: Major incident | flow changes suddenly | Incident-aware features and rapid refresh
edge: Road works | the network changes | Network updates from works schedules
off: Error by horizon ; Coverage ; Congestion onset detection
on: Delay forecast accuracy ; Travel time reliability ; Operator response time
gap: Independent link models ; Individual traces ; Averages as the forecast

== transit-demand-forecasting | Public Transit Demand Forecasting | time-series | batch | foundational | a=96 k=2
obj: Forecast boardings by route, stop and time from card, count and event data so timetables, vehicle sizes and crowding information match demand.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Forecast by route and 15-minute interval ; Aggregated and anonymised card data ; Event and weather inputs ; Weekly run for 800 routes
sn: Data | Boardings from counters and aggregated cards | Individual journeys | Journey histories are private
sn: Censoring | Estimated unconstrained demand | Boardings when vehicles were full | Full vehicles hide passengers left behind
sn: Use | Service planning | A report | Planners need vehicle and frequency changes
sig: Boardings last week | boardings at the same time last week | Anchor | Aligned
sig: Events and school terms | event calendars and term dates | Demand shifts | From calendars
sig: Weather | rain and temperature | Mode choice | From weather
sig: Service changes | timetable changes | Supply effect | From schedules
noise: Route name | an identifier
noise: Driver name | irrelevant
noise: Fare product alone | weak link
base: Seasonal average of boardings by route and time, because planners use it today.
prod: A hierarchical forecaster with calendar and event covariates, censoring correction on full vehicles and scenarios for timetable changes.
pipe: Boarding data @ ticketing and counters ; Aggregation and anonymisation @ batch ; Censoring correction @ statistical model ; Forecast model @ gradient boosting ; Scenario testing @ planning tool ; Planner review @ scheduling team ; Accuracy tracking @ monthly
edge: Strike or closure | demand shifts across modes | Event flags and scenario inputs
edge: Counter fault | boardings are undercounted | Data quality checks
edge: Full vehicles | observed demand is capped | Censoring models
off: Weighted error by route ; Peak error ; Unconstrained demand estimate checks
on: Overcrowded trips ; Empty running ; Forecast bias at peak
gap: Observed boardings as demand ; Individual journey data ; Ignoring events

== bus-bunching-prevention | Bus Bunching Prevention | reinforcement-learning,time-series | seconds | advanced | a=20 k=4
obj: Recommend holding, speed and dispatch adjustments that keep buses evenly spaced on frequent routes, as advice to controllers and drivers within safety and labour rules.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Recommendations respect driver hours and safety rules ; Controllers approve any intervention ; Messages within 10 s ; Simulation test before live use ; 300 vehicles
sn: Goal | Even headways and short waits | On-time at timepoints only | Frequent routes depend on spacing
sn: Safety | Rules enforced in code | Learned preferences | Drivers cannot be asked to break rules
sn: Evaluation | Matched days in simulation and live | Raw before and after | Traffic differs by day
sig: Headway gap to the vehicle ahead | time gap to the leader | Bunching risk | From AVL
sig: Passenger load | onboard count | Dwell | From counters
sig: Traffic delay forecast | delay on the next segment | Arrival | From traffic data
sig: Layover and driver hours remaining | time left and break needs | Constraint | From the system
noise: Driver name | irrelevant
noise: Vehicle number | an identifier
noise: Shift label | weak link
base: Timetable adherence rules and manual holding at timepoints, because they are the standard controls.
prod: A control policy trained in simulation with a rules-based clip that proposes holds and skips to controllers, evaluated on matched days.
pipe: Vehicle location feed @ AVL ; Headway estimate @ stream processing ; Control policy @ reinforcement learning ; Rules clip @ constraints ; Controller advice @ control centre ; Driver message @ onboard unit ; Evaluation @ matched days
edge: Traffic incident | delays occur across a corridor | Corridor-wide advice
edge: Vehicle breakdown | a large gap appears between buses | Re-plan with spare vehicles
edge: Data loss | location data is missing | Fallback to timetable rules
off: Headway variation in simulation ; Rule violation rate ; Passenger wait time
on: Excess wait time ; Bunching events ; Controller acceptance rate
gap: On-time at timepoints only ; Learned labour rules ; Raw before-and-after comparison

== parking-occupancy-prediction | Parking Occupancy Prediction | time-series | batch | foundational | a=96 k=2
obj: Predict parking occupancy by street and lot for the next hours so drivers get guidance and pricing and enforcement follow demand.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Forecast to 3 hours at 15-minute resolution ; Aggregated occupancy only ; No tracking of plates ; Enforcement guidance is advice and not an automatic fine ; 100K spaces
sn: Data | Sensor and payment aggregates | Plate-level histories | Plate data is personal
sn: Use | Guidance and dynamic pricing within policy | Automatic fines | Fines need an officer and proof
sn: Evaluation | Error by zone and hour | Daily totals | Daily totals hide peaks
sig: Current occupancy | occupancy now by zone | Anchor | From sensors and payments
sig: Same time last week | occupancy in prior weeks | Pattern | Aligned
sig: Events and weather | event calendar and weather | Demand shifts | From data
sig: Price and rules | prices and time limits | Behaviour | From policy
noise: Plate number | personal data
noise: Meter name | an identifier
noise: Officer name | irrelevant
base: Same-hour-last-week occupancy by zone, because it is the simple benchmark.
prod: A zone-level forecaster with event covariates, guidance messages to drivers and occupancy-based pricing recommendations for approval.
pipe: Occupancy and payment data @ sensors and meters ; Aggregation @ zones ; Forecast model @ gradient boosting ; Guidance messages @ apps and signs ; Pricing recommendation @ policy tool ; Approval @ parking authority ; Accuracy tracking @ monthly
edge: Sensor outage | a zone loses data | Payment-only estimates and flags
edge: Special event | demand jumps for a few hours | Event features
edge: Rule change | time limits change | Versioned rules
off: Occupancy error by zone ; Peak error ; Guidance accuracy
on: Cruising time ; Occupancy near target ; Complaints about availability
gap: Plate-level tracking ; Automatic fines from forecasts ; Daily totals only

== road-pavement-condition-assessment | Road Pavement Condition Assessment | computer-vision | batch | advanced | a=20 k=400
obj: Measure cracks, potholes and rutting from vehicle-mounted and drone imagery so maintenance budgets target the roads that need repair.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Condition index per road segment with the image evidence ; Safety hazards flagged to a person immediately ; Engineer confirms before treatment ; Faces and plates blurred ; 5K km of road per year
sn: Truth | Engineer-rated condition scores | Image tags | Tags vary in quality
sn: Priority | Condition, traffic and treatment cost | Damage count | A small defect on a main road can matter more
sn: Privacy | Blurred people and plates | Raw video storage | Street imagery shows people
sig: Crack and pothole detection | model score per defect | Condition | Calibrated
sig: Traffic volume and road class | vehicles and class | Priority | From the register
sig: Surface age and last treatment | years since treatment | Deterioration | From the asset system
sig: Weather exposure | freeze and thaw cycles | Deterioration | From weather
noise: Vehicle name | irrelevant
noise: Survey vendor | irrelevant
noise: File name | an artefact
base: Manual windshield surveys by engineers, because they are the quality reference.
prod: A detection and segmentation model with condition indices per segment, a hazard rule, blurred imagery and a treatment optimiser tied to the budget.
pipe: Image capture @ survey vehicles ; Blur sensitive content @ vision model ; Defect detection @ vision model ; Condition index @ rules ; Treatment optimiser @ budget model ; Engineer review @ asset tool ; Re-survey tracking @ annual
edge: Wet road | glare hides cracks | Weather-aware filtering and re-survey
edge: Patches | repairs look like defects | Patch class training
edge: Poor GPS | images are on the wrong segment | Alignment checks
off: Condition index error ; Hazard recall ; Segment ranking accuracy
on: Cost per lane-kilometre treated ; Roads in poor condition ; Pothole complaints
gap: Raw image storage ; Damage counts as priority ; Image tags as truth

== micromobility-rebalancing | Shared Micromobility Rebalancing | reinforcement-learning,time-series | batch | foundational | a=48 k=3
obj: Plan the moves of shared bikes and scooters between zones so vehicles are available where demand is, with routes and crews that are cost-efficient.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Zone-level forecasts and plans only ; No tracking of individual riders ; Crew routes within shift limits ; Re-plan every hour ; 100K vehicles
sn: Goal | Rides served and equity of coverage | Rides alone | Pure ride maximisation ignores underserved areas
sn: Privacy | Aggregated trips by zone | Rider histories | Trips reveal movements
sn: Constraint | Crew capacity and battery state | Free movement | Vehicles need charging and crews are limited
sig: Zone demand forecast | forecast departures | Need | From the model
sig: Current stock by zone | vehicles available | State | From telemetry
sig: Battery level | charge of each vehicle | Feasibility | From telemetry
sig: Coverage targets | minimum service per area | Equity | From policy
noise: Rider name | personal data
noise: Vehicle id alone | an identifier
noise: Payment method | irrelevant
base: Crews move vehicles from the fullest to the emptiest zone by rule, because it is the usual practice.
prod: A demand forecast with a rebalancing optimiser that respects crew limits and coverage targets, with a route planner and a daily equity report.
pipe: Telemetry and trip aggregates @ operator platform ; Demand forecast @ time-series model ; Rebalancing optimiser @ vehicle routing ; Coverage rules @ policy ; Crew task list @ mobile app ; Outcome measurement @ daily ; Equity report @ weekly
edge: Weather change | rain collapses demand | Fast re-plans
edge: Event crowd | demand spikes around the venue | Event features
edge: Vehicle theft | stock disappears | Anomaly alerts
off: Demand error by zone ; Coverage attainment ; Route cost
on: Availability in underserved areas ; Rides served ; Crew cost per ride
gap: Maximising rides only ; Individual rider histories ; Ignoring battery state
