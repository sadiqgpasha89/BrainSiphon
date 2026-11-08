# BFSI: Banking, Financial Services & Insurance, part 2 (use cases 26-50): capital-markets ops, wealth, insurance, customer operations
== collateral-margin-call-dispute-prediction | Collateral Margin Call Dispute Prediction | tabular | batch | production-grade | a=1 k=3
obj: Predict which margin calls a counterparty will dispute so the collateral team resolves valuation differences before the call deadline.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Scores ready before the morning call cycle ; Explanation per flagged call ; Dispute handling follows the legal agreement ; No client data leaves the bank
sn: Cause | Source of the valuation gap: price source, trade population or FX rate | The size of the call alone | Large calls are often accepted while small ones with a model difference are disputed
sn: Timing | State known before the call is issued | Status after the counterparty replies | Reply status leaks the label
sn: Counterparty | Dispute history by agreement and asset class | A single counterparty score | Behaviour changes by product
sig: Valuation gap to counterparty mark | our mark minus the last agreed mark, scaled by notional | Disagreement predicts dispute | Marks must be same-day
sig: Dispute rate 90d | disputed calls divided by calls for the agreement | Repeat behaviour | Window ends the day before
sig: Trade population mismatch | trades present on one side only | Reconciliation issues drive disputes | Population snapshots must be pre-call
sig: Eligible collateral change | recent changes to the collateral schedule | New terms cause confusion | Change dates may be loaded late
noise: Analyst name | irrelevant to the counterparty
noise: Call reference number | arbitrary
noise: Call time stamp seconds | no signal
base: Flag calls above a size threshold from counterparties with prior disputes, because the team already uses it.
prod: Gradient boosting on valuation gaps, population mismatch and dispute history, ranked by value at risk with the top reasons shown.
pipe: Call data extract @ collateral platform ; Mark comparison @ valuation service ; Feature builder @ Spark ; Dispute model @ gradient boosting ; Priority list @ rules with capacity ; Collateral analyst desk @ workflow tool ; Outcome capture @ warehouse
edge: Month-end volatility | many marks diverge at once | Volatility regime flag and a wider review list
edge: Agreement amendment | threshold changes mid-quarter | Versioned terms with effective dates
edge: New counterparty | A counterparty with no dispute history gets a flat, uninformative score | Fall back to agreement-type and asset-class priors and widen the review list for new counterparties
off: PR-AUC at team capacity ; Calibration by counterparty group
on: Disputes resolved before deadline ; Days of unsettled margin
gap: Features captured after the reply ; Counterparty overlap across train and test

== fund-nav-break-detection | Fund NAV Break Detection | tabular,time-series | batch | production-grade | a=1 k=4
obj: Detect errors in daily fund net asset value before publication so administrators fix pricing and accrual errors first.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Huber}(\hat{r}-r)
con: Check completes within 30 minutes of the pricing cut-off ; Every flag names the likely line item ; Tolerance bands set by fund type ; Auditable
sn: Attribution | NAV change explained by price moves, flows and accruals | Total NAV change | A move can be right in total and wrong in components
sn: Tolerance | Bands per fund type and asset mix | One global threshold | Money-market and equity funds move very differently
sn: Source | Independent price check | The same vendor price twice | A vendor error passes silently
sig: Unexplained NAV residual | NAV change minus attributed price, flow and accrual effects | Direct error indicator | Needs correct holdings and FX
sig: Stale price count | holdings with unchanged price for 3+ days | Stale prices distort NAV | Illiquid assets are often stale legitimately
sig: Price jump versus peers | holding return minus peer index return | Detects bad marks | Peer sets must be right
sig: Accrual swing | day-on-day change in fee and income accruals | Accrual errors are common | Month-end schedules
noise: Fund name | no signal
noise: Administrator staff | irrelevant
noise: Report time stamp | arbitrary
base: Fixed percentage tolerance on NAV change per fund, because administrators already use it.
prod: Attribution engine producing residuals, plus an anomaly model per fund type on residual and context, ranked by NAV impact in basis points.
pipe: Holdings and prices @ fund accounting system ; NAV attribution @ rules engine ; Residual anomaly model @ gradient boosting ; Impact ranker @ rules ; Reviewer queue @ operations tool ; Correction log @ audit store ; Model monitor @ dashboard
edge: Large subscription | A large subscription changes the NAV through flows and looks like a pricing error | Attribute the NAV change to flows before testing for a break
edge: Corporate action not booked | Holdings and prices disagree because an action has not been booked | Cross-check holdings against the corporate action feed and flag unmatched events
edge: Market holiday in one region | Prices in one region do not change because the market is shut and the check reads it as a stale price | Use a holiday calendar for each market and suppress the stale-price test on closed days
off: Recall of known breaks at fixed review load ; Precision of flags
on: NAV errors published ; Review time per fund
gap: Labels only for breaks found later ; Calm-period tuning

