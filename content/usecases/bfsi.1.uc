# BFSI: Banking, Financial Services & Insurance, part 1 (use cases 1-25): lending, treasury and capital-markets operations
== mortgage-underwriting-document-automation | Mortgage Underwriting Document Automation | nlp,computer-vision | seconds | production-grade | a=0.05 k=900
obj: Classify, extract and cross-check the documents in a mortgage file (payslips, bank statements, tax returns, ID, valuation) so underwriters review exceptions instead of retyping fields.
loss: \mathcal{L}=\mathcal{L}_{\text{det}}+\mathcal{L}_{\text{CTC}}+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Every extracted field links to its source page and box ; Income and identity fields never auto-accepted below the audit-agreed confidence ; Applicant data stays inside the bank tenancy ; Decision turnaround under 2 minutes per document pack
sn: Extraction scope | Fields that drive an affordability decision: gross income, employer, pay frequency, deductions | Extracting every printed field on the page | Wide extraction raises error surface while the decision uses ten fields
sn: Consistency | Cross-document checks: payslip net pay against the bank statement credit | Judging each document alone | A forged payslip looks perfect alone and fails only against the statement
sn: Layout shift | Template-free models robust to employer-specific payslip layouts | Per-template rules for the top 20 employers | Rules cover 60% of volume and silently fail on the long tail
sig: Net pay to statement credit match | absolute difference between payslip net pay and matched salary credit within 3 days of pay date | Genuine income reconciles, edited documents rarely do | Matching window must use document dates, not upload dates
sig: Document tamper score | font, compression and metadata inconsistency score per page | Edited PDFs carry editing artefacts | Scanner and phone-camera files must not be scored against born-digital files
sig: Field confidence margin | gap between top and second extraction hypothesis per field | Low margin predicts needed review | Margin must come from a calibrated model, not raw softmax
sig: Pay frequency consistency | implied annual income from payslip versus year-to-date figure | Mismatch flags misread periods | Year-to-date fields are absent on some payslips
noise: Page count of the pack | depends on the applicant's scanner and not on credit quality
noise: File name | set by the broker and changes between submissions
noise: Postcode of the applicant | proxy risk in a document task, adds nothing to extraction
base: Template-based OCR with regex validation and a manual queue for failures, because it is auditable and sets the cost floor.
prod: Layout-aware transformer for classification and extraction with calibrated field confidence, plus deterministic cross-document reconciliation rules and an underwriter exception queue.
pipe: Broker upload API @ API gateway with virus scan ; Document classifier @ layout transformer ; Field extractor @ LayoutLM-style model on GPU ; Cross-document reconciler @ rules engine ; Tamper checker @ image forensic model ; Underwriter review queue @ case management ; Extraction audit log @ immutable object store
edge: Phone photo of a payslip | skew, glare and shadows break the field boxes | De-skew and glare detection with a re-upload request when quality is below the threshold
edge: Multi-employer applicant | income lines from two payslips are summed or overwritten | Entity-aware grouping by employer before income aggregation
edge: Non-standard currency or date format | day and month swapped on foreign payslips | Locale detection per document and a unit test set per locale
off: Field-level exact match per field type ; Document classification macro-F1
on: Underwriter minutes per file ; Straight-through documents with no manual correction
gap: Test files from the same broker as training inflate extraction accuracy ; Synthetic payslips are cleaner than real phone photos

== mortgage-prepayment-and-default-risk | Mortgage Prepayment & Default Risk Modelling | tabular,time-series | batch | production-grade | a=1 k=3
obj: Forecast monthly prepayment and default for each mortgage so pricing, hedging, provisioning and servicing capacity use the right cash flows.
loss: \mathcal{L}=-\sum_i\left[\delta_i\log h(t_i\mid x_i)-\int_0^{t_i}h(u\mid x_i)\,du\right]+\lambda\,\mathrm{Brier}(\hat{p},y)
con: Competing risks, prepayment versus default, modelled jointly ; Rate-path scenarios from the treasury curve engine ; Monthly run under 3 hours for 4M loans ; Model passes independent validation
sn: Competing risk | Prepayment and default treated as competing exits with separate hazards | Predicting one outcome and discarding the other | Ignoring prepayment overstates default exposure on loans that would have left
sn: Rate incentive | Refinance incentive as current rate minus the market rate available to this borrower | Using the coupon alone | Coupon without the market rate cannot see a refinancing wave
sn: Burnout | Loans that skipped past refinancing waves are less sensitive later | Treating all borrowers as equally rate-sensitive | Pools look stable until a second wave arrives and prepayment undershoots
sig: Refinance incentive | current coupon minus prevailing offer rate for the borrower's LTV and score band | Drives rate-sensitive prepayment | Market rate must be as at the month, not today
sig: Loan seasoning curve | piecewise hazard by months since origination | Prepayment ramps over the first 30 months | Vintage and seasoning mix if not stratified
sig: Current LTV with house price index | balance divided by indexed property value using the local HPI | Negative equity blocks refinancing and raises default | HPI release lags the decision date
sig: Payment shock | scheduled payment change at the next reset divided by current payment | Reset shocks cause both prepayment and distress | The reset date must be known contractually, not learned from the outcome
noise: Broker name | proxies for vintage and product, not for behaviour
noise: Month-end balance rounding | numerical noise below any decision threshold
noise: Application channel | correlates with cohort effects that change every year
base: Pool-level CPR and CDR curves by seasoning and rate incentive, because servicers and traders already read them.
prod: Loan-level discrete-time competing-risk gradient boosting with macro-scenario covariates, calibrated against pool-level actuals each month.
pipe: Loan tape ingest @ nightly CDC from the servicing system ; Feature builder @ Spark with point-in-time tables ; Macro scenario service @ treasury curve engine ; Hazard model @ gradient boosting survival ; Cash-flow projector @ batch Python on Spark ; Validation report @ model risk dashboard ; Model registry @ MLflow with signed artefacts
edge: Rate regime never seen in training | model extrapolates refinancing behaviour badly | Scenario bands, monotone constraints on incentive and an overlay process approved by risk
edge: Forbearance programmes | borrowers pause payments but are not in default | Explicit forbearance state in the model and a separate outcome label
edge: Servicer transfer | loan history resets on the new system | Stable loan key and lineage checks at every transfer
off: Calibration of cumulative CPR and CDR by vintage ; Time-dependent concordance
on: Forecast error of monthly cash flow ; Provision movement explained by model drift
gap: Random split leaks vintages across train and test ; Back-test in a calm rate year hides refinancing waves

