# Telecommunications & Networks, part 2 (use cases 21-50): service provisioning and orders, revenue, fraud and billing, marketing and sales, field force and assets, enterprise, edge and governance
# Vendor-neutral. Customer-facing and network-facing actions follow approved catalogues, spend and credit limits, and a named human decides anything above a risk threshold.
== realtime-service-activation-agent | Real-Time Service Activation Agent | llm-agents,tabular | seconds | staff-principal | a=0.1 k=30
obj: Take a validated order for a new feature, add-on or business service and drive it through eligibility, provisioning and verification in minutes, escalating only the exceptions to people.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: The agent works only from the product catalogue and approved order templates ; Orders above a value or risk threshold need human approval ; Every provisioning step is idempotent and reversible ; Customer consent and eligibility checked before activation ; 500K orders per day with activation inside 120 s for standard services
sn: Scope | A catalogue of orderable services with eligibility rules | Free-form requests turned into network changes | Free-form changes bypass product and billing controls
sn: Sequence | Ordered, idempotent steps with checkpoints | One bulk call to all systems | A half-finished activation leaves billing and network out of step
sn: Exceptions | A small set of typed failure classes with owners | Retry everything | Blind retries create duplicate charges and orders
sig: Eligibility check result | pass or fail of coverage, credit and contract rules | Stops invalid orders early | Rules owned by product teams
sig: Dependency state | status of upstream orders and resources the service needs | Predicts a stuck order | Needs live order state
sig: Step latency history | median and p95 time of each provisioning step | Spots a slow system | Per system and per hour
sig: Customer consent record | consent and contract acceptance flags | Legal gate | From the consent store at action time
noise: Order submission channel | does not change provisioning
noise: Customer name | irrelevant and private
noise: Sales agent identifier | irrelevant to activation
base: A workflow engine with fixed steps and a queue for failed orders, because it is the reference for activation time and exception volume.
prod: A supervisor agent that plans steps from a typed order, calls provisioning tools with idempotency keys, verifies service state after each step and escalates typed exceptions with the evidence, with approval gates by order value and risk.
pipe: Order intake @ order management ; Eligibility and consent gate @ rule engine ; Step planning @ agent with order templates ; Provisioning calls @ orchestrator tools ; Verification probes @ service tests ; Exception escalation @ case system ; Audit trail @ lakehouse
edge: Downstream system timeout | the step state is unknown | Read back state before retrying and use idempotency keys
edge: Partial activation | the network is on but billing is not | Compensating actions and a reconciliation check
edge: Conflicting concurrent orders | two orders touch the same line | Per-line locking and ordering by timestamp
off: Straight-through rate on replayed orders ; Compensation correctness in fault injection ; Eligibility decision accuracy
on: Time to activate ; Orders needing manual touch ; Billing errors after activation
gap: Retrying without idempotency ; Skipping the verification step ; Letting the agent bypass the catalogue

== private-5g-network-slice-provisioning | Private 5G Network & Slice Provisioning | llm-agents,reinforcement-learning | seconds | staff-principal | a=0.01 k=80
obj: Turn an enterprise request for a private 5G network or slice into a validated design, resource allocation and activation plan so business customers are live in days, not months.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Design output restricted to approved reference architectures ; Resource commitments checked against live capacity ; Human engineer approves every customer-facing commitment ; Spectrum and licence rules enforced ; Plan generated within 5 minutes of a completed request
sn: Requirements | Latency, coverage, device count and availability targets in numbers | A request such as fast and reliable | Vague needs produce designs that miss the SLA
sn: Capacity | Live capacity and spectrum headroom | Static planning sheets | Old sheets over-promise
sn: Sign-off | Engineer approval before any commitment | An auto-generated quote | A wrong commitment is a contractual liability
sig: Target service profile | required latency, throughput and reliability | Chooses the slice type | Must be machine-readable
sig: Coverage and site fit | predicted indoor and outdoor coverage at the site | Feasibility | Needs a site survey input
sig: Available capacity | free radio and core resources in the area | Limits the offer | Live not planned
sig: Similar past deployments | outcome of deployments with the same profile | Risk and effort estimate | Only confirmed outcomes
noise: Customer company size alone | not a technical need
noise: Sales region | not a design driver
noise: Quote length | an artefact
base: A design questionnaire and spreadsheet sizing by a solutions engineer, because it is the current process and shows how long it takes.
prod: An agent that gathers requirements into a typed profile, selects an approved reference design, checks feasibility with simulation and capacity tools, drafts the plan and bill of materials, and hands it to an engineer for approval.
pipe: Requirements capture @ structured intake and chat ; Profile validation @ schema checks ; Design selection @ reference architecture catalogue ; Feasibility and capacity @ simulation tools ; Plan and quote draft @ LLM with templates ; Engineer approval @ review console ; Activation orchestration @ orchestrator
edge: Unrealistic requirement | latency target beyond physics | Flag as infeasible with the nearest feasible profile
edge: Coverage uncertainty | indoor propagation is unknown | Require a survey and quote with ranges
edge: Capacity changes before activation | headroom shrinks after the quote | Reserve resources with an expiry
off: Design feasibility agreement with engineer review ; Capacity check accuracy ; Plan completeness
on: Request to activation time ; Quotes revised after delivery ; Customer SLA attainment
gap: Letting the model quote without review ; Using planned instead of live capacity ; Free-text requirements

== order-fallout-prediction | Order Fallout Prediction | tabular | batch | advanced | a=0.1 k=8
obj: Predict which orders will fall out of automated processing and why, so they are fixed before the customer commitment date is missed.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Prediction at order entry and refreshed at each step ; Top reasons shown to the fallout team ; Precision above 50% on the top decile ; Scores for 2M open orders every hour
sn: Label | Orders that needed manual intervention with the coded cause | Orders that were late for any reason | Late orders mix fallout and customer delay
sn: Timing | Features known at the time of scoring | Final order attributes | Final state leaks the outcome
sn: Cause | Fallout cause classes | One generic fallout label | Different causes need different owners
sig: Product and component complexity | number of components and dependencies in the order | Complex orders fail more | From the catalogue
sig: Address and service qualification quality | match score of the address to inventory | Frequent cause | Needs the inventory match result
sig: Prior fallout rate of the order template | fallout rate of this template over 90 days | Template risk | Exclude the order being scored
sig: Step wait time so far | minutes waiting in the current step compared with typical | Stuck signal | Per step distribution
noise: Order number | an identifier
noise: Sales channel alone | weak link
noise: Customer age | irrelevant
base: Historical fallout rate by product and channel applied to new orders, because it is simple and shows the value of order-level features.
prod: Gradient boosting on order structure and step progress with cause-class outputs and calibrated probabilities, feeding a work queue ordered by the commit date and the expected effort.
pipe: Order event ingestion @ streaming ; Feature build @ order and inventory joins ; Fallout model @ gradient boosting ; Cause classifier @ multi-class model ; Work queue ranking @ priority rules ; Fix tracking @ case system ; Retrain @ weekly
edge: New product | the new product has no history | Start from a type-level prior and widen thresholds
edge: Fix applied silently | the order recovers but the label is lost | Record interventions as events to keep labels honest
edge: Peak sales period | volumes change the pattern | Include volume features and monitor drift
off: Precision and recall at fixed queue capacity ; Cause class accuracy ; Calibration by product
on: Orders missing the commit date ; Manual touches per order ; Days to resolve fallout
gap: Using final order state as a feature ; One label for all causes ; Evaluating on random order splits