== advisor-next-best-conversation-copilot | Wealth Advisor Next-Best-Conversation Copilot | llm-agents,recommender | seconds | production-grade | a=2 k=40 s=5 t=600
obj: Suggest which clients an advisor should contact and why, with a drafted talking-points note built from the client's own records.
loss: \mathcal{L}=\mathrm{BPR}(\hat{y},y)+\lambda\,\mathrm{CE}(\hat{y},y)
con: Every suggestion cites client data ; Advisor decides and sends ; Suitability rules checked before any product mention ; Client data stays in the bank tenancy
sn: Trigger | Concrete events: maturity, cash drift, life event, market move | Generic contact schedules | Calls without a reason are ignored
sn: Suitability | Product ideas filtered by client profile and rules | Highest-margin product | Mis-selling risk is a regulatory issue
sn: Evidence | Notes drafted from records with citations | Free-form generated advice | Unsupported statements create liability
sig: Cash drift | idle cash above the target for 30 days | Clear reason to call | Account balances must be fresh
sig: Portfolio drift | deviation from the agreed allocation | Triggers a rebalancing talk | Mandate definitions differ
sig: Maturity ladder | products maturing in the next 60 days | Time-bound reason | Missing for some accounts
sig: Advisor action rate | share of past suggestions acted on | Learns usefulness | Reflects advisor habits
noise: Client last name | irrelevant
noise: Advisor tenure | weak
noise: Email open rate | weak link to need
base: A weekly list of clients ranked by assets and days since last contact, because it is what advisors use now.
prod: A ranker over trigger features with a drafting agent that retrieves the client record and policy, writes cited talking points and passes a suitability checker before showing.
pipe: Client data hub @ CRM and portfolio systems ; Trigger detector @ rules and stream jobs ; Contact ranker @ learning-to-rank ; Note drafter @ LLM with retrieval ; Suitability checker @ rules plus entailment ; Advisor inbox @ CRM ; Feedback log @ warehouse
edge: Vulnerable client | life event needs a careful approach | Vulnerability flag routes to a specialist note
edge: Conflicting mandates | joint account holders differ | Show both and ask the advisor
edge: Model-generated figure wrong | number mismatches the system | Typed tools for all figures and a number check
off: NDCG on past advisor actions ; Citation validity
on: Meaningful conversations per advisor-week ; Client assets retained
gap: Past actions reflect advisor taste ; Features computed after the contact

