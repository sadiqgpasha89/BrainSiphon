# Real Estate & PropTech, part 2 (use cases 26-50): commercial, construction, smart buildings, risk and transactions
== lease-abstraction-and-obligation-extraction | Lease Abstraction & Obligation Extraction | nlp,llm-agents | seconds | production-grade | a=0.02 k=900
obj: Read commercial leases and amendments and extract the dates, rents, options, break clauses and obligations into a structured abstract with page citations.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Every extracted field cites its page and clause so a lawyer can check it ; Critical dates and money fields are reviewed by a person before use ; Amendments are applied in date order to give the terms in force ; Leases stay inside the owner's tenancy and are never used to train shared models
sn: Amendments | The effective terms after every amendment and side letter is applied | The original lease read alone | The rent in force may be set by the third amendment, and the original shows a figure that stopped applying years ago
sn: Dates | Each date extracted with its trigger, such as notice of a break or a rent review | Any date that appears in the text | Missing a break notice date can cost a year of rent, and a date without its trigger is unusable
sn: Scope | Fields that drive money and risk, such as rent, term, options and obligations | Every clause in the lease | Wide extraction multiplies review effort and buries the few fields that matter
sig: Field confidence | calibrated probability that the extracted value is correct, per field type | Routes uncertain fields to a reviewer | Calibrate by field type, as dates and amounts behave differently
sig: Cross-document consistency | difference between the rent in the abstract and the rent in the rent roll | Mismatches expose extraction or rent roll errors | The rent roll itself contains errors, so treat a mismatch as a question and not a verdict
sig: Clause type classifier | predicted clause class for each paragraph, such as rent review, break option or repair | Gives structure for field extraction | Clause wording varies between firms and jurisdictions, so test per template
sig: Amendment ordering | date order and reference chain linking each amendment to what it changes | Determines which terms are current | Missing pages and undated amendments break the chain and must be flagged
noise: Law firm footer | Boilerplate that repeats on every page and is not part of any term
noise: Page numbers | Layout artefacts that are not content and cause false matches
noise: Defined-term capitalisation | A drafting style that varies by firm and does not change the meaning
base: Manual abstracting by paralegals, because it is accurate and slow.
prod: Layout-aware extraction with an LLM for clause understanding, amendment resolution, citations and a reviewer queue for critical fields.
pipe: Lease upload @ data room ; Document parser @ layout model ; Clause extractor @ LLM with schema ; Amendment resolver @ rules ; Validator @ cross-checks ; Reviewer queue @ workflow ; Lease database @ warehouse
edge: Scanned old leases | Scanned old leases have poor OCR and dates and rents are misread | Gate on scan quality, cross-check against the rent roll and send low-confidence fields to review
edge: Side letters | Terms are in a side letter that is not in the lease file | Flag references to unknown documents and ask for them
edge: Foreign-language lease | A lease in another language is mistranslated and a clause is misunderstood | Detect the language, use a multilingual model and require legal review for critical fields
off: Field accuracy ; Critical date recall
on: Abstract time per lease ; Missed critical dates
gap: Evaluation on clean, modern leases hides failures on the old scans that dominate real portfolios ; Template leakage when similar leases from one firm appear in both training and test

== commercial-occupancy-and-rent-roll-forecasting | Commercial Occupancy & Rent-Roll Forecasting | time-series,tabular | batch | production-grade | a=1 k=5
obj: Forecast occupancy and rental income by property from lease expiries, renewal behaviour and market demand.
loss: \mathcal{L}=\sum_t\mathrm{Pinball}(\hat{q}_{0.5},y_t)+\lambda\,\mathrm{Huber}(\hat{r}-r)
con: The forecast is built lease by lease and reconciles to the current rent roll ; Updated every quarter with a record of changes ; Downside, base and upside scenarios shown together ; Every property forecast traces to its lease and tenant assumptions
sn: Expiry | Lease expiries and break options as dated events | A smooth occupancy trend | Occupancy moves in steps at expiries, and a trend line smooths over the cliff
sn: Renewal | Tenant-level renewal probability based on that tenant | A portfolio average renewal rate | An anchor tenant and a small tenant behave very differently, so an average is wrong for both
sn: Market | Submarket vacancy and rents for the specific area | National or city-wide data | Local markets diverge, and the relevant vacancy is the one next door
sig: Expiry profile | share of income expiring within 12 months and within 36 months | The main driver of near-term income risk | Break options can move the real expiry earlier, so include them
sig: Renewal propensity | predicted probability that the tenant renews, from tenant sector, size and history | Gives the expected income retained | Few renewal events per tenant, so pool by tenant type
sig: Submarket vacancy | vacancy rate of comparable space within the submarket over the last 8 quarters | Shows the strength of demand for re-letting | Sources define vacancy differently, so use one source throughout
sig: Rent gap to market | passing rent minus market rent as a share of market rent | A tenant above market is likely to leave or reduce rent | Market rent estimates are uncertain, so carry an interval
noise: Property name | A label that carries no income information
noise: Manager | The identity of the property manager does not change lease terms
noise: Photo | Images of the building say nothing about lease expiries or tenants
base: Assume a flat renewal rate and market rent growth, because it is simple.
prod: Lease-level simulation with tenant renewal models and market scenarios, aggregated to fan charts.
pipe: Rent roll @ property system ; Lease terms @ abstract database ; Renewal model @ boosting ; Market model @ time-series ; Simulator @ Monte Carlo ; Asset manager dashboard @ BI ; Archive @ lakehouse
edge: Anchor tenant leaves | The anchor tenant leaves and occupancy drops far more than the model expects | Model anchor tenants individually and run explicit single-name scenarios
edge: Incentives | Incentives such as free rent make the passing rent differ from the effective rent | Model incentives explicitly and forecast effective rent alongside passing rent
edge: Redevelopment | Space is taken out of the lease for redevelopment | Add redevelopment flags and remove the space from forecasts
off: Occupancy error ; Income error
on: Forecast accuracy ; Leasing decisions
gap: A back-test through a strong market makes any renewal assumption look good ; Errors in the lease data feed straight through to the forecast and are mistaken for model error

== investment-property-screening-and-underwriting | Investment Property Screening & Underwriting | tabular,llm-agents | seconds | production-grade | a=0.1 k=100
obj: Screen listed investment properties against the fund's criteria and draft an underwriting summary with cash-flow assumptions.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Huber}(\hat{r}-r)
con: Every assumption such as rent growth, vacancy and exit yield is stated and editable ; An analyst approves every underwriting before it leaves the team ; Each figure in the summary cites its source document ; Deal information stays confidential and is never shared across clients
sn: Fit | Mandate fit checked first on sector, size, location and return target | Analysing every property in full | Analyst time is limited and most listings fail the mandate on the first page
sn: Cash flow | Net operating income rebuilt from the lease and cost documents | The asking figures in the offering memorandum | Seller figures flatter income and understate costs, so they must be rebuilt
sn: Sensitivity | A range of returns under changing rent, vacancy and exit yield | A single point return | Assumptions drive the answer, and a point estimate hides how fragile it is
sig: Yield vs target | going-in cap rate minus the fund's target cap rate | A direct test of mandate fit | Cap rates are computed on estimated income, so mark the income source
sig: Rent gap | passing rent minus market rent as a share of market rent | Shows upside from marking rents to market | Market rents are estimates, so use an interval
sig: Capex need | estimated capital spend per square metre from condition, age and survey notes | Capital needs reduce returns and are often hidden | Estimates are rough, so keep a contingency band
sig: Debt service cover | net operating income divided by annual debt service at current rates | Shows whether the deal survives financing | Rates change, so recompute when rates move
noise: Broker enthusiasm | Marketing language that does not tell the analyst about the property
noise: Photo count | Reflects the brochure and not the investment
noise: Deal name | A label chosen by the seller or broker with no link to returns
base: Spreadsheet screening by analysts, because it is the norm.
prod: Criteria classifier, NOI estimator and an LLM that drafts the underwriting with cited sources and sensitivities.
pipe: Offering memorandum intake @ deal inbox ; Extractor @ LLM ; Criteria screen @ rules ; NOI model @ boosting ; Underwriting drafter @ LLM ; Analyst review @ workflow ; Deal log @ CRM
edge: Missing rent roll | The rent roll is missing, so income cannot be checked | Ask for it, and mark any returns that depend on assumed income as provisional
edge: Seller errors | Seller figures are inconsistent between documents | Flag the inconsistency and use the lower-confidence figure in the base case
edge: Rate changes | A rate change moves returns after the analysis is done | Re-run the underwriting automatically when rates change and show the difference
off: Screen precision ; NOI error
on: Deals screened per analyst ; Hit rate
gap: Past deals are those the team chose to pursue, so the data is biased toward what they already liked ; Optimistic seller data in the memorandum distorts any model trained on its figures