== order-fallout-resolution-agent | Order Fallout Resolution Agent | llm-agents,tabular | seconds | advanced | a=0.1 k=30
obj: Diagnose a fallout order from system errors and order history, apply approved low-risk fixes and prepare a complete handoff for the rest, so human fallout handlers focus on hard cases.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Fixes restricted to an approved catalogue such as resubmit, correct address format or re-trigger a step ; Anything that changes price, contract or customer data needs a human ; Every fix recorded with before and after state ; Triage within 30 s of fallout
sn: Evidence | The system error code and the order step state | The agent's own guess at the cause | Guessing wastes handler time
sn: Fix class | Reversible fixes with known results | Open-ended edits | Edits to customer data create new problems
sn: Handoff | A summary with evidence and what was tried | A bare reassignment | Handlers repeat the same checks
sig: Error code and message pattern | normalised code and text from the failing system | Names the cause | Maintain a code map per system
sig: Past fix success rate | success rate of each fix for this error class | Chooses the fix | Only count verified outcomes
sig: Order state graph position | the step and dependencies around the failure | Scope of the repair | Live state
sig: Retry count so far | automatic retries already tried | Avoids loops | Per order
noise: Handler name | irrelevant
noise: Order age alone | not a cause
noise: Message sentiment | no link
base: A rules table mapping error codes to a standard fix or queue, because it is the existing practice and sets the straight-through target.
prod: A tool-using agent with read access to order and system logs and a write catalogue of approved fixes, with a post-fix verification step and a structured handoff to handlers.
pipe: Fallout event intake @ order system ; Error classification @ rules and LLM ; Evidence gathering @ read-only tools ; Fix selection @ agent with a fix catalogue ; Fix execution @ orchestrator tools ; Verification @ order state check ; Handoff note @ case system
edge: Unknown error | no mapped class | Escalate with all evidence and add to the code map
edge: Fix succeeds but hides a deeper cause | the order falls out again | Cap automatic fixes per order and escalate on repeat
edge: Conflicting updates | a handler edits the order at the same time | Optimistic locking and an abort on change
off: Fix correctness against handler review ; Verified success rate ; Handoff completeness rating
on: Share of fallout resolved without a person ; Handler time per order ; Repeat fallout
gap: Counting closed tickets as fixed ; Open-ended write access ; No cap on retries

== number-porting-validation-exceptions | Number Porting Validation & Exceptions | tabular | seconds | foundational | a=0.05 k=5
obj: Predict and explain porting request rejections and exceptions before submission so more ports complete on the first attempt.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Validation within 3 s of the request ; Reasons mapped to the porting authority's rejection codes ; No automatic cancellation of a customer request ; Handles 300K porting requests per day
sn: Label | Rejection codes from the porting authority | Ports that took long | Delay and rejection have different fixes
sn: Check | Pre-validation of the data the donor will check | Waiting for the donor's rejection | Rejections cost days
sn: Fairness | Treat all customers the same | Different handling by plan value | Port-out quality should not depend on value
sig: Identifier match score | match of name, account and number against the donor's record format | Most rejections are mismatches | Compare formats not raw values
sig: Pending order on the number | open orders or locks on the number | Blocks the port | From order and number systems
sig: Contract and balance flags | whether notice or balance checks apply | Rejection reason | Use policy fields
sig: Donor history | rejection rate of the donor operator for the reason code | Operator behaviour | Use recent windows
noise: Customer name | irrelevant and private
noise: Time of day | weak link
noise: Request channel alone | weak link
base: Static field-format validation, because it catches simple data errors cheaply.
prod: Gradient boosting over validation features with reason codes mapped to rejection classes and a guidance message for the agent or customer before submission.
pipe: Port request intake @ order channel ; Field and format validation @ rule engine ; Rejection risk model @ gradient boosting ; Reason mapping @ code table ; Guidance to requester @ UI message ; Submission to porting hub @ porting API ; Outcome capture @ nightly join
edge: New donor operator | no rejection history | Use a pooled prior and monitor closely
edge: Rule change at the porting authority | validation becomes wrong | Rule versioning and a rapid update path
edge: Customer requests urgent port | the check delays the request | Allow submission with a warning when the customer insists
off: Rejection prediction AUC and precision ; Reason code accuracy ; First-attempt success rate
on: First-attempt port success ; Days to complete a port ; Port-related care contacts
gap: Evaluating without reason codes ; Treating delay as rejection ; Differential service by value

== esim-activation-risk-scoring | eSIM Activation Risk Scoring | tabular | sub-100ms | advanced | a=0.05 k=6
obj: Score eSIM and SIM-swap activation requests for takeover risk in real time so genuine customers are served quickly and risky activations get step-up verification.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Decision within 60 ms of the request ; False step-up rate under 2% of genuine requests ; Step-up methods accessible to all customers ; No decision on protected attributes ; 200K requests per day with spikes after launches
sn: Label | Confirmed account takeovers and customer-reported swaps | Customers who failed verification | Failed checks include genuine mistakes
sn: Action | Step-up verification for medium risk and a hold for high risk | Block or allow only | Customers need a path to prove identity
sn: Timing | Signals available at the request moment | Signals discovered after | Later facts leak the outcome
sig: Recent credential or contact changes | password, email or phone changes in the last 7 days | Takeover precursor | From identity events
sig: Device and location mismatch | device age and location distance from the usual | Possible attacker | Use coarse location
sig: Request velocity | requests on the account and device in an hour | Automated attack | Per account and per device
sig: Account value and exposure | linked banking or payment services | Raises the stakes | Use bands
noise: Customer name | irrelevant and private
noise: Handset brand alone | weak link
noise: Request time alone | weak link
base: Rules on recent credential changes and request velocity, because they catch common patterns and are easy to explain.
prod: Gradient boosting scored from an online feature store with calibrated probability and tiered actions, plus a case queue for held activations and a feedback loop from takeover reports.
pipe: Activation request @ digital channel ; Feature fetch @ online feature store ; Risk model @ gradient boosting ; Policy tiers @ rule engine ; Step-up or hold @ verification service ; Case review @ fraud queue ; Outcome labels @ weekly join
edge: Genuine device upgrade | many new device signals | Use the customer's own device history and a smooth step-up
edge: Attack wave | new pattern appears | Fast rule updates and a daily model refresh in a surge
edge: Verification outage | step-up cannot run | Safe default of a delayed activation with a clear message
off: Recall at fixed false step-up rate ; Calibration by segment ; Latency at p99
on: Takeover losses ; Genuine customers stepped up ; Activation completion rate
gap: Counting verification failures as fraud ; Blocking without a path to prove identity ; Training on post-hoc signals

== sim-box-bypass-fraud-detection | SIM-Box & Bypass Fraud Detection | graph,time-series | batch | advanced | a=24 k=3
obj: Detect SIM-box and interconnect bypass fraud from call patterns and network signalling, so illegal termination of international calls is found and blocked.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{GraphReg}
con: Features from call detail records only and never call content ; Analyst confirmation before blocking a subscriber ; Evidence pack for regulator and carrier disputes ; Daily scoring for 50M lines
sn: Behaviour | Patterns of many short calls to many numbers with low inbound | Total call minutes | Heavy genuine users look busy too
sn: Network | Groups of lines sharing a cell, device or time pattern | Single line analysis | Fraud is run as a farm of lines
sn: Evidence | Test calls and CDR patterns together | CDR patterns alone | Blocking needs strong proof
sig: Call fan-out and reciprocity | distinct destinations versus inbound calls ratio | Classic bypass pattern | Window per line
sig: Cell and device concentration | many active SIMs in one cell and device cluster | Farm signal | Use anonymised device groups
sig: Call duration profile | share of very short and fixed-length calls | Automated dialling | Compare with the segment
sig: Test call match | matched test call routed through the suspected line | Confirmation | Needs a test programme
noise: Subscriber name | irrelevant and private
noise: Plan name alone | weak link
noise: Number prefix alone | easily changed
base: Rules on outbound call fan-out and low inbound ratios, because fraud teams already use them.
prod: A graph and tabular model scoring lines and clusters from CDR aggregates and device data, with a ranked analyst queue, test call integration and a case file generator.
pipe: CDR ingestion @ mediation feed ; Line aggregates @ batch features ; Graph construction @ graph store ; Fraud model @ gradient boosting and graph embeddings ; Cluster ranking @ scoring ; Analyst review and test calls @ case system ; Block action @ network control
edge: Legitimate call centre | patterns look like bypass | Verified business flags and a separate segment
edge: Fraudsters rotate SIMs | line scores reset when SIMs rotate | Cluster-level features that persist across SIMs
edge: Test call gets missed | confirmation fails | Combine several evidence types before action
off: Precision of confirmed fraud lines ; Recall at fixed analyst capacity ; Cluster purity
on: Bypass minutes blocked ; Revenue recovered ; False blocks of genuine lines
gap: Per-line analysis only ; Blocking without evidence ; Using call content