== commercial-loan-covenant-early-warning | Commercial Loan Covenant Breach Early Warning | tabular,time-series | batch | production-grade | a=0.1 k=40
obj: Predict which corporate borrowers will breach a financial covenant in the next two quarters so relationship managers act before the breach.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Predictions explainable to credit officers line by line ; Quarterly cycle after statements arrive ; No use of data the bank is not permitted to use for monitoring ; Full lineage for audit
sn: Headroom | Distance to the covenant threshold and its trend | Level of leverage or coverage alone | A firm at 3.9x against a 4.0x limit is riskier than one at 4.5x against 6.0x
sn: Reporting lag | Using the as-at date the figures were known to the bank | Using period-end dates for figures that arrived weeks later | Period-end dating leaks future information into training
sn: Definitions | Covenant defined exactly as in the facility agreement, with adjustments | Standard EBITDA from a data vendor | Contractual EBITDA differs by add-backs and the breach test uses the contract
sig: Covenant headroom and slope | current ratio minus threshold, plus 4-quarter linear trend | Shrinking headroom precedes breach | Use as-reported contractual definitions only
sig: Revenue momentum | quarter-on-quarter revenue growth from management accounts | Earnings fall before ratios break | Management accounts arrive late and are sometimes restated
sig: Liquidity cushion | undrawn committed lines plus cash divided by next-12-month debt service | Liquidity gaps push ratios | Facility availability must be as at the date, not current
sig: Account behaviour | change in overdraft usage and payment timing on the bank's own accounts | The bank sees stress in cash movements early | Only valid for borrowers whose main account is held here
noise: Sector label alone | too coarse, a sector spans healthy and weak firms
noise: Relationship age | weak link to near-term covenant stress
noise: Number of facilities | mixes size and complexity, no causal link
base: Rule-based watchlist on headroom under 15% plus two negative quarters, because credit officers already use it.
prod: Gradient boosting on headroom, trend and account-behaviour features with monotone constraints, calibrated per sector band, with a reason list for each flag.
pipe: Financial statement store @ spreading system and warehouse ; Covenant definition service @ contract-derived formulas ; Feature builder @ Spark point-in-time ; Breach model @ gradient boosting ; Watchlist ranker @ rules plus capacity cap ; Credit officer workbench @ review UI ; Outcome store @ lakehouse
edge: Waiver or amendment before breach | breach never occurs because terms were changed | Treat amendments as an event with its own label and exclude from negatives
edge: Restated accounts | historical ratios change after the fact | Version financials and train on first-reported values
edge: Parent group support | a weak subsidiary is propped by its parent | Add group-level features and guarantor flags
off: PR-AUC at the watchlist size ; Lead time of correct warnings
on: Breaches caught at least one quarter early ; Share of watchlist cases that needed action
gap: Using final accounts instead of as-reported ones inflates accuracy ; Random split leaks the same borrower across quarters

== credit-committee-memo-copilot | Credit Committee Memo Drafting Copilot | llm-agents,nlp | seconds | staff-principal | a=0.3 k=60 s=6 t=900
obj: Draft the credit memo for a corporate facility from the bank's own sources, with every number and claim cited, so analysts spend their time on judgment.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Every figure and claim cites an internal source ; No external data not licensed for credit use ; The analyst signs the memo and owns it ; Prompts, retrievals and drafts retained for model risk review
sn: Grounding | Each sentence tied to a retrieved source and a figure from the spreading system | Fluent narrative from the model's general knowledge | Fluent unsupported text passes casual review and fails at committee
sn: Numbers | Figures pulled from the spreading system through typed tools | Numbers typed from model memory | A transposed digit in a ratio can change a decision
sn: Judgement | Draft the facts, flag the risks, leave the recommendation to the analyst | Ask the model to recommend approval | The recommendation carries accountability that cannot be delegated
sig: Citation coverage | share of sentences with at least one valid source link | Unsupported sentences are the main risk | Links must be checked against the retrieved text, not just present
sig: Figure match rate | share of numbers in the draft equal to the spreading system value | Numbers must be exact | Rounding rules differ by section
sig: Section completeness | required template sections filled versus required | Committees reject incomplete memos | A filled section can still be empty of substance
sig: Analyst edit distance | tokens changed by the analyst before sign-off | A direct measure of usefulness | Low distance can mean rubber-stamping, review a sample
noise: Draft length | longer drafts are not better, committees prefer concise memos
noise: Model self-reported confidence | not calibrated for factual correctness
noise: Style similarity to old memos | copies old weaknesses along with the form
base: A fixed memo template filled by analysts from the spreading system, because it is the current process and defines the quality bar.
prod: Planner-executor agent with typed read tools on the spreading system, document store and news feed, retrieval over prior memos and policy, a citation verifier and an analyst approval step.
pipe: Request intake @ workflow tool ; Source retriever @ hybrid search over filings and prior memos ; Figure tool @ typed API on the spreading system ; Memo drafter @ LLM with structured output ; Citation verifier @ entailment checker plus number matcher ; Analyst review @ editor with tracked changes ; Memo audit store @ immutable store with prompts
edge: Contradictory sources | filings and management accounts disagree | Show both with dates and ask the analyst to resolve instead of choosing silently
edge: Confidential deal information | memo includes data from a restricted side of the bank | Entitlement checks on every retrieval and a hard block on restricted sources
edge: Prompt injection in a filing | text inside a PDF instructs the model | Treat retrieved text as data and strip instruction-like spans before use
off: Citation validity rate ; Figure exact-match rate
on: Analyst hours per memo ; Committee rework requests per memo
gap: Evaluating on memos the retriever has seen inflates grounding ; Edit distance rewards agreeable drafts

== sme-financial-statement-spreading | SME Financial Statement Spreading | nlp,computer-vision | seconds | production-grade | a=0.1 k=600
obj: Convert scanned or digital SME financial statements into standard spread lines so ratios and ratings use consistent definitions.
loss: \mathcal{L}=\mathcal{L}_{\text{det}}+\lambda\,\mathrm{CE}(\hat{y},y)
con: Totals must foot and balance, assets equal liabilities plus equity ; Each spread line traces to a statement cell ; Handles 12 accounting standards and 6 languages ; Under 90 seconds per statement
sn: Foot and balance | Arithmetic validation that rows sum and the balance sheet balances | Trusting extracted numbers because the text read cleanly | OCR confuses 3, 8 and 5 while a balance check catches it
sn: Mapping | Mapping to a standard chart of accounts by meaning and position | Matching label strings | The same item is labelled differently across firms and languages
sn: Period | Correct period and currency per column | Assuming the rightmost column is the current year | Comparative columns switch order across filers
sig: Foot check residual | difference between reported totals and the sum of lines | Residuals show extraction errors | Rounding in thousands needs a tolerance
sig: Label to account similarity | embedding similarity between a label and the account definitions | Handles synonyms and languages | Needs per-language calibration
sig: Column role classification | probability a column is current, prior or note | Drives period correctness | Layout varies by auditor
sig: Cross-statement consistency | profit on the income statement equals the movement in equity | Catches mapping errors | Dividends and other movements need explicit handling
noise: Logo and letterhead | irrelevant visual content
noise: Auditor name | no relation to the numbers
noise: Page background colour | scanner artefact
base: Template OCR and manual spreading by an analyst in the credit team, because it is trusted and sets the effort baseline.
prod: Table-structure model with layout transformer, line-to-account mapper with a confidence per cell, deterministic foot-and-balance validators and an analyst correction loop.
pipe: Statement intake @ email and portal upload ; Table detector @ layout model ; Cell reader @ OCR with constrained decoding ; Account mapper @ embedding classifier ; Validator @ accounting rules engine ; Analyst correction UI @ review tool ; Spread store @ warehouse with lineage
edge: Handwritten amendments | corrected figures are written on printed statements | Flag low-confidence handwriting and route to an analyst
edge: Consolidated versus entity statements | numbers from the group are spread as the borrower's | Detect scope from the title page and ask when ambiguous
edge: Hyperinflation or restated accounts | values need adjustment | Capture the standard and flag for analyst treatment
off: Cell exact-match accuracy ; Share of statements that foot and balance
on: Analyst minutes per statement ; Rating rework caused by spreading errors
gap: Clean statements in training hide scanner noise in production ; Same-auditor leakage inflates layout accuracy