== suitability-and-mis-selling-detection | Suitability & Mis-Selling Detection | nlp,tabular | batch | production-grade | a=0.2 k=30
obj: Review advised sales and call records to find products that do not fit the client's profile or were sold with misleading statements.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{CE}(\hat{y},y)
con: Reviewers see evidence for each flag ; Review capacity of 400 cases a week ; Records retained under conduct rules ; No automatic customer redress
sn: Fit | Product risk against client profile and objectives | Product category alone | Complex products suit some clients
sn: Statement | Specific misleading claims in the call or note | Overall tone | Pushy tone is not always misleading
sn: Sampling | Risk-based sampling of sales for review | Random sampling only | Rare breaches are missed
sig: Risk mismatch | product risk class minus client risk tolerance | Core suitability signal | Questionnaires age
sig: Concentration after sale | share of wealth in the product | Over-concentration | Needs the full balance sheet
sig: Claim phrases | guaranteed, no risk, always, as phrases in transcripts | Misleading statements | Context matters
sig: Advisor pattern | advisor's rate of flagged sales | Behavioural signal | Penalises high volume advisors unfairly
noise: Call duration | weak
noise: Client age alone | proxy for vulnerability, handle separately
noise: Branch | administrative
base: Random sampling of sales plus a rule list on product and client risk, because it is the standard control.
prod: A tabular model over fit features with a transcript model for claims, producing a ranked review list with evidence snippets.
pipe: Sales records @ advice platform ; Call transcripts @ speech to text store ; Fit feature builder @ Spark ; Fit model @ gradient boosting ; Claim detector @ encoder classifier ; Review list builder @ rules with capacity ; Compliance workbench @ case tool
edge: Updated client profile after sale | A client's risk profile changes after the sale, so fit at the time cannot be read from today's profile | Use the client profile as it stood on the sale date and keep a history of changes
edge: Joint advice | A sale to two clients with different profiles fits one and not the other | Evaluate suitability against both profiles and flag the more cautious one
edge: Transcript errors | speech to text misses words | Confidence-aware flags and audio links
off: Precision at review capacity ; Recall on confirmed breaches
on: Confirmed breaches found per 100 reviews ; Time to detect
gap: Confirmed breaches are those that complained, a biased label ; Same advisor in train and test

== tax-aware-portfolio-rebalancing | Tax-Aware Portfolio Rebalancing | reinforcement-learning,tabular | batch | staff-principal | a=0.1 k=20
obj: Recommend trades that bring accounts back to target allocation at the lowest tax and trading cost.
loss: \min_{x}\;\sum_{i}\mathrm{Drift}_i^2+\lambda\sum_{j}\mathrm{Tax}_j\,x_j+\mu\sum_{j}\mathrm{Cost}_j\,x_j
con: Respect client restrictions and wash-sale rules ; Trade lists explainable to the advisor ; Daily scan, monthly trading ; Minimum trade size
sn: After tax | Return after tax and cost | Pre-tax tracking error alone | A perfect rebalance can cost more than it earns
sn: Lots | Tax lot selection | Average cost | Lot choice changes the tax by large amounts
sn: Tolerance | Drift bands to avoid churn | Rebalance to target every time | Churn costs more than small drift
sig: Drift versus band | allocation minus target relative to the band | Trigger | Targets change
sig: Unrealised gain by lot | gain per lot and holding period | Tax cost | Lot data errors
sig: Cash flow available | contributions and income | Can rebalance without selling | Timing
sig: Trading cost estimate | spread and fee by security | Cost | Estimates vary
noise: Account nickname | irrelevant
noise: Advisor | irrelevant
noise: Statement date | arbitrary
base: Calendar rebalancing to target with a drift threshold, because it is common practice.
prod: A convex or mixed-integer optimiser with lot-level tax models and cost estimates, wrapped in a policy check and advisor review.
pipe: Positions and lots @ custody feed ; Target allocation service @ model portfolios ; Cost and tax estimator @ rules and boosting ; Optimiser @ convex solver ; Compliance check @ rules ; Advisor review @ portfolio tool ; Trade file @ OMS
edge: Wash-sale | repurchase within the window | Window tracking across accounts
edge: Concentrated stock | large gain with restrictions | Staged sales and hedge options
edge: Client withdraws cash | The client withdraws cash after the plan is made, so the trade list no longer matches the account | Re-solve at run time against the latest balances and drop trades that no longer fit
off: After-tax tracking error ; Tax saved versus naive
on: Net-of-tax return ; Turnover
gap: Back-test ignores lot constraints ; Static prices

