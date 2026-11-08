# FinTech & Payments, part 2 (use cases 26-50)
== algorithmic-trading-signal-research | Alpha Signal Research Pipeline | time-series,tabular | batch | staff-principal | a=1 k=4
obj: Discover and validate cross-sectional return signals that survive costs and decay, and promote them to production with strict overfitting control.
loss: \mathcal{L}=\sum_{t}\left(r_{t+h}-\hat r_{t+h}\right)^2+\lambda\,\mathrm{Turnover}
con: Point-in-time universe including delisted names ; Transaction-cost-aware evaluation ; Capacity limits ; Reproducible research environment
sn: Overfitting | Purged and embargoed cross-validation with multiple-testing correction | Choosing the best of 500 backtests | The best of many random signals always looks great
sn: Costs | Net-of-cost returns with realistic impact | Gross backtest Sharpe | High-turnover signals vanish after costs
sig: Cross-sectional rank momentum | rank of 12-1 month return across the universe | Documented persistent premium | Skip the most recent month to avoid reversal contamination
sig: Earnings surprise drift | standardised surprise vs consensus at announcement | Post-announcement drift | Use consensus snapshot before the release
sig: Liquidity-adjusted turnover | alpha divided by participation-rate cost estimate | Capacity realism | Volume must be same-period not future
noise: Raw price level | not stationary, no cross-sectional meaning
noise: Last-day return | microstructure noise that reverses
base: Single-factor ranked long-short portfolios.
prod: Gradient-boosted cross-sectional model on 60 neutralised factors with purged walk-forward CV, deflated Sharpe gating and an execution-cost model.
pipe: Market data lake @ point-in-time store ; Factor engine @ Spark ; Model trainer @ purged walk-forward GBDT ; Backtester @ cost-aware simulator ; Promotion gate @ deflated Sharpe check ; Portfolio constructor @ optimiser ; Live performance tracker @ attribution
edge: Delisting and survivorship | backtest ignores failed companies | Use survivorship-free point-in-time universe
edge: Factor crowding event | signal decays rapidly | Crowding monitor and capacity-aware sizing
off: Net Sharpe after costs ; Deflated Sharpe ratio
on: Live vs backtest slippage gap ; Information coefficient decay
gap: Look-ahead via restated fundamentals ; Hyperparameters tuned on the test period

== portfolio-optimization-risk-parity | Robo-Advisor Portfolio Optimization | reinforcement-learning,tabular | batch | production-grade | a=0.05 k=3
obj: Construct and rebalance goal-based portfolios for millions of retail users that stay within each user's risk tolerance while minimising taxes and costs.
loss: \min_w\; w^\top\Sigma w-\lambda\,\mu^\top w+\kappa\,\|w-w_0\|_1
con: Suitability rules per jurisdiction ; Fractional shares ; Tax-lot awareness ; Rebalance 10M portfolios nightly
sn: Estimation | Shrinkage covariance and robust expected-return priors | Plugging sample mean and covariance into mean-variance | Estimation error makes the optimiser an error maximiser
sn: Trading | Drift-threshold and tax-aware rebalancing | Calendar rebalancing everyone monthly | Needless trades erode returns and trigger taxes
sig: Shrunk covariance matrix | Ledoit-Wolf shrinkage on rolling returns | Stable risk estimate | Rolling window must not include rebalance date
sig: Drift from target | L1 distance of current weights to target | Trade trigger | Use pre-trade market values
sig: Tax-lot loss harvesting value | unrealised loss available net of wash-sale rules | After-tax alpha | Check wash-sale window across accounts
noise: Recent 1-month returns | chasing performance increases risk
noise: Forecast of next-day price | not forecastable at useful accuracy
base: Target-date glide paths with threshold rebalancing.
prod: Black-Litterman with shrinkage risk, convex optimiser with turnover and tax constraints, user-level risk questionnaire calibrated via behaviour.
pipe: Account and holdings snapshot @ core ledger ; Risk model @ shrinkage covariance ; Optimiser @ convex solver ; Tax and constraint layer @ lot-level rules ; Order generator @ batch trades ; Compliance review @ suitability check ; Performance attribution @ nightly report
edge: Market crash with synchronized rebalancing | trading storms into illiquid ETFs | Staggered cohorts and liquidity-aware order slicing
edge: User changes risk tolerance mid-cycle | portfolio mismatched | Event-driven re-optimisation on profile change
off: Out-of-sample volatility vs target ; After-tax return in simulation
on: Goal-achievement probability ; Tracking error to target
gap: Backtest ignores taxes and transaction costs ; Risk questionnaire answers treated as true risk capacity

== market-regime-detection | Market Regime Detection | time-series | batch | production-grade | a=1 k=2
obj: Identify volatility and correlation regimes early so risk limits and strategy weights adapt before drawdowns compound.
loss: \log p(x_{1:T})=\log\sum_{s_{1:T}}\prod_t p(s_t\mid s_{t-1})\,p(x_t\mid s_t)
con: Decision lag under 1 day ; Interpretable regime labels ; Low false switching ; Regime history reproducible
sn: Persistence | Regime-switching models with sticky transition priors | Thresholds on VIX | Single-indicator thresholds whipsaw at boundaries
sn: Lag | Posterior regime probabilities used probabilistically | Hard labels from smoothed fits | Smoothed regimes use future data and cannot be traded
sig: Realised vs implied vol spread | 20d realised vol minus implied vol | Stress onset signal | Align timestamps across sources
sig: Cross-asset correlation spike | rolling average pairwise correlation | Diversification failure | Window excludes decision day close
sig: Credit spread momentum | 5-day change in IG-HY spread | Risk-off indicator | Use as-published spreads
noise: Calendar month | spurious seasonality
noise: Single-day return extremes | outliers without persistence
base: Rule-based volatility bands.
prod: Bayesian hidden Markov model with sticky-HDP priors on multi-asset features, filtered (not smoothed) probabilities feeding risk limits.
pipe: Market data feed @ vendor API ; Feature builder @ rolling windows ; Regime filter @ Bayesian HMM ; Probability publisher @ risk service ; Limit adjuster @ risk rules ; Risk committee review @ oversight ; Regime audit @ historical archive
edge: Flash crash day | model flips regime on one print | Minimum dwell time and robust features
edge: New asset class enters | feature set changes | Versioned feature sets and refit with shadow comparison
off: Regime-conditional return separation ; Switching frequency
on: Drawdown reduction vs static ; Turnover cost of regime switching
gap: Using smoothed state probabilities in backtests ; Regimes defined with hindsight