== reit-portfolio-risk-and-allocation | REIT Portfolio Risk & Allocation | tabular,time-series | batch | staff-principal | a=0.1 k=30
obj: Estimate portfolio risk across properties and sectors and recommend allocation changes within mandate limits.
loss: \min_{w}\;w^\top\Sigma w-\lambda\,\mu^\top w
con: Allocation changes stay within sector, region, leverage and single-asset limits in the mandate ; Liquidity limits constrain how fast any asset can be sold ; Reviewed quarterly by the investment committee ; Every recommendation traces to a risk driver the committee can see
sn: Appraisal | Returns de-smoothed to remove the lag of valuation | Reported appraisal returns used as they are | Appraisals lag the market and understate volatility, so risk looks smaller than it is
sn: Concentration | Exposure by sector, region and tenant with correlations | Risk measured one asset at a time | Correlated assets fall together, and a portfolio of safe-looking assets can be a concentrated bet
sn: Liquidity | The time needed to sell each asset in a stress | Assuming every asset can be sold at book value | Property is illiquid, so a rebalance that looks cheap on paper may take a year
sig: De-smoothed volatility | standard deviation of returns after an autoregressive correction for appraisal smoothing | A truer measure of risk than reported volatility | Depends on the smoothing model, so test its sensitivity
sig: Sector correlation | rolling correlation of de-smoothed returns between sectors | Shows real diversification | Short histories make correlations unstable, so use shrinkage
sig: Lease expiry concentration | share of income expiring in any one year across the portfolio | Cash flow risk that valuations do not show | Break options change the dates, so include them
sig: Leverage | loan-to-value ratio at asset and portfolio level using current valuations | Higher leverage magnifies losses and covenant risk | Definitions differ between lenders, so use one convention
noise: Asset name | A label that has no bearing on risk
noise: Manager | The asset manager's name is not a risk factor once asset data are known
noise: Photo | Appearance of a building says nothing about its risk contribution
base: Sector weights vs benchmark, because it is typical.
prod: Factor-based risk model with de-smoothing, a constrained optimiser and a scenario module.
pipe: Property valuations @ appraisal data ; Return de-smoother @ model ; Risk model @ factor model ; Optimiser @ constrained solver ; Scenario tool @ simulation ; Committee pack @ BI ; Archive @ lakehouse
edge: Valuation lag | Appraisal-based values lag the market so risk looks smaller than it is | Use de-smoothed returns when estimating volatility and correlation
edge: Rate shock | A rate shock reduces values across all property sectors together | Run stress scenarios with correlated value falls and check the covenant limits
edge: Illiquidity | Assets cannot be sold quickly so the portfolio cannot rebalance | Impose liquidity limits and consider the time to sell in the optimiser
off: Risk forecast error ; Tracking error
on: Risk-adjusted return ; Drawdown
gap: Back-tests that use smoothed returns show low risk that does not exist ; A short history of a few cycles makes any estimate of correlation and tail risk fragile

== commercial-tenant-credit-risk | Commercial Tenant Credit Risk | tabular,nlp | batch | production-grade | a=0.1 k=20
obj: Predict the likelihood that commercial tenants default on rent so landlords price deposits, incentives and exposure.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Each score shows the factors behind it so an asset manager can explain it ; Refreshed monthly as rent ledgers close ; Data licences for vendor financials are respected ; Tenants of the same type are treated the same way
sn: Rent | Rent as a share of the tenant's revenue | A credit score only | A tenant with a good score and an unaffordable rent still fails, since occupancy cost matters
sn: Sector | Sector stress in the tenant's industry and area | A static sector rating | Retail and office cycles diverge, so a single rating hides who is in trouble now
sn: Behaviour | Payment behaviour from the rent ledger | Annual financial statements alone | Payment behaviour changes months before the accounts show stress
sig: Payment days trend | change in average days paid after the due date over the last 6 months | An early warning of stress | Agreed concessions look like lateness, so exclude them
sig: Rent to revenue | annual rent divided by estimated annual tenant revenue | Shows how heavy the occupancy cost is | Revenue estimates are noisy, so use sector medians when private
sig: Sector stress index | composite of insolvencies, footfall and sector sales for the tenant's industry | Gives context for a tenant's behaviour | Different sources give different readings, so use one
sig: Guarantor strength | credit rating or equivalent of the parent or guarantor | Support behind the lease reduces loss | Ratings are missing for private guarantors, so mark them unknown
noise: Tenant name | A label that carries no credit information and risks bias
noise: Lease length | Weakly related once payment behaviour and sector are known
noise: Floor | The floor of a unit has no link to the tenant's ability to pay
base: Credit agency scores, because landlords use them.
prod: Boosting with payment and sector features, monotone constraints and a watchlist.
pipe: Rent ledger @ property system ; Financial data @ vendors ; Feature builder @ Spark ; Default model @ boosting ; Watchlist @ rules ; Asset manager view @ BI ; Outcome feed @ warehouse
edge: Anchor tenant | The largest tenant is a big share of income and its default dominates the risk | Treat large tenants as single names with their own limits
edge: Rent holidays | Rent holidays granted by the landlord look like arrears | Record agreed concessions so they are not treated as missed payments
edge: Parent change | The tenant's parent company changes and the support behind the lease changes | Update guarantor information and re-score when ownership changes
off: AUC ; Calibration
on: Bad debt ; Early warnings
gap: Few defaults make any estimate noisy and hide poor performance on the rare cases ; The credit cycle means a model trained in a good period misses defaults in a bad one

== office-space-utilisation-from-sensors | Office Space Utilisation from Sensors | time-series,tabular | batch | foundational | a=96 k=1
obj: Measure how workspaces and meeting rooms are actually used from sensors and badge data to right-size the portfolio and plan layouts.
loss: \mathcal{L}=\sum_t\mathrm{MSE}(\hat{y}_t,y_t)+\lambda\,\mathrm{Huber}(\hat{o}-o)
con: No tracking of individuals at any step ; Only aggregate counts are stored or shown ; Reports remain valid with gaps in sensor data ; A weekly report goes to facilities and real-estate planners
sn: Privacy | Anonymous counts of people per zone | Tracking named individuals by badge or device | Staff trust is easily lost, and individual tracking is a legal risk in many places
sn: Peak | Peak and typical use measured separately | The average occupancy over a week | Space needs are set by the peaks, and an average hides that a room is full on Tuesdays
sn: Booking | What was actually used compared with what was booked | Booking data alone | No-shows hide real use, so a fully booked room may be empty
sig: Peak occupancy | 95th percentile of hourly counts per zone over four weeks | Peak demand drives the space needed | Sensor errors create spikes, so remove impossible values
sig: Booked vs used | booked hours with no detected occupancy divided by booked hours | Measures wasted space | Booking data are often incomplete
sig: Dwell time | median minutes people stay in a zone | Separates short drop-ins from real work | Sensors miss still people, so cross-check with a second source
sig: Day pattern | weekday profile of mean occupancy across weeks | Supports planning of space and cleaning | Patterns shift with policies, so refresh it often
noise: Sensor ID | A device label that carries no information on use
noise: Floor colour | A physical attribute that does not affect occupancy
noise: Badge number | A personal identifier that must not be used, for privacy
base: Annual manual headcount, because it is cheap.
prod: Occupancy estimation from sensor fusion with gap filling and a recommendation engine for layouts.
pipe: Sensors @ IoT gateway ; Cleaner @ stream job ; Occupancy estimator @ model ; Pattern miner @ clustering ; Recommender @ rules ; Facilities dashboard @ BI ; Archive @ lakehouse
edge: Sensor failure | Sensor failures create gaps in the occupancy counts | Impute from nearby sensors and mark the interval as estimated
edge: Hybrid days | Patterns change when a hybrid policy changes | Refresh baselines after a policy change and mark the transition
edge: Events | An event fills the building for a day and distorts normal use | Exclude event days from the baseline and report them separately
off: Count error ; Peak error
on: Space released ; Cost saved
gap: A short pilot period misses seasonal peaks and holidays ; Sensor bias, such as under-counting in doorways, makes the data look cleaner than the truth