== mutual-fund-flow-forecasting | Mutual Fund Flow Forecasting | time-series | batch | production-grade | a=1 k=2
obj: Forecast daily subscriptions and redemptions per fund so portfolio managers hold the right cash and treasury can plan liquidity.
loss: \mathcal{L}=\sum_t\mathrm{Pinball}(\hat{q}_{0.9},y_t)+\lambda\,\mathrm{MSE}(\hat{y}_t,y_t)
con: Forecast by 06:00 ; Intervals required ; Explainable drivers ; Large-flow events flagged
sn: Net vs gross | Subscriptions and redemptions modelled separately | Net flow only | Offsetting flows hide risk
sn: Calendar | Month-end, tax dates and salary cycles | Day of week only | Flows follow investor calendars
sn: Performance | Performance relative to peers with a lag | Recent return only | Flows chase past performance
sig: Day-of-month profile | median flow by day type | Seasonality | Calendar shifts
sig: Trailing relative performance | 3 and 12 month return versus category | Flow driver | Lagged reporting
sig: Market stress indicator | volatility index level | Redemption pressure | Regime changes
sig: Distributor activity | orders from the top platforms | Large flows visible early | Data timing
noise: Fund brand colour | irrelevant
noise: Fund manager name | weak
noise: Weather | no link
base: Same-day-last-year flow scaled by AUM, because treasury uses it.
prod: Quantile gradient boosting by fund group with calendar, performance and stress features and an event overlay for large investors.
pipe: Transfer agent data @ flow feeds ; Feature builder @ Spark ; Flow model @ quantile boosting ; Event overlay @ rules ; Forecast store @ lakehouse ; PM dashboard @ BI ; Monitor @ drift dashboard
edge: Large institutional redemption | One investor redeems a large amount and the forecast is dominated by a single event | Flag concentrated holders and take their intentions as manual inputs
edge: Fund merger | A fund merger breaks the flow history so the model sees a sudden level change | Link predecessor and successor series and add a merger event flag to the features
edge: Market crash | Flows in a crash leave all history behind and the model underestimates redemptions | Scale forecasts with a stress regime and use scenario analysis alongside the model
off: Pinball loss ; Coverage of the 90% interval
on: Cash drag ; Forced sales
gap: Using final data instead of as-known data ; Calm-year back-test

== private-wealth-client-attrition | Private Wealth Client Attrition Early Warning | tabular | batch | production-grade | a=0.1 k=15
obj: Identify high-net-worth clients likely to move assets away in the next 6 months so the relationship team can act.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Rank only, no automatic action ; Explainable reasons ; Advisor capacity 50 calls a week ; Data from internal systems only
sn: Outflow | Net asset outflow share, not only account closure | Account closure flag | Clients thin accounts before leaving
sn: Advisor | Advisor changes and departures | Client attributes only | Advisor exits drive attrition
sn: Life events | Inheritance, sale of business | Age | Events trigger reviews
sig: Net outflow 90d share | outflows over assets for 90 days | Leading indicator | Seasonal tax payments
sig: Contact gap | days since the last advisor contact | Neglect | Contacts logged late
sig: Performance gap | client return versus benchmark and peer | Dissatisfaction | Mandate mismatch
sig: Advisor departure | advisor leaving the firm | Large effect | Known in advance
noise: Client birthday | irrelevant
noise: Account opening channel | cohort
noise: Email domain | weak
base: Rule list on outflows and contact gaps, because relationship managers use it.
prod: Gradient boosting with survival framing on outflow, advisor and performance features, calibrated and ranked by assets at risk.
pipe: Client and account data @ wealth platform ; Event feed @ CRM ; Feature builder @ Spark ; Attrition model @ boosting ; Value ranker @ rules ; RM call list @ CRM ; Outcome capture @ warehouse
edge: Planned large withdrawal | A client withdraws money for a house purchase and the model reads it as leaving | Allow advisors to record planned withdrawals and exclude them from attrition signals
edge: Advisor departure | When an advisor leaves, their clients leave as a group | Treat the departing advisor's book as a group case with a retention plan
edge: Market fall | A market fall widens the performance gap for every client and raises attrition scores for all | Use peer-relative performance features so the market effect is removed
off: PR-AUC ; Calibration
on: Assets retained ; Save rate of called clients
gap: Retention actions change labels ; Random split leaks households