== ifrs9-ecl-stage-allocation | IFRS 9 Expected Credit Loss Staging | tabular | batch | staff-principal | a=1 k=3
obj: Allocate each exposure to IFRS 9 stage 1, 2 or 3 and estimate lifetime expected loss so provisions respond to deteriorating credit without whipsaw.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Brier}(\hat{p},y)+\mu\,\mathrm{Calibration}(\hat{p})
con: Staging rules must be explainable to the auditor ; Monthly close under 4 hours ; Forward-looking scenarios from the economics team ; Stable stage migration, no oscillation month to month
sn: Significant increase | Change in lifetime PD since origination, not the level of PD today | Staging by current PD alone | A high-risk loan priced at origination for that risk has not deteriorated
sn: Stability | Hysteresis between stage 1 and 2 to avoid flip-flop | A single threshold evaluated monthly | Borrowers hovering near the cut-off swing provisions every month
sn: Scenarios | Probability-weighted scenarios | A single baseline forecast | Non-linear loss makes the weighted result larger than the baseline result
sig: Lifetime PD ratio | current lifetime PD divided by lifetime PD at origination | The standard relative test for stage 2 | The origination PD must be preserved, not re-estimated
sig: Days past due flag | payment more than 30 days overdue | The backstop for stage 2 | Counted on contractual due dates, not posting dates
sig: Watchlist and forbearance | internal flags for credit concern or concession | Qualitative indicators of increase | Flags must have effective dates to avoid leakage
sig: Macro sensitivity | portfolio PD elasticity to unemployment and rates | Drives forward-looking adjustment | Sensitivities are estimated on few downturns
noise: Customer tenure | weak link once behaviour is observed
noise: Number of products | proxy for relationship, not for risk
noise: Branch code | administrative noise
base: Rule-based staging on days past due and a PD ratio threshold, because it is simple and the auditors know it.
prod: Behavioural PD models with origination PD held, monotone gradient boosting, hysteresis rules on stage migration and a scenario engine that weights macro paths.
pipe: Exposure data mart @ nightly loads ; Origination PD vault @ immutable snapshot store ; Lifetime PD model @ monotone gradient boosting ; Scenario engine @ macroeconomic paths ; Stage allocator @ rules with hysteresis ; ECL calculator @ batch Spark ; Finance reconciliation @ GL feed
edge: Model change at quarter end | provisions jump for modelling reasons | Parallel run, bridge analysis and an approved overlay for transitions
edge: Missing origination PD for legacy loans | the relative test cannot be computed | Backcast under documented assumptions and flag exposures
edge: Pandemic-style payment holidays | arrears do not reflect distress | Policy-driven treatment and separate indicators
off: Calibration of PD by stage ; Stability of stage migration matrix
on: Provision volatility relative to credit losses ; Late stage-3 recognitions
gap: Random split ignores economic cycles ; Calibrating on benign years understates stage 2

== loan-hardship-case-triage | Loan Hardship Case Triage | nlp,tabular | seconds | production-grade | a=0.2 k=12
obj: Route incoming hardship requests to the right treatment and priority, quickly and fairly, while spotting customers in vulnerable circumstances.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y_{\text{vulnerable}})
con: Vulnerability flags reviewed by a trained human ; No automated refusal of hardship assistance ; Response within regulatory time limits ; Free-text stays inside the bank
sn: Intent | The kind of hardship (job loss, illness, bereavement, disaster) and the requested relief | Sentiment of the message | Calm messages can describe severe distress
sn: Urgency | Days to the next missed payment and size of the arrears | Message length or tone | Long emotional messages are not more urgent than a short precise one
sn: Fairness | Equal service quality across customer groups and languages | Optimising average handling time only | Efficiency gains can hide worse treatment of non-native speakers
sig: Days to next due date | next scheduled payment minus today | Urgency depends on time left | Dates must be contractual
sig: Arrears and history | current arrears, prior arrangements and recent contact | Predicts the appropriate treatment | Prior arrangements may have been miscoded
sig: Hardship category | classifier over the message and attachments | Chooses the treatment pathway | Categories overlap in real messages
sig: Vulnerability cues | phrases and context indicating illness, bereavement or coercion | Triggers a specialist team | Over-flagging overloads the team, under-flagging harms customers
noise: Time of day sent | no relationship to need
noise: Device type | proxy for income, unfair as a signal
noise: Spelling errors | proxy for education or language, not for hardship
base: Keyword routing with a form dropdown and a manual queue, because it is the current practice.
prod: Multilingual encoder for hardship category and vulnerability cues combined with tabular urgency features, a human-in-the-loop queue with service-level timers and explanation snippets for the agent.
pipe: Intake channel gateway @ web form and email parser ; Language and PII processor @ redaction service ; Hardship classifier @ multilingual encoder ; Urgency scorer @ gradient boosting ; Treatment router @ rules with queue limits ; Specialist case queue @ case management tool ; Outcome feedback @ lakehouse
edge: Third-party request | a family member writes on behalf of the customer | Capture authority status and route to identity verification
edge: Mixed topics | hardship is mentioned inside a complaint | Multi-label classification and routing by the highest-priority label
edge: Language not supported | the message is in a language outside training | Detect, route to a human translator and log coverage gaps
off: Macro-F1 per category and language ; Recall of vulnerability cues
on: Time to first response ; Share of vulnerable customers reached by a specialist
gap: Offline labels come from past routing, which carries its own bias ; Language mix in tests differs from live traffic

== collateral-valuation-and-haircut-monitoring | Collateral Valuation & Haircut Monitoring | tabular,time-series | batch | production-grade | a=1 k=5
obj: Revalue pledged collateral continuously and set haircuts so the bank is not under-secured when prices fall or liquidity dries up.
loss: \mathcal{L}=\sum_t\mathrm{Huber}(y_t-\hat{y}_t)+\lambda\,\mathrm{Pinball}(\hat{q}_{0.05},y)
con: Daily revaluation before the margin cut-off ; Haircuts follow the board-approved policy bounds ; Independent price sources for assets with no market ; Explainable to credit risk and audit
sn: Downside | Tail quantile of recovery value | Mean valuation | The mean hides the loss given a stress sale
sn: Liquidity | Time-to-sell and bid-ask for the asset class | Treating all collateral as liquid | Illiquid collateral loses value when it must be sold quickly
sn: Concentration | Exposure to the same collateral type across borrowers | Valuing each loan separately | Correlated falls hit all loans at once
sig: Price momentum and volatility | 20-day return and realised volatility of the reference price | Rising volatility widens haircuts | Use settlement prices, not stale quotes
sig: Liquidity proxy | traded volume and quoted spread over 30 days | Illiquid assets need larger haircuts | Volumes are missing for private assets
sig: Valuation age | days since the last independent valuation | Stale values drift from reality | Ageing must use the valuation date, not the booking date
sig: Concentration index | share of total pledged value in the same asset or region | Risk is non-linear in concentration | Group borrowers by common ownership first
noise: Collateral description free text | inconsistent wording, replaced by coded types
noise: Loan officer identifier | not related to collateral value
noise: Original appraiser name | proxy for cohort, not value
base: Static haircut table by asset class with annual valuation, because it is the policy default and auditors expect it.
prod: Quantile regression and volatility models for liquid assets, indexed valuation for property and private assets with stale-value penalties, and a haircut recommender capped by policy bounds.
pipe: Price feed ingest @ market data vendors ; Asset reference data @ collateral register ; Valuation model @ quantile gradient boosting ; Haircut calculator @ policy rules engine ; Exception reviewer @ credit risk workbench ; Margin call generator @ workflow ; Valuation history @ lakehouse
edge: Price feed outage | collateral is valued at yesterday's price | Fallback to the last good price with an age penalty and an alert
edge: Fire sale | forced selling widens spreads beyond the model | Stress overlay with liquidity multiples and a manual override
edge: Duplicate pledging | the same asset secures multiple loans | Registry matching on asset identifiers across the bank
off: Coverage of the 95% quantile on back-tests ; Valuation error against realised sale price
on: Under-secured exposure days ; Margin calls disputed because of valuation
gap: Back-test on calm markets misses stressed haircuts ; Sale prices selection bias, only defaulted loans are sold