== site-selection-for-retail-and-logistics | Site Selection for Retail & Logistics | tabular,graph | batch | production-grade | a=0.02 k=200
obj: Rank candidate locations for a store or warehouse by expected revenue or cost, using demographics, mobility, competition and network fit.
loss: \mathcal{L}=\mathrm{Huber}(\hat{y}-y)+\lambda\,\mathrm{GraphReg}(z)
con: No protected attributes or close proxies in demand models ; Cannibalisation of the company's own sites is modelled and shown ; Data licences for mobility and demographic data are respected ; An analyst reviews every ranked site before a committee sees it
sn: Catchment | Drive-time and walk-time catchments built from the road network | A fixed radius circle | Rivers, motorways and rail lines shape real catchments, so a circle misses where customers come from
sn: Cannibalisation | The effect of a new site on the company's own nearby sites | The new site evaluated alone | A strong new store that pulls sales from an existing one adds less than its revenue
sn: Transfer | Validity checks for a new market with few comparable sites | A model fit only on existing markets | Extrapolating to a new market assumes it behaves like the old ones, which is often untrue
sig: Catchment population | residents within a 15-minute drive weighted by purchasing power | The main driver of demand | Census data age, so adjust with recent growth
sig: Competitor density | number and size of competing stores within the catchment | Competition reduces demand | Definitions of a competitor differ, so use a consistent category
sig: Mobility flows | anonymised footfall or vehicle counts passing the site, per hour | Shows actual movement of potential customers | Panels are samples, so check representativeness
sig: Network fit | average distance from the site to the company's hubs and suppliers | Drives cost for logistics sites | Road conditions change, so use time and not distance
noise: Site name | A label that carries no demand information
noise: Broker | The agent selling a site does not change its performance
noise: Photo | Marketing images of the site do not change catchment or competition
base: Gravity model on population, because it is standard.
prod: Revenue model with cannibalisation and a facility-location optimiser.
pipe: Site candidates @ broker feeds ; Catchment builder @ routing ; Demand model @ boosting ; Cannibalisation model @ regression ; Optimiser @ solver ; Committee pack @ BI ; Outcome log @ warehouse
edge: New market | A new market has no existing stores to learn from | Use priors from similar markets and widen the intervals
edge: Road changes | A new road changes the catchment | Update the routing network and re-run the catchments
edge: Pandemic effects | Traffic data from the pandemic distort demand | Use recent data and exclude the distorted period
off: Revenue error ; Rank correlation
on: New site performance ; Hit rate
gap: Survivor sites are those that were opened and kept, so failed locations are missing from the data ; Selection bias because the company opened sites where it expected success

== due-diligence-document-review | Real Estate Due-Diligence Document Review | llm-agents,nlp | seconds | production-grade | a=0.05 k=800 s=6 t=800
obj: Review data-room documents (title, leases, surveys, environmental, contracts) for a property acquisition, flag issues and draft a report with citations.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Every issue in the report cites the document and page it comes from ; Lawyers review and approve every report ; Data-room documents stay confidential and are not used to train shared models ; Coverage is tracked against a per-transaction checklist
sn: Coverage | Checklist coverage per document type | Reading documents in random order | Missing documents matter as much as the ones present, and a random read does not reveal gaps
sn: Issues | Material issues ranked by severity and value | Every finding listed with equal weight | Noise buries the real risk, and the reviewer misses the one clause that kills the deal
sn: Evidence | Each claim linked to a quoted passage | Unsupported claims | A claim without a citation cannot be trusted or checked by a lawyer
sig: Checklist coverage | share of required document types present and reviewed | A direct completeness measure | Definitions of required vary by deal, so use a template per type
sig: Issue precision | share of flagged issues that a lawyer accepts as real | Measures noise in the report | Reviewers disagree, so measure agreement as well
sig: Citation validity | share of issues whose cited passage supports the statement | Trust in the report depends on it | A passage can be real and still not support the claim, so check entailment
sig: Material flag | severity score assigned by a rule set tied to value and legal risk | Prioritises the review | Severity involves judgement, so calibrate with lawyers
noise: Document length | Longer documents are not riskier, and length carries no signal about issues
noise: Folder names | Arbitrary labels chosen by the seller's team
noise: Dates alone | Weak evidence of relevance unless tied to a clause or event
base: Associates read documents against a checklist, because it is standard.
prod: Agent with document classification, checklist matching, issue extraction and cited drafting with lawyer review.
pipe: Data room ingest @ vendor ; Classifier @ model ; Checklist matcher @ rules ; Issue extractor @ LLM ; Report drafter @ LLM ; Lawyer review @ workflow ; Report @ document
edge: Missing documents | Key documents are missing from the data room | List the missing documents against the checklist and flag the risk in the report
edge: Conflicting documents | Two documents give different facts about the same item | Flag the conflict with both citations and ask the lawyer to resolve it
edge: Scanned files | Scanned files in the data room are unreadable | Check the OCR quality and request clean copies for critical documents
off: Issue recall ; Citation validity
on: Review hours ; Missed issues
gap: Past deals used for tuning are the easy ones that closed, so recall on hard deals is overstated ; Checklist bias, since the model finds what the checklist already asks for and misses the unusual

== acquisition-deal-sourcing | Acquisition Deal Sourcing | graph,tabular | batch | production-grade | a=0.05 k=50
obj: Find off-market properties likely to sell by combining ownership, debt maturity, lease expiry and behaviour signals.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{GraphReg}(z)
con: Data licences for ownership, debt and mobility sources are respected ; Owner contact follows fair and lawful practice ; Analysts review every list before outreach ; A fresh list each week
sn: Sale | The likelihood that an owner sells in the next 12 months | Owner wealth or size | Wealth does not imply sale, and wealthy owners hold for decades
sn: Ownership | Ownership entities resolved to the people and groups behind them | Parcel owner names as listed | Shell companies and trusts hide the real owner, so the name does not identify who decides
sn: Timing | Debt maturity and lease expiry events | A static property profile | Events trigger sales, and a loan that matures in six months changes the odds
sig: Debt maturity | months until the main loan matures | A maturing loan forces a refinance or a sale | Debt data are incomplete for private loans
sig: Hold period | years since the last transfer | Owners often sell at typical points in the cycle | Differs by owner type, so segment
sig: Owner entity graph | number of properties and entities linked to the same ultimate owner | Shows portfolio context and likely strategy | Resolution errors merge unrelated owners
sig: Lease expiry | months until the main lease ends | A vacancy risk that may prompt a sale | Break options shift the real date
noise: Owner name | A label that the model can memorise without learning why owners sell
noise: Parcel ID | An administrative key with no information on sale intent
noise: Broker | Who listed it before is not related to who will sell now
base: Analysts' lists from brokers, because it is the norm.
prod: Entity resolution, a sale-propensity model and a ranked outreach list.
pipe: Property and debt data @ vendors ; Entity resolver @ graph ; Features @ Spark ; Sale model @ boosting ; Ranker @ rules ; Analyst list @ CRM ; Outcome feed @ warehouse
edge: Shell ownership | Ownership is hidden behind shell companies | Resolve entities across registries and build the ownership graph
edge: Stale data | Stale debt or owner data suggests a sale that has already happened | Check the freshness of each source and drop records older than the threshold
edge: Mass outreach | Mass outreach to owners causes fatigue and complaints | Limit contacts per owner and per period and track opt-outs
off: PR-AUC ; Lift
on: Off-market deals ; Contact success
gap: Observed sales are biased towards properties that were listed, so off-market sales are missed ; Leakage when the sale itself changes the data, such as a new owner or loan