== investment-research-qa-copilot | Investment Research Q&A Copilot | llm-agents,nlp | seconds | production-grade | a=3 k=70 s=5 t=700
obj: Answer analysts' questions from the firm's research notes, filings and data with citations and clear abstention.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Every claim cites a document and its publication date ; An analyst sees only the research they are entitled to, enforced at retrieval ; Restricted-list and information-barrier rules are applied before any text is retrieved ; No document or question leaves the firm's environment
sn: Currency | The latest version of each note, estimate and filing | Any passage that matches the question | An old earnings estimate can be the closest text match and still be wrong
sn: Entitlement | Access rights applied when documents are retrieved | A filter applied after the answer is written | A summary can leak restricted content even when the quoted text is removed
sn: Numbers | Figures read from the firm's data service | Numbers copied from note text | Transcription errors and stale tables put a wrong figure into an answer that looks cited
sig: Citation validity | share of claims whose cited passage entails the claim | The core quality measure | A passage may exist and not support the claim, so test entailment
sig: Retrieval recall | share of questions where the gold passage is in the top k | Everything depends on retrieval | Gold sets are costly to build, so sample across sectors
sig: Abstention precision | share of refusals that were correct because the evidence was missing | Limits confident wrong answers | Over-refusal lowers usefulness, so track both
sig: Freshness | age in days of each cited source against the latest available version | Prevents stale answers | Dating metadata are often missing or wrong
noise: Note length | A style of the author and not a mark of relevance
noise: Author | Weak signal once the content is matched, and it invites bias to star analysts
noise: Rating word frequency | Counts of words like buy reflect the author's tone and not the facts
base: Keyword search across the research portal, because analysts use it today.
prod: Hybrid retrieval with entitlements, structured data tools for figures, a verifier for claims and abstention when evidence is thin.
pipe: Research and filings index @ hybrid search ; Entitlement filter @ policy service ; Figure tools @ market data APIs ; Answer composer @ LLM with citations ; Claim verifier @ entailment model ; Analyst UI @ web app ; Feedback log @ warehouse
edge: Restricted-list company | A question concerns a company on the restricted list and an answer could breach an information barrier | Block restricted-list documents at retrieval and tell the analyst the topic is restricted
edge: Conflicting estimates | Two analysts publish different estimates for the same item | Show both estimates with dates and authors and do not pick one silently
edge: Prompt injection in a document | A document contains text that tries to instruct the assistant | Treat retrieved text as data and not instructions and enforce tool allow-lists
off: Citation validity ; Retrieval recall at 10
on: Analyst time saved per question ; Thumbs-down rate
gap: Evaluating on questions where the relevant notes are known flatters retrieval ; Entitlements differ by tester, so a test run by a senior user hides access failures

== fund-factsheet-generation-with-compliance-review | Fund Factsheet Generation with Compliance Review | llm-agents,nlp | seconds | production-grade | a=0.1 k=60 s=4 t=800
obj: Generate monthly fund factsheet commentary from portfolio data and manager notes, checked by a compliance verifier before review.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Figures come from the performance system ; Forbidden phrases and forward-looking claims blocked ; Compliance signs every factsheet ; Version history kept
sn: Source | Figures from the system of record | Figures typed by the model | Wrong performance numbers are a regulatory event
sn: Language | Approved disclosures and balanced wording | Promotional language | Regulators check balance
sn: Review | Verifier plus human sign-off | Human only | Reviewers miss numbers
sig: Figure match | share of numbers equal to the source | Accuracy | Rounding rules
sig: Banned phrase rate | rate of phrases from the blacklist | Compliance | List maintenance
sig: Edit distance | changes by compliance | Usefulness | Style edits
sig: Disclosure presence | required statements present | Completeness | Per jurisdiction
noise: Draft length | style
noise: Manager mood | irrelevant
noise: Font choice | cosmetic
base: Template with manager-written commentary, because it is the current process.
prod: Structured draft generation from data and notes, number and phrase verifiers, a disclosure checker and a compliance queue.
pipe: Performance data @ attribution system ; Manager notes @ document store ; Commentary drafter @ LLM with schema ; Number verifier @ rule checks ; Phrase and disclosure checker @ rules plus classifier ; Compliance review @ workflow ; Publish @ document system
edge: Late restatement | Performance figures change after the draft is written and the factsheet is wrong | Lock the data version at drafting and re-check every figure before release
edge: New regulation | Wording rules change and an approved template becomes non-compliant | Keep rules in configuration with effective dates and re-run the compliance check on templates
edge: Manager note contradictions | The manager's commentary contradicts the performance data | Flag the contradiction to the manager before the compliance review
off: Figure exact match ; Banned phrase recall
on: Time to publish ; Compliance rework
gap: Test notes are cleaner than real ones ; Rules change between test and live