== wangiri-irsf-fraud-detection | Wangiri & Premium-Rate Fraud Detection | time-series,tabular | seconds | advanced | a=48 k=2
obj: Detect call-back, premium-rate and international revenue share fraud in near real time so fraudulent traffic is stopped before large bills and settlement losses accrue.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Alert within 5 minutes of the pattern starting ; Blocks limited to destination ranges and approved templates ; Genuine customers notified and given a way to appeal ; 100M call records per day
sn: Pattern | Bursts to premium or high-risk destinations | Total international spend | Heavy genuine callers look the same on spend
sn: Speed | Detection inside minutes | Next-day batch | Fraud losses accrue per minute
sn: Action | Block the destination range and not the customer | Block the account | Customers are victims in call-back fraud
sig: Destination risk score | fraud rate of the destination range from recent weeks | Targets the fraud route | Update daily
sig: Calls per minute spike | calls per minute against the account's baseline | Burst signal | Account baseline
sig: Missed call to call-back ratio | inbound missed calls followed by outbound calls | Wangiri pattern | Per account
sig: Revenue share exposure | minutes and cost to the suspected number range | Loss estimate | From rating
noise: Customer name | irrelevant and private
noise: Plan name alone | weak link
noise: Time zone of destination | weak link
base: Threshold alerts on spend per destination and calls per hour, because they are the common practice.
prod: A streaming detector with destination risk scores and account baselines that proposes range blocks and customer messages, with a human approval for large blocks and an outcome feedback loop.
pipe: Real-time CDR feed @ mediation stream ; Windowed features @ stream processor ; Fraud model @ gradient boosting ; Destination risk table @ daily batch ; Block proposal @ rule engine ; Analyst approval @ fraud console ; Customer notification @ messaging
edge: New fraud destination | the new range has no risk score | Anomaly features on destination novelty
edge: Genuine event drives calls | a disaster causes calls to a range | Event awareness and a human check before range blocks
edge: Late CDRs | the pattern shows up hours later | Prefer signalling-based features with real-time CDR estimates
off: Detection delay on replayed fraud ; Precision of range blocks ; Loss prevented in backtests
on: Fraud loss per month ; Genuine calls blocked ; Customer bill disputes
gap: Account blocks for call-back fraud ; Batch-only detection ; Ignoring event traffic

== subscription-identity-fraud-onboarding | Subscription & Identity Fraud at Onboarding | tabular,graph | sub-100ms | advanced | a=0.05 k=10
obj: Score new subscription and device-financing applications for identity and bust-out fraud so fraudsters are stopped at the door and genuine customers onboard quickly.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Decision within 80 ms ; Document and identity checks follow the local KYC rules ; Decline reasons available for appeals ; No protected attributes ; 400K applications per day
sn: Label | Confirmed identity fraud and first-payment default | Early cancellations | Many early cancellations are genuine
sn: Linkage | Shared devices, addresses and numbers across applications | Single application view | Fraud rings reuse details
sn: Fairness | Equal treatment across applicant groups | Segment-specific thresholds without review | Thin-file customers are over-declined
sig: Identity attribute reuse | number of applications sharing the phone, address or device | Ring signal | Use hashed identifiers
sig: Device and channel risk | device reputation and emulator indicators | Automation signal | Per channel
sig: Credit bureau inconsistency | mismatch between declared and bureau data | Synthetic identity sign | Use official data
sig: Order value and device mix | high-value handsets on credit | Bust-out exposure | Per product
noise: Applicant name | irrelevant and private
noise: Email domain alone | weak link
noise: Application time alone | weak link
base: Rules on identity mismatches and blacklists, because they catch obvious fraud and are explainable.
prod: Gradient boosting on application and linkage graph features, scored from an online feature store with a calibrated probability and reason codes, plus a manual review queue.
pipe: Application intake @ digital and retail channels ; Identity and bureau checks @ vendor APIs ; Linkage features @ graph store ; Risk model @ gradient boosting ; Decision and reasons @ policy engine ; Manual review @ fraud queue ; Outcome labels @ monthly join
edge: Thin-file genuine customer | very few signals are available | Offer alternatives such as a deposit or a lower tier
edge: Ring adapts | fresh identities | Graph features across devices and addresses and fast rule updates
edge: Vendor outage | identity check fails | Safe fallback with a hold and clear status
off: Recall at fixed approval rate ; Calibration by segment ; Disparity checks across groups
on: Fraud loss at onboarding ; Genuine approval rate ; Review queue volume
gap: Evaluating on early cancellations ; Ignoring linkage ; Fixed thresholds across all segments

== usage-revenue-leakage-detection | Usage & Rating Revenue Leakage Detection | time-series | batch | advanced | a=24 k=3
obj: Find usage that was delivered but not billed or billed incorrectly across mediation, rating and billing so revenue assurance recovers lost revenue and fixes the root cause.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Reconciliation across network, mediation and billing counts ; Findings linked to a process step for root cause ; Evidence pack for finance sign-off ; Daily run over 3B usage records
sn: Reconcile | Counts and values compared at each hop | Final bill totals only | Leakage hides in the middle steps
sn: Baseline | Expected volume by service and period | Fixed tolerance | Volumes shift with seasons and launches
sn: Cause | Leakage tied to a rule, product or interface | A list of anomalies | Teams need the cause to fix it
sig: Record count ratio between steps | records in versus out per day and service | Loss at a hop | Align on the same period
sig: Rate plan assignment gaps | usage without a matching rating rule | Common cause | Needs the catalogue history
sig: Unrated or zero-value share | share of usage with zero charge by product | Leak signal | Per product
sig: Change adjacency | catalogue or system changes near the shift | Explains the onset | Needs change records
noise: Customer name | irrelevant and private
noise: Invoice number | an identifier
noise: Region alone | weak link
base: Daily reconciliation of record counts and values with fixed tolerance by service, because finance trusts it.
prod: Seasonal baselines per service and hop with anomaly scoring and a classifier of probable root cause, producing a ranked recovery list with an evidence pack.
pipe: Usage data extraction @ lakehouse ; Hop-level reconciliation @ batch jobs ; Baseline model @ seasonal time-series ; Anomaly scoring @ gradient boosting ; Root-cause classifier @ rules and model ; Recovery list @ finance console ; Fix tracking @ ticketing
edge: Product launch | volumes jump without history | Launch calendar and a looser baseline for new products
edge: Late-arriving usage | counts differ by timing | Reconcile on event time with a settlement lag
edge: Planned free usage | zero charge is intended | Intent flags from the catalogue
off: Recall of seeded leaks ; Root-cause accuracy ; Value-weighted precision
on: Revenue recovered ; Time from leak to fix ; Leaks found by customers
gap: Using total bill checks only ; Fixed tolerances ; No link to root cause

== bill-shock-prediction-alerts | Bill Shock Prediction & Alerts | tabular | batch | foundational | a=1 k=4
obj: Predict customers likely to receive an unexpectedly high bill and alert them with a way to adjust, so disputes and complaints fall.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Alerts only through the customer's chosen channel ; Alert cadence capped ; No pressure to buy a higher plan ; Daily scoring of 30M customers
sn: Label | Disputes and care contacts about unexpected charges | Any bill above average | High bills are often expected
sn: Expectation | Charges compared with the customer's own history | Compared with the population | Normal for one customer is shock for another
sn: Respect | Helpful alerts with a clear action | Upsell messages | Alerts framed as sales erode trust
sig: Usage to date versus history | usage so far in the cycle against the same point in prior cycles | Early warning | Align by cycle day
sig: Roaming and premium usage | charges outside the plan | Common shock source | Rated near real time
sig: Plan allowance remaining | allowance left against the projected usage | Overage risk | Per service
sig: Past dispute history | prior charge disputes | Sensitivity indicator | Use counts not text
noise: Customer name | irrelevant and private
noise: Payment method alone | weak link
noise: Device brand alone | weak link
base: Alert when usage reaches fixed shares of the allowance, because it is the regulatory baseline in many markets.
prod: Gradient boosting on cycle-to-date usage and history that predicts an out-of-pattern bill with calibrated risk, plus a message with the cause and the easiest fix.
pipe: Usage feed @ rating stream ; Cycle-to-date features @ batch ; Shock model @ gradient boosting ; Alert rules and caps @ policy engine ; Message with cause @ messaging ; Customer response capture @ analytics ; Dispute join @ weekly
edge: Customer on holiday | roaming appears suddenly | Roaming alerts at first foreign use
edge: Alert fatigue | too many messages | Frequency caps and a value threshold
edge: Rating delay | usage appears late | Estimate with a delay allowance and show that it is an estimate
off: Precision and recall of shock bills ; Calibration ; Alert actionability rating
on: Bill disputes ; Complaints about charges ; Opt-outs from alerts
gap: Using population averages ; Sales framing ; No frequency cap