== construction-cost-estimation-from-plans | Construction Cost Estimation from Plans | nlp,computer-vision,tabular | seconds | staff-principal | a=0.02 k=2000
obj: Estimate construction cost early from drawings, specifications and past projects, with quantity take-off support.
loss: \mathcal{L}=\mathrm{Huber}(\log\hat{c}-\log c)+\lambda\,\mathrm{Pinball}(\hat{q}_{0.9},c)
con: Every estimate is a range with a stated confidence and never a single number ; Assumptions on spec, site and escalation are listed with the estimate ; A cost estimator reviews and approves before use ; Costs adjusted with regional cost indices and the date of pricing
sn: Quantities | Quantities taken off the plans by element, such as slab, walls and openings | Floor area alone | Two buildings of equal area differ widely in cost because of shape, structure and services
sn: Escalation | Prices adjusted for time and region to the date of construction | Historic cost used as it was | Material and labour prices move, and a cost from three years ago is wrong now
sn: Scope | Scope changes expected over the project | A static scope at estimate date | Change orders add cost, and an estimate that ignores them is always short
sig: Gross area and storeys | gross floor area and number of storeys read from the plans | The base driver of cost | Plans differ on what counts as gross, so define it
sig: Spec level | classifier score from finish schedules and notes for low, medium, high and luxury | Finish drives cost per square metre | Specifications are text and often incomplete
sig: Region index | construction cost index of the project region relative to a base | Adjusts for local labour and materials | Indices lag, so update them often
sig: Similar project cost | cost per square metre of the five most similar past projects, escalated to today | A reference grounded in real outcomes | Matching is subjective, so show the projects used
noise: Architect | Who drew the plan does not change the cost of building it
noise: Drawing style | A cosmetic feature that varies by office and does not change quantities
noise: Project name | A label with no cost information
base: Cost per square metre by building type, because estimators use it.
prod: Quantity extraction from plans, a cost model with retrieval of similar projects and intervals.
pipe: Plan intake @ project system ; Take-off extractor @ vision model ; Spec parser @ NLP ; Cost model @ boosting ; Similar projects @ retrieval ; Estimator review @ UI ; Archive @ warehouse
edge: Early design | Early design stages have little detail so a point estimate is false precision | Show a wide range and narrow it as the design develops
edge: Material price spike | A sudden spike in a material price such as steel breaks the estimate | Link to material price indices and re-run the estimate when they move
edge: Unusual site | An unusual site with difficult access adds cost not seen in past projects | Flag unusual sites and require an estimator's review
off: Error by stage ; Interval coverage
on: Estimate vs final cost ; Estimator time
gap: The final cost in the data includes changes, so it is not the cost of the plan as drawn ; Few similar projects mean any benchmark is built on a handful of cases

== project-delay-and-overrun-prediction | Construction Project Delay & Overrun Prediction | tabular,time-series | batch | production-grade | a=1 k=10
obj: Predict schedule and cost overruns on live projects from progress, supply and weather data so managers act early.
loss: \mathcal{L}=\mathrm{Huber}(\hat{d}-d)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Forecasts refreshed weekly for every active project ; Each forecast shows the drivers behind it ; No scoring of individual people or blame ; Only data from official project systems is used
sn: Earned | Earned value compared with the plan | Percent complete reported by site staff | Self-reported progress is optimistic and lags reality
sn: Critical | Delay on tasks on the critical path | Delay on all tasks equally | A late task with float costs nothing, and a late task on the path delays the finish
sn: Supply | Material and subcontractor delivery risk | Site conditions only | Late deliveries stop work, and they are visible weeks before the delay
sig: Schedule performance index | earned value divided by planned value to date | The standard measure of schedule health | Depends on honest progress reporting, so cross-check with quantities
sig: Critical path float | days of float on the tasks that drive the finish date | Low float means any slip delays the project | Schedules are updated irregularly
sig: Delivery lateness | average days late of the last ten key deliveries | Supply delays precede site delays | Logs may record receipt and not site-ready dates
sig: Weather lost days | days lost to rain or wind against the allowance | Context for delays outside the contractor's control | Weather days are claimed inconsistently
noise: Project name | A label with no predictive content
noise: Manager | Naming a manager risks blame scoring and does not generalise
noise: Photo count | A reporting habit and not a measure of progress
base: Earned-value indices with thresholds, because project controls use them.
prod: Gradient boosting for delay with critical-path features and a simulation of schedule risk.
pipe: Schedule and cost data @ project system ; Progress capture @ app ; Feature builder @ Spark ; Delay model @ boosting ; Monte Carlo @ schedule risk ; PM dashboard @ BI ; Outcome log @ warehouse
edge: Change orders | Change orders add scope and cost beyond the original plan | Flag projects with frequent change orders and add them to the forecast
edge: Strike | A strike or stoppage halts work for an extended period | Add an event flag and re-simulate the schedule from the stoppage
edge: Late data | Progress data arrives late so forecasts use stale information | Track data freshness and lower the confidence when it is old
off: MAE of delay ; Early-warning recall
on: Overrun days ; Cost overrun
gap: Only completed projects are in the data, so cancelled or abandoned ones are missing ; Optimistic reports make early signals look healthier than they were

== construction-site-safety-monitoring | Construction Site Safety Monitoring | computer-vision | seconds | production-grade | a=1 k=500
obj: Detect missing PPE, exclusion-zone entries and unsafe equipment proximity from site cameras and alert supervisors.
loss: \mathcal{L}=\mathcal{L}_{\text{det}}+\lambda\,\mathrm{FL}(\hat{p},y)
con: Alerts reach the supervisor within 5 seconds of a hazard ; Individual workers are not scored or ranked ; Faces blurred and footage retained only for incidents ; Compliance with union agreements and local legal rules
sn: Hazard | Specific hazards such as a person in an exclusion zone or no helmet | Detecting people on site | People are always present on a site, so presence is not a hazard
sn: Privacy | Aggregate counts and blurred images | Identifying individuals | Identifying workers erodes trust and breaches privacy rules
sn: Alert | A few precise alerts that supervisors act on | Many alerts for every possible issue | Alert fatigue leads supervisors to ignore the system, including when it is right
sig: PPE detection | probability that a detected person wears a helmet and a high-visibility vest | The most common safety rule | Occlusion by machinery lowers accuracy, so require confidence over frames
sig: Zone entry | whether a person's position falls inside a polygon for an exclusion zone | A direct hazard definition | Camera calibration errors move the polygon, so recalibrate often
sig: Equipment proximity | estimated distance between a person and moving plant | Struck-by incidents are a leading cause of harm | Depth from a single camera is imprecise
sig: Event persistence | number of consecutive frames in which the hazard is seen | Removes single-frame false alarms | Longer persistence delays alerts, so balance with the 5 second limit
noise: Camera brand | A hardware attribute that has no effect on hazard
noise: Worker identity | Personal and not allowed, and the model should not use it
noise: Time stamp | Hazards occur at any time, so the clock adds no information
base: Periodic manual inspections, because they are required.
prod: Detection and tracking with zone logic, persistence rules and supervisor alerts.
pipe: Cameras @ RTSP ; Edge detector @ GPU ; Tracker @ model ; Rules @ zones ; Alert @ push ; Supervisor app @ mobile ; Review log @ store
edge: Night | Low light at night makes detection unreliable | Use infrared cameras or restrict automated alerts to well-lit areas
edge: Dust | Dust and dirt on lenses hide people and equipment | Schedule lens cleaning and detect low-visibility frames
edge: New PPE colours | New PPE colours or styles are not recognised and workers are flagged wrongly | Retrain on new PPE and add a feedback path for false alerts
off: Recall of hazards ; Precision
on: Incidents ; Near misses
gap: Staged footage is clean and well lit and overstates accuracy on real, cluttered sites ; Site differences in layout, PPE and weather mean a test on one site overstates performance elsewhere