== corporate-obligor-rating-migration | Corporate Obligor Rating Migration Prediction | tabular | batch | production-grade | a=0.1 k=30
obj: Predict the probability that a corporate borrower's internal rating moves up or down within 12 months to guide limits, pricing and watchlists.
loss: \mathcal{L}=\mathrm{OrdinalCE}(\hat{y},y)+\lambda\,\mathrm{Calibration}(\hat{p})
con: Ratings remain explainable and monotone in key drivers ; Credit committee override recorded ; Quarterly refresh ; Aligned to the regulatory rating scale
sn: Ordinality | Ordered rating classes with distance-aware loss | Unordered multi-class classification | Missing a one-notch move is far less costly than missing a five-notch drop
sn: Through the cycle | Migration conditional on the cycle phase | Averaging migration across years | Downturn years have much higher downgrade rates
sn: Rating source | Internal rating assigned by the bank at the date | Agency ratings as the label for all firms | Most mid-market firms have no agency rating
sig: Rating age and prior moves | months since last review and number of changes in 24 months | Stale ratings drift | Review dates may be late
sig: Margin and coverage trend | change in EBITDA margin and interest cover over 2 years | Operating stress precedes downgrades | Use contractual definitions
sig: Sector stress index | sector default rate and credit spread level | Sector shocks affect all firms | Index must be as at the date
sig: Account behaviour | drawdown speed and covenant waiver count | Early signs of stress | Waivers can be recorded late
noise: Company name length | no information
noise: Region of head office | weak, proxies for sector mix
noise: Number of directors | no stable link to credit migration
base: Historical transition matrix by rating class and sector, because it is the standard reference and is interpretable.
prod: Ordinal gradient boosting with monotone constraints and macro covariates, calibrated per rating class, with reason codes and an override workflow.
pipe: Rating history store @ credit risk warehouse ; Financial spread feed @ spreading system ; Feature builder @ Spark ; Migration model @ ordinal boosting ; Calibrator @ isotonic per class ; Review queue @ rating committee tool ; Back-test archive @ lakehouse
edge: Merger or demerger | the entity changes and history no longer applies | Use a legal-entity graph and restart features on the new entity
edge: Rating policy change | the scale or criteria change mid-sample | Map old to new ratings and cap training to the consistent window
edge: Rare high-grade downgrades | few events to learn from | Pooling with sector priors and credible-interval reporting
off: Ranked probability score ; Calibration by rating class
on: Share of downgrades flagged at least one quarter early ; Expected loss variance
gap: Pooling cycles in a random split understates downturn risk ; Overrides in history hide the model's own errors

== risk-adjusted-loan-pricing | Risk-Adjusted Loan Pricing (RAROC) | tabular,reinforcement-learning | seconds | staff-principal | a=0.05 k=20
obj: Recommend the loan rate and fees that meet the hurdle return on capital while winning the deals worth winning.
loss: \min_{r}\;-\mathbb{E}\left[\mathbb{1}[\text{win}(r)]\left(r-c_{\text{funding}}-c_{\text{risk}}\right)K\right]+\lambda\,\mathrm{Var}(r)
con: Never price below the risk-adjusted floor without approval ; Pricing explainable to relationship managers ; Fair lending rules apply to retail segments ; Grid refresh weekly
sn: Win model | Probability of winning at each price from past quotes including losses | Using only won deals | Won deals are cheap deals so the curve slopes the wrong way
sn: Costs | Funding, expected loss, capital and operating cost per deal | Margin over the base rate | A thin margin may still earn the hurdle if risk is low
sn: Relationship | Value of the whole relationship over time | Pricing each product in isolation | Loss leaders on loans pay back through deposits and fees
sig: Quote-to-win curve | logistic model of win versus price gap to the market | Elasticity differs by segment | Quote data is truncated where deals never reached a quote
sig: Expected loss and capital | PD times LGD times EAD plus regulatory capital charge | Sets the floor | Risk parameters must be the approved ones
sig: Relationship profitability | trailing 12-month income from the client's other products | Justifies concessions | Allocation of shared costs is contested
sig: Competitor rate | latest observed competitor offers for the segment | Anchor for the market | Often anecdotal, not systematically collected
noise: Time since last meeting | relationship manager noise
noise: Branch | administrative
noise: Loan purpose free text | inconsistent categories
base: Pricing grids by risk grade and tenor, with relationship-manager discretion within bands, because they are what the bank runs now.
prod: Win-probability model plus cost model giving expected return at each price, a constrained optimiser that picks the price within policy bounds, and a contextual bandit for exploration within safe ranges.
pipe: Deal request @ origination system ; Cost builder @ risk and treasury services ; Win-probability model @ gradient boosting ; Price optimiser @ constrained solver ; Approval engine @ delegated authority rules ; Quote record @ CRM ; Outcome feedback @ lakehouse
edge: Market rate shock | funding costs jump during the quote validity period | Rate-lock windows and repricing triggers on funding moves
edge: Strategic client | price below hurdle is justified by group value | Explicit strategic override with senior sign-off and logging
edge: Sparse segments | few quotes for large corporates | Hierarchical shrinkage to segment priors
off: Win-probability calibration ; Realised RAROC against predicted RAROC
on: Portfolio RAROC ; Win rate at or above the hurdle
gap: Truncated quote data biases elasticity ; Past discounts reflect relationship-manager habits, not customer need

== intraday-liquidity-forecasting | Intraday Liquidity Forecasting | time-series | seconds | production-grade | a=96 k=1
obj: Forecast intraday payment inflows and outflows by settlement system so treasury funds positions on time without holding excess buffers.
loss: \mathcal{L}=\sum_{t}\mathrm{Pinball}(\hat{q}_{0.95},y_t)+\lambda\,\mathrm{MSE}(\hat{y}_t,y_t)
con: Refresh every 15 minutes during operating hours ; Never under-forecast peak outflow by more than the agreed tolerance ; Fallback to historical profiles if feeds fail ; Explainable to the treasurer
sn: Timing | Intraday arrival profile by counterparty and payment type | Daily totals | The same daily total can need very different peak funding
sn: Tail | Upper quantile of net outflow | Mean forecast | Failing to fund a peak causes settlement failure and penalties
sn: Calendar | Scheduled settlement events and holidays by currency | Treating each day as a plain weekday | Month-end, tax dates and market holidays dominate peaks
sig: Time-of-day profile | median cumulative flow by 15-minute slot for the same day type | The strongest regularity | Day types must be classified using the settlement calendar
sig: Queued payments | value of payments waiting in the queue | Known near-term outflow | The queue state needs a consistent snapshot
sig: Counterparty concentration | share of flows from the top 10 counterparties | A few large counterparties drive peaks | Counterparty identities need entity mapping
sig: Scheduled obligations | known margin calls, CLS pay-ins and bond settlements | Deterministic cash events | Source systems differ on timing
noise: Payment reference text | inconsistent across channels
noise: Branch of origin | not related to the intraday timing
noise: Weekday number alone | too coarse
base: Same-day-last-week profile with a safety buffer, because treasurers know and trust it.
prod: Quantile gradient boosting over time-of-day, queue state and calendar features, with online correction from realised flows through the day and a rule-based fallback.
pipe: Payment message feed @ Kafka from settlement systems ; State aggregator @ Flink windows ; Forecast model @ quantile gradient boosting ; Intraday corrector @ Kalman-style update ; Funding recommender @ rules with limits ; Treasury dashboard @ real-time UI ; Forecast archive @ lakehouse
edge: Settlement system outage | flows stop and then arrive in a burst | Outage detector that switches to scenario profiles and widens bands
edge: One-off large payment | a single large transfer breaks the profile | Event feed from relationship managers and exclusion from the baseline
edge: Cut-off time changes | a system shifts its cut-off | Calendar updates as configuration and a drift alert on slot profiles
off: Coverage of the 95% quantile ; Peak-time error
on: Overdraft days and intraday credit usage ; Excess buffer cost
gap: Training on end-of-day aggregated data hides timing ; Back-test on calm days misses stressed peaks