== volatility-forecasting | Volatility Forecasting for Risk & Options | time-series | batch | production-grade | a=2 k=2
obj: Forecast 1-day to 3-month volatility per instrument for VaR, margining and options pricing with calibrated coverage.
loss: \mathcal{L}=\sum_t\left[\log\hat\sigma_t^2+\frac{r_t^2}{\hat\sigma_t^2}\right]
con: Coverage tests for VaR (Kupiec) ; Nightly for 50k instruments ; Intraday refresh for top 500 ; Model governance
sn: Benchmark | HAR-RV and GARCH baselines as the bar | Complex nets without baseline | Deep nets often fail to beat HAR on realised variance
sn: Target | Realised variance from intraday data | Squared daily returns | Squared returns are an extremely noisy volatility proxy
sig: Realised variance components | daily, weekly, monthly RV averages | HAR structure | Intraday RV needs clean tick data
sig: Jump component | bipower variation difference | Separates jumps from diffusion | Use consistent sampling frequency
sig: Implied vol term structure | at-the-money implied vol by tenor | Forward-looking | Use end-of-day mid not stale quotes
noise: Raw volume | co-moves with vol without added info
noise: Previous-day sign of return | little vol information
base: HAR-RV regression on realised variance.
prod: HAR features plus LSTM residual correction and implied-vol inputs, with conformal intervals and nightly coverage backtests.
pipe: Tick data ingestion @ Kafka and Parquet ; Realised vol builder @ Spark ; Forecast model @ HAR plus LSTM ; Interval calibrator @ conformal ; Risk system publisher @ VaR engine ; Model validation @ backtest of exceptions ; Governance log @ audit store
edge: Bad ticks inflate realised vol | forecast explodes | Robust filtering and outlier-aware estimators
edge: Market holiday asymmetry | misaligned windows | Exchange-calendar aware resampling
off: QLIKE loss ; VaR exception rate vs nominal
on: Margin efficiency ; Risk limit breaches
gap: Evaluating against squared returns instead of RV ; Overlapping windows inflate significance

== order-execution-slippage-minimization | Order Execution & Slippage Minimisation | reinforcement-learning,time-series | sub-10ms | staff-principal | a=20 k=1
obj: Slice large parent orders into child orders that minimise implementation shortfall against arrival price.
loss: \min_\pi\;\mathbb{E}\!\left[\sum_t \text{impact}_t(q_t)+\lambda\,\text{risk}_t\right]
con: Decision latency under 2 ms ; Participation caps ; Fat-finger protection ; Best-execution reporting
sn: Benchmark | Implementation shortfall vs arrival price | VWAP beat rate | VWAP can be gamed by trading late with the market
sn: Simulation | Calibrated limit-order-book simulator with impact | Replaying historical fills | Your own orders change the market; replay ignores that
sig: Order-book imbalance | (bid depth - ask depth) / total depth at top 5 levels | Short-term price pressure | Snapshot at decision time
sig: Spread and depth ratio | spread over mid and depth at touch | Liquidity cost | Use pre-trade quotes only
sig: Remaining-time urgency | residual quantity over remaining horizon | Schedule pressure | Normalise by expected volume curve
noise: Order sizes of other participants | not observable reliably
noise: Time-of-day dummies | captured by the volume curve
base: Almgren-Chriss schedule with a TWAP fallback.
prod: PPO policy trained in an LOB simulator with domain randomisation, wrapped by hard participation and price-limit constraints, running on FPGA-adjacent hosts.
pipe: Market data handler @ kernel-bypass feed ; State encoder @ LOB features ; Execution policy @ ONNX PPO ; Risk guard @ hard limits ; Order gateway @ FIX ; Post-trade TCA @ analytics ; Policy trainer @ simulator
edge: Venue outage mid-order | stuck child orders | Heartbeat monitor and auto-cancel with schedule rebalance
edge: Volatility spike beyond training range | policy acts out of distribution | OOD detector reverts to benchmark schedule
off: Shortfall vs benchmark in simulator ; Sim-to-real gap on shadow trades
on: Average slippage in basis points ; Fill rate
gap: Simulator lacks market impact ; Training on one volatility regime

== market-making-quote-optimization | Market-Making Quote Optimisation | reinforcement-learning | sub-10ms | staff-principal | a=100 k=1
obj: Quote bid and ask prices that earn spread while controlling inventory and adverse selection.
loss: \max_\pi\;\mathbb{E}\!\left[\text{PnL}_T-\phi\int_0^T q_t^2\,dt\right]
con: Quote update under 1 ms ; Inventory and loss limits ; Exchange message rate caps ; Kill switch within 100 ms
sn: Adverse selection | Fill toxicity features (trade imbalance, queue position) | Spread alone | Capturing spread against informed flow loses money
sn: Inventory | Inventory-aware skewing of quotes | Symmetric quotes | Inventory risk dominates PnL variance
sig: Queue position and size | estimated position in queue at best price | Fill probability | Estimate from own order events
sig: Short-term trade imbalance | signed volume over last 100 ms | Toxicity predictor | Use exchange-timestamp ordering
sig: Inventory skew | quote shift proportional to inventory | Risk control | Cap by hard limits
noise: Long-horizon price predictions | not actionable at quote horizon
noise: News sentiment | too slow for quote decisions
base: Avellaneda-Stoikov closed-form quoting.
prod: Avellaneda-Stoikov baseline plus an RL policy modulating skew and spread via learned toxicity features, with hard risk wrappers.
pipe: Feed handler @ UDP multicast ; Microstructure features @ FPGA or C++ ; Quote policy @ small MLP ; Risk wrapper @ inventory and loss limits ; Order entry @ exchange binary protocol ; Kill-switch monitor @ independent process ; Offline replay @ simulator
edge: Exchange sends stale data | quotes against old prices | Sequence-gap detection with quote pull
edge: Latency spike in order entry | stale quotes picked off | Latency monitor widens spreads automatically
off: Sharpe in market-replay simulation ; Fill toxicity calibration
on: PnL per unit risk ; Adverse selection cost
gap: Replay ignores queue position effects ; Overfitting to a single instrument