== billing-dispute-resolution-agent | Billing Dispute Resolution Agent | llm-agents,nlp | seconds | advanced | a=0.1 k=40
obj: Investigate a billing dispute, check the rated usage and rules, explain the charge or propose a correction and credit within policy, so disputes resolve faster and more consistently.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Credits and corrections follow a policy table with caps ; Anything above a cap or involving legal threats goes to a human ; The explanation cites the rated records ; No changes to the bill without approval ; Investigation completed within 60 s
sn: Evidence | Rated usage records and the rate plan in force on the date | The customer's description | Memory of the plan is often wrong
sn: Policy | A table of allowed corrections with caps | Case-by-case discretion | Inconsistent outcomes drive complaints
sn: Explanation | A plain account of how the charge arose | A generic apology | Customers need to understand the cause
sig: Rated record match | whether the disputed charge maps to a rated record and rule | Validity of the charge | Needs a rule trace from rating
sig: Rate plan history | plan and promotion in force on the date | Detects wrong plans | Full history needed
sig: Similar case outcomes | outcomes for matching dispute types | Consistency | Approved outcomes only
sig: Customer value and history | tenure and dispute count by band | Sets escalation rules | Use for routing not for fairness
noise: Customer tone | not evidence
noise: Time of day | weak link
noise: Agent identifier | irrelevant
base: A decision tree on dispute type and amount with a standard credit, because it is the starting point for consistency.
prod: An agent with read tools for rated records, plan history and policy and a write tool for correction proposals with caps, producing an explanation with citations and routing complex cases to people.
pipe: Dispute intake @ care channels ; Record retrieval @ billing read tools ; Rule trace and plan check @ rating engine ; Resolution proposal @ agent with policy table ; Approval gate @ policy engine ; Correction and message @ billing and messaging ; Audit @ lakehouse
edge: Charge is valid | the customer disagrees | Explain with the records and offer a review path
edge: Billing error found | many customers are affected | Escalate to revenue assurance for a batch fix
edge: Threat of regulator complaint | the case needs a specialist | Route to the complaints team immediately
off: Resolution correctness against specialist review ; Policy compliance rate ; Explanation faithfulness
on: Time to resolve ; Disputes reopened ; Credits outside policy
gap: Letting the agent edit bills freely ; Case-by-case discretion ; Ignoring systemic billing errors

== roaming-settlement-reconciliation | Roaming Settlement Reconciliation | tabular,graph | batch | advanced | a=1 k=5
obj: Match roaming usage records between partner operators and flag mismatches and disputes before settlement so wholesale revenue and cost are accurate.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Calibration}
con: Matching on record keys and tolerances agreed in partner contracts ; Disputes backed by records ; Currency and tax rules applied correctly ; Monthly run over 2B records
sn: Key | Partner-agreed record identifiers and tolerances | Fuzzy matching only | Settlement needs rule-based proof
sn: Exceptions | Ranked mismatch reasons | A raw difference total | Finance needs the reason to dispute
sn: Timing | Late records included by event time | Cut-off by file date | Late files change totals
sig: Unmatched record share | share of records without a partner match by partner | Dispute signal | Per period
sig: Rate and tax mismatch | difference between the billed and contract rate | Pricing disputes | Contract table needed
sig: Duplicate record flag | repeated record keys | Double billing | Needs the record key
sig: Partner dispute history | dispute rate and win rate by partner | Prioritises effort | Recent windows
noise: Subscriber name | irrelevant and private
noise: File name | an artefact
noise: Region alone | weak link
base: Exact-key matching with a fixed tolerance on duration and amount, because it follows the contract.
prod: Rule-based matching plus a model that proposes matches for broken keys and ranks mismatch reasons by value, with a dispute pack generator and partner-specific tolerances.
pipe: Usage file ingestion @ clearing house feeds ; Exact matching @ batch SQL ; Near-match proposal @ gradient boosting ; Mismatch classification @ rules and model ; Dispute pack @ report generator ; Finance review @ settlement console ; Partner submission @ clearing API
edge: Currency conversion differences | totals differ by rate source | Use contract rates and record the source
edge: Duplicate files | the same file arrives twice | File hash checks
edge: Partner format change | file parsing fails on the new format | Schema versioning and alerting
off: Match rate against audited reconciliations ; Dispute win rate ; Value of mismatches found
on: Settlement variance ; Days to close a period ; Disputed amount recovered
gap: Fuzzy matching without contract rules ; Cut-off by file date ; Ignoring partner behaviour

== postpaid-churn-prediction | Postpaid Churn Prediction | tabular | batch | foundational | a=1 k=10
obj: Predict which postpaid customers are likely to leave in the next 60 days and why, so retention offers go to those who can be saved at a sensible cost.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Offers capped by customer margin ; Contact only within consent ; Scores explained to retention agents ; Weekly scoring of 20M customers
sn: Label | Voluntary leave versus involuntary leave | Any disconnect | Non-payment is not a retention problem
sn: Target | Customers whose decision can change with an offer | Highest churn probability | Some leavers cannot be saved
sn: Timing | Features before the prediction date | Features including the notice | The notice itself leaks the label
sig: Experience score trend | trend in the customer's network experience score | Dissatisfaction signal | Join with the experience score
sig: Contract end proximity | days to the end of the minimum term | Churn window | From billing
sig: Care contact pattern | repeat contacts and unresolved issues in 60 days | Frustration | Use coded reasons
sig: Competitor offer pressure | market price gap for the plan | Switching incentive | Aggregated market data
noise: Customer name | irrelevant and private
noise: Number of lines alone | weak link
noise: Handset colour | no link
base: Logistic regression on tenure, contract end and recent complaints, because it is easy to explain and sets the benchmark.
prod: Gradient boosting for the churn risk plus an uplift model for who responds to offers, with explanations and an offer optimiser under margin caps.
pipe: Customer feature build @ lakehouse ; Churn model @ gradient boosting ; Uplift model @ causal model ; Offer optimiser @ constrained selection ; Agent and campaign lists @ CRM ; Response tracking @ analytics ; Retrain @ monthly
edge: Price rise month | churn spikes for all | Segment baseline adjustment and price-event features
edge: Competitor launch | churn patterns shift after the launch | Rapid drift monitoring and short windows
edge: Offer fatigue | repeated offers lose effect | Offer history and caps
off: Lift at the top decile ; Calibration ; Uplift AUUC
on: Churn rate of targeted customers against control ; Offer cost per saved customer ; Customer satisfaction after offers
gap: Treating all leaves as churn ; Targeting by risk alone ; Measuring without a control group