== deposit-run-off-modelling | Deposit Run-Off Modelling | time-series,tabular | batch | staff-principal | a=1 k=3
obj: Estimate how fast deposits leave under rate moves and stress so liquidity buffers and funding plans are set with evidence.
loss: \mathcal{L}=\sum_i\mathrm{Huber}(y_i-\hat{y}_i)+\lambda\,\mathrm{Pinball}(\hat{q}_{0.95},y_i)
con: Regulatory liquidity coverage assumptions as bounds ; Model validated annually ; Stable and non-stable splits explainable ; Monthly refresh
sn: Behaviour | Stickiness of operational versus rate-sensitive balances | Treating all balances alike | Rate-sensitive balances leave with a lag and in size
sn: Stress | Run-off in the worst historical and hypothetical scenarios | Average attrition | Liquidity risk is about the tail
sn: Concentration | Large depositors behave differently | Per-account averages | The top depositors can be a large share of balances
sig: Rate gap | own deposit rate minus the best competitor rate for the segment | Customers move when the gap is large | Competitor rates are collected irregularly
sig: Balance volatility | 90-day coefficient of variation of the account balance | Volatile balances are less stable | Salary accounts look volatile around payday
sig: Product and tenure | account age and number of active products | Multi-product customers are stickier | Needs consistent product mapping
sig: Digital activity | login and transfer frequency | Digitally active customers can move faster | Channel mix shifts over time
noise: Account number | arbitrary identifier
noise: Branch | administrative
noise: Marketing source | cohort effect
base: Regulatory run-off rates by deposit class, because they are the reference and are accepted by supervisors.
prod: Survival and quantile models by segment on balance and customer features with scenario drivers (rate paths, competitor moves), producing run-off curves with intervals.
pipe: Deposit ledger @ core banking extract ; Customer features @ Spark ; Rate-gap service @ market data ; Run-off model @ survival and quantile boosting ; Scenario engine @ treasury paths ; Liquidity planner @ ALM tooling ; Validation pack @ model risk
edge: Social-media-driven bank run | outflows far exceed history | Tail scenarios with speed assumptions and intraday triggers
edge: Product migration | customers move between internal products | Track the customer and not the product
edge: Corporate payroll accounts | one client's decision moves a large balance | Single-name concentration limits and client-level modelling
off: Back-test of run-off by segment ; Coverage of the 95% quantile
on: Liquidity buffer cost ; Forecast error in stressed months
gap: Training on a rate-stable era understates sensitivity ; Customer-level splits leak households

== net-interest-income-sensitivity-forecasting | Net Interest Income Sensitivity Forecasting | time-series,tabular | batch | production-grade | a=1 k=4
obj: Forecast net interest income under rate scenarios using behavioural models for repricing, prepayment and deposits.
loss: \mathcal{L}=\sum_t\mathrm{MSE}(\hat{y}_t,y_t)+\lambda\,\mathrm{Pinball}(\hat{q}_{0.9},y_t)
con: Monthly ALCO pack ; Scenarios from the ALM policy ; Reconcile to finance within 1% ; Model assumptions documented
sn: Behaviour | Pass-through and prepayment behaviour by product | Contractual repricing only | Behaviour changes the repricing profile in rising or falling cycles
sn: Balance sheet | Dynamic balance sheet with growth assumptions | A static balance sheet | NII depends on new volumes and mix
sn: Beta | Deposit beta that varies with the rate level | A constant beta | Deposit costs rise faster once rates pass a threshold
sig: Deposit beta by product | change in own rate per unit change in the policy rate | Core driver of NII | Beta is non-linear and lagged
sig: Prepayment speed | monthly prepayment rate of the fixed book | Reinvestment risk | Depends on rate incentive
sig: Repricing gap | assets minus liabilities repricing within each time bucket | Standard measure | Needs behavioural adjustments
sig: Margin on new volume | spread on recent originations versus the book | Indicates future margin | New spreads reflect competition
noise: Customer age | weak
noise: Channel | little effect
noise: Currency pair labels | not informative for pass-through
base: Static repricing gap analysis with parallel shocks, because it is standard in ALM.
prod: Product-level behavioural models for beta and prepayment combined with a dynamic balance-sheet simulator and scenario fan charts, with attribution of NII change to drivers.
pipe: Balance sheet snapshot @ finance data mart ; Behaviour models @ boosting per product ; Scenario curve engine @ treasury ; NII simulator @ Python on Spark ; Attribution engine @ variance decomposition ; ALCO dashboard @ BI tool ; Run archive @ lakehouse
edge: Negative rate regime | model assumptions break | Floors and regime flag in the behaviour models
edge: Large one-off prepayments | a pool pays out in one month | Event flag and exclusion from behaviour estimation
edge: Hedge accounting changes | the effective rate depends on hedges | Include the hedge book in the simulator
off: NII forecast error by quarter ; Beta calibration
on: Variance of NII versus plan ; Hedge cost
gap: Training in a falling-rate era understates deposit beta ; Static balance sheet inflates stability

== macro-scenario-generation-for-stress-tests | Macroeconomic Scenario Generation for Stress Tests | time-series,llm-agents | batch | staff-principal | a=0.1 k=20
obj: Generate internally consistent macroeconomic paths for stress testing, translating a narrative (for example a property crash) into variables used by credit and market models.
loss: \mathcal{L}=\sum_t\mathrm{MSE}(\hat{x}_t,x_t)+\lambda\,\mathrm{KL}(q\|p)
con: Paths must be internally coherent (GDP, unemployment, rates, house prices) ; Regulator scenarios reproduced exactly ; Scenario rationale documented ; Reviewed by the economics team
sn: Coherence | Joint movement of variables consistent with historical relationships | Independent shocks to each variable | Independent shocks create combinations that never occur
sn: Severity | Plausible but severe, calibrated to historical depth | Arbitrary large shocks | Implausible severity is rejected by the board and supervisors
sn: Narrative | A scenario narrative translated to variables with traceability | A black-box path generator | Reviewers need to see why unemployment peaks at 11%
sig: VAR impulse responses | estimated responses of variables to a shock to one variable | Preserves co-movement | Short histories give unstable estimates
sig: Historical analogues | paths from past crises matched on shock type | Anchors severity | Few crises exist per country
sig: Regime indicator | probability of expansion or contraction state | Changes response magnitudes | Regime labelling is subjective
sig: Narrative-to-shock mapping | LLM-proposed shock sizes verified against analogues | Speeds drafting | Must be validated by economists
noise: Daily market noise | irrelevant for quarterly paths
noise: Social sentiment | too noisy for macro drivers
noise: Forecaster consensus stale values | already priced into baselines
base: Regulator-provided scenarios and a scalar severity multiplier, because they are mandated.
prod: A Bayesian VAR with regime switching for joint paths, an analogue library for severity checks and an LLM assistant that drafts narratives and proposes shocks for economist approval.
pipe: Macro data ingest @ national statistics and market feeds ; Historical store @ time-series database ; Joint path generator @ Bayesian VAR with regimes ; Analogue matcher @ nearest-crisis search ; Narrative drafter @ LLM with retrieval ; Economist review @ approval workflow ; Scenario library @ versioned store
edge: Structural break | pre-break relationships no longer hold | Break tests and re-estimation windows
edge: Missing data for emerging markets | short or revised histories | Partial pooling and wider intervals
edge: Conflicting narratives | two plausible stories give different paths | Present both and weight them with documented rationale
off: Out-of-sample path likelihood ; Consistency checks pass rate
on: Time to produce a scenario set ; Reviewer acceptance rate
gap: Fitting on 2010-2019 gives mild shocks ; LLM-drafted shocks may be fluent but not calibrated