== credit-card-offer-personalization | Credit Card Offer Personalisation | recommender,tabular | sub-100ms | production-grade | a=3 k=3
obj: Show each customer the card or reward offer with the highest expected lifetime value subject to eligibility and risk policy.
loss: \mathcal{L}=-\sum_{(u,o)}\left[c_{uo}\log\sigma(s_{uo})+(1-c_{uo})\log(1-\sigma(s_{uo}))\right]
con: Pre-approval eligibility filters ; Fair-lending rules ; Offer must be explainable ; 60 ms
sn: Value | Expected profit (approval, usage, risk) not click-through | Maximising clicks | Clicks on cards that decline or default lose money
sn: Eligibility | Eligibility computed before ranking | Rank then filter | Showing ineligible offers frustrates users and violates policy
sig: Pre-approval probability | model score for approval of this offer | Avoids dead-end clicks | Compute with current bureau pull date
sig: Spend category affinity | share of spend in offer's reward category | Reward relevance | Trailing 6 months excluding offer period
sig: Expected profit margin | model-based NPV of acquiring this customer | Business value | Uses forward-looking estimates with lag
noise: Browsing dwell time | high variance and gameable
noise: Device brand | proxy for income with fairness risk
base: Rules by segment (spend profile, credit tier).
prod: Two-stage: eligibility service then multi-objective ranker (take-up, approval, profit) with exploration, served from a feature store.
pipe: Offer request @ app backend ; Eligibility service @ policy engine ; Feature lookup @ online store ; Offer ranker @ multi-task GBDT ; Exploration layer @ Thompson sampling ; Display API @ response ; Outcome events @ attribution
edge: Rate change invalidates offers | stale offers shown | Offer catalogue versioning and TTL
edge: Cold-start new customers | ranker falls back to popularity | Segment-based priors and fast bandit warm-up
off: Offer ranking NDCG on profit-weighted conversions ; Approval-rate calibration
on: Booked accounts per impression ; Profit per offer shown
gap: Training on clicks ignores approval outcome ; Selection bias from past rules-based targeting

== insurance-claims-fraud-detection | Insurance Claims Fraud Detection | tabular,graph,nlp | batch | production-grade | a=0.05 k=40
obj: Triage incoming claims by fraud likelihood to route investigators to the highest recovery opportunities while paying genuine claims fast.
loss: \mathcal{L}=\mathrm{CE}(y,p)\cdot v(\text{claim amount})
con: Straight-through payment for low-risk claims ; Evidence preserved for litigation ; Fair claims handling regulations ; Daily scoring
sn: Network | Shared providers, lawyers, repair shops and addresses across claims | Single claim attributes | Organised fraud lives in the links between claims
sn: Text | Narrative inconsistency across statements and reports | Keyword flags | Keyword lists are trivially avoided
sig: Provider-claimant co-occurrence | count of past claims where the pair appears together | Collusion marker | Use claims before the current one
sig: Claim-timing anomaly | days between policy inception and loss | Fraud near inception | Policy dates from the policy admin system as-of
sig: Narrative similarity | embedding similarity of this loss description to prior flagged claims | Template reuse | Exclude same-claim documents
noise: Claim number | arbitrary identifier
noise: Adjuster ID | memorises staff, not claim risk
base: Rule-based red-flag scoring.
prod: GBDT on structured features, graph features from claim-entity network, and an LLM-derived narrative inconsistency score.
pipe: Claim intake @ policy admin API ; Entity resolution @ blocking plus matching ; Graph feature job @ Spark ; Fraud scorer @ GBDT ; Narrative analyser @ LLM with extraction ; SIU referral @ investigator queue ; Recovery outcomes @ labels
edge: Catastrophe event (hurricane) floods genuine claims | volume spike triggers false flags | Event-aware baselines and CAT-mode thresholds
edge: Investigator capacity shrinks | queue overflows | Capacity-aware cutoff with value-weighted ranking
off: PR-AUC and recovery-weighted gain ; Precision at SIU capacity
on: Fraud recovery per investigator hour ; Genuine claim cycle time
gap: Labels only from investigated claims ; Fraud found years later leaks from later closed claims

== insurance-claim-damage-estimation-vision | Vehicle Damage Estimation from Photos | computer-vision,tabular | seconds | production-grade | a=0.05 k=3000
obj: Estimate repair cost from customer photos within seconds, enabling instant settlement of simple claims.
loss: \mathcal{L}=\mathcal{L}_{\text{seg}}+\mathcal{L}_{\text{cls}}+\lambda\,\mathrm{Huber}(\text{cost},\widehat{\text{cost}})
con: Settlement accuracy within 10% ; Photo fraud detection ; Works with phone photos in poor light ; Human override
sn: Coverage | Required photo angles enforced with guided capture | Whatever the customer uploads | Missing angles are the main error source
sn: Cost | Part-level damage mapped to repair-shop labour and part prices | End-to-end image-to-cost regression | Prices vary by region and part supplier
sig: Damaged part segmentation | mask and severity per vehicle part | Maps to repair operations | Use a part taxonomy per model year
sig: Photo integrity score | EXIF, duplication and manipulation checks | Photo fraud | Reverse-image search against prior claims
sig: Vehicle identification | make, model, year from VIN and image | Parts price lookup | Decode VIN before image model
noise: Image aspect ratio | device-specific artefact
noise: Weather in the photo | environment, not damage
base: Adjuster manual estimate from photos.
prod: Part-aware segmentation (Mask2Former) feeding repair-line prediction and a regional parts-and-labour price service, with confidence-based human review.
pipe: Guided capture app @ mobile SDK ; Image quality gate @ blur and angle check ; Damage segmentation @ Mask2Former on GPU ; Repair-line estimator @ GBDT ; Price service @ parts and labour API ; Adjuster review @ low-confidence queue ; Settlement outcomes @ final repair cost
edge: Pre-existing damage | prior damage is counted | Cross-check against previous claims and photo history
edge: Rare vehicle models | parts mapping missing | Fallback to human estimate with data capture for catalogue
off: Mean absolute percentage error vs final repair cost ; Part-level IoU
on: Straight-through settlement rate ; Supplement (re-estimate) rate
gap: Training on estimates instead of final invoices ; Only easy claims in test set