== life-accelerated-underwriting | Life Insurance Accelerated Underwriting | tabular | seconds | production-grade | a=0.02 k=30
obj: Approve eligible life insurance applicants instantly using data already available, referring the rest to full underwriting.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Brier}(\hat{p},y)
con: Mortality-slippage budget set by the actuary ; Fair-treatment rules ; Explainable declines ; Regulatory data restrictions
sn: Mortality | Mortality outcomes versus the traditional process | Approval rate | Approving more is easy and can leak claims
sn: Selection | Referral band for uncertain risk | Binary approve or decline | The middle band protects the book
sn: Data | Permitted data with consent | Any data available | Some data is prohibited
sig: Disclosure consistency | answers versus prescription and records | Misstatement | Data coverage
sig: Prescription history flags | chronic medication categories | Health proxies | Fairness review
sig: Motor record | driving violations | Risk correlate | Jurisdiction limits
sig: Amount versus income | sum assured over income | Anti-selection | Verified income needed
noise: Application time | irrelevant
noise: Marketing source | cohort
noise: Email provider | proxy
base: Questionnaire rules with full underwriting for flagged cases, because it is the baseline.
prod: Gradient boosting trained against underwriting outcomes and claims, with a referral band and actuarial monitoring of mortality slippage.
pipe: Application API @ gateway ; Data enrichment @ consented data providers ; Risk model @ monotone boosting ; Eligibility rules @ rules engine ; Referral to underwriter @ workflow ; Decision letter @ document service ; Mortality monitor @ actuarial dashboard
edge: Data provider outage | A data provider outage leaves key inputs missing for an applicant | Refer the application to full underwriting instead of imputing, and log the outage for monitoring
edge: Late-disclosed condition | A claim shows that a condition was not disclosed and the fast decision was wrong | Feed the finding back to the model and audit the cases decided in the same way
edge: Fairness complaint | A customer complains of disparate outcomes in accelerated decisions | Run periodic fairness tests across protected groups and publish the results to compliance
off: AUC and referral rate ; Mortality ratio by decile
on: Instant decision share ; Mortality slippage
gap: Labels only for accepted applicants ; Long claim delay

== policy-lapse-and-persistency-prediction | Policy Lapse & Persistency Prediction | tabular,time-series | batch | production-grade | a=1 k=3
obj: Predict which policies will lapse so retention teams and the actuary can plan interventions and reserves.
loss: \mathcal{L}=-\sum_i\left[\delta_i\log h(t_i\mid x_i)-\int_0^{t_i}h(u\mid x_i)\,du\right]
con: Retention offers within conduct rules ; Monthly scoring ; Explainable ; Actuarial assumptions updated yearly
sn: Timing | Hazard by policy year and payment mode | Single yes or no | Lapse peaks around anniversaries and surrender charges ending
sn: Cause | Voluntary, non-payment and lapse due to price change | One lapse flag | Treatments differ
sn: Cohort | Duration and product vintage | Average persistency | Vintages differ
sig: Premium shock | renewal premium change | Price sensitivity | Known at renewal
sig: Missed payment count | missed or late payments | Distress | Grace period
sig: Surrender charge expiry | months until the charge ends | Timing | Contract data
sig: Service contacts | complaints and calls | Dissatisfaction | Logging
noise: Policy number | arbitrary
noise: Agent code | cohort
noise: Name | irrelevant
base: Persistency tables by product and year, because actuaries use them.
prod: Discrete-time hazard boosting with calibrated survival curves and a retention-uplift model for who to contact.
pipe: Policy admin extract @ nightly feed ; Feature builder @ Spark ; Lapse model @ boosting survival ; Uplift ranker @ causal model ; Campaign lists @ CRM ; Actuarial feed @ reserving system ; Monitor @ dashboard
edge: Regulation limits offers | Some retention offers are not allowed for certain customers | Apply offer eligibility rules before ranking so the list contains only lawful offers
edge: Product withdrawal | A product is withdrawn and many policies are forced to lapse, which looks like voluntary behaviour | Add an event flag and exclude forced lapses from the voluntary-lapse label
edge: Economic downturn | A downturn raises lapse rates beyond anything in the training years | Include macro covariates and report scenario-conditioned persistency alongside the baseline
off: Concordance ; Calibration by duration
on: Persistency uplift ; Retention cost per saved policy
gap: Contacted customers differ ; Ignoring censoring