== progress-monitoring-from-drone-imagery | Progress Monitoring from Drone Imagery | computer-vision | batch | production-grade | a=0.1 k=5000
obj: Compare drone captures to the BIM or schedule to estimate progress by element and flag deviations.
loss: \mathcal{L}=\mathcal{L}_{\text{seg}}+\lambda\,\mathrm{Huber}(\hat{p}-p)
con: Drone capture weekly at the agreed flight times ; Accuracy reported for each element type ; Privacy rules followed for people and neighbouring properties ; Deviation tolerances defined per element
sn: Alignment | Captured data registered to the BIM model coordinates | Raw images compared as they are | Misalignment produces apparent deviation that is not real
sn: Element | Status per building element such as slab, column and facade panel | A single percentage complete | One number hides which elements are done and which are not, so payment and sequencing decisions suffer
sn: Tolerance | Deviation checked against the tolerance for each element type | A visual impression of quality | Out-of-tolerance work becomes rework that is costly to find later
sig: Point cloud registration | root-mean-square error of aligned points to BIM control points | Measures whether comparisons are meaningful | Drift over a large site needs control markers
sig: Element completion | classifier probability that an element is built, per element | The base of progress reporting | Occlusion hides elements, so report visibility alongside
sig: Deviation | millimetres between the as-built surface and the BIM surface per element | Quality control against the design | Noise in the point cloud limits precision, so state the error margin
sig: Schedule variance | planned finish minus predicted finish by task, in days | Links progress to schedule | Depends on a current plan
noise: Lighting | Varies by time of day and does not change the structure
noise: Weather | Affects image quality and must be normalised and not read as progress
noise: Cloud | Cloud cover is a capture condition and has no information on the building
base: Site walks and manual reports, because they are standard.
prod: Photogrammetry, registration to BIM, element classification and a progress dashboard.
pipe: Drone capture @ flights ; Photogrammetry @ pipeline ; Registration @ ICP ; Element model @ vision ; Progress @ rules ; PM dashboard @ BI ; Archive @ store
edge: Occlusion | Interior work or covered areas cannot be seen from the drone | Combine with interior capture or site reports for hidden work
edge: Design change | A design change makes the BIM out of date so deviations are false | Version the BIM and compare against the correct version
edge: Weather | Weather prevents flights on the planned date | Reschedule and fall back to the last good capture with a staleness flag
off: Element accuracy ; Registration error
on: Report time ; Rework found
gap: Training on one site hides failures on sites with different structures and materials ; Controlled flights under ideal conditions overstate accuracy in everyday use

== permit-and-zoning-compliance-checking | Permit & Zoning Compliance Checking | nlp,llm-agents | seconds | production-grade | a=0.1 k=300
obj: Check building plans and applications against zoning and code rules and give applicants and officers cited findings.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Findings are based on the official code text and nothing else ; The permit officer makes every decision ; Every finding cites the code section and the plan sheet ; Rules versioned so an application is checked against the code in force at submission
sn: Rules | Rules encoded as structured, testable checks | Free-text summaries of the code | A structured check can be audited and tested, while a summary hides how a conclusion was reached
sn: Version | The code version in force on the application date | The latest code | A later amendment does not apply to an earlier application, and applying it gives the wrong result
sn: Judgement | The officer decides on discretionary and ambiguous cases | Automated decisions | Authority rests with the officer, and an automated decision has no legal standing
sig: Rule check accuracy | share of rule checks that match an expert's verdict on a labelled set | The core quality measure | Rules interact, so test combinations
sig: Citation validity | share of findings whose cited section supports the finding | Trust depends on correct citations | A real section can still be the wrong one, so check support
sig: Measurement extraction | accuracy of dimensions, areas and heights read from the plans | Inputs to the rule checks | Scales and units vary, so validate against stated figures
sig: Exception flag | whether a variance or special permission is requested | Routes cases to the officer | Judgement-based, so measure agreement with officers
noise: Applicant name | Does not affect whether a plan complies
noise: Format | The file format of the application, which has no bearing on compliance
noise: Length | A long application is not more or less compliant
base: Officers check manually against checklists, because it is the norm.
prod: Structured code rules, plan measurement extraction and an LLM for narrative requirements with cited findings.
pipe: Application intake @ portal ; Plan reader @ vision and OCR ; Rule engine @ rules ; Narrative checker @ LLM ; Findings drafter @ LLM ; Officer review @ workflow ; Record @ system
edge: Ambiguous code | The code text is ambiguous and can be read two ways | Escalate ambiguous clauses to the officer with both readings
edge: Amendments | Amendments change the code after the application is filed | Version the rule set and check against the version in force at submission
edge: Non-standard plan | A non-standard plan format cannot be read automatically | Route to manual review and add the format to the training set
off: Rule accuracy ; Finding precision
on: Review time ; Rework cycles
gap: Easy applications are over-represented in the data, so unusual cases fail in use ; Code updates mean a test set from last year does not reflect today's rules

== building-material-demand-and-procurement-forecast | Building Material Demand & Procurement Forecast | time-series,tabular | batch | production-grade | a=1 k=3
obj: Forecast material needs by project phase and plan purchases to avoid delays and excess stock.
loss: \mathcal{L}=\sum_t\mathrm{Pinball}(\hat{q}_{0.9},y_t)+\lambda\,\mathrm{Huber}(\hat{c}-c)
con: Lead times of each supplier are respected in the order plan ; Price volatility reflected in order timing and quantity ; On-site storage limits cap early ordering ; A weekly procurement plan for every active project
sn: Phase | Demand forecast by construction phase and task | An average monthly consumption | Demand is lumpy, with concrete in the early phases and finishes at the end
sn: Lead | Supplier lead-time risk in the order date | Ordering when the schedule says so | A late delivery stops work, so orders must allow for the real lead time
sn: Price | Price volatility and index changes | Fixed price assumptions | Costs move, and locking in at the right time saves money
sig: Schedule phase | tasks planned in each of the next 8 weeks mapped to material take-offs | The main driver of demand | Schedules slip, so refresh weekly
sig: Supplier lead time | median and 90th percentile days from order to delivery for each supplier | Determines the order date | Quoted lead times differ from realised ones
sig: Price index | recent change in the relevant material price index | Informs timing of purchases | Indices lag spot prices
sig: Waste factor | percentage of material wasted in past projects of the same type | Converts net quantity into order quantity | Varies by crew and site, so use site-level values
noise: Project name | A label with no demand information
noise: Supplier name | The supplier's identity is captured by lead time and price already
noise: Order number | An administrative identifier with no signal
base: Bill of quantities with a buffer, because it is typical.
prod: Phase-aware quantile demand forecast with lead-time risk and a procurement optimiser.
pipe: Schedule and BoQ @ project system ; Demand model @ boosting ; Lead-time model @ regression ; Price feed @ indices ; Procurement optimiser @ solver ; Buyer view @ app ; Outcome log @ warehouse
edge: Design change | A design change alters the quantities after the plan is made | Re-run the take-off when the design changes and update the order
edge: Shortage | A material shortage in the supply chain delays the order | Identify approved substitutes and update the plan
edge: Delay | A schedule delay shifts when materials are needed | Re-forecast demand from the revised schedule and move orders
off: Quantity error ; Stock-out rate
on: Delays from materials ; Excess stock
gap: Plans differ from as-built quantities, so a forecast fitted to plans is biased ; Price shocks in the past are few and a model trained on calm periods fails in a shock

== contractor-bid-evaluation | Contractor Bid Evaluation | tabular,nlp | seconds | production-grade | a=0.02 k=100
obj: Compare contractor bids on price, scope coverage, risk and track record to recommend a shortlist.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Huber}(\hat{c}-c)
con: Evaluation follows procurement rules and published criteria ; The scoring method is transparent to bidders on request ; A person makes the award decision ; Every step is auditable
sn: Scope | Coverage of the full scope of works in each bid | The lowest price | Low bids often omit scope that is later claimed as extras
sn: Track | A contractor's delivery record on similar projects | The price alone | Cheap bidders often have a record of delay and claims
sn: Risk | Risk-adjusted cost including likely overruns | The bid price as submitted | The cheapest bid can be the most expensive outcome once overruns are included
sig: Scope gap | number of bill-of-quantities items missing or priced at zero | Reveals omissions in a low bid | Parsing errors in the bid documents, so check by hand
sig: Past overrun rate | average percentage cost overrun of the contractor's last ten projects | Reliability evidence | Data are patchy and project types differ
sig: Bid outlier | z-score of the bid compared with the other bids and the estimate | Flags abnormally low or high bids | Few bids make the z-score unstable, so use the estimate as well
sig: Capacity | the contractor's current workload relative to capacity | A contractor stretched across projects delivers late | Data are self-reported
noise: Company name | A label that invites bias and has no evidence on performance
noise: Bid format | Presentation style that carries no information on capability
noise: Brochure | Marketing material that does not predict delivery
base: Lowest compliant bid, because rules often require it.
prod: Scope-gap analysis from bid text, a risk-adjusted cost model and a transparent comparison for the committee.
pipe: Bid intake @ procurement system ; Parser @ NLP ; Scope checker @ rules ; Risk model @ boosting ; Comparison @ BI ; Committee @ workflow ; Record @ system
edge: Abnormally low bid | An abnormally low bid omits part of the scope | Query the bidder on omitted items and compare scope coverage before price
edge: Single bidder | Only one bidder responds so there is nothing to compare | Benchmark against past similar projects and the estimate
edge: Late bids | Bids arrive late and procurement rules say what to do | Apply the procurement policy and record the decision
off: Overrun prediction ; Scope gap recall
on: Overruns ; Dispute rate
gap: Data only on winners, since the performance of unsuccessful bidders is never observed ; Few failures make it hard to learn what predicts a failing contractor