== insurance-underwriting-risk-pricing | Insurance Underwriting & Risk Pricing | tabular | sub-100ms | production-grade | a=0.02 k=10
obj: Price policies at quote time so premiums match expected loss and competitor-aware conversion within regulatory rate rules.
loss: \mathcal{L}=\mathrm{Deviance}_{\text{Tweedie}}(y,\hat\mu)=2\left[\frac{y^{2-p}}{(1-p)(2-p)}-\frac{y\hat\mu^{1-p}}{1-p}+\frac{\hat\mu^{2-p}}{2-p}\right]
con: Rating factors must be filed with regulators ; No prohibited attributes ; Quote in 80 ms ; Rate changes need actuarial sign-off
sn: Model form | Frequency times severity (or Tweedie) with exposure offsets | Classification of claim yes/no | Ignoring exposure biases pricing for part-year policies
sn: Price | Loss cost plus demand elasticity optimisation | Charging pure risk premium | Pure-risk price ignores conversion and retention
sig: Exposure-adjusted claim frequency | claims per policy-year by segment | Core pricing signal | Offset by earned exposure
sig: Vehicle or property risk class | engineered class from make, model, construction | Severity driver | Use as-of rating tables
sig: Telematics or sensor score | driving behaviour score from device | Behavioural risk | Consent and short observation windows
noise: Customer first name | no risk information and proxy for demographics
noise: Browser type | quote-funnel artefact
base: GLM with filed rating factors.
prod: GLM-GBM hybrid (GBM residual on GLM offset) distilled to a filed rating table, with elasticity-aware price optimisation.
pipe: Quote request @ API ; Rating-factor service @ filed tables ; Risk model @ GBM on GLM offset ; Price optimiser @ elasticity model ; Compliance check @ filed-rate guard ; Underwriter referral @ exceptions ; Claims outcomes @ development triangles
edge: Claims development lag | recent cohorts look better than they are | IBNR adjustments and development-factor features
edge: Competitor rate cut | conversion collapses | Competitive price feed and elasticity retraining
off: Gini and lift by decile ; Out-of-time Tweedie deviance
on: Loss ratio by cohort ; Conversion rate at target margin
gap: Immature claims in training window ; Rating factors not permitted in production slipped into features

== telematics-usage-based-insurance-scoring | Telematics Usage-Based Insurance Scoring | time-series,tabular | batch | production-grade | a=2 k=50
obj: Score driving behaviour from phone and device sensors to offer fair, behaviour-based premiums and reduce claims through feedback.
loss: \mathcal{L}=\mathrm{PoissonDeviance}(\text{claims},\hat\lambda)+\lambda\,\mathrm{Fairness}
con: Battery impact on phones ; Trip detection accuracy ; Privacy of location data ; Score stability over time
sn: Events | Harsh braking, speeding and phone-handling per 100 km normalised by road type | Raw event counts | City drivers brake more by necessity
sn: Exposure | Time-of-day and road-type exposure features | Mileage alone | Night driving risk differs from daytime
sig: Harsh events per 100km by road class | events normalised by distance and road class | Behaviour not circumstance | Map-match to road class
sig: Speed over limit percentage | fraction of distance over posted limit | Risk behaviour | Map speed limits as-of date
sig: Phone distraction minutes | touch and motion-based screen use while moving | Strong crash predictor | Respect passenger exclusion
noise: Absolute top speed | rare, outlier-dominated
noise: Trip start location | privacy risk, weak signal
base: Rule scorecard with event penalties.
prod: Sequence model over sensor-derived events with map-matching, GBDT scoring on aggregated features, calibrated to claim frequency.
pipe: Sensor ingestion @ mobile SDK ; Trip segmentation @ stream processor ; Map matching @ road network service ; Driving-event extractor @ signal processing ; Risk scorer @ GBDT ; Premium engine @ rating service ; Claims linkage @ outcomes
edge: Passenger in car misdetected as driver | the passenger’s driving score is wrongly attributed to the policyholder | Driver-identification model and manual confirmation
edge: Phone OS update changes sensor sampling | event rates shift | Sampling-rate-invariant features and per-OS calibration
off: Poisson deviance on claims ; Score stability across weeks
on: Claim frequency of high-score vs low-score ; Opt-in retention
gap: Short observation windows with no claims yet ; Selection bias because only safe drivers opt in

== retail-banking-churn-prediction | Retail Banking Churn Prediction | tabular,time-series | batch | foundational | a=1 k=2
obj: Identify customers likely to leave within 90 days and trigger the right retention action at net-positive ROI.
loss: \mathcal{L}=\mathrm{BCE}(y,p)\quad\text{with uplift targeting: }\tau(x)=\mathbb{E}[Y(1)-Y(0)\mid x]
con: Marketing consent ; Offer budget ; Weekly scoring ; Do not target customers likely to stay anyway
sn: Targeting | Uplift modelling to find persuadable customers | Targeting highest churn probability | The likeliest churners often cannot be saved
sn: Definition | Churn as primary-account abandonment, not inactivity alone | Account closure only | Customers silently shift salary credit first
sig: Salary-credit shift | share of incoming salary arriving to this account vs prior | Earliest abandonment cue | Detect before closure date
sig: Digital engagement decay | 4-week trend of logins and transactions | Disengagement | Exclude outage weeks
sig: Product depth | number of active products and their stickiness | Retention driver | Count active, not opened
noise: Customer tenure alone | already captured by product depth
noise: Branch assigned | stale, unrelated to digital behaviour
base: Logistic regression on RFM features.
prod: GBDT churn model plus a T-learner uplift model, with a budget-constrained treatment allocator.
pipe: Customer 360 @ lakehouse ; Feature builder @ Spark ; Churn and uplift models @ GBDT ; Treatment allocator @ budget optimiser ; Campaign orchestration @ CRM ; Relationship manager outreach @ human follow-up ; Retention outcomes @ labels
edge: Product repricing event | churn spike unrelated to behaviour | Include price-change flags and cohort controls
edge: Treatment fatigue | repeated offers lose effect | Contact history and exposure caps in the model
off: Qini and uplift at top decile ; AUC for churn
on: Retained revenue net of offer cost ; Save rate in treated vs control
gap: Predicting churn and treating without holdout ; Features computed after the churn event began