== risk-weighted-asset-optimisation | Risk-Weighted Asset Optimisation | reinforcement-learning,tabular | batch | staff-principal | a=0.05 k=30
obj: Recommend actions (sell, hedge, restructure, re-price) that reduce risk-weighted assets per unit of lost income so capital is used where it earns most.
loss: \min_{x}\;\sum_{k}\mathrm{RWA}_k x_k+\lambda\sum_{k}\mathrm{Cost}_k\,x_k
con: All actions respect limits and client commitments ; Output explainable to the capital committee ; Weekly refresh ; No action breaches regulatory rules
sn: Marginal | Marginal RWA and income of an action | Average RWA density | The average hides which exposure to sell
sn: Feasibility | Actions the bank can execute (tenor, consent, market) | Theoretical reductions | Many reductions need client consent or market depth
sn: Interaction | RWA effects of portfolio diversification and netting | Summing exposure by exposure | Netting can change RWA non-linearly
sig: Marginal RWA per unit of income | RWA released divided by income lost | Ranks actions | Allocation of shared costs matters
sig: Execution cost | bid-ask or break cost of each action | Real cost of change | Estimates vary by market conditions
sig: Maturity and optionality | remaining tenor and call dates | Short tenors run off naturally | Wrong dates distort the plan
sig: Client relationship value | income from other products | Protects key clients | Subjective allocation
noise: Loan identifier order | arbitrary
noise: Booking desk | administrative
noise: Currency | indirect
base: Rank exposures by RWA density and review manually, because treasury and finance already do that.
prod: A constrained optimiser (mixed integer program) over candidate actions with RWA and income models, and a learned execution-cost estimator, giving a ranked plan with trade-offs.
pipe: Exposure and RWA feed @ risk engine ; Action generator @ rules over book ; Cost estimator @ boosting ; Optimiser @ MIP solver ; Capital committee pack @ BI ; Execution tracker @ workflow ; Plan archive @ lakehouse
edge: Rule change mid-quarter | RWA calculation changes | Parameterised rule sets and rerun
edge: Client refusal | a planned sale is blocked | Re-solve with the exclusion
edge: Market closure | execution costs spike | Cost multipliers and timing windows
off: RWA saved per plan ; Income retained
on: Capital ratio change ; Cost of execution
gap: Counting reductions that cannot be executed ; Static prices make plans look cheaper

== operational-risk-event-classification | Operational Risk Event Classification & Loss Forecasting | nlp,tabular | batch | production-grade | a=0.1 k=8
obj: Classify incident reports into the operational risk taxonomy and forecast loss severity so controls and capital reflect real event patterns.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{Huber}(\log\hat{s},\log s)
con: Basel event types and business lines mapped ; Reviewer sign-off on high-severity events ; Reports retained under policy ; Weekly taxonomy updates
sn: Taxonomy | Event type, cause and control failure as separate labels | One free-text category | Without causes, remediation repeats
sn: Severity | Heavy-tailed loss distribution with the tail modelled separately | Mean loss | A few events dominate total losses
sn: Reporting | Reports at the time of discovery with discovery lag | Date of incident as the report date | Many events are found months later
sig: Text embedding of the report | encoder over the narrative | Captures cause and impact | Reports vary in quality
sig: Control tested flag | whether a related control failed in the last test | Links event to control | Control IDs can be stale
sig: Business line and process | process owner and value chain | Narrows event type | Org changes alter mapping
sig: Similar prior events | nearest neighbours in prior loss events | Informs severity | Retrieval must exclude future events
noise: Reporter name | arbitrary
noise: Report length | style
noise: Severity assigned by the reporter | not calibrated
base: Manual classification by the operational risk team using the taxonomy, because it is the standard practice.
prod: A multilingual encoder classifier with a heavy-tail loss model (lognormal body, generalised Pareto tail), review queues for high-severity items and drift monitoring.
pipe: Incident intake @ risk system ; Text preprocessor @ PII redaction ; Event classifier @ transformer ; Severity model @ tail model ; Reviewer queue @ case tool ; Control linker @ rules and retrieval ; Loss database @ warehouse
edge: Novel event type | taxonomy does not fit | Out-of-distribution flag and taxonomy proposal
edge: Duplicate reports | the same event reported by many | Clustering and merge suggestions
edge: Unquantified loss | severity unknown for months | Mark pending and separate training labels
off: Macro-F1 by event type ; Tail quantile accuracy
on: Reviewer time per report ; Share of events with a linked control action
gap: Labels reflect the first classification, not the final one ; Time leakage via prior-event retrieval

== model-risk-validation-assistant | Model Risk Validation Assistant | llm-agents | seconds | staff-principal | a=0.2 k=80 s=7 t=800
obj: Assist model validators by checking documentation against policy, reproducing key tests and drafting findings, with the validator remaining accountable.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Read-only access to model code and data ; Every finding cites a document section or test output ; Validators approve every finding ; No model data leaves the bank
sn: Evidence | Findings tied to exact documents and test outputs | Opinions from the model | Unsupported findings undermine independence
sn: Reproduction | Re-running tests in a sandbox | Trusting reported metrics | Reported metrics can be stale or from a different data version
sn: Scope | Policy-based checklists per model tier | Generic review prompts | Tier 1 models need deeper review
sig: Policy coverage | share of policy requirements addressed in the documentation | Gap detection | Policy versions change
sig: Metric reproduction delta | difference between reported and reproduced metric | Detects errors | Randomness needs seeds
sig: Change since last validation | code and data diff summary | Focuses review | Repos may be messy
sig: Finding precision | share of drafted findings accepted by validators | Quality | Review bias
noise: Documentation length | not quality
noise: Author name | irrelevant
noise: Tool formatting | cosmetic
base: Manual checklist-based validation by teams, because it is the current process.
prod: A planner-executor agent with sandboxed code tools, retrieval over policy and documentation, a citation verifier and validator approval for each finding.
pipe: Validation request @ GRC tool ; Document retriever @ hybrid search ; Sandbox runner @ containerised Python ; Policy checker @ LLM with structured checks ; Finding drafter @ LLM with citations ; Validator review @ workflow ; Evidence archive @ immutable store
edge: Model code unavailable | black-box vendor model | Switch to documentation and output testing only and flag the limitation
edge: Non-deterministic tests | metrics vary across runs | Fixed seeds and tolerance bands
edge: Conflicting policy versions | two policies apply | Prefer the latest and flag for human resolution
off: Finding precision and recall against validator findings ; Citation validity
on: Validation cycle time ; Findings missed on later audit
gap: Evaluating on past reports the retriever has seen ; Reviewers accept plausible findings too easily

== counterparty-exposure-pfe-approximation | Counterparty Exposure (PFE) Approximation with ML | tabular,time-series | seconds | staff-principal | a=40 k=6
obj: Approximate potential future exposure for trade-level pre-deal checks fast enough for traders, matching the full Monte Carlo engine within tolerance.
loss: \mathcal{L}=\mathrm{MSE}(\hat{y},y)+\lambda\,\mathrm{Pinball}(\hat{q}_{0.95},y)
con: Approximation error within the risk-approved tolerance ; Fallback to the full engine for large trades ; Model re-trained after market regime changes ; Response under 300 ms
sn: Surrogate | A fast surrogate trained on the full engine outputs | Replacing the engine entirely | The engine remains the system of record
sn: Tail | The 95th percentile profile over time | Expected exposure | Limits are set on the tail
sn: Netting | Netting set structure | Trade by trade exposure | Netting can reduce exposure by orders of magnitude
sig: Trade sensitivities | delta, vega and DV01 of the trade and the set | Drives exposure | Computed on the same curves
sig: Market volatility level | implied volatility of the main risk factors | Drives the width of the distribution | Source differences
sig: Netting set composition | notional by product and tenor | Describes diversification | Changes each day
sig: Collateral terms | threshold and margin period of risk | Reduces exposure | Contract data quality
noise: Trade booking time | irrelevant
noise: Trader identifier | irrelevant
noise: Counterparty name | already represented
base: Add-on method from the regulatory standard, because it is a conservative estimate with no modelling.
prod: A neural surrogate of the Monte Carlo PFE profile with quantile outputs, trained on daily engine runs and with an error monitor that escalates to the full engine.
pipe: Pre-deal request @ trading front end ; Feature assembler @ risk data service ; PFE surrogate @ neural net on GPU ; Error monitor @ shadow comparison ; Limit checker @ rules ; Trader response @ API ; Engine runs @ nightly Monte Carlo
edge: Exotic trade | out of the surrogate's training domain | Domain flag and fallback to the engine
edge: Volatility spike | market regime outside training | Retrain triggers and conservative overlay
edge: Netting agreement missing | trade is treated as standalone | Data quality gate on legal terms
off: Mean absolute error versus engine ; 95th percentile coverage
on: Pre-deal checks completed within 300 ms ; Limit breaches caught
gap: Training on calm periods ; Test on trades similar to training trades