== claims-triage-and-straight-through-processing | Claims Triage & Straight-Through Processing | tabular,nlp | seconds | production-grade | a=0.1 k=40
obj: Route each insurance claim to straight-through payment, standard handling or a specialist based on complexity and risk.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y_{\text{stp}})
con: Automatic payment only for claims below a set value and risk limit ; Fair-treatment and vulnerable-customer rules applied at triage ; Every routing decision explained in words the handler can read ; A full audit trail from first notice to payment
sn: Complexity | Expected handling effort and severity of the loss | The claim amount alone | A small claim can be complex, such as disputed liability, and a large one can be simple
sn: Safety | Straight-through only for low-risk, low-value claims | Maximising accuracy at any value | A wrongly paid claim is costly and hard to recover, so errors in this class must be rare
sn: Fraud | A separate fraud score alongside the complexity score | Using complexity as a proxy for fraud | Mixed signals send honest complex claims to a fraud team and let simple fraud pass
sig: First notice text | encoder embedding of the claim description mapped to complexity classes | Describes what happened in the customer's words | Language varies, so test across channels
sig: Coverage check | policy in force on the loss date and the peril covered, as binary flags | Eligibility decides whether a claim is payable at all | Data quality issues in policy records cause false denials
sig: Claimant history | number of claims by the claimant in the last 3 years | Patterns of repeated claims | Fair-use rules limit how it can be used
sig: Reserve estimate | initial reserve set by claim type and loss description | A first estimate of severity | Initial reserves are rough, so treat it as a prior
noise: Handler | The handler who first opens the claim has no bearing on its complexity
noise: Day filed | Weak relation to complexity once the type is known
noise: Channel | Reflects customer cohort and not the claim, so it risks unfair treatment
base: Rule-based routing by amount and type, because it is the current practice.
prod: A triage model over text and structured data, a straight-through policy with limits and an exception queue.
pipe: Claim intake @ portal and call centre ; Coverage verification @ policy service ; Triage model @ boosting plus encoder ; STP policy @ rules ; Handler queue @ claims system ; Payment @ payment service ; Outcome log @ warehouse
edge: Catastrophe surge | A catastrophe produces a surge of claims that overwhelms normal routing and capacity | Switch to surge rules with priority queues for vulnerable and high-severity claims and pre-agreed overflow handlers
edge: Mis-described loss | The claim is filed under the wrong peril so the routing and coverage check are wrong | Re-triage whenever new facts arrive and show the handler the peril the customer described
edge: Vulnerable claimant | A vulnerable claimant is routed to straight-through handling and not offered extra support | Run a vulnerability check on every claim and route flagged claimants to a trained handler
off: Routing accuracy ; STP leakage rate
on: STP share ; Cycle time
gap: Labels come from past routing decisions, so the model learns the old process and its biases ; Fraud found later is missing from the labels at training time