== next-best-offer-plans-addons | Next-Best-Offer for Plans & Add-ons | recommender | sub-100ms | advanced | a=2 k=6
obj: Recommend the plan, add-on or device offer most likely to benefit the customer and the business in each channel with consent and fair-treatment rules applied.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{RankLoss}
con: Response under 80 ms ; Offers respect eligibility and consent ; Fair-treatment rules prevent steering vulnerable customers into unsuitable products ; Offers explained to agents ; 30M customers
sn: Objective | Long-term value including retention | Immediate take-up | High take-up of unsuitable add-ons later becomes complaints
sn: Eligibility | Rules applied before ranking | Ranking then filtering | Ineligible offers waste exposure
sn: Fairness | Suitability checks for vulnerable customers | Maximum conversion | Mis-selling carries regulatory risk
sig: Usage versus plan fit | share of allowance used and overage events | Plan upgrade or downgrade need | Per cycle
sig: Device age and upgrade eligibility | device age and financing status | Device offer fit | From the device record
sig: Past offer response | accept and ignore history by offer type | Taste | Decay old events
sig: Life event proxies | new address or new line for family | Moments of need | Only with consent
noise: Customer name | irrelevant and private
noise: Time since last login alone | weak link
noise: Offer image colour | no link to need
base: Most popular offer by segment, because it is simple and a standard comparison for personalisation.
prod: A two-tower retrieval model with a re-ranker constrained by eligibility, consent and suitability rules, with an exploration share and a holdout for incremental value.
pipe: Eligibility filter @ rules engine ; Candidate retrieval @ two-tower model ; Re-ranker @ gradient boosting ; Suitability and consent gate @ policy engine ; Offer display @ channel API ; Response capture @ event stream ; Holdout evaluation @ experiment platform
edge: New offer | the new offer has no response history | Exploration traffic and content features
edge: Vulnerable customer | an upsell is unsuitable | Suitability check blocks the offer and logs it
edge: Offer expires | the cache serves stale offers | Short cache lifetimes and expiry checks
off: Recall at ten and NDCG ; Calibration of acceptance ; Suitability rule coverage
on: Incremental revenue against holdout ; Complaints about offers ; Retention of accepting customers
gap: Optimising take-up only ; Filtering after ranking ; No holdout

== device-upgrade-propensity | Device Upgrade Propensity | tabular | batch | foundational | a=1 k=6
obj: Predict which customers are likely to upgrade a handset soon so retail, logistics and campaigns plan stock and offers sensibly.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Use only consented marketing data ; Predictions per device model for stock planning ; Refreshed weekly for 20M customers ; Offers must stay within fair-treatment rules
sn: Label | Completed upgrades within 90 days | Store visits | Visits do not always lead to upgrades
sn: Timing | Launch calendar and contract end | Calendar-free scoring | Upgrades cluster at launches and contract ends
sn: Stock | Forecast by device and region | One national number | Stock outs are local
sig: Device age | months since the device was acquired | Main driver | From the device record
sig: Contract and instalment status | months left on the plan or payment | Upgrade eligibility | From billing
sig: Battery and performance proxies | device health indicators with consent | Need to replace | Only with consent
sig: Launch proximity | days since the last flagship launch | Demand wave | From the calendar
noise: Customer name | irrelevant and private
noise: Colour preference | weak link
noise: Store opening hours | no link
base: A rule that flags customers whose device is more than 24 months old and contract ended, because retail already uses it.
prod: Gradient boosting for propensity and a forecast of device-level demand by region, with a campaign list and stock plan view.
pipe: Device and billing features @ lakehouse ; Propensity model @ gradient boosting ; Demand aggregation @ batch ; Region forecast @ time-series model ; Campaign list @ CRM ; Stock plan @ supply planning ; Outcome tracking @ weekly
edge: New device launch | the new device has no upgrade history | Use similar devices as priors
edge: Supply shortage | demand cannot be met | Use predicted demand to prioritise limited stock rules
edge: Price promotion | upgrades pulled forward | Include promotion features and treat as an event
off: AUC and top-decile lift ; Device-level forecast error ; Regional stock plan error
on: Stock outs ; Upgrade campaign conversion ; Excess stock
gap: Counting visits as upgrades ; Ignoring launches ; National-only stock plans

== prepaid-recharge-prediction | Prepaid Recharge & Top-up Prediction | time-series,tabular | batch | advanced | a=1 k=3
obj: Predict when each prepaid customer will recharge and how much so offers, reminders and liquidity forecasts reflect real behaviour.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Daily prediction for 100M prepaid lines ; Reminders honour consent and frequency caps ; Forecasts for finance with intervals ; No targeting based on financial hardship
sn: Behaviour | Recharge patterns by customer with a time-to-event model | Average monthly recharge | Customers recharge on rhythms
sn: Churn | Lapse is a distinct state | Zero recharge as churn | Many users recharge irregularly and return
sn: Care | Offers that help customers stay connected | Pressure when balance is low | Pressure harms trust
sig: Days since last recharge | gap to the usual interval | Due-date signal | Per customer
sig: Balance and burn rate | current balance and recent daily spend | Time to depletion | Real-time balance
sig: Payday and calendar effects | pay days and holidays | Timing effects | Local calendar
sig: Recharge channel mix | channels used over 90 days | Preference | Aggregates only
noise: Customer name | irrelevant and private
noise: SIM serial number | an identifier
noise: Store location alone | weak link
base: Predict the next recharge as the median interval of the last three recharges, because it is simple and effective.
prod: A survival model for time to next recharge combined with an amount model, producing intervals and a due-soon list for consented reminders and an aggregate liquidity forecast.
pipe: Recharge event ingestion @ streaming ; Customer features @ feature store ; Time-to-recharge model @ survival model ; Amount model @ gradient boosting ; Reminder list @ campaign system ; Liquidity forecast @ finance report ; Accuracy tracking @ weekly
edge: Dual-SIM users | activity moves to the other SIM | Treat quiet lines carefully and avoid churn labels
edge: Promotion week | recharges pull forward | Promotion calendar features
edge: Network outage | recharges stop while the outage lasts | Condition on outage events
off: Interval and amount error ; Calibration of the due-soon list ; Forecast coverage
on: Reminder conversion ; Liquidity forecast error ; Customers contacted per recharge
gap: Counting zero recharge as churn ; Ignoring dual-SIM behaviour ; Targeting low balance customers with pressure

== postpaid-credit-risk-point-of-sale | Postpaid Credit Risk at Point of Sale | tabular | sub-100ms | advanced | a=0.05 k=8
obj: Decide on credit limits and deposits for postpaid and device-financing applicants at the point of sale with explainable, fair credit risk scores.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Decision within 80 ms ; Adverse-action reasons for declines ; No use of protected attributes or close proxies ; Model governance sign-off for each release ; 300K applications per day
sn: Label | Default or serious delinquency within 12 months | Early late payments | Short delays are common and benign
sn: Population | Accepted and declined applicants with reject inference | Accepted customers only | Declined applicants hide risk
sn: Fairness | Disparity checks in each release | Accuracy only | Credit models face legal tests
sig: Bureau score and trade lines | score and delinquency history | Core risk signal | Official sources
sig: Existing relationship | tenure and payment record with the operator | Strong behavioural signal | Own data
sig: Application consistency | declared versus bureau data | Fraud and risk | Use match quality
sig: Device financing exposure | total outstanding device credit | Exposure | Per customer
noise: Applicant name | irrelevant and private
noise: Application time alone | weak link
noise: Store brand alone | weak link
base: A bureau score cut-off with fixed deposit tiers, because it is transparent and the incumbent approach.
prod: Gradient boosting with monotonic constraints and reason codes, a limit and deposit policy, reject-inference training and a monitoring pack for fairness and stability.
pipe: Application and bureau pull @ credit APIs ; Feature build @ online feature store ; Risk model @ gradient boosting ; Policy and deposit tiers @ rule engine ; Decision and reasons @ POS channel ; Performance tracking @ monthly ; Fairness and drift monitor @ governance report
edge: Thin-file applicant | no bureau history | Alternative data with consent and a smaller initial limit
edge: Bureau outage | the bureau returns no score at all | Conservative fallback and a retry path
edge: Economic shock | portfolio risk shifts quickly | Stress tests and a faster recalibration schedule
off: AUC and KS by segment ; Calibration ; Disparity metrics by group
on: Bad debt rate ; Approval rate ; Appeals upheld
gap: Training only on accepted applicants ; Skipping fairness tests ; Using protected proxies