== customer-lifetime-value-prediction | Customer Lifetime Value Prediction | tabular,time-series | batch | production-grade | a=1 k=2
obj: Predict 12-month and 36-month customer value at acquisition and over time to steer marketing spend and servicing tiers.
loss: \mathcal{L}=\sum_i\mathrm{ZILN}(y_i;\pi_i,\mu_i,\sigma_i)=-\sum_i\left[\mathbb{1}_{y_i=0}\log\pi_i+\mathbb{1}_{y_i>0}\left(\log(1-\pi_i)+\log\mathcal{LN}(y_i;\mu_i,\sigma_i)\right)\right]
con: Calibrated across cohorts ; Refresh weekly ; Used in bid decisions so must not leak cost data ; Explainable to finance
sn: Distribution | Zero-inflated lognormal for spend (many zeros, heavy tail) | MSE on raw spend | A few whales dominate MSE and the model ignores everyone else
sn: Horizon | Cohort-based validation with observed horizon | Mixing censored and mature customers | Young customers have partial histories
sig: Early-life activity | transactions and balances in the first 30 days | Strongest predictor of value | Fixed observation window per customer
sig: Product mix at 30d | products held and funding patterns | Depth predicts value | Count at fixed day not current
sig: Acquisition source quality | historical LTV of customers from the same source | Targeting feedback | Use matured cohorts only
noise: Raw lifetime-to-date spend | encodes age, not future value
noise: Customer ID cohort order | arbitrary
base: BG/NBD plus Gamma-Gamma probabilistic model.
prod: ZILN gradient-boosted model with cohort-aware calibration, quantile outputs for planning and a monotone constraint on engagement.
pipe: Customer ledger @ lakehouse ; Early-life feature builder @ Spark ; LTV model @ ZILN GBDT ; Calibration layer @ cohort isotonic ; Marketing bid feed @ CDP ; Finance review @ variance report ; Realised value tracker @ cohort monitor
edge: Product launch changes value drivers | model underestimates new product customers | Segment-level monitor with fast retrain triggers
edge: Macro downturn | LTV overestimated across cohorts | Scenario multipliers and stress calibration
off: Normalised Gini of value ranking ; Cohort-level calibration error
on: Marketing ROI by channel ; Value captured in top decile
gap: Using full-history features for young customers ; Evaluating without censoring-aware metrics

== payment-ops-anomaly-detection | Payments Operations Anomaly Detection | time-series | sub-100ms | production-grade | a=0 k=1
obj: Detect abnormal drops in success rate, latency or volume across thousands of payment dimensions within minutes of onset.
loss: \mathcal{L}=\sum_t\left[\log\hat\sigma_t+\frac{(y_t-\hat\mu_t)^2}{2\hat\sigma_t^2}\right]
con: Alert latency under 3 minutes ; 50k dimension combinations ; False alerts under 1 per day per team ; Root-cause hints
sn: Dimensions | Hierarchical detection across (acquirer, BIN, region, method) | Monitoring only top-line success rate | Segment outages hide inside healthy aggregates
sn: Noise | Seasonality-adjusted residuals with adaptive thresholds | Static thresholds | Weekly and diurnal cycles break static thresholds
sig: Success-rate residual z-score | residual of success rate vs seasonal forecast | Anomaly measure | Forecast uses only past data
sig: Volume-weighted impact | residual times affected volume | Prioritises business impact | Use rolling volume baseline
sig: Dimension co-movement | which dimension values explain the drop | Root cause | Control for multiple comparisons
noise: Single-minute dips in tiny segments | statistical noise
noise: Holiday raw volumes | predictable via calendar
base: Static thresholds on success rate.
prod: Seasonal forecasting per segment with Bayesian shrinkage, hierarchical reconciliation and Shapley-style drill-down for root cause.
pipe: Metrics stream @ Kafka ; Segment aggregator @ Flink ; Seasonal forecaster @ Prophet-style plus shrinkage ; Anomaly scorer @ residual statistics ; Alert deduplicator @ incident grouping ; On-call page @ PagerDuty ; Incident labels @ postmortem tags
edge: Planned maintenance window | alerts fire for known downtime | Change-calendar suppression with automatic registration
edge: New merchant launch | segment has no history | Hierarchical priors from parent segments
off: Detection delay at fixed false-alarm rate ; Precision on postmortem-confirmed incidents
on: Mean time to detect ; Alert fatigue (pages per incident)
gap: Synthetic injected anomalies unlike real outages ; Training on periods containing undetected incidents

== reconciliation-matching-automation | Payment & Ledger Reconciliation Matching | nlp,tabular | batch | production-grade | a=2 k=3
obj: Automatically match bank, processor and ledger entries to close books faster with 98% auto-match and clear exceptions.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{ManyToManyConsistency}
con: Auditable matches ; Day-end close deadline ; Handle one-to-many and many-to-many ; Tolerate rounding and FX
sn: Matching | Candidate blocking then learned pair scoring | All-pairs comparison | N-squared comparison cannot finish before close
sn: Groups | Many-to-many subset-sum matching with tolerance | Strict one-to-one amount equality | Batched settlements and fees break one-to-one
sig: Amount delta within tolerance | absolute and relative difference net of fees | Primary match feature | Fee tables as-of settlement date
sig: Reference token overlap | normalised reference and narrative token similarity | Human-visible link | Strip bank-injected prefixes
sig: Date proximity | value date vs booking date gap | Timing alignment | Business-day calendars per currency
noise: Free-text customer notes | rarely consistent between systems
noise: Entry sequence number | arbitrary and system-specific
base: Deterministic rules on amount and reference equality.
prod: Blocking, GBDT pair scorer, subset-sum solver for groups, and an active-learning loop from accountant corrections.
pipe: Source ingestion @ SFTP and APIs ; Normaliser @ schema mapping ; Candidate blocking @ key buckets ; Pair scorer @ GBDT ; Group matcher @ subset-sum solver ; Exception queue @ accountants ; Correction feedback @ active learning
edge: Cut-off timing differences at month-end | many items unmatched | Period-boundary aware matching windows
edge: Duplicate provider files | double-counted settlements | File-hash idempotency and duplicate detection
off: Auto-match precision at 98% recall ; Group match accuracy
on: Days to close ; Manual touches per 1000 entries
gap: Training on already-reconciled easy matches ; Evaluating on one bank format