== hvac-energy-optimisation | HVAC Energy Optimisation | reinforcement-learning,time-series | seconds | staff-principal | a=288 k=1
obj: Control heating and cooling setpoints to cut energy use while keeping comfort within limits.
loss: \max_\pi\;\mathbb{E}\!\left[\sum_t\gamma^t\left(-\text{energy}_t-\lambda\,\text{discomfort}_t\right)\right]
con: Zone temperature and air quality stay within comfort bounds at all times ; Safety interlocks on equipment always take priority over the controller ; The controller falls back to the BMS schedule on any fault ; Gradual rollout zone by zone with monitoring
sn: Comfort | A comfort constraint that must hold while saving energy | Energy use alone as the objective | A cold or hot office produces complaints, and the controller is switched off
sn: Model | A thermal model fitted to the specific building | Generic rules applied to all buildings | Buildings differ in mass, glazing and layout, so what works in one wastes energy in another
sn: Safety | Hard limits enforced outside the learned policy | A learned policy trusted to stay safe | A learning system can try unsafe actions, so limits must be enforced by the BMS
sig: Zone temperature | measured air temperature per zone with a sensor-quality flag | The state the controller tries to regulate | Sensors are noisy and can be placed badly
sig: Weather forecast | forecast outside temperature and solar load for the next 6 hours | Lets the controller pre-cool or pre-heat | Forecasts have errors, so use ranges
sig: Occupancy forecast | expected number of people per zone from bookings and badge counts | The main source of internal load | Data are aggregate and not personal
sig: Energy price | time-of-use tariff and demand charge periods | Allows load shifting to cheaper periods | Tariffs change, so load them from a table
noise: Building name | A label that does not carry thermal behaviour
noise: Valve ID | An identifier for equipment with no information on state
noise: Sensor brand | Drift characteristics may differ but the brand name itself does not help
base: Fixed schedules with setpoints, because buildings use them.
prod: Model-predictive control with a learned thermal model and a safe RL layer inside bounds.
pipe: Sensors @ BMS ; State estimator @ model ; Thermal model @ learned ; Controller @ MPC ; Safety layer @ rules ; BMS write @ BACnet ; Energy log @ lakehouse
edge: Sensor fault | A faulty sensor sends wrong data and the controller reacts to it | Detect the fault and fall back to the schedule for that zone
edge: Heatwave | Extreme heat pushes the plant beyond its design capacity | Respect equipment limits and keep comfort limits relaxed in a defined way
edge: Occupancy surge | A sudden surge in occupancy from an event overloads the zone | Take occupancy feeds from the booking system and allow an override
off: Energy saved in simulation ; Comfort violations
on: kWh ; Complaints
gap: A simulator that does not match the real building gives gains that vanish on site ; A mild test season hides performance in extremes

== building-energy-benchmarking-and-retrofit-targeting | Building Energy Benchmarking & Retrofit Targeting | tabular | batch | production-grade | a=0.1 k=10
obj: Benchmark building energy use against peers and rank buildings for retrofit by savings and payback.
loss: \mathcal{L}=\mathrm{Huber}(\hat{y}-y)+\lambda\,\mathrm{MSE}(\hat{s},s)
con: Energy use normalised for weather and occupancy before any comparison ; Peer groups defined so that like buildings compare with like ; Calculations traceable so a building owner or auditor can reproduce them ; Run annually after the full year of meter data is closed
sn: Normalise | Energy use normalised for weather, area and occupancy | Raw kilowatt-hours | A cold winter or a larger floor area makes a building look worse without any change in efficiency
sn: Peers | Peer groups by use type, size and climate zone | A national average for all buildings | A hospital and an office have different loads, so a national peer makes one look good and the other bad
sn: Savings | Savings potential and payback of each retrofit option | The level of use alone | A high-use building may have no cheap fix, and a modest one may have a quick payback
sig: Normalised EUI | annual kilowatt-hours per square metre after weather and occupancy adjustment | The core efficiency measure | Area definitions differ, so use the standard gross internal area
sig: Peer percentile | rank of the building's normalised EUI within its peer group | Shows how far from typical the building is | Peer groups with few members are unstable
sig: Envelope age | year of construction and of the last major facade or window upgrade | Older envelopes lose more heat | Records are often missing, so use the building age as a fallback
sig: System type | heating and cooling system class, such as gas boiler, heat pump or chiller | Systems drive both use and retrofit options | Recorded types are often outdated
noise: Building name | A label that does not describe efficiency
noise: Owner | The owner identity does not change the physical performance
noise: Photo | Appearance has little relation to energy use
base: Rank by energy per square metre, because it is easy.
prod: Weather-normalised models of expected use, savings estimators and a payback ranking.
pipe: Meter data @ utilities ; Weather @ feeds ; Expected-use model @ boosting ; Peer benchmark @ stats ; Savings model @ regression ; Retrofit ranker @ rules ; Report @ BI
edge: Missing meters | Missing meters leave gaps in the energy record | Impute carefully from sub-meters or similar buildings and flag them
edge: Mixed use | Tenants in a mixed-use building share meters so use cannot be allocated | Use allocation rules or sub-metering and benchmark by space type
edge: Occupancy change | A change in occupancy shifts energy use and is mistaken for a performance change | Adjust expected use for occupancy and record the change
off: Expected-use error ; Savings error
on: Retrofits delivered ; Energy saved
gap: Retrofitted buildings differ from the rest, so their results are not comparable with unretrofitted ones ; Weather in one year is not typical, and a model fitted on it misleads

== indoor-air-quality-and-comfort-anomaly-detection | Indoor Air Quality & Comfort Anomaly Detection | time-series | seconds | foundational | a=288 k=1
obj: Detect abnormal CO2, humidity, temperature and particulate readings so facilities fix ventilation and comfort issues.
loss: \mathcal{L}=\sum_t\mathrm{MSE}(\hat{x}_t,x_t)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Alerts are tuned to occupancy and room use so normal meetings do not alarm ; Sensor health is tracked and faulty devices are excluded ; No personal data collected and counts only ; Alert limits follow recognised indoor air quality standards
sn: Context | Baselines that depend on occupancy and ventilation state | Fixed thresholds for every room | A full meeting room raises CO2 for an hour and is normal, but a fixed threshold alarms on it
sn: Sensor | Sensor faults separated from real events | Every anomaly treated as an environmental event | A drifting or stuck sensor looks like an event and misleads facilities
sn: Action | Alerts that tell facilities what to check and where | Raw alarms with no context | Too many alarms cause fatigue, and nobody responds to the one that matters
sig: CO2 vs occupancy | residual between measured CO2 and the CO2 expected for the current occupancy | Isolates ventilation faults from normal use | Occupancy counts are noisy, so smooth them
sig: Humidity drift | slope of relative humidity over 7 days with a seasonal baseline | A rising trend signals mould risk | Seasonal effects are strong, so compare with the same season
sig: Particulate spike | PM2.5 rise above the rolling baseline, compared with outdoor PM2.5 | Detects indoor sources and filter failure | Outdoor pollution enters, so compare with outside
sig: Temperature gradient | difference in temperature between adjacent zones and between floor and ceiling sensors | Shows comfort and airflow problems | Sensor placement bias affects it
noise: Room name | A label that carries no information on air quality
noise: Sensor ID | A device label that does not describe conditions
noise: Floor | Floor number has weak relation once the ventilation system is known
base: Fixed limit alarms, because standards define them.
prod: Occupancy-conditioned anomaly detection with sensor health checks and a work-order link.
pipe: Sensors @ IoT ; Cleaner @ stream ; Baseline model @ time-series ; Anomaly scorer @ model ; Sensor health @ rules ; Work order @ CMMS ; Dashboard @ BI
edge: Sensor drift | Sensor drift makes readings wrong over time | Calibrate sensors on a schedule and flag drifting devices
edge: Events | A crowd in a room raises CO2 for a short time | Use occupancy to put the reading in context before raising an alert
edge: Outdoor smoke | Smoke outside raises indoor particulates | Use outdoor air data to separate outdoor events from indoor sources
off: Event recall ; False alarms
on: Complaints ; Alerts acted on
gap: Few labelled events, so recall is poorly estimated ; Clean data from the first months of a deployment hides later drift and faults