== retail-store-footfall-staffing | Retail Store Footfall & Staffing | time-series | batch | foundational | a=24 k=1
obj: Forecast store footfall and service demand by hour and plan shifts so queues fall and labour cost stays in budget.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Forecast per store per hour for 14 days ; Rostering rules and labour law respected ; Planner can override ; Counter data aggregated without identifying individuals
sn: Demand | Footfall and appointment counts by hour | Daily sales | Sales hide the queue
sn: Events | Launches, promotions and local events | Seasonality only | Spikes are event-driven
sn: Constraint | Contracts, breaks and skill mix | Hours only | Infeasible rosters fail on the day
sig: Same hour last week | footfall in the same hour in recent weeks | Seasonal anchor | Local time
sig: Launch and promotion calendar | device launches and offers in the window | Demand spikes | From the plan
sig: Local event flags | events near the store | Footfall effect | Curated
sig: Weather | forecast rain or heat | Shifts walk-ins | Forecast not actual
noise: Store manager name | irrelevant
noise: Store opening date | weak link
noise: Receipt number | an identifier
base: Seasonal naive footfall with average growth, because it is easy to explain to store managers.
prod: A global forecast with store embeddings and calendar covariates feeding a shift optimiser with rules for skills and labour law.
pipe: Counter ingestion @ store sensors ; Forecast model @ gradient boosting ; Event and promotion features @ calendar join ; Demand to staff conversion @ queue model ; Shift optimiser @ integer programming ; Planner review @ roster tool ; Outcome tracking @ weekly
edge: New store | the new store has no history yet | Borrow a profile from similar stores
edge: Counter fault | footfall drops to zero | Detect faults and use transaction proxies
edge: Strike or closure | demand moves to neighbours | Manual overrides and neighbour spillover features
off: Weighted error by store and hour ; Queue time prediction accuracy ; Roster feasibility rate
on: Queue time at peak ; Labour cost per transaction ; Hours of idle staff
gap: Using sales as demand ; Ignoring roster rules ; Random time splits

== enterprise-connectivity-lead-scoring | Enterprise Connectivity Lead Scoring | tabular | batch | foundational | a=0.1 k=10
obj: Rank business leads for fibre, private networks and managed services by likelihood and value so sales effort goes where it pays.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Use firmographic and own-network data only ; Sales sees reasons for each score ; Weekly refresh of 500K leads ; Coverage feasibility checked before ranking
sn: Label | Closed-won deals with first-year revenue | Opportunities created | Many opportunities never close
sn: Feasibility | Serviceable by the network within a time | Interest alone | An unserviceable lead wastes sales time
sn: Timing | Signals before the opportunity | Signals after contact | Later steps leak the outcome
sig: Serviceability | whether fibre or wireless coverage reaches the site | Gate for ranking | From the network inventory
sig: Business size and growth | employee and revenue band and growth signals | Demand proxy | From licensed data
sig: Current spend and contract end | existing telecom spend and renewal dates | Timing | From CRM
sig: Intent signals | web visits and enquiry types | Interest | Use consented data
noise: Sales rep name | irrelevant
noise: Lead source alone | confounded
noise: Company logo | no link
base: Rank by company size and coverage, because sales teams already use it.
prod: Gradient boosting on firmographic, serviceability and intent features with value estimates and reasons shown in CRM, retrained quarterly on closed deals.
pipe: Lead and firmographic ingestion @ CRM and data vendors ; Serviceability join @ network inventory ; Lead model @ gradient boosting ; Value estimate @ regression ; Rank and reasons @ CRM ; Sales feedback @ outcomes ; Retrain @ quarterly
edge: New segment | there are few wins to learn from | Start with priors and manual review
edge: Long sales cycle | outcomes arrive late | Use stage progression as an interim label
edge: Duplicate companies | one company gets several split scores | Entity resolution before scoring
off: Win rate by score decile ; Value capture at top deciles ; Calibration
on: Sales conversion ; Revenue per sales hour ; Leads closed as unserviceable
gap: Using opportunity creation as the label ; Skipping serviceability ; No entity resolution

== field-technician-dispatch-optimisation | Field Technician Dispatch Optimisation | reinforcement-learning,tabular | seconds | advanced | a=0.5 k=20
obj: Assign and route field technicians to installs and repairs by skills, parts, location and customer commitments so more jobs complete on time with less travel.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Skills, parts and working-time rules as hard constraints ; Re-optimisation within 60 s after a change ; Dispatcher can override ; Fair workload spread ; 20K jobs per day
sn: Objective | On-time completion weighted by priority and cost | Utilisation alone | High utilisation produces late jobs
sn: Estimate | Job duration predicted from job type and history | Fixed standard times | Durations vary widely
sn: Change | Re-optimise as jobs overrun | Plan once in the morning | Real days break plans
sig: Predicted job duration | model of duration by job type, site and technician skill | Plan accuracy | Use confirmed durations
sig: Travel time matrix | road travel time by period | Route cost | Traffic aware
sig: Parts availability | parts in the vehicle or depot | Avoids repeat visits | Live stock
sig: Customer appointment window | commitment time and priority | Constraints | From orders
noise: Technician name | irrelevant
noise: Vehicle colour | irrelevant
noise: Ticket text length | weak link
base: A greedy dispatcher assigning the nearest qualified technician, because it is the common approach and the benchmark.
prod: A vehicle routing optimiser with learned durations and a rolling horizon re-plan, with a simulator for policy testing and dispatcher override logging.
pipe: Job and schedule intake @ field service system ; Duration model @ gradient boosting ; Travel matrix @ routing service ; Optimiser @ vehicle routing solver ; Re-plan on events @ streaming triggers ; Dispatcher console @ field service tool ; Outcome capture @ lakehouse
edge: Emergency job | the day plan is disrupted | Priority insertion and re-optimisation with minimal change
edge: Technician absent | daily capacity drops suddenly | Auto re-plan and alerts for jobs at risk
edge: Duration surprise | a job runs long | Early detection and reassignment of later jobs
off: Duration prediction error ; Plan feasibility ; On-time rate in simulation
on: On-time completion ; Kilometres per job ; Repeat visits
gap: Fixed standard times ; Planning once a day ; Ignoring parts

== truck-roll-avoidance-prediction | Truck-Roll Avoidance Prediction | tabular | seconds | advanced | a=0.2 k=15
obj: Predict whether a customer fault can be fixed remotely so a technician is sent only when needed, and remote steps are tried first for the rest.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Never delay a visit for a safety or service-critical fault ; Remote steps limited to approved actions ; Customer can request a visit ; Recommendation within 5 s
sn: Label | Visits that found no fault or a remote-fixable fault | Visits that closed quickly | Quick visits can still need a technician
sn: Safety | Safety and critical-service rules first | A model decision on all faults | A missed critical fault is costly
sn: Action | Remote diagnostics and resets in order | A single remote attempt | The sequence resolves many cases
sig: Line and modem diagnostics | line quality, sync and reboot history | Remote fixability | From the line test
sig: Fault description class | classified customer fault type | Prior for outcome | Use categories
sig: Past visit outcomes on the line | earlier no-fault-found visits | Pattern signal | Per line
sig: Device and firmware state | modem model and firmware version | Known issues | From device management
noise: Technician name | irrelevant
noise: Ticket age alone | weak link
noise: Customer name | irrelevant and private
base: A rule that tries a line test and reset before every visit, because it is a standard first step.
prod: Gradient boosting on line, device and ticket features giving fixable-remotely probability with a policy engine for safety rules and a guided remote step sequence.
pipe: Ticket intake @ care and field systems ; Line test and device data @ diagnostic tools ; Fixability model @ gradient boosting ; Safety and critical rules @ rule engine ; Remote step sequence @ device management ; Visit decision @ dispatch ; Outcome labels @ weekly
edge: Intermittent fault | tests pass while the fault remains | Repeat tests and flag intermittent patterns
edge: Vulnerable customer | a visit is needed for safety | Vulnerability flags override remote-first
edge: Remote step makes things worse | a reset breaks service | Limit steps and add rollback
off: Precision of remote-fixable predictions ; Missed critical faults ; Calibration
on: Truck rolls avoided ; Repeat visits ; Time to fix
gap: Delaying critical visits ; Learning from visit duration ; One remote attempt only

