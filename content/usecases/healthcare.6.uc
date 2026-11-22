# Healthcare & Life Sciences, part 6: Procurement & Spend Intelligence (use cases 83-90) and Contract & Legal Intelligence (91-98)
# Findings are leads for finance, procurement, clinical value analysis and legal counsel. No supplier hold, substitution, recovery claim, legal determination or contract change happens without a named human approval.
== healthcare-procurement-spend-anomaly-detection | Healthcare Procurement Spend Anomaly Detection | time-series,tabular | batch | advanced | a=1 k=2
obj: Identify unusual purchasing amounts, frequency, unit prices, suppliers, categories and cost-centre patterns, and give procurement and finance a ranked exception queue with the expected-versus-actual variance and the evidence behind it.
sor: Procurement and accounts-payable system ; Supplier master data ; Item catalogue and contract repository ; Budget and general ledger
up: Purchase orders, invoices and receipts ; Supplier master ; Item catalogue and unit-of-measure tables ; Budgets and cost centres ; Contract references
down: Procurement exception queue ; Finance review and dispute workflow ; Cost-centre manager notification ; Spend dashboard
opt: External price indices ; Group purchasing organisation price files
proto: SFTP and REST extracts from ERP and accounts payable, EDI 850 and 810 documents where used, and a case workflow for exceptions
own: Supply chain finance ; Procurement ; Accounts payable ; Cost-centre owners
con: Rules and robust anomaly models rank exceptions and procurement or finance reviews before any hold or supplier action ; Units of measure, currencies, tax and item equivalence are normalised before comparison ; Every exception shows the expected value, the actual value and the evidence ; Alert budget per analyst per week ; Scores 4M purchase and invoice records nightly ; No individual is named in an alert
loss: \mathcal{L}=\sum_t \mathrm{Huber}\!\left(y_t-\hat y_t\right)
sn: Normalisation | Unit, currency, tax and pack-size normalised lines | Raw line prices | A case of 100 and a box of 10 look like a price anomaly
sn: Baseline | Item-level and category-level seasonal baselines | One global threshold | Spend is lumpy and seasonal in healthcare
sn: Evidence | Expected-versus-actual with contract reference | Score only | Finance cannot dispute a score
sn: Priority | Exposure-ranked queue | Count of flags | Large exposures hide among many small ones
sn: Action | Review before any hold | Auto-hold on a score | A wrongly held supplier can interrupt care supplies
sig: Unit-price deviation | invoiced unit price versus contract or trailing median price | The core price anomaly | Use normalised units and the price at the order date
sig: Order-frequency change | change in order frequency for the item and cost centre | Detects fragmentation and surges | Trailing windows
sig: Supplier-concentration shift | share of category spend moving between suppliers | Reveals off-contract buying | Contract status as at purchase
sig: Budget burn rate | spend to date versus budget pace | Context for large purchases | Ledger as at the day
noise: Supplier name spelling | resolved by the master
noise: Invoice number | identifier not signal
noise: Cost-centre manager identity | personal and not a driver
base: A report of invoices above a fixed price or quantity threshold.
prod: Normalisation of units, currencies and item equivalence followed by rule checks and a robust seasonal anomaly model on price, quantity and frequency, with exposure ranking, contract-reference evidence and a review workflow.
pipe: Purchase and invoice intake @ ERP extracts ; Unit and item normaliser @ item crosswalk rules ; Business rule checks @ procurement policy rules ; Spend anomaly detector @ robust baseline with isolation forest ; Exposure ranker and evidence builder @ variance calculator ; Procurement and finance review @ human ; Case outcome and audit @ case workflow
edge: Unit-of-measure change | a price jumps tenfold | Unit conversion tables with change detection
edge: New item | no price baseline exists so the first purchase looks unusual | Category prior and a low-confidence flag
edge: Emergency purchase | the spike is legitimate | Emergency flag from the order reason code
edge: Duplicate invoice | the same spend is counted twice | Duplicate rules on supplier, invoice number and amount
off: Precision at the review capacity and recall on seeded and confirmed exceptions ; Variance-estimate error against resolved cases ; Alert acknowledgement rate
on: Recovered or avoided spend ; Time to resolve an exception ; False-alert share
gap: Comparing unnormalised units ; Training on already-resolved cases ; Auto-holding suppliers on a score
== contract-purchase-order-compliance-detection | Contract vs Purchase Order Compliance Detection | nlp,tabular | batch | advanced | a=0.5 k=4
obj: Detect purchase orders that violate contracted price, supplier, volume, term, approval or purchasing-channel conditions by extracting contract terms and testing each order line against them.
sor: Contract repository ; Procurement and accounts-payable system ; Supplier and item master data ; Approval policy register
up: Contract clauses and price schedules ; Purchase-order lines ; Supplier and item master ; Contract amendments ; Approval policies
down: Procurement compliance queue ; Buyer correction request ; Contract owner exception review ; Exposure report
opt: Group purchasing organisation agreements ; Supplier portal catalogues
proto: Document extraction from contracts into a structured term store, SFTP and REST feeds from the purchasing system and a rules service with an exception worklist
own: Procurement ; Contract management ; Supply chain finance ; Legal
con: Contract terms are extracted with page and clause provenance and a human validates each contract once ; Deterministic compliance rules test each line and the contract or procurement owner validates interpretation and the disposition of exceptions ; Amendments and effective dates are versioned ; Item matching uses catalogue identifiers before fuzzy text ; Evaluates 1.5M order lines per day ; Estimated exposure is a modelled figure and not a recovery claim
sn: Terms | Structured contract terms with source clauses | Free-text reading at check time | Rules need stable structured terms
sn: Amendments | Effective-dated amendments and supersession | The base contract only | The wrong price is checked against an obsolete term
sn: Matching | Catalogue and contract item identifiers | Fuzzy text on item names | A false match flags a legitimate order
sn: Interpretation | Owner confirms ambiguous clauses | Model interpretation as final | Legal meaning is a human call
sn: Exposure | Variance times volume with stated assumptions | Count of exceptions | Finance acts on value
sig: Price variance to schedule | order price minus contracted price for the item and tier | The main compliance test | Contract version at order date
sig: Channel and supplier match | whether supplier and channel match the contract | Off-contract buying | Contract scope tables
sig: Volume tier position | cumulative volume against tier thresholds | Tiered prices depend on it | Cumulative at order date
sig: Approval chain completeness | required approvals present | Policy compliance | Policy version
noise: Buyer name | not a compliance driver
noise: Order free-text note | noisy
noise: Order entry time | process artefact
base: A quarterly sample audit of purchase orders against contracts.
prod: Layout-aware contract term extraction with human validation, an effective-dated term store, catalogue-first item matching and a deterministic line-by-line compliance engine that produces a clause-to-transaction match, variance and exposure.
pipe: Contract and PO intake @ document OCR and ERP extracts ; Contract term extractor @ document AI with spans ; Item matcher for catalogue identifiers @ rules and fuzzy lookups ; Compliance rule engine @ versioned rules ; Exposure and evidence builder @ variance calculator ; Contract and procurement review @ human ; Exception outcome and audit @ case workflow
edge: Contract amended retroactively | past orders become non-compliant | Effective-dated amendments and a restatement run
edge: Bundled prices | line-level rules do not apply | Bundle rules with explicit components
edge: Ambiguous clause | the model reads it two ways | Route to the contract owner and store the decision
edge: Supplier catalogue update | item identifiers change | Crosswalk table maintenance with alerts on unmatched items
off: Field-level F1 of extracted contract terms ; Exception precision and recall against audited orders ; Exposure error against resolved variances
on: Compliant spend share ; Recovered price variance ; Time to resolve an exception
gap: Checking orders against superseded terms ; Fuzzy item matches without a threshold ; Treating exposure as a guaranteed recovery
== healthcare-supplier-performance-risk-scoring | Healthcare Supplier Performance & Risk Scoring | tabular,time-series | batch | advanced | a=0.5 k=3
obj: Predict supplier delivery, quality, continuity and financial or operational risks that could disrupt care operations, with an explainable scorecard that separates observed facts from external signals.
sor: Procurement and supplier management system ; Receiving and inventory system ; Quality and recall management system ; Supplier master data
up: Purchase orders and delivery and receipt events ; Quality incidents and recalls ; Service levels ; Supplier profile ; Approved external risk feeds
down: Supply chain risk dashboard ; Critical-item exposure list ; Supplier review meetings ; Mitigation plan tracker
opt: Financial health and sanction data under licence ; Geopolitical and weather disruption feeds
proto: Warehouse extracts from ERP and receiving, REST or file feeds from approved risk providers and a scorecard API
own: Supply chain risk ; Procurement ; Clinical value analysis ; Materials management
con: Observed facts and external signals are shown separately ; Supplier decisions need procurement and clinical value review ; Scores show the evidence and the dimension ; Critical-item exposure joins supplier risk to clinical criticality ; Scores 8K suppliers weekly and on events ; External data used only under licence
sn: Dimensions | Delivery, quality, continuity and financial risk shown separately | One blended score | A supplier can be reliable but financially fragile
sn: Facts | Observed deliveries and incidents | Press sentiment | External noise outweighs facts
sn: Criticality | Exposure weighted by clinical criticality of items | Spend weighted | The cheapest item can be life-critical
sn: Action | Mitigation options with evidence | Score only | Procurement needs next steps
sn: Fairness | Treat small and large suppliers consistently | Volume-biased scores | Small suppliers get unfairly flagged
sig: On-time-in-full rate trend | trailing on-time-in-full against target and its slope | Direct delivery performance | Receipts as logged
sig: Quality incident rate | incidents and recalls per volume | Safety signal | Incidents as recorded
sig: Single-source exposure | share of critical items with no qualified alternative | Continuity risk | Item qualification tables
sig: External risk flags | approved financial and disruption indicators | Adds forward-looking risk | Feed timestamps
noise: Supplier marketing material | not evidence
noise: Social media volume | noisy
noise: Account manager opinion | unsystematic
base: Annual vendor scorecard from delivery and quality reports.
prod: Explainable gradient-boosted classification and trend forecasting per risk dimension combined with a rules-based criticality overlay and a scorecard that labels each input as an observed fact or an external signal.
pipe: Delivery and quality intake @ ERP and receiving extracts ; External risk feed loader @ licensed APIs ; Risk feature builder @ point-in-time features ; Supplier risk model @ gradient boosting with calibration ; Criticality overlay @ item criticality rules ; Procurement and clinical value review @ human ; Mitigation outcome and audit @ lakehouse
edge: Supplier merger | history is split | Supplier hierarchy with lineage
edge: Recall event | risk jumps immediately | Event-driven re-score
edge: Sparse history for a new supplier | the model is uncertain | Prior from category and a low-confidence flag
edge: Licensed feed outage | the signal vanishes | Feed health flag and a degraded score
off: PR-AUC and precision at the review capacity by dimension ; Calibration of risk probabilities ; Lead time of correct risk flags before disruption
on: Disruption events avoided or mitigated ; Critical-item stockouts ; Share of high-risk suppliers with a mitigation plan
gap: Mixing facts with unverified external signals ; Weighting by spend not criticality ; Evaluating without a time split
== healthcare-contract-price-variance-detection | Healthcare Contract-Based Price Variance Detection | tabular,nlp | batch | advanced | a=0.5 k=3
obj: Find differences between contracted and invoiced or paid prices after accounting for units, tiers, rebates, freight, taxes and amendments, and quantify the recoverable amount for finance to validate.
sor: Accounts-payable and procurement system ; Contract price schedules ; Item crosswalk and master data ; Payment system
up: Contract price schedules and amendments ; Invoices and purchase orders ; Item crosswalks ; Payment records ; Rebate and tier terms
down: Finance recovery queue ; Supplier dispute workflow ; Contract owner correction request ; Variance dashboard
opt: Group purchasing organisation price files ; Supplier price-list updates
proto: ERP and contract-repository extracts, EDI 810 invoices where used, a deterministic price engine and a dispute worklist
own: Accounts payable ; Procurement ; Contract management ; Finance
con: A deterministic calculation gives the expected price and anomaly prioritisation only ranks the residual ; Finance validates every recovery and dispute and the system does not claim a recovery ; Units, tiers, rebates, freight and tax are modelled explicitly ; Contract versions are effective-dated ; Item matching uses catalogue identifiers first ; Evaluates 2M invoice records nightly
sn: Expected price | Deterministic computation from the contract schedule | A model estimate of the price | The expected price is defined by contract not learned
sn: Components | Unit conversion, tier, rebate, freight and tax modelled | Headline price compare | Most differences are legitimate components
sn: Reason | Variance explained by cause | Raw difference | Finance disputes need a cause
sn: Recoverability | Estimated recoverable amount with dispute rules | Total variance | Not all variance is recoverable
sn: Matching | Identifier-first item crosswalk | Description similarity | Wrong matches create false claims
sig: Contract price at invoice date | effective-dated scheduled price for the item and tier | The expected price | Version at invoice date
sig: Tier and rebate position | cumulative volume against tier thresholds and rebates earned | Explains legitimate differences | Cumulative at invoice date
sig: Freight and tax adjustments | computed components | Separates add-ons from price | Rules
sig: Variance persistence | repeated variance on the item over time | Systematic errors differ from one-offs | Past invoices
noise: Invoice layout | style
noise: Buyer identity | not a cause
noise: Supplier sales representative | personal
base: Spreadsheet comparison of invoice prices against the contract price list.
prod: An effective-dated price engine that computes the expected invoiced price with units, tiers, rebates, freight and tax, an item crosswalk with identifier-first matching, a variance-cause classifier and an anomaly ranker for residual cases.
pipe: Invoice and contract intake @ ERP and contract extracts ; Item crosswalk matcher @ identifier-first rules ; Expected price engine @ deterministic calculator ; Variance cause classifier @ gradient boosting ; Residual anomaly ranker @ isolation forest ; Finance validation @ human ; Dispute outcome and audit @ case workflow
edge: Contract price schedule revised | past invoices look wrong | Effective-dated versions
edge: Supplier credit memo | variance is already corrected | Credit-memo reconciliation before flagging
edge: Mixed units on one invoice | unit confusion makes a normal price look like a variance | Unit conversion with checks
edge: Disputed contract term | expected price is uncertain | Owner decision stored as a rule
off: Variance-detection precision and recall on audited invoices ; Recoverable-amount error against realised recoveries ; Cause-classification accuracy
on: Recovered amount ; Time to dispute resolution ; Share of variance explained automatically
gap: Treating all variance as recoverable ; Ignoring credit memos ; Using description similarity to match items
== healthcare-spend-category-optimization | Healthcare Spend Category Optimization | reinforcement-learning,tabular | batch | advanced | a=0.1 k=3
obj: Identify category-level savings opportunities while accounting for clinical equivalence, quality, availability, standardisation and switching costs, and present ranges with trade-offs for value analysis and procurement leadership.
sor: Procurement and accounts-payable system ; Item and service taxonomy ; Supplier contract repository ; Clinical value analysis records
up: Spend history ; Item and service taxonomy ; Supplier contracts ; Clinical approvals ; Utilisation, quality and budget data
down: Category strategy review ; Sourcing event plan ; Value analysis submission ; Savings tracker
opt: Benchmark price data under licence ; Group purchasing organisation catalogues
proto: Warehouse extracts and a taxonomy service with a scenario API; savings hypotheses move through value analysis before any switch
own: Strategic sourcing ; Supply chain finance ; Clinical value analysis ; Materials management
con: Clinical value analysis approves substitutions and standardisation and the model only proposes hypotheses ; Clinical equivalence and availability are hard constraints ; Savings are ranges with stated confidence and not commitments ; Switching and implementation costs are included ; Uses only licensed benchmark data ; Covers 60K item groups across 250 categories
loss: \max\;\sum_g x_g\,(\text{saving}_g-\text{switch cost}_g)\quad\text{s.t. clinical equivalence, supply and capacity limits}
sn: Equivalence | Clinically approved equivalence as a hard gate | Similarity of descriptions | Similar words do not mean clinical equivalence
sn: Savings | Range net of switching cost and risk | Gross price difference | The cheapest item may not be usable
sn: Segmentation | Spend segmentation by category, volume and variability | One list of items | Different segments need different strategies
sn: Adoption | Utilisation and physician preference considered | Price only | Savings that clinicians reject are not savings
sn: Evidence | Confidence ranking of hypotheses | Single estimate | Leaders need to compare certainty
sig: Price dispersion | spread of unit price for equivalent items across facilities | A savings signal | After normalisation
sig: Volume concentration | share of spend in few suppliers | Leverage and risk | Spend as at period end
sig: Standardisation gap | number of equivalent items used in a category | Complexity and cost | Clinical approvals
sig: Switching feasibility | clinical, contractual and inventory barriers | Realisable savings | Contract and approval status
noise: Price list discounts not applied in practice | inflates savings
noise: Brand preference alone | not clinical
noise: Supplier relationship tenure | not a savings driver
base: Annual top-spend category review with manual price comparison.
prod: Spend segmentation and clustering with price benchmarking, a constrained optimiser for category allocation that treats clinical equivalence and supply limits as hard constraints and reports savings ranges net of switching cost.
pipe: Spend and taxonomy intake @ warehouse extracts ; Spend segmentation @ clustering and taxonomy rules ; Price benchmarking @ normalised unit prices ; Category allocation optimizer @ mixed-integer program ; Clinical equivalence and supply rules @ approved equivalence table ; Value analysis review @ human ; Savings tracking and audit @ lakehouse
edge: Taxonomy errors | items land in the wrong category | Taxonomy validation and a review loop
edge: Shortage of the preferred product | the plan is infeasible | Re-run with supply constraints
edge: Clinical approval revoked | savings disappear | Approval status as a live constraint
edge: Contract lock-in | no switch is possible | Contract term in the constraints
off: Savings realised versus predicted savings range ; Constraint violations in proposed plans ; Hypothesis hit rate
on: Realised savings net of switching cost ; Standardisation rate ; Clinician acceptance of proposals
gap: Counting gross savings ; Treating description similarity as equivalence ; Ignoring supply risk
== healthcare-purchase-demand-consolidation-optimization | Healthcare Purchase Demand Consolidation Optimization | reinforcement-learning,tabular | batch | advanced | a=0.2 k=3
obj: Aggregate compatible demand across facilities to improve contract leverage, reduce fragmented orders and optimise replenishment while keeping safety stock for critical supplies.
sor: Inventory and materials management system ; Procurement system ; Contract repository ; Demand forecasting service
up: Forecast demand by item and facility ; Inventory levels ; Supplier minimums and lead times ; Storage limits ; Contract terms and volume tiers
down: Buyer approval worklist ; Consolidated purchase orders ; Logistics and delivery plan ; Savings tracker
opt: Supplier capacity signals ; Transport cost tables
proto: Forecast and inventory extracts, a solver service with a REST API and EDI or portal order submission after buyer approval
own: Materials management ; Procurement ; Supply chain logistics ; Finance
con: Buyers approve orders and critical supplies keep safety-stock constraints ; Hard constraints cover supplier minimums, lead times, shelf life, storage and contract terms ; The plan explains each constraint that binds ; Solver status, gap and fallback are reported ; Plans 90K item-facility pairs weekly ; Multi-echelon inventory logic covers central and local stores
loss: \min\;\sum_i \text{holding cost}_i+\text{order cost}_i+\text{stockout penalty}_i-\text{tier saving}_i
sn: Objective | Total cost with tier savings, holding, ordering and stockout | Unit price alone | Cheap bulk buys create expiry and holding cost
sn: Safety | Safety stock for critical items as hard constraints | Cost-minimal stock | A stockout of a critical supply harms patients
sn: Network | Multi-echelon view across central and local stores | Facility-by-facility planning | Local optima fragment demand
sn: Contract | Tier thresholds and minimums as constraints | Ignoring contract structure | Missing a tier forfeits savings
sn: Forecast | Forecast uncertainty reflected in safety stock | Point forecast | Demand uncertainty drives buffer needs
sig: Forecast demand with uncertainty | expected demand and variance per item and facility | The basis of the plan | Forecast snapshot at planning time
sig: Tier proximity | distance to the next price tier | Value of consolidation | Contract terms
sig: Lead-time variability | variance of supplier lead time | Sets buffer | Receipts history
sig: Expiry risk | shelf life remaining against forecast consumption | Prevents waste | Lot data as at planning
noise: Buyer preference for a supplier | habit
noise: Facility size alone | not demand
noise: Past order timing | reflects past fragmentation
base: Each facility orders independently by reorder point.
prod: A multi-echelon inventory and mixed-integer optimiser that consolidates forecast demand into supplier-level orders under minimum quantities, lead times, shelf life, storage and safety-stock constraints, with an explainer for binding constraints.
pipe: Forecast and inventory intake @ planning extracts ; Constraint builder @ contract and supply rules ; Consolidation optimizer @ MILP solver ; Savings and risk evaluator @ cost model ; Buyer approval @ human ; Order release @ ERP ; Outcome and audit log @ lakehouse
edge: Supplier minimum cannot be met | no feasible consolidation | Relax only soft costs and show the binding minimum
edge: Demand surge | safety stock is too low | Re-plan with updated forecast
edge: Item recall | stock must be removed | Recall event updates inventory and constraints
edge: Late delivery | planned stock is not available | Lead-time variability and an expedite option
off: Total cost versus the best plan in hindsight ; Stockout rate for critical items ; Solver gap and time to feasible
on: Tier savings achieved ; Order count reduction ; Critical-item service level
gap: Optimising price while ignoring holding cost ; Dropping safety stock to hit a tier ; Planning from a point forecast
== healthcare-vendor-substitution-recommendation | Healthcare Vendor Substitution Recommendation | recommender,tabular | batch | advanced | a=0.1 k=3
obj: Recommend alternative suppliers or items when supply, price, quality or contract risk requires substitution, ranking only options that clinical and biomedical teams have approved as equivalent.
sor: Item master and clinical equivalence register ; Procurement system ; Supplier performance records ; Recall and alert feeds
up: Item equivalence and clinical approval status ; Supplier performance, price and availability ; Lead times ; Contract terms ; Recall data
down: Buyer substitution worklist ; Clinical and biomedical approval request ; Materials management alert ; Contract and supplier notification
opt: Supplier catalogue feeds ; Group purchasing organisation alternatives
proto: Item and supplier extracts, a recommendation API with approval status and a clinical approval workflow
own: Materials management ; Clinical value analysis ; Biomedical engineering ; Procurement
con: Clinical equivalence is a hard gate from the approved register and never a learned similarity score ; Substitution needs clinical, biomedical and procurement approval before use ; Rankings show evidence and the approval status of each option ; Recall data triggers urgent re-ranking ; Serves a worklist for 30K item shortages per year ; Substitution never changes what a clinician orders without approval
loss: \mathcal{L}=-\sum_{(i,j)}\log\frac{e^{s(i,j)/\tau}}{\sum_{k}e^{s(i,k)/\tau}}
sn: Equivalence | Approved equivalence register | Embedding similarity | Similar descriptions can be clinically different
sn: Hard gate | Only approved candidates are ranked | Ranked list of everything similar | Unapproved items cannot be used
sn: Trade-offs | Price, availability, lead time and risk shown | One score | Buyers weigh them differently by urgency
sn: Approval | Request for clinical sign-off | Auto-substitute | A wrong substitution can harm patients
sn: Learning | Learn ranking among approved options from accepted decisions | Learn equivalence from history | History contains unapproved emergency swaps
sig: Approved-equivalence status | status in the clinical equivalence register | Gate for eligibility | Register version
sig: Supply risk of the alternative | availability and lead time of the candidate | Practical feasibility | Latest feed
sig: Price delta | candidate price relative to current price after tier and contract | Cost impact | Contract status
sig: Supplier reliability | performance score of the candidate supplier | Delivery risk | Earlier periods
noise: Brand popularity | not equivalence
noise: Catalogue description text | marketing
noise: Rep recommendation | commercial interest
base: A buyer searches the catalogue manually for alternatives.
prod: A two-stage recommender: a hard filter from the clinical equivalence register, then a learning-to-rank model over price, availability, lead time, performance and contract fit, with approval-status labels and evidence for each option.
pipe: Shortage or risk event intake @ inventory and recall feeds ; Equivalence filter @ approved register rules ; Candidate retriever @ item and supplier index ; Substitution ranker @ gradient-boosted ranking ; Evidence and approval status builder @ rules ; Clinical and procurement approval @ human ; Decision and outcome log @ lakehouse
edge: No approved alternative | the list is empty | Escalate to value analysis with a request for evaluation
edge: Register out of date | an item is wrongly approved | Register freshness checks and an owner review cycle
edge: Recall of the alternative | a ranked option is unsafe | Recall feed removes candidates immediately
edge: Contract conflict | the alternative violates exclusivity | Contract constraint in the filter
off: NDCG@3 against approved substitution decisions ; Share of recommended items that are approved-equivalent ; Hit rate of the accepted option in the top three
on: Time to resolve a shortage ; Substitution acceptance rate ; Cost impact of substitutions
gap: Using embedding similarity for equivalence ; Training on emergency swaps ; Recommending unapproved items
== healthcare-value-analysis-committee-decision-intelligence | Healthcare Value Analysis Committee Decision Intelligence | llm-agents,nlp | seconds | advanced | a=0.02 k=200 s=3 t=500
obj: Prepare evidence-based review packets that compare products and services on clinical outcomes, safety, total cost, utilisation, implementation and alternatives, with source citations, uncertainty and conflict-of-interest disclosures.
sor: Value analysis request system ; Evidence and literature repository ; Procurement and spend system ; Clinical outcomes and utilisation data
up: Product evidence and clinical studies ; Internal utilisation, outcomes and spend ; Contracts and recall data ; Approved clinical guidelines ; Committee criteria and prior decisions
down: Committee packet and meeting workspace ; Decision record draft ; Evidence gap request ; Procurement and clinical follow-up tasks
opt: Health technology assessment publications ; Vendor-submitted dossiers marked as such
proto: Retrieval over approved evidence collections with a REST service, structured analytics from the warehouse and a packet generator with citation checks
own: Clinical value analysis ; Supply chain ; Clinical leadership ; Compliance
con: Committee members decide and generated summaries must cite sources and disclose evidence gaps ; Vendor-supplied evidence is labelled and weighed separately ; Evidence is graded by an explicit scheme ; Conflict-of-interest disclosures are included ; The system abstains where evidence is absent ; Documents are untrusted input
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{evidence})+\lambda\,\mathrm{Calibration}
sn: Evidence | Graded evidence with study type and risk of bias | A fluent summary | A committee must see the quality of each source
sn: Vendor material | Labelled as vendor-supplied | Mixed with independent evidence | Commercial evidence carries bias
sn: Comparison | Matrix on agreed criteria | Narrative only | Members need side-by-side comparison
sn: Uncertainty | Evidence gaps and conflicts disclosed | Single recommendation | False confidence misleads a committee
sn: Decision | Members decide and the system drafts | Recommendation as decision | Accountability stays with the committee
sig: Evidence grade | study design and risk-of-bias grade per source | Weights the claims | Grading scheme version
sig: Internal utilisation and cost | actual use and total cost of ownership | Local relevance | Period as stated
sig: Citation coverage | share of statements with a supporting source span | Faithfulness | Checked against retrieved text
sig: Conflict flags | disclosed interests of authors and sponsors | Bias awareness | Disclosure data
noise: Journal prestige alone | not study quality
noise: Number of citations | popularity
noise: Vendor presentation length | marketing
base: A coordinator assembles a packet from vendor dossiers and a literature search.
prod: Hybrid retrieval over approved evidence with an evidence-grading rubric, structured internal analytics, multi-criteria comparison and an LLM that drafts the packet strictly from retrieved passages with citations, labelling vendor material and stating gaps.
pipe: Request and evidence intake @ approved repositories ; Hybrid retriever @ vector and keyword index ; Evidence grading @ rubric rules ; Internal analytics builder @ warehouse queries ; Packet drafter with citations @ LLM ; Citation and policy guard @ citation verifier ; Committee review @ human ; Decision record and audit @ case repository
edge: Evidence is mostly vendor-supplied | bias is high and the packet reads as independent | Label it and request independent evidence
edge: Conflicting studies | the summary hides it | Show conflict and uncertainty
edge: New safety notice | the packet is stale | Alert feed and a refresh
edge: Injected instruction in a dossier | model behaviour changes | Treat as data and no tool calls
off: Citation precision and unsupported-claim rate ; Evidence-grade agreement with expert reviewers ; Gap-detection recall
on: Committee preparation time ; Decisions deferred for missing evidence ; Post-decision realised value versus the packet estimate
gap: Judging fluency over citations ; Mixing vendor and independent evidence ; Letting the system recommend a decision
== healthcare-contract-clause-risk-classification | Healthcare Contract Clause Risk Classification | nlp,tabular | batch | advanced | a=0.1 k=200
obj: Identify clauses that deviate from approved playbooks or create legal, financial, privacy, security, operational or clinical-continuity risk, and rank them for counsel review with source spans and the deviation from the fallback language.
sor: Contract management system ; Clause library and legal playbook ; Document repository ; Contract metadata
up: Agreements and amendments ; Clause library and approved fallback language ; Contract metadata ; Jurisdiction ; Policy version
down: Legal reviewer queue ; Playbook deviation report ; Negotiation brief input ; Risk register
opt: Prior negotiated outcomes ; Data protection assessment records
proto: Document parsing into clause segments, a classifier service over REST and a reviewer workbench; results are never written into a contract
own: Legal ; Procurement ; Privacy and security ; Compliance
con: Legal counsel makes legal determinations and approves changes and the classifier only flags and ranks ; Every flag cites the clause span and the playbook position ; Deterministic policy checks run beside the model ; Classification is by risk type with confidence ; Jurisdiction and policy version are inputs ; Processes 20K agreements in a one-off and 800 new agreements per month
sn: Playbook | Deviation from approved language | Free-form risk opinion | Counsel needs the rule and the fallback
sn: Source | Clause span with section references | Summary only | A flag without a source cannot be reviewed
sn: Risk type | Separate legal, financial, privacy and continuity types | One risk label | Different owners handle different risks
sn: Determination | Counsel decides | Model verdict | Legal advice cannot be automated
sn: Context | Contract type and jurisdiction | Clause in isolation | The same clause is acceptable in one context and not another
sig: Playbook deviation score | semantic and structural distance from approved clause language | Primary risk signal | Playbook version
sig: Clause type and obligation direction | classified clause family and who carries the obligation | Risk depends on who bears it | Parsed text
sig: Liability and indemnity terms | caps, exclusions and indemnity scope as extracted values | Financial exposure | Extracted with provenance
sig: Data-handling terms | data location, breach notice and subprocessor rights | Privacy and security risk | Extracted with provenance
noise: Contract length | not risk
noise: Counterparty brand | not clause risk
noise: Formatting and numbering style | layout
base: A keyword search for liability and indemnity clauses.
prod: Document parsing into clauses, a fine-tuned transformer classifier and a retrieval comparison against playbook language, combined with deterministic checks on extracted values such as caps and notice periods, and a ranked reviewer queue.
pipe: Document intake and parsing @ OCR and clause segmentation ; Clause classifier @ transformer ; Playbook comparator @ embedding search ; Policy checks on extracted values @ deterministic rules ; Risk ranker @ gradient boosting ; Legal counsel review @ human ; Reviewer feedback and audit @ lakehouse
edge: Scanned contract with poor text | clauses are mis-segmented | OCR confidence gate and a manual route
edge: Amended clause | the amendment supersedes the base | Document set assembled with effective dates
edge: Unusual jurisdiction | playbook does not apply | Jurisdiction flag and escalation
edge: Rare clause type | classifier is uncertain | Abstain and route
off: Macro-F1 by clause type and risk type ; Deviation-detection recall at the reviewer capacity ; Span-level agreement with counsel
on: Counsel review time per agreement ; High-risk clauses found before signature ; Playbook adherence
gap: Splitting by clause not by contract ; Training on negotiated final text only ; Treating the model as legal advice
== healthcare-contract-obligation-deadline-intelligence | Healthcare Contract Obligation & Deadline Intelligence | llm-agents,nlp | seconds | advanced | a=0.02 k=150 s=4 t=400
obj: Extract obligations, owners, milestones, notice periods, service levels, renewal windows, penalties and dependencies from agreements into a cited obligation register, and draft follow-up tasks for owners to confirm.
sor: Contract management system ; Obligation and task management system ; Organisation and team directory ; Calendar service
up: Executed contracts, amendments and schedules ; Obligation taxonomy ; Organisation and team directory ; Calendar rules
down: Obligation register ; Owner task assignment after confirmation ; Due-date calendar ; Evidence requirement checklist
opt: Supplier portal notices ; Service-level monitoring feeds
proto: Document extraction with citations, a typed agent over a task API with approval gates and calendar integration using standard calendar protocols
own: Contract management ; Legal ; Procurement ; Operations owners
con: The contract owner confirms obligations and assignments before workflow activation ; Every obligation cites its clause and page ; Dates use deterministic calendar rules for notice and renewal windows ; The agent only drafts tasks and never changes a contract or sends notices ; Tool permissions are least privilege ; Documents are untrusted input
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{clause})+\lambda\,\mathrm{PolicyViolation}
sn: Extraction | Structured obligation with clause citation | Free-text summary | Operations needs owner, date and evidence
sn: Dates | Deterministic notice and renewal calculation | Model arithmetic on dates | A wrong date can lose a renewal right
sn: Ownership | Suggested owner for confirmation | Auto-assigned task | Owners must accept responsibility
sn: Dependencies | Obligations with prerequisites | Flat list | Many obligations depend on earlier milestones
sn: Authority | Draft only | Send notices | A notice has legal effect
sig: Obligation extraction confidence | calibrated confidence for each field | Routes review | Held-out contract groups
sig: Notice window | computed latest action date for the clause | Prevents missed rights | Rule-computed
sig: Owner suggestion match | similarity of obligation to a team's responsibilities in the directory | Speeds routing | Directory as at assignment
sig: Penalty exposure | stated penalties and caps for the obligation | Prioritisation | Extracted with provenance
noise: Contract title | not obligation content
noise: Counterparty size | not an obligation property
noise: Paragraph position | layout
base: A spreadsheet of key dates kept by the contract manager.
prod: Layout-aware clause extraction into an obligation schema with citations, deterministic date and notice calculators, an LLM agent that drafts tasks and owner suggestions through typed tools and a confirmation workflow that blocks activation until the owner approves.
pipe: Contract intake and parsing @ OCR and clause segmentation ; Obligation extractor @ LLM with schema and citations ; Date and notice calculator @ deterministic calendar rules ; Task drafting agent @ typed task tools ; Permission and policy guard @ tool allow-list ; Contract owner confirmation @ human ; Obligation register and audit @ task system
edge: Ambiguous deadline wording | multiple readings | Show both and route to the owner
edge: Amendment changes an obligation | register is stale | Amendment linkage by contract identifier and a re-extraction
edge: Owner left the organisation | the task is orphaned | Directory sync and a fallback owner
edge: Injected instruction in a contract | agent attempts an action | Allow-listed tools and content isolation
off: Field-level F1 for obligations and dates with citation accuracy ; Task-proposal acceptance rate ; Missed-deadline rate on audited contracts
on: Obligations with a confirmed owner ; Notice windows met ; Contract manager time per contract
gap: Letting the model compute dates ; Auto-activating tasks ; Scoring extraction without checking citations
== healthcare-contract-renewal-termination-risk-prediction | Healthcare Contract Renewal & Termination Risk Prediction | tabular,time-series | batch | advanced | a=0.1 k=2
obj: Prioritise upcoming renewals and termination windows by value, performance, risk, utilisation and lead time, so owners start review early enough to renegotiate, renew or exit deliberately.
sor: Contract management system ; Procurement and spend system ; Supplier performance records ; Obligation register
up: Contract dates, notice terms and value ; Spend and utilisation ; Performance and disputes ; Obligation status ; Service criticality
down: Renewal review calendar ; Owner reminders ; Executive renewal dashboard ; Negotiation preparation task
opt: Market price indices ; Alternative supplier availability
proto: Governed extracts from contract and spend systems, a rule-based notice calendar and a scoring API with a renewals worklist
own: Procurement ; Contract management ; Legal ; Finance
con: Notice dates are deterministic and the model only prioritises review ; Legal and procurement owners decide renewal, renegotiation or termination ; Outputs show decision deadline, evidence gaps and recommended start date ; Scores 25K contracts weekly ; No supplier action is triggered by a score ; Contract values and terms come from verified records
sn: Deadline | Notice window computed by rule | Predicted deadline | The notice date is a fact in the contract
sn: Priority | Value, risk and lead time combined | Renewal date only | A small contract with a short notice can be more urgent than a large one
sn: Outcome | Renewed, renegotiated or exited with censoring | Binary renewal | Many contracts are still open
sn: Evidence | Performance and dispute evidence shown | Score only | Owners need reasons
sn: Timing | Recommended start date for review | Alert at the deadline | A late alert leaves no time to negotiate
sig: Days to notice deadline minus review lead time | remaining time before the latest action date less the usual review cycle | The urgency measure | Rule-computed
sig: Spend and criticality | annual value and clinical or operational criticality | Weights the decision | Verified records
sig: Performance and dispute history | service-level misses and open disputes | Evidence for renegotiation | Earlier periods
sig: Alternative availability | qualified alternative suppliers | Negotiation leverage | Qualification tables
noise: Contract title text | not risk
noise: Account manager identity | not a driver
noise: Signing date | explained by dates
base: A report of contracts expiring in the next 180 days.
prod: A rule-based notice calendar with a discrete-time survival and gradient-boosted model that scores the urgency and likelihood of a contentious or at-risk renewal, with evidence gap detection and a recommended start date.
pipe: Contract and spend intake @ contract extracts ; Notice calendar rules @ deterministic date rules ; Renewal risk model @ discrete-time survival ; Evidence gap builder @ obligation and performance data ; Review scheduler @ capacity-aware ranking ; Owner review @ human ; Decision outcome and audit @ lakehouse
edge: Auto-renewal clause | the contract renews silently | Auto-renewal flag with an earlier alert
edge: Contract merged or novated | the owner changes | Contract lineage table
edge: Amendment extends the term | dates are stale | Effective-dated amendments
edge: Mass expiry date | the queue floods | Capacity-aware ranking and early starts
off: Concordance index and time-dependent AUC for at-risk renewals at 90 and 180 days ; Notice-date rule accuracy ; Precision at the review capacity
on: Renewals reviewed before notice deadline ; Savings from renegotiation ; Contracts renewed by default
gap: Predicting dates that the contract states ; Treating open contracts as renewed ; Alerting only at the deadline
== healthcare-contract-compliance-monitoring | Healthcare Contract Compliance Monitoring | llm-agents,tabular | batch | advanced | a=0.1 k=40 s=3 t=300
obj: Monitor operational and commercial evidence against contractual obligations and service levels, so owners see breach risks and remediation tasks early and no formal breach notice is sent without their decision.
sor: Contract management system ; Obligation register ; Service and transaction systems ; Invoice and payment system
up: Contract obligation register ; Service and transaction data ; Invoices ; Service-level events ; Audit evidence and amendments
down: Compliance status dashboard ; Breach-risk alerts to owners ; Remediation task queue ; Evidence pack for disputes
opt: Supplier performance portals ; Audit findings
proto: Event and batch processing from operational systems, a rules engine over the obligation register and an agent that drafts evidence summaries with citations
own: Contract management ; Operations owners ; Procurement ; Legal
con: Rules and event processing determine compliance status and LLM interpretation is advisory and grounded ; The contract owner validates exceptions and any formal breach notice ; Evidence links point to source records ; Agent permissions are read-only plus draft tasks ; Documents are untrusted input ; Evaluates 5M service and invoice events per day
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{evidence})+\lambda\,\mathrm{PolicyViolation}
sn: Status | Rule-based compliance against structured obligations | Model judgement of breach | Breach is a legal conclusion
sn: Evidence | Linked transaction or service records | Narrative | Owners need the source to dispute
sn: Timing | Breach risk before a deadline passes | Alert after the breach | Early notice allows remediation
sn: Interpretation | LLM explains an ambiguous clause with citations as advice | LLM decides applicability | Interpretation belongs to the owner
sn: Notices | Owner approves any formal notice | Agent sends notice | A notice has legal effect
sig: Service-level attainment | measured performance against SLA targets in the period | The primary compliance measure | Period closed
sig: Obligation due-date proximity | days to due date for open obligations | Breach risk | Rule-computed
sig: Invoice-to-term consistency | invoiced items and rates against terms | Commercial compliance | Contract version
sig: Evidence freshness | age of the latest evidence for the obligation | Missing evidence is a risk | At scoring
noise: Supplier correspondence tone | opinion
noise: Contract title | not compliance
noise: Owner seniority | not a compliance factor
base: Quarterly manual review of service reports against the contract.
prod: A rules and event-processing engine over the obligation register with service-level and commercial checks, a grounded LLM that drafts evidence summaries and interpretation notes with citations and a task workflow that stops at owner approval.
pipe: Service and invoice event intake @ event stream ; Obligation rule engine @ versioned rules ; Evidence linker @ source record index ; Compliance status scorer @ rules with gradient boosting ; Evidence summary agent @ LLM with citations ; Contract owner review @ human ; Remediation task and audit log @ task system
edge: Service data is delayed | breach risk is overstated | Data freshness flag and a pending status
edge: Amendment changes an SLA | wrong target applied | Effective-dated obligations
edge: Supplier disputes data | evidence is contested | Evidence pack and audit trail
edge: Credit regime for service failure | breach differs from penalty | Obligation types separate breach from credit
off: Rule accuracy against audited compliance decisions ; Breach-risk precision and lead time ; Citation precision in evidence summaries
on: Breaches caught before notice deadlines ; Service credits recovered ; Owner time per review
gap: Letting the model decide breach ; Applying the wrong contract version ; Alerting after the deadline
== healthcare-contract-negotiation-intelligence | Healthcare Contract Negotiation Intelligence | llm-agents,nlp | seconds | advanced | a=0.01 k=250 s=4 t=600
obj: Prepare negotiation briefs using historical terms, approved playbooks, performance, spend, risk and alternative suppliers, giving negotiators evidence-based priorities, fallback positions and draft talking points.
sor: Contract management system ; Clause library and playbook ; Procurement and spend system ; Supplier performance records
up: Contract portfolio and clause library ; Approved benchmarks ; Supplier performance and spend ; Negotiation outcomes ; Risk and alternative-supplier data
down: Negotiation brief ; Priority and fallback matrix ; Scenario comparison ; Approval request for strategy
opt: Licensed market benchmark data ; Prior negotiation notes
proto: Retrieval over contract and benchmark collections, structured analytics from the warehouse and a brief generator with citation checks
own: Procurement ; Legal ; Contract management ; Finance
con: Negotiators and legal approve strategy ; The system never fabricates market benchmarks and cites each figure to an approved source ; Scenario analysis states its assumptions ; Benchmarks are used only under licence and with comparability noted ; Documents are untrusted input ; Draft talking points are labelled as drafts
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{brief inputs})+\lambda\,\mathrm{Calibration}
sn: Benchmarks | Approved benchmark with comparability notes | Invented market rate | A fabricated benchmark destroys credibility
sn: Positions | Fallbacks from the approved playbook | Free-form positions | Negotiators need approved ground
sn: Evidence | Performance and spend evidence per issue | General arguments | Leverage depends on facts
sn: Scenarios | Trade-offs with assumptions stated | One recommendation | Negotiation has many acceptable endpoints
sn: Authority | Approved strategy | Autonomous concessions | Concessions need approval
sig: Leverage indicators | spend share, alternatives and switching cost | Determines bargaining strength | Latest verified data
sig: Performance record | service level misses and incidents | Supports claims | Verified records
sig: Term deviation from portfolio norms | how far current terms differ from similar contracts | Shows where to push | Normalised terms
sig: Benchmark comparability | match of benchmark scope to the contract | Prevents false comparisons | Source metadata
noise: Negotiator seniority | not leverage
noise: Supplier public statements | not evidence
noise: Brief length | not value
base: Negotiators assemble briefs from past contracts and personal notes.
prod: Hybrid retrieval over contract, playbook and benchmark collections, structured analytics for leverage and performance, a scenario engine for trade-offs and an LLM that drafts the brief with citations and refuses to produce unsourced benchmarks.
pipe: Portfolio and benchmark intake @ contract and warehouse extracts ; Hybrid retriever @ vector and keyword index ; Leverage and performance analytics @ warehouse queries ; Scenario engine @ trade-off simulator ; Brief drafter with citations @ LLM ; Citation and benchmark guard @ citation verifier ; Negotiator and legal review @ human ; Outcome capture and audit @ contract system
edge: No approved benchmark exists | the brief wants a number | Say so and recommend a data request
edge: Supplier changes terms mid-negotiation | the brief is stale | Version and refresh
edge: Conflicting playbook versions | positions differ | Effective-dated playbook
edge: Injected instruction in a supplier document | model behaviour changes | Content isolation
off: Citation precision and unsupported-benchmark rate ; Brief usefulness rating by negotiators ; Fallback-position accuracy against the playbook
on: Negotiation preparation time ; Savings achieved versus brief targets ; Share of briefs with every figure cited
gap: Accepting fluent benchmarks without a source ; Using stale playbooks ; Recommending concessions
== healthcare-contract-price-terms-benchmarking | Healthcare Contract Price & Terms Benchmarking | tabular,nlp | batch | advanced | a=0.1 k=3
obj: Compare contract pricing and terms across the organisation's portfolio and approved benchmark datasets, building comparable cohorts so reviewers see normalised variance and unfavourable terms with stated confidence.
sor: Contract management system ; Item and service taxonomy ; Procurement and spend system ; Approved benchmark data store
up: Normalised agreements and clause values ; Item and service taxonomy ; Geography and volume tiers ; Term, payment and liability terms ; Approved benchmark sources
down: Benchmark report for reviewers ; Unfavourable-term flags ; Negotiation brief input ; Portfolio dashboard
opt: Licensed external benchmark datasets ; Group purchasing organisation price files
proto: Clause extraction into a normalised term store, warehouse analytics and a benchmark API; external data is used under licence only
own: Procurement ; Legal ; Finance ; Contract management
con: Legal and procurement validate comparability and the right to use each benchmark source ; Comparisons show cohort definition, sample size and confidence ; Prices are normalised for unit, tier, geography and term ; Extracted terms keep clause provenance ; Runs on 60K contracts quarterly ; No benchmark is shown without its source and licence
sn: Cohort | Comparable items, tier, geography and term | All contracts for the item | Mismatched cohorts mislead
sn: Normalisation | Unit and term normalised before comparison | Raw price | Differing units look like price gaps
sn: Terms | Clause values compared where comparable | Price only | Payment and liability terms drive value
sn: Confidence | Sample size and dispersion shown | Single median | Thin cohorts give false precision
sn: Rights | Licensed sources with rights recorded | Unlicensed data | Misuse creates legal exposure
sig: Normalised price percentile | position of the price within the comparable cohort | The main benchmark | Cohort at the contract date
sig: Term favourability | score of payment, liability and termination terms against the cohort | Value beyond price | Extracted with provenance
sig: Cohort size and dispersion | number of comparables and spread | Sets confidence | At analysis time
sig: Volume-tier alignment | tier thresholds relative to actual volume | Explains price differences | Spend data
noise: Supplier prestige | not a benchmark
noise: Contract negotiation date alone | confounds with market trends
noise: Account manager | personal
base: Manual comparison against the group purchasing organisation price file.
prod: Clause and price extraction into a normalised term store, cohort construction by item, tier, geography and term, statistical benchmarking with robust percentiles and intervals, and a flag layer for unfavourable terms with source and licence records.
pipe: Contract and benchmark intake @ extracts and licensed files ; Term extractor and normaliser @ document AI and unit rules ; Cohort builder @ taxonomy and tier rules ; Benchmark model @ robust regression with quantiles ; Unfavourable-term flagger @ rules ; Legal and procurement review @ human ; Report and audit log @ lakehouse
edge: Few comparables | the benchmark is unreliable | Minimum cohort size and a low-confidence label
edge: Bundled contracts | prices are not separable | Bundle decomposition rules or an exclusion
edge: Benchmark licence expires | data cannot be shown | Licence register and automatic suppression
edge: Currency and inflation | historical prices are not comparable | Normalisation indices
off: Median absolute error of normalised price against held-out contracts ; Cohort comparability rating by reviewers ; Interval coverage
on: Savings found from benchmark gaps ; Share of reviews using the benchmark ; Unfavourable terms renegotiated
gap: Comparing unnormalised units ; Using unlicensed benchmark data ; Reporting medians from tiny cohorts
== healthcare-contract-redlining-copilot | Healthcare Contract Redlining Copilot | llm-agents,nlp | seconds | staff-principal | a=0.02 k=200 s=4 t=600
obj: Suggest changes to contract clauses against approved legal playbooks and explain the rationale, the negotiation trade-offs and the unresolved legal questions, so counsel can review proposed redlines faster.
sor: Contract management system ; Clause playbook and fallback library ; Document editing system ; Approved redline history
up: Draft contract ; Clause playbook and fallback language ; Organisation policies ; Prior approved redlines ; Contract type and jurisdiction
down: Proposed redline in a document with tracked changes ; Rationale and source panel ; Unresolved-questions list ; Counsel approval workflow
opt: Negotiation history ; Matter management system
proto: Document add-in or API over tracked changes, retrieval over the playbook and a structured diff with citations; changes are proposals until a reviewer accepts them
own: Legal ; Procurement ; Compliance
con: Legal review and explicit approval are required for every proposed change ; Suggestions come only from approved playbook language and cite it ; No unsupported legal advice and unresolved questions are listed ; The copilot never sends a draft externally ; Documents are untrusted input ; Latency under 30 seconds for a clause suggestion
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{clause},\text{playbook})+\lambda\,\mathrm{PolicyViolation}
sn: Source | Replacement language drawn from approved playbook | Freshly invented clause text | Invented text has no legal approval
sn: Rationale | Cites the playbook rule and the deviation | Confident explanation | Counsel needs to verify the reason
sn: Authority | Proposal for counsel | Auto-accepted change | Each change needs approval
sn: Scope | Clause-level change with structured diff | Whole-document rewrite | Reviewers cannot audit a rewrite
sn: Limits | Unresolved questions listed | Pretended certainty | A hidden gap becomes a missed risk
sig: Playbook match | retrieved playbook clause and fallback levels for the issue | Grounds the redline | Playbook version
sig: Deviation severity | classified severity of the clause deviation | Prioritises the work | Classifier calibration
sig: Acceptance history | rate at which similar redlines were approved | Helps ranking | Past approved redlines
sig: Diff size | length of the proposed change | Reviewers prefer minimal edits | Computed from the diff
noise: Writing fluency | style
noise: Model confidence phrases | not calibrated
noise: Counterparty identity | not legal merit
base: Counsel edits clauses manually using a playbook document.
prod: Retrieval of the matching playbook clause and fallback ladder, an LLM that proposes minimal tracked changes with a rationale and citations, a structured-diff validator that blocks text not found in approved language and a counsel approval workflow.
pipe: Draft and playbook intake @ contract system ; Clause segmenter and classifier @ transformer ; Playbook retriever @ vector and keyword index ; Redline drafter @ LLM with structured diff ; Approved-language and policy guard @ diff validator ; Counsel review @ human ; Accepted and rejected redline log @ contract system
edge: No playbook clause exists | the model improvises | Abstain and escalate with a request for guidance
edge: Cross-references between clauses | a change breaks another clause | Dependency check and a warning
edge: Counterparty counter-redline | prior suggestions are stale | Version tracking and a new proposal
edge: Prompt injection in the draft | the model follows instructions hidden in the draft text | Tool-free generation and content isolation
off: Approved-language adherence of suggested text ; Counsel acceptance rate and edit distance after review ; Unsupported-legal-claim rate
on: Counsel review time per contract ; Playbook adherence in signed contracts ; Cycle time to signature
gap: Measuring fluency not approval ; Allowing invented clause text ; Skipping adversarial draft tests
== healthcare-contract-portfolio-risk-prioritization | Healthcare Contract Portfolio Risk Prioritization | tabular,graph | batch | advanced | a=0.1 k=3
obj: Rank agreements by combined legal, financial, compliance, supplier, operational-continuity and renewal exposure, so risk owners direct review and remediation to the contracts that matter most.
sor: Contract management system ; Supplier risk and performance records ; Obligation register ; Audit and incident records
up: Contract metadata and clauses ; Obligations and spend ; Supplier risk scores ; Incidents and audit findings ; Service criticality
down: Risk owner priority queue ; Exposure scenario report ; Remediation task tracker ; Executive risk summary
opt: External credit and sanctions data ; Insurance coverage records
proto: Warehouse extracts, a graph of contracts, suppliers, services and obligations and a scoring API with a prioritised worklist
own: Enterprise risk ; Legal ; Procurement ; Compliance
con: Risk owners set weights and approve escalations ; Scores are explainable by dimension with evidence ; Graph relationships show shared-supplier and dependency exposure ; Scenario analysis states its assumptions ; Scores 30K agreements weekly ; Weights and criteria are versioned
sn: Dimensions | Legal, financial, compliance, supplier, continuity and renewal exposure kept separate | One opaque score | Different owners act on different dimensions
sn: Dependencies | Shared-supplier and service dependency graph | Contract-by-contract view | Concentration risk is invisible in isolation
sn: Weights | Owner-set versioned weights | Hidden weights | Owners must own the trade-off
sn: Evidence | Evidence per dimension | Score only | Reviewers need the reason
sn: Scenarios | Exposure under supplier failure or term change | Static ranking | Leaders want to test what-ifs
sig: Dimension exposure scores | normalised exposure for each risk dimension from verified inputs | The core components | Input snapshots
sig: Dependency concentration | number of critical services depending on one supplier | Continuity risk | Graph at scoring time
sig: Open obligations and incidents | overdue obligations and recent incidents linked to the contract | Operational risk | Earlier periods
sig: Renewal proximity and value | time to renewal and annual value | Priority | Contract data
noise: Contract title | not risk
noise: Counterparty size alone | not exposure
noise: Owner seniority | not risk
base: Ranking by contract value and expiry date.
prod: A transparent weighted risk model over verified dimension inputs combined with graph relationships for shared-supplier and dependency exposure, a scenario engine for what-if exposure and an owner-set weight table, with an evidence panel per dimension.
pipe: Contract and risk intake @ warehouse extracts ; Dimension score builder @ normalised metrics ; Dependency graph builder @ graph store ; Portfolio risk scorer @ weighted scoring with gradient boosting ; Scenario engine @ what-if simulator ; Risk owner review @ human ; Decision and audit log @ lakehouse
edge: Missing data for a dimension | the score is understated | Show missing data and a lower-confidence label
edge: Supplier failure | multiple contracts are affected | Graph propagation in the scenario engine
edge: Weights contested | the ranking changes | Versioned weights and sensitivity view
edge: Contract split into many orders | exposure is fragmented | Contract family grouping
off: Precision at the review capacity for high-exposure agreements ; Rank stability under weight changes ; Calibration of risk tiers against realised incidents
on: High-exposure agreements reviewed ; Risk reduced after remediation ; Time from flag to action
gap: Hiding weights from owners ; Ignoring shared-supplier concentration ; Scoring contracts as independent