== flood-and-climate-risk-scoring-for-properties | Flood & Climate Risk Scoring for Properties | tabular,computer-vision | seconds | staff-principal | a=0.1 k=100
obj: Score each property's exposure to flood, wildfire, heat and wind under current and future climate for buyers, lenders and insurers.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Brier}(\hat{p},y)
con: Methodology published so that users can judge and challenge a score ; Every score names the climate scenario and the time horizon ; Uncertainty ranges shown alongside the score ; Hazard layers updated at least yearly
sn: Elevation | Property-level elevation and local drainage | The flood zone designation alone | Flood zones are coarse and place houses on either side of a line at very different risk
sn: Scenario | A climate scenario with a stated horizon | A single future | Futures differ, and a single number hides how uncertain the outlook is
sn: Vulnerability | Building vulnerability, such as basement, floor height and materials | Hazard alone | Two neighbours with the same hazard suffer different loss depending on how the building is built
sig: Elevation above river | metres between the lowest floor and the 100-year flood level from LiDAR data | The most direct driver of river flooding | LiDAR resolution and age limit precision
sig: Distance to water | distance to the nearest river, coast or drainage channel along the flow path | Flood exposure falls with distance | Straight-line distance misleads, so use flow paths
sig: Vegetation fuel | fuel load and density within 100 metres from imagery | A key driver of wildfire spread | Seasonal, so use the dry-season image
sig: Historic claims density | insurance claims per property in the area over 20 years | Evidence of past damage | Privacy-restricted, and claims depend on take-up
noise: Owner | Owner identity has no physical link to hazard
noise: Address string | The text of an address is not a risk factor and can encode area bias
noise: Photo | A listing photo says nothing about flood or fire exposure
base: Official flood zone maps, because lenders require them.
prod: Hazard models combined with property vulnerability, calibrated to claims, with scenario scores and intervals.
pipe: Hazard layers @ models ; Property features @ geospatial ; Vulnerability model @ boosting ; Calibrator @ isotonic ; Score API @ service ; Report @ PDF ; Archive @ lakehouse
edge: New defences | New flood defences change the risk but the hazard maps lag | Update the hazard layers when defences are completed and mark the date
edge: Basement | A basement or below-grade space has far higher flood vulnerability | Add the basement feature and increase vulnerability for it
edge: Model update | A hazard model update changes scores for many properties at once | Version the model and explain the change in scores to users
off: Brier score ; Claims calibration
on: Loss ratio ; Disputes
gap: Claims come from a few events, so models fit those events and miss others ; Scenario uncertainty is wider than the differences between models, so validation on past data is a weak guide

== title-and-deed-fraud-detection | Title & Deed Fraud Detection | graph,nlp | seconds | production-grade | a=0.1 k=50
obj: Detect forged deeds, owner impersonation and suspicious transfers before closing or recording.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{GraphReg}(z)
con: A human investigator reviews every flagged case before action ; Every alert shows the evidence behind it ; False positives kept low so legitimate transfers are not delayed ; Recording deadlines respected, so alerts arrive within hours of filing
sn: Pattern | Behavioural patterns of fraud, such as speed and mismatch | A fixed list of rules | Fraudsters adapt to the rules, and a static list is learned and evaded
sn: Identity | Verification that the signer is the true owner | The document alone | A forged document can look perfect, and impersonation succeeds when only the paper is checked
sn: Network | Networks of notaries, agents and buyers linked across cases | A single deal looked at in isolation | Rings reuse the same notaries and addresses, and no single case shows it
sig: Ownership change speed | days between the first filing and the transfer to a new owner or a loan against the property | Fast transfers are typical of fraud | Legitimate rushed sales exist, so combine with other signals
sig: Notary frequency | number of filings by the same notary in the last 30 days compared with their norm | Rings use a small number of notaries | Busy notaries are legitimate, so compare with their norm
sig: Vacant or no-mortgage property | flag for property that is vacant or has no mortgage | Fraudsters target properties that nobody is watching | Data on occupancy are incomplete
sig: Signature similarity | similarity score of the signature against previous filings by the owner | Detects forged signatures | Image quality and ageing change signatures, so use a threshold with a review
noise: Parcel number | An identifier that has no link to fraud
noise: Document format | The file format differs between submitters and carries no fraud signal
noise: Seller name | A name is personal data and does not indicate fraud
base: Manual title search and checklists, because they are standard.
prod: Graph and tabular models on transfer patterns, document checks and an investigator queue.
pipe: Recording data @ registry ; Entity graph @ graph store ; Feature builder @ Spark ; Fraud model @ boosting plus GNN ; Document checks @ vision ; Investigator queue @ case tool ; Outcome log @ warehouse
edge: Elderly owners | Elderly owners are targeted by fraudsters and are often victims | Give protective alerts to owners flagged at higher risk and add review before recording
edge: Estate sales | Estate sales look unusual but are legitimate | Add context about estates and avoid blocking on this alone
edge: Cross-county | Fraud is spread across counties so no single registry sees the pattern | Link records across counties and share indicators
off: PR-AUC ; Recall
on: Fraud prevented ; Delays
gap: Few labelled cases and many undetected ones make the recall unknowable ; Hidden fraud, since detected cases are those that were easy to detect

== roof-condition-from-aerial-imagery | Roof Condition from Aerial Imagery | computer-vision | batch | production-grade | a=0.05 k=4000
obj: Classify roof material, age and damage from aerial imagery for underwriting, maintenance and valuation.
loss: \mathcal{L}=\mathcal{L}_{\text{seg}}+\lambda\,\mathrm{Ordinal}(\hat{q},q)
con: The date of the imagery is shown with every grade ; Results are for a single property and never a neighbourhood average ; A person reviews any adverse decision based on the grade ; Imagery licences are respected
sn: Material | The roof material recognised by texture and pattern | The colour of the roof | Colour misleads, since weathering turns many materials grey and paint changes it
sn: Condition | A condition grade on a scale with defined levels | A binary good or bad flag | The grade drives action, and a binary flag does not separate a minor repair from a replacement
sn: Date | The age of the image shown with the grade | Assuming the latest image is current | A stale image misses recent repairs and recent storm damage
sig: Roof segmentation | intersection-over-union of the predicted roof mask with labelled outlines | The base for every other measure | Shadows and tree edges confuse the mask
sig: Material class | predicted material from texture, such as tile, metal, asphalt or flat membrane | Material affects life expectancy and risk | Rare materials are under-represented
sig: Damage score | model score for missing tiles, staining, patching and sagging | The direct condition signal | Resolution limits what the model can see
sig: Image age | months since the image capture date | Tells the user how far to trust the grade | Metadata may be wrong, so validate
noise: Image tile | A division of the image that has no meaning for the roof
noise: Sensor | The camera type changes appearance but not the roof condition
noise: Cloud | Cloud shadow affects the image and not the condition of the roof
base: Inspector visits, because they are accurate and costly.
prod: Segmentation and classification with condition scoring and imagery age rules.
pipe: Imagery @ providers ; Footprint match @ geospatial ; Roof model @ vision ; Condition scorer @ model ; Rules @ policy ; Underwriter view @ app ; Archive @ lakehouse
edge: Tree cover | Tree cover hides part of the roof so condition cannot be graded | Flag the occlusion and request another image or an inspection
edge: Recent repair | A recent repair is not in a stale image | Show the image date and prefer fresher imagery for adverse decisions
edge: Solar panels | Solar panels are mistaken for roof damage or a different material | Add a solar-panel class and mask it in condition scoring
off: Condition accuracy ; Material F1
on: Inspection avoided ; Loss ratio
gap: The date of the imagery rarely matches the date of the decision, so errors rise in real use ; Rare materials are under-represented, so average accuracy hides poor results for them