== tower-inspection-drone-imagery | Tower Inspection with Drone Imagery | computer-vision | batch | advanced | a=0.01 k=5000
obj: Find corrosion, loose fittings, antenna misalignment and structural damage from drone and climber images so inspections are faster and safer.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Defects ranked by severity with the image location ; Engineer confirms before any work order ; Personnel safety rules maintained ; Images processed within 1 hour per site ; No imagery of people stored
sn: Label | Engineer-confirmed defects with severity | Any visible mark | Surface marks are mostly benign
sn: Coverage | Complete image coverage by tower section | Whatever the pilot captured | Gaps hide defects
sn: Action | Severity-ranked work orders | A raw list of detections | Engineers need priorities
sig: Defect detection score | model confidence for a defect class at the location | Core output | Calibrated per class
sig: Defect growth between visits | change in the same area over time | Progression | Needs image registration
sig: Component type | antenna, mount, cable or structure | Severity rules | From a component detector
sig: Environmental exposure | coastal and wind exposure class | Risk weighting | From site data
noise: Pilot name | irrelevant
noise: Image brightness alone | acquisition artefact
noise: Sky background | irrelevant
base: Manual inspection of images by an engineer, because it is the standard and the measure for time saved.
prod: A detector and segmenter for components and defects with calibrated severity, image registration for change over time, and a review tool that creates work orders.
pipe: Image upload @ object storage ; Quality check @ blur and coverage check ; Component and defect detection @ vision model ; Registration and change @ image alignment ; Severity ranking @ gradient boosting ; Engineer review @ inspection tool ; Work order @ asset system
edge: Poor lighting | defects are missed in dark images | Quality gate and a reshoot request
edge: Occlusion | parts hidden by structure | Flag unseen areas for a climber
edge: New antenna type | unseen component | Human review and quick retraining
off: Recall and precision per defect class ; Severity agreement with engineers ; Coverage completeness
on: Inspection hours per tower ; Defects found early ; Climber hours
gap: Treating all marks as defects ; No coverage check ; Ignoring image registration

== fibre-fault-localisation | Fibre Fault Localisation from OTDR & Telemetry | time-series | seconds | advanced | a=4 k=30
obj: Locate the position of a fibre cut or degradation from OTDR traces and optical telemetry so repair crews go to the right place the first time.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Position estimate with an error range in metres ; Combine OTDR with route records ; Crew guidance within 10 minutes of the fault ; No replacement of engineer judgement on safety
sn: Evidence | OTDR distance and the cable route record together | OTDR distance alone | Optical distance differs from route distance
sn: Fault type | Break, bend or connector loss classified | A single fault flag | Fix and urgency differ by type
sn: Learning | Confirmed fault locations from repair records | Estimated locations | Estimates are not truth
sig: OTDR event distance | optical distance to the first major loss event | Raw location | Needs refractive index calibration
sig: Route length slack | route length versus cable length factors | Converts to the ground | From the route records
sig: Power drop pattern | change in received power at the endpoints | Fault type | From telemetry
sig: Past faults on the segment | earlier faults on the same segment | Prior | From repair records
noise: Technician name | irrelevant
noise: Trace file name | an artefact
noise: Region alone | weak link
base: Convert optical distance to ground distance with a fixed slack factor and send a crew, because it is the standard method.
prod: A model that corrects OTDR distance with route slack and past repair corrections to give a ground location range, plus a classifier for the fault type and a map for crew guidance.
pipe: OTDR trace capture @ monitoring system ; Event detection @ signal processing ; Route join @ GIS and cable records ; Location model @ gradient boosting ; Fault classifier @ model ; Crew guidance @ field app ; Repair feedback @ outcome labels
edge: Multiple events | the first event is not the cut | Rank events using telemetry and past traces
edge: Wrong route record | the location is off | Flag low confidence and ask for a route survey
edge: Aerial versus buried | cable slack differs by installation type | Segment type features
off: Location error against repair records ; Fault type accuracy ; Share within 50 m
on: Time to locate the fault ; Wasted crew travel ; Repeat visits to the same fault
gap: Using estimated locations as labels ; Ignoring route slack ; Single event assumption

== site-power-battery-failure-prediction | Site Battery & Power Failure Prediction | time-series | batch | advanced | a=24 k=2
obj: Predict battery, rectifier and mains failures at radio sites so spares and crews arrive before the site goes down.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Lead time of at least 7 days for battery replacement ; Priority ranking by customer impact ; Alerts auditable by operations ; Scores for 150K sites daily
sn: Label | Confirmed battery or power failures from work orders | Any alarm | Many alarms are minor
sn: Health | Discharge behaviour during real outages | Static voltage readings | Batteries fail under load
sn: Priority | Sites ranked by customers affected | Sites ranked by risk only | Low-impact sites distract crews
sig: Autonomy time during outages | hours the battery held the load in the last outages | Capacity proxy | From site logs
sig: Float voltage and temperature trend | slope of float voltage and temperature | Ageing | Calibrate per model
sig: Mains outage frequency | mains drops per month | Stress | From alarms
sig: Battery age and chemistry | months in service and type | Prior | From asset records
noise: Site name | an identifier
noise: Technician on last visit | no link
noise: Alarm text | vendor formatting
base: Replace batteries by age, because it is the usual maintenance policy.
prod: A survival model on discharge and float features with impact-ranked work lists and a spares forecast for each depot.
pipe: Telemetry ingestion @ monitoring ; Discharge event extraction @ batch ; Health model @ survival model ; Impact ranking @ customer join ; Work list @ asset system ; Spares forecast @ planning ; Outcome tracking @ monthly
edge: No outages in the window | no discharge evidence | Use proxies and widen intervals
edge: Heat wave | batteries age faster | Temperature-driven risk adjustment
edge: Battery replaced without records | the replacement labels are wrong | Verify with voltage jump and confirm in work orders
off: Precision and recall at 7 and 30 days ; Lead time ; Calibration
on: Site outages due to power ; Batteries replaced early ; Generator callouts
gap: Replacing by age only ; Ignoring discharge tests ; Ranking by risk alone

== spare-parts-swap-inventory-forecasting | Spare Parts & Swap Inventory Forecasting | time-series | batch | advanced | a=1 k=3
obj: Forecast the demand for spare parts, modems and swap units by depot and part so stock-outs and write-offs both fall.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Forecast by part and depot with intervals ; Lead times included ; Obsolete parts flagged ; Weekly run for 80K part-depot pairs
sn: Demand | Failure rate times installed base | Past issues only | Installed base changes drive failures
sn: Lead time | Supplier lead time distributions | A fixed lead time | Variable lead times cause stock-outs
sn: Intermittent | Methods for slow-moving parts | Averages | Many parts sell once a quarter
sig: Installed base by age | count of units by age band | Failure exposure | From asset records
sig: Failure rate by part type | failures per thousand unit-months | Core driver | From repair data
sig: Supplier lead time | median and p90 lead time | Reorder timing | From purchase orders
sig: Planned rollout | upcoming installs and upgrades | Demand shift | From the project plan
noise: Depot manager | irrelevant
noise: Part colour | irrelevant
noise: Order number | an identifier
base: Reorder-point rules from average usage and a safety factor, because the supply team already uses them.
prod: A hierarchical forecast with intermittent demand methods driven by installed base, with lead time scenarios and a stocking optimiser by depot.
pipe: Usage and base data @ lakehouse ; Demand forecast @ intermittent model ; Lead time model @ distribution fit ; Stock optimiser @ service-level optimisation ; Order proposals @ planning tool ; Buyer review @ approval ; Accuracy tracking @ monthly
edge: New part | the new part has no usage history | Use similar parts and rollout data
edge: Supplier disruption | lead times explode | Scenario planning and alternative suppliers
edge: Return of repaired parts | stock is higher than shown | Include the repair loop in the stock position
off: Weighted quantile loss ; Stock-out rate at service level ; Bias
on: Stock-outs ; Inventory value ; Write-offs
gap: Fixed lead times ; Using averages for slow parts ; Ignoring the repair loop