== subrogation-recovery-detection | Subrogation Recovery Detection | nlp,tabular | batch | production-grade | a=0.05 k=30
obj: Find paid claims where another party is liable so the insurer recovers money it would otherwise lose.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Huber}(\hat{r}-r)
con: Statute-of-limitations dates tracked for every candidate and shown to the reviewer ; A reviewer sees the evidence behind every flag ; Recovery effort weighed against the expected net value ; Privacy rules followed when sharing information with other insurers
sn: Liability | Evidence that a third party was at fault | The size of the claim | A large claim with no liable party recovers nothing, and size says nothing about fault
sn: Value | Expected recovery net of the cost of pursuit | The probability of recovery alone | A low-value recovery costs more to chase than it returns
sn: Timing | The deadline to start recovery for the jurisdiction | The age of the case | A missed deadline ends the claim to recover, regardless of its strength
sig: Fault phrases | presence of phrases such as rear-ended, third party driver or defective product in the claim notes | A text signal of liability | Phrases need context, since a customer may blame themselves
sig: Police report match | whether an attached report assigns fault to another party | A strong, formal signal | Reports are not available for every loss
sig: Counterparty insurer known | whether the other party and their insurer are identified | A recovery needs someone to claim from | Data are often incomplete early in the claim
sig: Days to limitation | days remaining to the limitation date for the jurisdiction | Sets the priority of review | Jurisdiction rules differ and change
noise: Adjuster | Who handled the claim does not decide whether a third party is liable
noise: Claim number | An arbitrary identifier with no signal
noise: Handling office | An administrative attribute that adds no fact about fault
base: Adjusters flag recovery by judgement, because that is the process.
prod: Text and tabular models for liability and recovery value, a deadline-aware ranker and a recovery team queue.
pipe: Claims data @ claims system ; Notes processor @ text pipeline ; Liability model @ encoder plus boosting ; Value estimator @ boosting ; Recovery queue @ workflow ; Legal tracker @ case tool ; Outcome feed @ warehouse
edge: Partial liability | Fault is shared between parties so a yes-or-no liability label misses part of the recovery | Model recovery as a percentage of the loss and rank by expected net recovery
edge: Opposing insurer disputes | The opposing insurer disputes liability and the case drags past the limitation date | Escalate to recovery counsel with a deadline alert well before the limitation period ends
edge: Missing evidence | There is no police report or evidence, so liability cannot be shown | Send standard evidence requests early and score the case with a missing-evidence flag
off: PR-AUC ; Recovery value captured
on: Recovery rate ; Cost per recovered dollar
gap: Past flags are biased to obvious cases, so the model repeats the cases staff already found ; Outcomes arrive months later, so recent flags have no result yet

== loss-reserving-with-machine-learning | Loss Reserving with Machine Learning | time-series,tabular | batch | staff-principal | a=1 k=4
obj: Estimate ultimate claim costs and their uncertainty by line and accident period to set reserves.
loss: \mathcal{L}=\mathrm{Poisson}(\hat{y},y)+\lambda\,\mathrm{Pinball}(\hat{q}_{0.75},y)
con: Reconcile with actuarial chain-ladder ; Uncertainty intervals required ; Quarterly sign-off ; Reproducible
sn: Triangle | Development of claims by accident and development period | Calendar-year totals | Changes in payment patterns hide in totals
sn: Case reserves | Adjuster reserve adequacy over time | Taking reserves as truth | Reserving practice changes
sn: Inflation | Claims inflation and legal trends | Constant development | Social inflation
sig: Development factors | incremental payments ratio | Pattern | Volatile at long tails
sig: Open claim count and severity | counts and average | Exposure | Reopened claims
sig: Case reserve strength | paid divided by incurred | Adequacy | Practice shifts
sig: Legal flag share | share with litigation | Severity driver | Late flags
noise: Handler | irrelevant
noise: Policy number | arbitrary
noise: Region code | noisy
base: Chain-ladder with actuarial adjustments, because it is the industry standard.
prod: Claim-level and triangle-level models blended with chain-ladder, bootstrap or quantile intervals and a drivers report.
pipe: Claims and payments @ data warehouse ; Triangle builder @ Spark ; Development model @ boosting ; Uncertainty engine @ bootstrap ; Actuary workbench @ notebook UI ; Reserve report @ finance system ; Back-test archive @ lakehouse
edge: Large loss | One large claim dominates the triangle and distorts the estimate | Separate large losses and model them on their own with a different method
edge: Process change | A faster payments process changes development patterns | Add process-change flags and weight recent development more
edge: Few data points | A new line of business has too few accident years to estimate development | Borrow development patterns from related lines with priors and report wider intervals
off: Reserve error against ultimate ; Interval coverage
on: Reserve volatility ; Release or strengthening
gap: Using final data in back-test ; Long delays