== branch-cash-and-vault-optimisation | Branch Cash & Vault Optimisation | time-series,reinforcement-learning | batch | production-grade | a=1 k=2
obj: Plan cash holdings and shipments for branch vaults so branches rarely run out and the bank does not hold idle cash.
loss: \min\;\sum_{b}\left(c_{\text{hold}}\,I_b+c_{\text{ship}}\,S_b+c_{\text{out}}\,\mathbb{E}[\text{stockout}_b]\right)
con: Insurance limits per vault ; Cash-in-transit schedules are fixed ; Weekly plan with daily adjustments ; Explainable to branch managers
sn: Demand | Forecast of teller cash demand by denomination | Total cash only | A stock-out of one note type blocks service
sn: Costs | Holding, transport and stock-out cost together | Minimising shipments | Fewer shipments lead to larger balances and more stock-outs
sn: Events | Local events and pay days | Weekly seasonality only | Events drive spikes
sig: Withdrawal profile | median daily withdrawals by branch and weekday | Core demand | Branch closures change patterns
sig: Pay-day effect | days since local payroll dates | Spike driver | Pay dates vary by employer
sig: Local event calendar | festivals and market days | Spike driver | Must be maintained
sig: Digital substitution trend | trend in ATM and card use near the branch | Long-term decline | Slow change
noise: Branch manager name | irrelevant
noise: Branch opening date | not predictive
noise: Weather noise | small effect
base: Fixed par stock per branch with replenishment on a schedule, because it is the current practice.
prod: Quantile demand forecasts by denomination feeding a stochastic inventory optimiser that sets shipment sizes within CIT slots and vault limits.
pipe: Branch transactions @ core banking ; Demand forecaster @ quantile boosting ; Event calendar @ configuration store ; Inventory optimiser @ stochastic program ; CIT scheduler @ logistics tool ; Branch manager view @ web app ; Outcome store @ warehouse
edge: Branch closure | demand moves to nearby branches | Link closures to neighbour forecasts
edge: Armoured vehicle delay | shipment misses the slot | Safety stock and reroute logic
edge: Denomination shortage | a note type is scarce | Substitution rules and alerts
off: Forecast pinball loss ; Stock-out rate
on: Cash held per branch ; Stock-out events
gap: Training on stocked-out days underestimates demand ; Static calendar in test

== regulatory-change-impact-analysis | Regulatory Change Impact Analysis | llm-agents,nlp | seconds | production-grade | a=0.2 k=100 s=6 t=900
obj: Read new regulations and consultations, map them to the bank's policies, processes and systems, and draft an impact assessment for compliance owners.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Every mapped obligation cites the regulatory paragraph ; Compliance owner approves the mapping ; Regulator documents only from official sources ; Audit log of drafts and decisions
sn: Obligation | Individual obligations extracted with scope, deadline and role | Summaries of the whole document | Summaries lose the 'must by date' that drives work
sn: Mapping | Obligations linked to existing controls and policies | Keyword overlap | The same word means different things in different regimes
sn: Currency | The current in-force version and effective dates | Any version found in search | Superseded text is a common source of wrong advice
sig: Obligation extraction precision | share of extracted obligations accepted by the owner | Core quality | Needs a labelled test set
sig: Policy mapping recall | share of true links found | Missed links are risks | Gold links are costly to build
sig: Effective date correctness | extracted date versus the official date | Drives plans | Phased dates are common
sig: Gap flag | obligation without a mapped control | Prioritises work | False gaps waste time
noise: Document length | style
noise: Law firm commentary | useful but not authoritative
noise: Headline tone | irrelevant
base: Compliance team reads and maps changes manually using spreadsheets, because it is the current process.
prod: An agent with retrieval over regulator sites and the policy library, structured obligation extraction, mapping to controls with citations and a review queue for compliance owners.
pipe: Regulatory feed @ official publication monitors ; Document parser @ layout-aware parser ; Obligation extractor @ LLM with schema ; Policy mapper @ hybrid retrieval ; Impact drafter @ LLM with citations ; Owner review @ workflow ; Obligation register @ GRC database
edge: Ambiguous drafting | the rule can be read two ways | Present both readings and escalate to legal
edge: Cross-border overlap | two regimes apply | Jurisdiction tags and conflict flags
edge: Amendments by reference | text refers to another instrument | Resolve references with the consolidated text
off: Obligation precision and recall ; Citation validity
on: Time from publication to impact assessment ; Missed obligations at audit
gap: Evaluation on documents seen in prompts ; Gold links biased to common policies

== settlement-fail-prediction | Settlement Fail Prediction | tabular | batch | production-grade | a=1 k=2
obj: Predict which trades will fail to settle on the intended date so operations can chase the counterparty, borrow securities or fund early.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Predictions delivered by 04:00 for the settlement day ; Explanation per flagged trade ; Operations capacity of 500 chases a day ; No customer data outside the bank
sn: Timing | Features known before the settlement cut-off | Features including the actual instruction status after the fact | Post-event status leaks the label
sn: Capacity | Ranking by expected loss within the chase capacity | Classification accuracy | Most trades settle, so accuracy hides ranking
sn: Counterparty | Counterparty's own fail history by instrument type | Global counterparty rating | Fail behaviour differs by security type
sig: Counterparty fail rate 30d | fails divided by trades in 30 days by counterparty and market | Strong repeat pattern | Window must end the previous day
sig: Instrument liquidity | average daily volume and borrow availability | Illiquid securities fail more | Borrow data comes from lenders
sig: Matching status | whether both sides' instructions have matched | Unmatched trades fail | Status snapshots must be as at 04:00
sig: Cut-off proximity | time between trade and the cut-off for the market | Late trades fail more | Time zones need care
noise: Trader name | arbitrary
noise: Trade comment text | free text, inconsistent
noise: Booking system id | arbitrary
base: A rule list by counterparty fail history and unmatched status, because operations already use it.
prod: Gradient boosting trained on matured settlement outcomes with calibrated probabilities, ranked by expected penalty and shown with top reasons.
pipe: Trade and instruction feed @ post-trade platform ; Feature builder @ Spark ; Fail model @ gradient boosting ; Penalty estimator @ rules ; Chase queue @ operations workbench ; Outcome capture @ settlement confirmations ; Model monitor @ dashboard
edge: Market holiday | settlement day shifts | Calendar service per market
edge: Corporate action | trade affected by an event | Event flag and separate handling
edge: Mass fails due to a CSD outage | all trades fail together | Outage regime and manual process
off: PR-AUC at the chase capacity ; Calibration by market
on: Fails avoided per day ; Penalty cost
gap: Using post-cut-off status ; Operations intervention changes outcomes, labels mixed