== enterprise-sla-breach-prediction | Enterprise SLA Breach Prediction | tabular,time-series | seconds | advanced | a=1 k=12
obj: Predict which enterprise services are likely to breach their SLA in the current period and trigger early action, so credits and churn fall.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Per-contract SLA definitions applied exactly ; Alerts to the account team with reasons ; No automatic credits ; Hourly scoring of 200K enterprise services
sn: Definition | The contractual SLA formula per customer | A generic availability figure | Contracts differ in measurement and exclusions
sn: Horizon | Probability of a breach by period end given the budget used | End-of-period outcomes only | Action needs time to help
sn: Action | Prioritised fixes on the services at risk | A report | Reports do not change outcomes
sig: SLA budget consumed | minutes of downtime used against the allowed budget | Primary signal | Contract rules applied
sig: Incident rate on the path | incidents on the service path in 30 days | Reliability trend | From fault records
sig: Maintenance planned | scheduled work that counts against the SLA | Future budget use | From change calendars
sig: Redundancy state | whether the backup path is healthy | Risk amplifier | From topology
noise: Account manager | irrelevant
noise: Customer logo | irrelevant
noise: Contract number | an identifier
base: Alert when SLA budget consumed passes fixed thresholds, because many teams already do this.
prod: A model for the probability of a breach by period end using budget use, path health and planned work, with a ranked list and suggested actions by account team.
pipe: Service impact and budget @ SLA engine ; Path and incident features @ lakehouse ; Breach model @ gradient boosting ; Planned work join @ change calendar ; Ranked alerts @ account console ; Action tracking @ ticketing ; Outcome tracking @ monthly
edge: Disputed outage | SLA exclusion is unclear | Mark disputed minutes and show both views
edge: New service | the new service has no breach history | Contract priors and a conservative threshold
edge: Planned work moved | the budget forecast changes | Recompute on change updates
off: Precision and recall of breaches ; Lead time ; Calibration by contract class
on: SLA credits paid ; Breaches avoided ; Enterprise churn
gap: Using one SLA formula ; Scoring at period end only ; Automatic credits

== mec-edge-workload-placement | MEC Edge Workload Placement | reinforcement-learning | seconds | staff-principal | a=0.2 k=20
obj: Decide where to place and move edge workloads such as video analytics or industrial control across network edge sites, balancing latency, cost and capacity.
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
con: Placement honours latency and data-residency constraints ; Moves cause no service interruption ; Human approval for new tenants ; Decisions within 20 s ; 5K workloads across 500 edge sites
sn: Constraint | Hard latency and residency rules | A cost-only placement | A cheap site that misses latency is useless
sn: Demand | Forecast load per site | Static capacity | Edge load shifts by hour and event
sn: Move | Cost of migration and risk of disruption | Free movement | Frequent moves cause outages
sig: Latency to users | measured latency from the user population to each site | Constraint check | Live measurements
sig: Site capacity headroom | spare compute and bandwidth | Feasibility | Live
sig: Workload demand forecast | predicted load for the workload | Planning | Per workload
sig: Residency rules | data location constraints per tenant | Legal limit | From contracts
noise: Workload name | an identifier
noise: Site name | an identifier
noise: Tenant brand | irrelevant
base: Place each workload at the nearest site with enough capacity, because it is the simplest scheme.
prod: A constrained optimiser with a learned demand model and a migration cost term, simulated before use and executed through orchestrator templates.
pipe: Capacity and latency telemetry @ edge monitoring ; Demand forecast @ time-series model ; Placement optimiser @ constrained solver ; Simulation check @ digital twin ; Approval gate @ risk tiers ; Orchestration @ edge orchestrator ; Outcome monitor @ KPI checks
edge: Demand spike at one site | capacity runs out | Overflow rules and quick scaling
edge: Site failure | workloads must move | Pre-planned failover sets
edge: Migration storm | many workloads move at once | Limits on concurrent moves
off: Constraint violation rate in simulation ; Latency target attainment ; Forecast error
on: SLA attainment for edge services ; Edge compute cost ; Disruptive migrations
gap: Cost-only placement ; Ignoring migration cost ; No simulation

== network-data-privacy-retention-compliance-copilot | Network Data Privacy & Retention Compliance Copilot | llm-agents,nlp | seconds | advanced | a=0.02 k=40
obj: Answer privacy and retention questions about network and subscriber data, map datasets to rules and flag gaps, so engineers and legal teams make consistent decisions.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Answers cite the policy clause and the data catalogue entry ; The copilot advises and never changes retention settings ; Legal reviews all interpretations of new rules ; Response within 10 s
sn: Source | The current policy and the data catalogue with owners | Model memory of privacy law | Rules differ by country and change
sn: Scope | Datasets mapped to purposes and retention classes | General privacy advice | Teams need decisions about their data
sn: Authority | A named legal owner signs off interpretation | The copilot's answer | An answer is not a legal opinion
sig: Dataset classification | sensitivity and retention class from the catalogue | Maps rules | Needs catalogue coverage
sig: Purpose match | whether a use case matches an approved purpose | Basis for allowing a use | Purpose register
sig: Retention timer status | age of data against the retention class | Finds overdue data | From storage metadata
sig: Cross-border flow | whether data leaves its jurisdiction | Transfer rules | From data lineage
noise: Question phrasing | not substance
noise: Requester seniority | not relevant to rules
noise: Document formatting | an artefact
base: Keyword search over policy documents, because it shows how much retrieval saves.
prod: A retrieval-grounded assistant over the policy library and data catalogue with structured findings, owner routing for unresolved questions and a log for audit.
pipe: Question intake @ chat and ticket ; Policy and catalogue retrieval @ hybrid search ; Mapping and gap check @ rules ; Grounded answer @ LLM with citations ; Owner routing @ case system ; Decision log @ lakehouse ; Policy update sync @ nightly
edge: Conflicting rules | two regions differ | Show both and route to legal
edge: Missing catalogue entry | the dataset is unknown | Flag as a gap and ask the data owner
edge: New regulation | the policy library is stale | Version policies and show effective dates
off: Citation faithfulness ; Gap detection recall on seeded issues ; Routing accuracy
on: Time to answer privacy questions ; Datasets with overdue retention ; Escalations to legal
gap: Treating the answer as legal advice ; No catalogue link ; Stale policies

== telecom-agent-action-audit-guardrails | Telecom Agent Action Audit & Guardrails | llm-agents,tabular | seconds | staff-principal | a=0.2 k=40
obj: Monitor every action taken by autonomous agents in network and customer systems, enforce guardrails and give auditors a replayable record, so governed autonomy can scale with confidence.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Policy enforcement happens outside the model in code ; Every tool call logged with inputs, outputs and approver ; High-risk actions require named human approval ; Kill switch per agent and per tool ; Audit queries answered within 5 s over 90 days of actions
sn: Enforcement | Policy checks in the tool gateway | Prompt instructions telling the model to be careful | A prompt can be overridden by input
sn: Evidence | Immutable action log with context | Summary reports | Auditors need to replay the decision
sn: Scope | Least-privilege tool access per agent | Shared credentials | One compromised agent should not reach everything
sig: Action risk tier | tier of the tool and target from the policy | Approval routing | Policy as code
sig: Action rate per agent | actions per minute against the baseline | Runaway detection | Per agent baseline
sig: Approval latency and override rate | time to approve and share rejected | Governance health | From the approval log
sig: Outcome verification result | whether post-action KPIs improved | Quality of the action | Needs verification step
noise: Agent name | an identifier
noise: Prompt text length | not risk
noise: Model version label alone | needs outcome data
base: A log of tool calls reviewed manually by team leads, because it is the minimum audit trail.
prod: A policy gateway between agents and tools with risk tiers, rate limits and a kill switch, an immutable action log with replay and anomaly detection on action behaviour for weekly governance reviews.
pipe: Network tool gateway @ policy proxy ; Network risk tier decision @ policy as code ; Network approval workflow @ maker-checker ; Network action log @ append-only store ; Behaviour anomaly detection @ time-series model ; Replay and audit console @ analytics ; Network governance report @ weekly
edge: Agent loops | repeated actions on one target | Rate limits and a loop detector
edge: Approval fatigue | approvers accept everything | Track override rates and rotate approvers
edge: Policy gaps | a new tool has no tier | Default deny until classified
off: Network policy test coverage ; Detection of seeded anomalous actions ; Replay completeness
on: Network actions blocked by policy ; Incidents caused by agent actions ; Time to answer audit queries
gap: Prompt-only guardrails ; Shared credentials ; Default allow for new tools