== regulatory-reporting-rag-copilot | Regulatory Reporting RAG Copilot | llm-agents,nlp | seconds | production-grade | a=0.05 k=30 s=3 t=500
obj: Answer compliance questions and pre-fill regulatory reports from rule books and internal data with exact citations.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{retrieved})+\lambda\,\mathrm{CitationError}
con: Every answer cites the rule paragraph ; Version-aware (effective dates) ; Private deployment ; Reviewer sign-off
sn: Versioning | Effective-date aware retrieval of rule versions | Latest-version only | Reports are filed under the rule version in force at period end
sn: Structure | Hierarchical chunking by article, paragraph and definition | Fixed-size chunks | Definitions live far from the clauses that depend on them
sig: Clause-level retrieval recall | share of ground-truth clauses retrieved in top 10 | Retrieval bounds answer quality | Evaluate with expert-labelled clauses
sig: Effective-date match | rule version vs report period | Prevents wrong-law answers | Date from filing period not today
sig: Definition linking | expanded defined terms inside the answer context | Correct interpretation | Link to the defining paragraph
noise: Generic web regulatory commentary | out-of-scope, unauthoritative
noise: Model's parametric memory of regulations | stale and ungrounded
base: Keyword search over rule PDFs.
prod: Hybrid retrieval over a versioned legal knowledge graph, reasoning LLM with citation verifier and numeric tool for report fields.
pipe: Rulebook ingestion @ structured parser ; Versioned index @ hybrid search ; Retriever and reranker @ cross-encoder ; Reasoning LLM @ private model ; Citation verifier @ entailment check ; Compliance officer review @ approval ; Answer log @ audit
edge: Amended regulation published today | answer cites superseded rule | Hot-reload pipeline with change-alert and re-index SLA
edge: Ambiguous question spanning jurisdictions | model blends rules | Jurisdiction detection and forced clarification
off: Clause recall at k ; Answer support rate
on: Time to prepare report ; Reviewer edit rate
gap: Test questions copied from document headings ; Counting plausible answers without clause verification

== earnings-call-sentiment-and-esg-signals | Earnings-Call Sentiment & ESG Signal Extraction | nlp | batch | production-grade | a=1 k=60
obj: Convert filings, calls and news into structured, point-in-time signals for research analysts and quant models.
loss: \mathcal{L}=\mathrm{CE}(y,p)+\lambda\,\mathrm{ConsistencyAcrossParaphrase}
con: Timestamp accuracy to the second ; Reproducible model versions ; Licence compliance for transcripts ; Cover 10k issuers
sn: Delta | Change in language versus prior quarters (new hedging, dropped guidance) | Absolute sentiment score | Absolute sentiment is dominated by sector tone
sn: Timing | Signal available only after publication timestamp | Date-level joins | Date joins leak intraday content into earlier returns
sig: Guidance language change | diff of forward-looking statements vs prior call | Early info on outlook | Align quarters correctly
sig: Q&A evasiveness score | non-answer rate in analyst Q&A | Management caution | Speaker diarisation must be accurate
sig: Topic emphasis shift | change in share of text on risk topics | ESG risk emphasis | Topic model frozen per version
noise: Overall positivity | boilerplate optimism by management
noise: Transcript length | varies with company style
base: Loughran-McDonald lexicon sentiment.
prod: Fine-tuned financial LLM extracting structured claims per paragraph, with quarter-over-quarter delta features and timestamps in a point-in-time store.
pipe: Transcript ingestion @ licensed feeds ; Speaker diarisation @ ASR plus alignment ; Claim extractor @ fine-tuned LLM ; Delta feature builder @ versioned diff ; Point-in-time store @ time-stamped ; Analyst API @ research platform ; Signal tracking @ IC monitor
edge: Transcript corrected hours later | signal changes retroactively | Versioned transcripts and as-of timestamps
edge: Language model update shifts scores | historical comparability breaks | Back-score full history on each model version
off: Information coefficient of delta signal ; Extraction F1
on: Analyst usage ; Portfolio contribution of signals
gap: Date-level joins instead of timestamp ; Model trained on text that mentions the subsequent price move

== trade-surveillance-spoofing-detection | Trade Surveillance: Spoofing & Layering Detection | time-series,tabular | sub-100ms | staff-principal | a=30 k=2
obj: Detect order-book manipulation patterns (spoofing, layering, wash trades) in near real time for regulators and venues.
loss: \mathcal{L}=\mathrm{FL}(p,y)+\lambda\,\mathrm{TemporalSmoothness}
con: Sub-100ms detection of live patterns ; Evidence preserved at message level ; Low false positives against legitimate market makers ; Venue audit
sn: Sequence | Order cancel-after-trade sequences on opposite sides | Order cancel ratio alone | Market makers have high cancel ratios legitimately
sn: Intent | Order-to-trade ratio conditioned on same-side execution | Raw message counts | Message counts reflect strategy not manipulation
sig: Opposite-side execution after cancel | execution on side B within 500 ms of cancelling side A | Spoof signature | Use exchange sequence numbers
sig: Large-order fleeting time | lifetime of large resting orders | Layering signal | Normalise by instrument liquidity
sig: Price impact of cancelled orders | quote move caused by the resting order | Manipulative effect | Counterfactual using same-time books
noise: Trading volume per day | trader size, not behaviour
noise: Account tenure | not an intent signal
base: Rule thresholds on cancel ratios and order lifetimes.
prod: Sequence model (temporal convolution) over order-book events plus GBDT on behavioural features, with rule-based hard evidence extraction.
pipe: Order-book event feed @ exchange multicast ; Sequence builder @ per-trader state ; Pattern detector @ TCN ; Evidence extractor @ message-level replay ; Alert router @ compliance ; Compliance review @ human analyst ; Regulatory referral @ case management
edge: Venue sends corrected sequence numbers | patterns misaligned | Sequence repair and reorder buffer
edge: Legitimate liquidity provider flagged | false positive storm | Counterparty-type features and whitelisted strategy registry
off: Recall on historical enforcement cases ; False-positive rate per million messages
on: Cases opened per month ; Analyst review time
gap: Few labelled cases drawn from enforcement bias ; Test period overlaps market-structure changes

== cross-border-fx-pricing-optimization | Cross-Border Payment FX & Fee Pricing | tabular,reinforcement-learning | sub-100ms | production-grade | a=0.3 k=2
obj: Price FX markup and fees per corridor and customer segment to maximise revenue subject to conversion and fairness constraints.
loss: \max_p\;\mathbb{E}\!\left[(p-c)\cdot\Pr(\text{convert}\mid p,x)\right]
con: Price transparency regulations ; No discriminatory pricing ; Live FX rate volatility ; Quote validity window of 30 s
sn: Elasticity | Price elasticity per corridor estimated causally | Correlating price with conversion | Price correlates with segment quality
sn: Cost | Live cost of liquidity (spread, hedging) in the margin | Fixed markup | Static markups lose money in volatile windows
sig: Corridor price elasticity | log-log demand response from randomised price tests | Optimisation input | Use randomised cells only
sig: Quote-to-convert funnel | conversion by price band for similar customers | Demand curve | Condition on amount and device
sig: Liquidity cost estimate | real-time spread plus hedge cost | Cost term | Use cost at quote time
noise: Customer nationality | fairness risk, replaced by corridor
noise: Session duration | funnel artefact
base: Tiered fixed markups per corridor.
prod: Bayesian demand model with Thompson-sampling price experimentation and a convex optimiser with fairness guardrails.
pipe: Quote request @ API ; Cost estimator @ live liquidity feed ; Demand model @ Bayesian elasticity ; Price optimiser @ constrained solver ; Fairness guard @ policy limits ; Quote service @ response ; Conversion events @ Kafka
edge: Volatility spike | quotes become loss-making | Dynamic margin floor tied to realised volatility
edge: Regulatory transparency rule | prices must be shown in fixed format | Display-layer template tests and compliance sign-off
off: Revenue lift in randomised price tests ; Elasticity calibration
on: Revenue per transaction ; Conversion rate
gap: Observational price-conversion data confounded ; Optimising on quotes not completed transfers