== closing-process-delay-prediction | Closing Process Delay Prediction | tabular | batch | foundational | a=1 k=5
obj: Predict which home purchases will miss their closing date and why, so agents and lenders chase the right items.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Scores refreshed daily with the latest transaction status ; Each score shows the reasons behind it ; Output is a worklist of items to chase and not just a number ; Personal and financial data limited to what the coordinator needs
sn: Cause | The specific cause of a likely delay, such as appraisal or title | A delay probability alone | Actions differ by cause, so a number with no cause does not tell a coordinator what to do
sn: Stage | The process stage the transaction is in | Calendar time to closing | Risk depends on stage, and a deal ten days out at the appraisal stage is riskier than one at clear-to-close
sn: Action | Actionable items such as a missing document or an unsigned form | A score the coordinator cannot act on | A score without a task list is ignored, and the value is in the chase
sig: Outstanding conditions | count of lender conditions not yet cleared | The more conditions open, the higher the delay risk | Counts vary by lender, so normalise by loan type
sig: Appraisal status | state of the appraisal: not ordered, ordered, received or disputed | Appraisal problems are a main cause of delay | Status updates come late, so use time since the last change
sig: Lender responsiveness | median days the lender takes to respond to requests in the last 10 deals | A slow lender predicts a delayed closing | Small samples for smaller lenders
sig: Days to close | days between today and the contract closing date | Time left to fix the open items | Extensions change the date, so use the current agreed one
noise: Buyer name | Personal data with no predictive value
noise: Property photo | Appearance of the home does not affect the closing process
noise: Agent | The agent's name captures habit and not the status of the deal
base: Checklists with due dates, because coordinators use them.
prod: Gradient boosting on stage features with reason codes and a coordinator worklist.
pipe: Transaction data @ platform ; Feature builder @ Spark ; Delay model @ boosting ; Reasons @ SHAP ; Worklist @ CRM ; Outcome log @ warehouse ; Monitor @ dashboard
edge: Rate lock expiry | A rate lock expires before closing and adds cost | Flag locks that expire before the closing date and prompt the lender
edge: Appraisal gap | The appraisal comes in below the contract price | Flag early signs of an appraisal gap and prepare the buyer and agent
edge: Chain sales | A purchase depends on another sale that is delayed | Link chain transactions and propagate the delay risk
off: PR-AUC ; Calibration
on: On-time closings ; Coordinator time
gap: Outcomes after action, because coordinators chase risky deals and thereby change the result ; Seasonality, since volumes and delays differ by month

== rental-listing-scam-detection | Rental Listing Scam Detection | nlp,computer-vision,graph | sub-100ms | production-grade | a=2 k=60
obj: Detect fake rental listings and advance-fee scams at posting time using text, images, price and account behaviour.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Decision within 80 ms when a listing is submitted ; Legitimate listings are rarely blocked, with a stated false-block ceiling ; Landlords can appeal a block and get a human review ; Personal data used only to detect fraud and kept to a minimum
sn: Behaviour | Account and posting behaviour such as age, velocity and contact pattern | Text alone | Scammers reuse photos and templates but rewrite the words, so text alone is evaded
sn: Price | Price compared with similar homes in the same area | The absolute price | A rent that is too good to be true for the area is the lure, not the amount
sn: Network | Accounts linked by shared images, devices and contact details | A single listing seen on its own | Scam rings run many listings from many accounts, and each looks small
sig: Image reuse | perceptual-hash match against an index of images seen in other listings and on other sites | Stolen photos are the most common scam sign | Legitimate agents reuse images across their own listings
sig: Price vs market | ratio of the asking rent to the median rent of similar homes nearby | Prices well below market are a lure | Rent control creates legitimate low rents
sig: Account age and velocity | number of listings posted in the first 24 hours of an account's life | New accounts that post many listings are suspicious | Legitimate agencies onboard in bulk
sig: Contact pattern | share of messages that push to move off the platform or request payment | Scammers want to leave the platform quickly | Uses message text, so apply privacy controls
noise: Title style | Writing style varies and is easily copied by scammers
noise: Photo count | Not a reliable differentiator once image reuse is measured
noise: Time posted | Weak relation, since scams are posted at all hours
base: Rules on price and keywords, because portals start there.
prod: Real-time scoring with image-reuse search, price models and account graph features and a review queue.
pipe: Posting API @ portal ; Feature service @ Redis ; Image reuse search @ vector index ; Scam model @ boosting ; Policy @ rules ; Moderation queue @ tool ; Outcome log @ Kafka
edge: Legit low price | A genuinely low price under rent control looks like a scam | Add the rent-control context so legitimate low rents are not blocked
edge: Reposted listing | A legitimate agent reposts the same listing and images | Link reposts to the same account and allow them within limits
edge: New scam pattern | A new scam pattern appears that the model has not seen | Monitor drift, retrain on new reports and add rules for urgent patterns
off: PR-AUC at fixed FPR ; Recall
on: Scam exposure ; False blocks
gap: The data contain reported scams only, which are the ones that victims noticed ; Adversarial drift, since scammers change patterns once they are caught

== property-tax-assessment-anomaly-detection | Property Tax Assessment Anomaly Detection | tabular | batch | production-grade | a=1 k=5
obj: Find properties whose assessed value is far from their expected market value so assessors fix inequity and appeal risk.
loss: \mathcal{L}=\mathrm{Huber}(\log\hat{y}-\log y)+\lambda\,\mathrm{Pinball}(\hat{q}_{0.9},y)
con: Assessments are equitable across areas and property types ; Each flagged anomaly has an explanation an assessor can check ; The owner's right to appeal is unaffected ; Run in the annual assessment cycle with time to correct before notices
sn: Ratio | The ratio of assessed value to sale price | The assessed value alone | The ratio shows whether a home is over or under-assessed relative to the market
sn: Fairness | Equal treatment across price bands and neighbourhoods | Average accuracy | Assessments are often regressive, with cheaper homes assessed higher against their value, and averages hide it
sn: Change | Updated attributes such as extensions and renovations | Static records | Records go stale, and an unrecorded extension under-assesses a home
sig: Assessment ratio | assessed value divided by the adjusted sale price for recent sales | The standard equity measure | Few sales in an area give noisy ratios
sig: Neighbourhood ratio | median ratio of comparable properties in the same neighbourhood | Puts a property's ratio in context | Neighbourhood boundaries are arbitrary
sig: Unrecorded changes | building permits and aerial change detections not reflected in the record | Finds under-assessed properties | Permit data are incomplete
sig: Sale price gap | difference between the last sale price and the current assessment, adjusted for market movement | An anomaly marker | Non-arm's-length sales distort it
noise: Owner | The owner's identity should not affect an assessment
noise: Parcel ID | An administrative key with no value signal
noise: Appeal count | Weak, as appeals depend on owners' resources more than on error
base: Periodic reassessment by area factors, because it is common.
prod: AVM-based expected value with anomaly scoring and a review list for assessors.
pipe: Assessment roll @ county ; Sales @ registry ; AVM @ boosting ; Anomaly scorer @ model ; Review list @ rules ; Assessor tool @ UI ; Outcome log @ warehouse
edge: Few sales | Few sales in an area leave the expected value uncertain | Use wider intervals or pool nearby areas
edge: New build | A new build has no sale history | Use priors from comparable new builds and build costs
edge: Exemptions | Exemptions and special assessments make values differ legitimately | Apply the exemption rules before scoring anomalies
off: COD and PRD ; Anomaly precision
on: Appeal rate ; Equity measures
gap: Sales selection, since sales are not a random sample of properties ; Stale attributes in the training data make the model learn the errors of the records