== corporate-actions-event-extraction | Corporate Actions Event Extraction | nlp | seconds | production-grade | a=0.2 k=40
obj: Extract corporate action events (dividends, splits, mergers, rights issues) and their terms from notices and vendor feeds into a golden source for downstream processing.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Accuracy above 99.5% on mandatory events ; Dual source verification for mandatory events ; Every field traces to a source ; Notices handled in 12 languages
sn: Fields | Event type, record date, ex-date, rate, election deadlines | Free-text description | Dates and rates drive entitlements
sn: Verification | Agreement between two independent sources | Trusting the first notice | Vendor errors and late amendments are frequent
sn: Mandatory vs voluntary | Event class determines the process | Treating all events alike | Voluntary events need client elections by deadlines
sig: Field confidence | calibrated confidence per extracted field | Routes to review | Calibration drifts by language
sig: Source agreement | whether vendor and issuer notices agree | Flags errors | Different timing across sources
sig: Date consistency | order check: announcement, ex, record, payment | Catches misreads | Market conventions differ
sig: Instrument match | security identifier resolution | Links to holdings | Identifier changes after events
noise: Notice formatting | varies across issuers
noise: Letterhead | irrelevant
noise: Notice length | style
base: Vendor feed with manual comparison to the issuer notice, because it is the current process.
prod: Document-understanding model with a constrained schema, cross-source reconciliation rules and a reviewer queue for mandatory event discrepancies.
pipe: Notice intake @ SWIFT and vendor feeds ; Document parser @ layout model ; Event extractor @ LLM with schema ; Reconciler @ rules engine ; Reviewer queue @ operations tool ; Golden source @ reference database ; Downstream publish @ message bus
edge: Late amendment | terms change after the first notice | Versioned events with change alerts
edge: Complex multi-leg event | merger with cash and shares | Structured event templates
edge: Language ambiguity | decimal separators differ | Locale-aware parsing and review
off: Field-level accuracy ; Event-level exact match
on: Manual touches per event ; Entitlement errors
gap: Evaluating on a single vendor format ; Test set excludes late amendments

== trade-break-exception-triage | Trade Break & Reconciliation Exception Triage | tabular,nlp | seconds | production-grade | a=2 k=6
obj: Classify and route reconciliation breaks between internal records and counterparties or custodians to the right owner with a suggested fix.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y_{\text{auto}})
con: Auto-resolve only breaks with a reversible fix ; Four-eyes check on any ledger change ; Break ageing targets by type ; Full audit trail
sn: Cause | Root-cause class (timing, price, quantity, static data) | Break amount only | Amount does not tell who must act
sn: Auto-fix | Safe, reversible resolutions | Auto-fix by confidence | A high-confidence wrong fix hides a real loss
sn: Ageing | Break age relative to the SLA | Break count | Old breaks cost more
sig: Field mismatch pattern | which fields differ between sides | Identifies cause | Needs normalisation
sig: Counterparty history | past break types for the counterparty | Predicts cause | Changes with systems
sig: Amount and tolerance | difference relative to tolerance | Rounding vs real | Currency conversions
sig: Break age | days since first seen | Priority | Clock must start from first detection
noise: Operator initials | irrelevant
noise: Break ID | arbitrary
noise: Free-text comments | inconsistent
base: Rule-based matching with manual assignment, because it is the current practice.
prod: A multi-class cause classifier on mismatch patterns with next-action suggestions, a safe auto-resolution policy and a prioritised worklist.
pipe: Reconciliation engine @ matching platform ; Break feature builder @ stream processor ; Cause classifier @ gradient boosting ; Action recommender @ rules and ranker ; Worklist @ operations tool ; Four-eyes approval @ workflow ; Outcome log @ warehouse
edge: Systemic mismatch | a static data error creates thousands of breaks | Cluster detection and one root-cause ticket
edge: Late counterparty confirmation | break closes by itself | Wait states and re-check before action
edge: Currency rounding differences | many small breaks | Tolerance policy by currency
off: Cause accuracy ; Safe auto-fix precision
on: Breaks aged beyond SLA ; Operator touches per break
gap: Labels from past manual assignment ; Auto-fix feedback loop hides errors

== custody-fee-billing-error-detection | Custody Fee & Billing Error Detection | tabular | batch | production-grade | a=1 k=3
obj: Detect incorrect custody and fund administration fees before invoices go out, protecting revenue and client trust.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Huber}(\hat{f}-f)
con: Review capacity of 300 invoices per cycle ; Explainable flags ; No changes to billing without approval ; Monthly cycle
sn: Expected fee | Recompute the fee from contract terms and assets | Compare to last month's fee | Both can be wrong in the same way
sn: Contracts | Tiering, caps and discounts as structured terms | PDF text | Many errors come from terms not loaded correctly
sn: Materiality | Error value and client importance | Count of anomalies | Small errors on small clients are not worth review
sig: Fee recomputation gap | invoiced fee minus recomputed fee | Direct error signal | Needs correct contract terms
sig: Asset base jump | month-on-month change in billable assets | Triggers rebates or errors | Corporate events
sig: Contract amendment age | days since terms last changed | New terms cause errors | Amendments loaded late
sig: Rate card mismatch | applied tier versus eligible tier | Common error | Tier boundaries
noise: Client name | irrelevant
noise: Invoice number | arbitrary
noise: Billing analyst | irrelevant
base: Month-on-month variance thresholds by client, because finance already uses them.
prod: Contract-aware recomputation engine plus an anomaly model on residuals and context, ranked by value at risk with reason codes.
pipe: Billing extract @ billing platform ; Contract term store @ structured contracts ; Fee recompute @ rules engine ; Residual model @ gradient boosting ; Review queue @ finance tool ; Correction workflow @ approvals ; Outcome log @ warehouse
edge: Mid-month asset transfer | pro-rata mistakes | Daily accrual checks
edge: Verbal discount | no contract record | Exception register and expiry
edge: Currency conversion rule | different rate dates | Rate date policy captured in terms
off: Precision at review capacity ; Recall of known errors
on: Revenue leakage recovered ; Invoice disputes
gap: Training on past errors found by clients ; Contract data differs between train and test

== securities-lending-recall-and-rate-prediction | Securities Lending Recall & Rate Prediction | tabular,time-series | batch | production-grade | a=1 k=4
obj: Predict lending demand, fee rates and recall risk per security so the lending desk prices loans and holds back what it expects to need.
loss: \mathcal{L}=\mathrm{Huber}(\hat{y},y)+\lambda\,\mathrm{BCE}(\hat{p},y_{\text{recall}})
con: Beneficial owner restrictions respected ; Daily run before market open ; Explainable to the desk ; Regulatory borrowing limits
sn: Demand | Short interest, utilisation and event risk | Past fee alone | Fees follow shorting demand that is visible earlier in utilisation
sn: Recall | Probability that the owner sells or needs the security | Average recall rate | Recalls cluster around corporate actions and index events
sn: Specials | Securities moving from general collateral to special | Treating all securities alike | A small share earns most revenue
sig: Utilisation trend | change in the share of lendable inventory on loan | Demand proxy | Data lags by a day
sig: Corporate event proximity | days to dividends, votes and index rebalances | Spikes in demand and recalls | Event dates change
sig: Short interest | reported short interest versus float | Indicates demand | Delayed publication
sig: Owner sell propensity | probability the beneficial owner sells in the next 5 days | Recall risk | Portfolio data is limited
noise: Trader name | irrelevant
noise: Ticker string | arbitrary
noise: Loan ID | arbitrary
base: Last-week fee and utilisation by security, because the desk already works that way.
prod: Gradient boosting for fee and recall probability with event features and owner-level models, producing price suggestions and hold-back inventory.
pipe: Inventory and loan data @ lending platform ; Market data @ vendor feeds ; Feature builder @ Spark ; Fee and recall models @ gradient boosting ; Price suggester @ rules ; Desk screen @ trading UI ; Outcome archive @ warehouse
edge: Short squeeze | fees spike far beyond history | Regime flag and cap on suggested pricing
edge: Restricted securities | Securities under borrowing restrictions are suggested for lending and the loan fails at the lender | Check eligibility and beneficial-owner restrictions from compliance before any price suggestion is shown
edge: Data delay | utilisation arrives late | Freshness checks and fallback
off: Fee MAE on specials ; Recall PR-AUC
on: Lending revenue ; Failed returns due to recalls
gap: Survivorship in security lists ; Event dates known only after the fact