== atm-cash-demand-forecasting | ATM Cash Demand Forecasting & Replenishment | time-series | batch | foundational | a=1 k=1
obj: Forecast per-ATM cash demand to cut cash-out incidents while reducing idle cash and cash-in-transit visits.
loss: \mathcal{L}=\sum_{t}\left[c_u(y_t-\hat y_t)^+ +c_o(\hat y_t-y_t)^+\right]
con: Replenishment cost per visit ; Cash-out SLA ; 100k ATMs daily ; Holiday and payday effects
sn: Asymmetry | Newsvendor-style asymmetric cost with quantile forecasts | Symmetric MSE | Running out costs far more than holding extra cash
sn: Censoring | Estimate true demand when ATM was empty | Using dispensed cash as demand | Cash-outs censor demand and bias forecasts down
sig: Payday proximity | days to local salary dates | Withdrawal surge | Region-specific calendars
sig: Location type | branch, mall, transit, rural cluster | Demand profile | Cluster by behaviour not label
sig: Recent cash-out censoring flag | hours out of cash in prior weeks | Demand correction | Use for de-censoring only
noise: ATM serial number | arbitrary
noise: Weather daily noise | marginal after calendar
base: Seasonal naive by weekday and ATM.
prod: Global gradient-boosted quantile model with calendar covariates and de-censoring, feeding a vehicle-routing replenishment optimiser.
pipe: ATM dispense logs @ switch ; De-censoring module @ Tobit-style correction ; Quantile forecaster @ LightGBM ; Cash-level optimiser @ newsvendor rule ; Route planner @ VRP solver ; Operations dispatch @ CIT vendor ; Replenishment outcomes @ cash-outs
edge: Local event (festival) drives demand | machines run out of cash during the event | Event calendar features and manual override channel
edge: ATM offline hours | demand data missing | Missingness flags and neighbour ATM transfer features
off: Pinball loss at 90th percentile ; Cash-out probability calibration
on: Cash-out incidents ; Idle cash balance
gap: Treating censored days as true demand ; Random CV over days

== digital-onboarding-dropoff-prediction | Digital Onboarding Drop-off Prediction & Intervention | tabular,time-series | sub-100ms | foundational | a=0.2 k=2
obj: Predict mid-funnel abandonment during account opening and intervene (nudge, simplified step, assisted help) to lift completion.
loss: \mathcal{L}=\mathrm{BCE}(y,p)\;\text{and uplift: }\tau(x)=\mathbb{E}[Y(1)-Y(0)\mid x]
con: No pressure tactics ; Consent for outreach ; Decision under 80 ms per screen ; Privacy for partial applications
sn: Intervention | Estimate uplift of each intervention | Predicting abandonment only | Some abandoners cannot be saved and some stay anyway
sn: Friction | Step-level timing and error features | Page-view counts | The failing step is the signal, not the total pages
sig: Step dwell time vs peers | z-score of dwell on current step | Confusion marker | Peer baseline per device type
sig: Validation error count | form errors encountered on this step | Friction direct measure | Count before the nudge
sig: Document capture retries | retries on ID photo | Quality friction | Retry source (device vs lighting)
noise: Total session time | dominated by multitasking
noise: Referrer URL | acquisition artefact
base: Funnel analytics with rule triggers (idle 60s).
prod: Real-time GBDT scoring per step with uplift-based intervention selection and online experimentation.
pipe: Client event stream @ SDK ; Session feature builder @ Flink ; Drop-off scorer @ GBDT ; Uplift selector @ T-learner ; Intervention API @ nudge service ; Experiment platform @ A/B holdout ; Completion outcome @ funnel logs
edge: App release changes flow | features shift instantly | Release-aware feature normalisation and rollback checks
edge: Bot traffic | inflates drop-off | Bot filter before scoring
off: Qini on randomised holdout ; AUC of drop-off
on: Completion rate ; Cost per activated account
gap: Intervention data from non-random triggers ; Sessions with no outcome treated as dropped

== bnpl-risk-decisioning | BNPL Instant Risk Decisioning | tabular | sub-100ms | production-grade | a=0.5 k=3
obj: Approve or decline buy-now-pay-later at checkout in under 100 ms with loss targets per merchant cohort and fair outcomes.
loss: \mathcal{L}=\mathrm{BCE}(y,p)\cdot w(\text{order value})+\lambda\,\mathrm{Calibration}
con: 100 ms total checkout budget ; Responsible-lending affordability checks ; Adverse action reasons ; Merchant-specific loss agreements
sn: Affordability | Cash-flow-based affordability checks | Bureau score alone | Thin-file users have no score but have stable cash flow
sn: Stacking | Outstanding BNPL exposure across providers | Own-book exposure only | Loan stacking drives early defaults
sig: Stacked exposure | total open BNPL obligations from consortium data | Overextension | Snapshot at checkout time
sig: First-payment risk | probability of failing the first instalment | Early default is the dominant loss | Label horizon 30 days
sig: Basket and merchant risk | category, value and merchant default history | Order-level risk | Merchant history as-of
noise: Device battery level | spurious
noise: Time on checkout page | friction artefact
base: Scorecard with bureau and order features.
prod: GBDT with consortium stacking features, calibrated per merchant cohort, plus dynamic limit adjustment from first-payment performance.
pipe: Checkout API @ merchant SDK ; Consortium lookup @ cached exposure service ; Feature store @ Redis ; Risk model @ LightGBM ; Affordability and policy @ rules ; Collections trigger @ early-risk queue ; Repayment labels @ ledger
edge: Merchant promotion causes volume surge | adverse selection | Merchant-level exposure caps and drift monitor
edge: Consortium API timeout | missing stacking data | Defined fallback score with tighter limits
off: AUC and KS at 30-day first-payment default ; Calibration by cohort
on: Loss rate per GMV ; Approval rate
gap: Training on approved orders only ; 30-day label window used for 90-day loss targets

== fraud-investigator-copilot-agent | Fraud Investigator Copilot Agent | llm-agents,graph | seconds | staff-principal | a=0.3 k=40 s=6 t=500
obj: Give fraud analysts a copilot that assembles the case timeline, links entities and proposes dispositions, cutting investigation time by 50%.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{tools})+\lambda\,\mathrm{UnsupportedClaim}
con: Read-only tools by default ; Immutable audit of every tool call ; Data minimisation ; Analyst remains decision maker
sn: Tools | Typed read-only tools over case, graph and transaction stores | Giving the model raw database access | Raw access leaks data and enables injection-driven exfiltration
sn: Evidence | Every claim linked to a record ID | Free-form narrative | Unsupported claims destroy analyst trust
sig: Evidence link rate | share of claims with valid record IDs | Trust metric | Verify IDs against the source system
sig: Tool-call success path | steps needed and failures per case type | Efficiency and reliability | Sample by case complexity
sig: Disposition agreement | agreement between copilot suggestion and senior analyst | Quality signal | Blind comparison
noise: Narrative length | longer is not better
noise: Confidence phrased in words | uncalibrated
base: Search and graph UI with saved queries.
prod: Planner agent with typed graph and transaction tools, a verifier, plan-then-act with step caps, and an eval harness replaying historical cases.
pipe: Case context loader @ case API ; Planner agent @ LLM with tool schema ; Entity graph tool @ read-only graph API ; Transaction query tool @ parameterised SQL ; Claim verifier @ record-ID check ; Analyst workspace @ review and decision ; Tool audit log @ immutable store
edge: Injected instruction in a memo field | agent changes tool use | Untrusted-field sandboxing and instruction hierarchy
edge: Tool latency spikes | agent retries tools in a loop and burns the budget | Step and time budgets with partial-result summary
off: Evidence link validity ; Disposition match on replayed cases
on: Investigation time per case ; Analyst-approved suggestion rate
gap: Replay set contains cases the model was tuned on ; Judging by analyst satisfaction instead of correctness

== credit-model-drift-and-fairness-monitoring | Credit Model Drift & Fairness Monitoring | tabular | batch | production-grade | a=1 k=2
obj: Continuously monitor credit models for performance decay, population shift and disparate impact, with automated retraining triggers and audit reports.
loss: \mathcal{L}=\mathrm{PSI}(P,Q)=\sum_i(P_i-Q_i)\ln\frac{P_i}{Q_i}
con: Regulator-grade documentation ; Delayed outcomes ; Protected-class data governance ; Monthly governance committee
sn: Performance | Matured-outcome performance with delay-aware estimates | Raw recent default rates | Recent cohorts have not had time to default
sn: Drift | Concept drift (relationship) vs covariate drift (inputs) | Reporting PSI only | PSI flags inputs but not whether the model is wrong
sig: Population stability by feature | PSI per feature and score | Input shift | Reference window fixed by model version
sig: Delay-adjusted default estimate | expected defaults on immature cohorts via survival | Early performance | Use hazard model not simple rates
sig: Adverse-impact ratio | approval ratio protected vs reference group | Fairness | Use proxy or surveyed attributes lawfully
noise: Daily PSI fluctuations | sampling noise
noise: Single-feature drift in unused features | no decision impact
base: Monthly PSI and Gini report.
prod: Automated monitoring with delay-aware performance estimators, drift decomposition, fairness metrics and champion-challenger triggers.
pipe: Scored decisions log @ lakehouse ; Outcome joiner @ matured-label job ; Drift and fairness metrics @ Spark ; Delay-aware estimator @ survival adjustment ; Governance dashboard @ BI reports ; Model risk committee @ human review ; Retrain trigger @ pipeline
edge: Policy change shifts population | alerts fire constantly | Policy-version stratification and re-baselining protocol
edge: Protected attribute unavailable | fairness unmeasurable | Lawful proxy methods (BISG) and surveys with governance
off: Metric stability across windows ; Detection recall on injected drift
on: Time to detect degradation ; Audit finding count
gap: Using immature cohorts as performance evidence ; Comparing across different policy regimes

== ledger-journal-entry-anomaly-audit | Ledger & Journal Entry Anomaly Audit | tabular,nlp | batch | foundational | a=1 k=2
obj: Flag unusual journal entries and postings for auditors by learning normal posting behaviour across accounts, users and periods.
loss: \mathcal{L}=\|x-\mathrm{Dec}(\mathrm{Enc}(x))\|^2+\beta\,\mathrm{KL}
con: Full population testing not sampling ; Explainable flags ; Segregation-of-duties awareness ; Quarterly audit cycle
sn: Population | Test 100% of entries with ranked risk | Random sampling of 5% | Fraud hides in entries the sample missed
sn: Context | Peer-group baselines by account, preparer and period | Global thresholds | Month-end adjustments look odd globally but are normal
sig: Round-amount and just-below-threshold | proximity to approval limits | Structuring | Limits as-of date
sig: Unusual preparer-account pair | rarity of this user posting to this account | Control override cue | Use history before the entry
sig: Posting time anomaly | weekend or night postings relative to peer pattern | Manual override sign | Timezone normalised
noise: Description length | no risk content
noise: Entry sequence | arbitrary
base: Benford's law tests and fixed rule checks.
prod: Peer-group autoencoder plus isolation forest ensemble with rule-based hard checks and LLM-generated flag explanations.
pipe: GL extract @ ERP connector ; Peer-group builder @ clustering ; Anomaly ensemble @ autoencoder plus isolation forest ; Rule checks @ hard controls ; Explanation generator @ LLM with citations ; Auditor workbench @ review ; Finding outcomes @ feedback
edge: Quarter-end close creates posting spikes | thousands of normal adjustments get flagged | Period-aware peer baselines
edge: ERP migration changes account structure | baselines break | Chart-of-accounts mapping layer and re-baseline
off: Precision at auditor capacity ; Recall on seeded anomalies
on: Findings per hundred hours ; Time to complete testing
gap: Seeded anomalies unlike real fraud ; Labels reflect auditor attention, not true risk
