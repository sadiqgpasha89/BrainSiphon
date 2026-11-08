# AdTech & Marketing, part 2 (use cases 26-50)
== landing-page-quality-score | Ad Quality Score & Landing-Page Experience | nlp,computer-vision | sub-100ms | production-grade | a=10 k=4
obj: Score expected landing-page experience and ad quality to rank and price ads, protecting users from deceptive or slow pages.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{RankLoss}
con: Page scores cached and refreshed ; Crawler politeness ; Advertiser appeals ; Transparent policy
sn: Experience | Post-click satisfaction signals (bounce, return-to-search) | CTR as quality | CTR rewards clickbait
sn: Freshness | Refresh scores on page change | One-time score | Landing pages change after approval
sig: Page load time and layout shift | Core Web Vitals | UX | Lab vs field
sig: Content relevance to ad | semantic match | Relevance | Embeddings
sig: Post-click return rate | share returning to results quickly | Dissatisfaction | Window
noise: Domain age | weak
noise: Ad ID | none
base: Rule checks on load time and policy keywords.
prod: Multimodal page model (text plus screenshot) combined with field user signals into a calibrated quality score refreshed on change detection.
pipe: Landing page crawler @ headless browsers ; Content and screenshot features @ extractor ; Quality model @ multimodal GBDT ; Field-signal merger @ analytics ; Score store @ key-value ; Auction consumer @ ranker ; Advertiser appeals @ human
edge: Page changes content after approval | bait-and-switch | Change detection and periodic re-crawl with cloaking checks
edge: Crawler blocked by advertiser | the landing page cannot be crawled so no quality score exists for ranking | Default score with penalty and advertiser notice
off: AUC on policy-labelled pages ; Rank correlation with satisfaction
on: User complaint rate ; Revenue per search
gap: Labels reflect only reported pages ; Crawler view differs from user view

== video-ad-placement-optimization | Video Ad Placement & Pod Optimisation | reinforcement-learning,tabular | sub-100ms | production-grade | a=5 k=2
obj: Choose ad slots, pod length and creatives in streaming video to maximise revenue and completion while limiting viewer abandonment.
loss: \max\;\mathbb{E}\!\left[\text{revenue}-\lambda\,\text{abandonment cost}\right]
con: Latency before playback ; Ad-load policies ; Content-sensitive breaks ; Viewer experience
sn: Cost | Model viewer abandonment cost of ad breaks | Maximise ad count | Too many ads reduce retention more than they earn
sn: Timing | Natural break points in content | Fixed intervals | Mid-scene breaks annoy viewers
sig: Viewer abandonment hazard | probability to drop at ad break | Cost | History
sig: Content break-point score | scene-boundary detector | Placement | Model
sig: Predicted ad completion | completion probability by creative | Value | Prior
noise: Ad ID | none
noise: Player version | none
base: Fixed pre-roll and mid-roll every 10 minutes.
prod: Survival model of viewer retention with ad-load policy optimiser and scene-boundary detection for break placement.
pipe: Playback request @ player ; Viewer state @ feature store ; Retention hazard model @ survival GBDT ; Break-point detector @ video model ; Pod optimiser @ constrained search ; Ad server @ VAST ; Playback analytics @ Kafka
edge: Live sports where breaks are unpredictable | placement misaligned | Operator cue integration and short-window decisions
edge: Ad server timeout at break | the ad server times out at a break and viewers see blank screens or errors | Prefetching and slate fallbacks
off: Simulated revenue and retention ; Abandonment hazard calibration
on: Revenue per viewing hour ; Viewer retention
gap: Observational ad loads confounded with content ; Ignoring long-term churn

== feed-ad-load-and-yield-optimization | Feed Ad Load & Yield Optimisation | reinforcement-learning,recommender | sub-100ms | staff-principal | a=15 k=3
obj: Decide how many ads to show and where in a feed so that long-term revenue is maximised without degrading user engagement.
loss: \max_\pi\;\mathbb{E}\!\left[\sum_t \gamma^t\,(\text{ad revenue}_t+\lambda\,\text{engagement}_t)\right]
con: Long-term user health ; Fairness to advertisers ; Real-time decision per request ; Experimentation with long holdouts
sn: Horizon | Long-term value of user retention | Immediate revenue | More ads today means fewer sessions next month
sn: Joint | Joint organic and ad ranking | Separate ads and organic ranking | Independent ranking cannot trade off user value
sig: User ad tolerance | historical engagement drop after ads | Load tuning | Experiments
sig: Predicted ad value | eCPM | Revenue | Calibration
sig: Organic item value | predicted engagement of next organic item | Opportunity cost | Calibration
noise: Ad ID | none
noise: Slot ID | none
base: Fixed ad every 5th item.
prod: Joint slate optimiser with a learned user-tolerance model, evaluated by long-horizon holdouts and surrogate metrics.
pipe: Feed request @ ranking service ; Organic ranker @ multi-task model ; Ad ranker @ eCPM model ; Slate optimiser @ constrained selection ; Tolerance model @ user-level ; Feed response @ client ; Long-term metric tracker @ experiments
edge: Short-term gains from aggressive ad load | retention declines months later | Long-term holdouts and surrogate indices
edge: Advertiser demand drop leaves slots unfilled | feed dominated by low-value ads | Reserve prices and organic fallback
off: Surrogate-index prediction of long-term impact ; Simulated slate value
on: Long-term revenue per user ; Session frequency
gap: A/B tests too short to see retention effects ; Optimising impressions rather than value

== app-install-prediction | Mobile App Install & Post-Install Prediction | tabular | sub-100ms | production-grade | a=20 k=1
obj: Predict install probability and early post-install value for mobile campaigns to bid efficiently under privacy limits.
loss: \mathcal{L}=\mathrm{BCE}(\text{install})+\lambda\,\mathrm{BCE}(\text{day-1 purchase})
con: Limited identifiers ; Delayed postbacks ; Fraudulent installs ; Cold-start apps
sn: Quality | Predict post-install value not installs alone | Install volume | Installs from low-quality sources never monetise
sn: Privacy | Aggregated postbacks and modelled signals | User-level joins | Platform privacy limits remove user-level joins
sig: Contextual app category match | app and publisher categories | Fit | Taxonomy
sig: Historic source quality | day-7 retention by source | Source value | Matured
sig: Device and OS context | version, locale | Fit | Allowed fields
noise: Ad ID | none
noise: Click timestamp second | none
base: Bid by source-level CPI targets.
prod: Multi-task GBDT or DCN predicting install and early value with aggregate-signal calibration and fraud filters.
pipe: Bid request @ SDK or exchange ; Context features @ cache ; Install and value model @ multi-task ; Fraud filter @ IVT score ; Bidder @ DSP ; Attribution postbacks @ MMP ; Calibration job @ batch
edge: Install-attribution partner changes postback schema | a schema change in postbacks silently breaks label joins and corrupts training data | Schema validation and monitoring
edge: Click-injection fraud inflates installs | wrong sources look great | Time-to-install anomaly features
off: AUC and calibration of installs and D1 value ; Source ranking accuracy
on: Cost per retained user ; Day-7 ROAS
gap: Training on installs from fraudulent sources ; Delayed postbacks excluded

== mobile-retention-roas-prediction | Mobile Retention & ROAS Prediction | tabular,time-series | batch | production-grade | a=1 k=2
obj: Predict day-30 to day-365 retention and revenue from early cohort signals to steer user-acquisition budgets.
loss: \mathcal{L}=\sum_t\left(r_t-\hat r_t\right)^2+\lambda\,\mathrm{CurveMonotonicity}
con: Cohorts with limited maturity ; Platform privacy aggregation ; Daily budget decisions ; Interpretable curves
sn: Curves | Parametric retention curves fitted with Bayesian priors | Point estimates at one day | Early data is noisy without shrinkage
sn: Cohorts | Cohort-level modelling under privacy limits | User-level predictions | User-level data may be unavailable
sig: Day-1 and day-3 retention | early retention | Curve anchor | Cohort windows
sig: Early ARPDAU | revenue per active user | Monetisation | Period
sig: Install source mix | channel mix | Quality | Aggregates
noise: Install hour | noise
noise: App version only | confounded
base: Industry benchmark retention curves.
prod: Hierarchical Bayesian cohort models with power-law retention curves and revenue forecasts, updated daily.
pipe: Cohort data @ MMP and analytics ; Cohort builder @ Spark ; Curve model @ hierarchical Bayesian ; Revenue projector @ model ; Budget advisor @ rules ; UA manager @ human ; Matured outcomes @ tracking
edge: Game update changes monetisation | curves shift abruptly | Version-aware cohorts and change-point detection
edge: Seasonal events inflate early revenue | LTV overestimated | Event covariates and cohort normalisation
off: Forecast error at D180 ; Interval coverage
on: Realised vs predicted ROAS ; Payback accuracy
gap: Early curves extrapolated beyond observed range ; Ignoring survivor effects

== guaranteed-inventory-forecasting | Guaranteed Inventory & Delivery Forecasting | time-series | batch | production-grade | a=1 k=1
obj: Forecast available impressions by audience and placement to sell guaranteed deals without under- or over-delivery.
loss: \mathcal{L}=\sum_t\rho_{0.2}(y_t-\hat y_t)
con: Overbooking penalties ; Audience overlap ; Seasonality ; Contract flight dates
sn: Overlap | Audience-overlap aware forecasts | Sum of segment forecasts | Segments overlap and sums overstate supply
sn: Risk | Conservative quantiles for sellable inventory | Mean forecast | Selling the mean means under-delivery half the time
sig: Historical impressions by placement | daily counts | Baseline | Cleaning
sig: Event calendar | sports and holidays | Spikes | Known
sig: Booked inventory so far | existing commitments | Net availability | Real-time
noise: Advertiser name | none
noise: Creative size | none
base: Same-period-last-year with growth factor.
prod: Hierarchical probabilistic forecasts with overlap modelling and a sellable-inventory calculator at the 20th percentile.
pipe: Impression logs @ lake ; Hierarchical forecaster @ GBDT quantile ; Overlap estimator @ audience model ; Availability calculator @ booking system ; Sales UI @ avails ; Trafficker review @ human ; Delivery reports @ outcomes
edge: Publisher traffic change after redesign | forecasts stale | Change-point detection and publisher alerts
edge: Overbooked deals across sellers | make-goods needed | Reservation holds and real-time availability checks
off: Quantile loss at 20th percentile ; Delivery success rate in backtest
on: Under-delivery rate ; Sell-through rate
gap: Ignoring overlap between audiences ; Backtesting without bookings

== ctv-ad-avails-forecasting | Connected-TV Ad Avails & Reach Forecasting | time-series,graph | batch | production-grade | a=1 k=2
obj: Forecast ad avails and campaign reach on connected TV across apps and household devices.
loss: \mathcal{L}=\sum_t\rho_q\!\left(y_t-\hat y_t^{(q)}\right)
con: Household-level counting ; Live-event spikes ; Panel calibration ; Contracts with guarantees
sn: Reach | Deduplicated household reach with frequency curves | Sum of impressions | Impression sums overstate reach
sn: Events | Live-event schedule covariates | Historical averages | Events create large spikes
sig: Household viewing frequency distribution | impressions per household | Reach | Measurement
sig: Programming schedule | live event times | Demand | Schedule
sig: Device mix | TV vs streaming stick | Supply | Telemetry
noise: App version | none
noise: Device ID | none
base: Average daily impressions by app.
prod: Probabilistic forecasts with household reach/frequency curves calibrated to panels and schedule-aware covariates.
pipe: Playback logs @ SSP ; Household aggregation @ identity graph ; Avails forecaster @ GBDT quantile ; Reach-frequency model @ Bayesian ; Panel calibrator @ measurement ; Sales planning tool @ avails ; Delivery outcomes @ reports
edge: Streaming service launches new tier | a new subscription tier shifts supply and viewing patterns that the forecast has never seen | Tier-aware features and manual overrides
edge: Household identity changes | reach double counted | Identity-graph quality checks
off: Reach error vs panel ; Quantile loss
on: Delivery vs guarantee ; Reach forecast accuracy
gap: Evaluating impressions not reach ; Panel bias ignored

== campaign-performance-anomaly-detection | Campaign Performance Anomaly Detection | time-series | sub-100ms | foundational | a=0 k=1
obj: Detect sudden changes in spend, CPA, CTR or delivery per campaign within minutes and alert owners with probable causes.
loss: \mathcal{L}=\sum_t\left[\log\sigma_t+\frac{(y_t-\mu_t)^2}{2\sigma_t^2}\right]
con: Hundreds of thousands of campaigns ; Seasonality ; Low noise alerts ; Root-cause hints
sn: Baselines | Seasonality-aware dynamic baselines per campaign | Static thresholds | Hourly cycles trigger constant false alarms
sn: Prioritisation | Rank by money at risk | Rank by z-score | Tiny campaigns dominate z-score rankings
sig: Seasonal residual | residual vs expected for hour and weekday | Anomaly | Forecast
sig: Spend at risk | residual times spend rate | Priority | Spend rate
sig: Change events | budget, bid or creative edits | Cause | Audit log
noise: Campaign name | none
noise: Advertiser industry | weak
base: Daily threshold alerts on CPA.
prod: Hierarchical seasonal models with robust residuals, change-event correlation and money-at-risk ranking.
pipe: Metrics stream @ Kafka ; Seasonal baseline @ per-campaign ; Residual scorer @ robust stats ; Cause linker @ audit-log join ; Alert ranker @ spend-at-risk ; Account manager @ human ; Alert feedback @ labels
edge: Platform reporting delays | spend appears to drop | Data-freshness checks per source
edge: Intentional campaign changes | expected jumps flagged | Change-event suppression and annotations
off: Detection delay at fixed false alarms ; Precision of top alerts
on: Mean time to detect ; Wasted spend before action
gap: Synthetic anomaly tests only ; Ignoring reporting delays

== ad-spend-forecasting-and-allocation | Ad Spend Forecasting & Budget Allocation | time-series,reinforcement-learning | batch | production-grade | a=1 k=1
obj: Forecast spend and outcomes by campaign and allocate budgets across campaigns to maximise return under constraints.
loss: \max_{b}\;\sum_c R_c(b_c)\ \text{s.t. }\sum_c b_c\le B
con: Minimum commitments ; Response curves ; Daily rebalance ; Explainability
sn: Curves | Diminishing-returns response curves per campaign | Proportional allocation | Equal marginal returns is the optimum
sn: Uncertainty | Allocate with uncertainty (Thompson sampling) | Plug-in estimates | Noisy curves misallocate budget
sig: Marginal ROI | derivative of response curve | Allocation | Estimation
sig: Saturation level | spend at which returns flatten | Cap | Curves
sig: Pacing state | spend vs plan | Feasibility | Real-time
noise: Campaign ID | none
noise: Owner | none
base: Allocate proportionally to last period spend.
prod: Bayesian response curves per campaign with Thompson sampling allocation and guardrails for minimum commitments.
pipe: Performance data @ warehouse ; Response-curve model @ Bayesian ; Allocator @ concave optimisation ; Guardrails @ constraints ; Budget API @ platforms ; Marketer review @ human ; Realised return @ tracking
edge: Sparse data for new campaigns | new campaigns have little data so fitted response curves are wild and misallocate budget | Hierarchical priors from similar campaigns
edge: Platform changes delivery logic | the ad platform changes its delivery algorithm so the fitted response curves become invalid | Change detection and re-learning
off: Backtest allocation value ; Curve fit error
on: Total conversions at equal budget ; Budget utilisation
gap: Observational curves confounded by bidding changes ; Ignoring carryover

== cross-channel-budget-allocation | Cross-Channel Budget Allocation with Bandits | reinforcement-learning | batch | staff-principal | a=1 k=1
obj: Shift weekly budget between channels using experimentation-informed bandit policies to maximise incremental outcomes.
loss: \text{regret}=\sum_t\left(\max_a\mu_a-\mu_{a_t}\right)
con: Channel minimums ; Measurement lag ; Interference between channels ; Weekly cadence
sn: Signal | Incremental returns from experiments | Platform-reported conversions | Platforms over-claim conversions
sn: Safety | Constrained exploration | Unconstrained reallocation | Aggressive shifts break channel performance
sig: Channel incremental ROAS | experiment-based | True return | Experiments
sig: Posterior uncertainty | variance of ROAS | Exploration | Bayesian
sig: Platform-claimed vs incremental ratio | inflation factor | Calibration | Tests
noise: Channel name | none
noise: Platform dashboard totals | biased
base: Fixed budget split by channel.
prod: Bayesian bandit on incrementality-calibrated returns with exploration bounds and MMM prior.
pipe: Channel data @ APIs ; Incrementality calibrator @ lift tests ; Bayesian bandit @ Thompson ; Constraint checker @ minimums ; Budget changes @ ad platforms ; Marketing lead @ human ; Outcome measurement @ geo tests
edge: Measurement lag hides negative effect of a shift | damage found weeks late | Gradual shifts with early-warning guardrails
edge: Interference: social ads lift search conversions | channel credit misallocated | Cross-channel effect terms and joint tests
off: Simulated regret ; Agreement with incrementality tests
on: Incremental conversions at constant spend ; Allocation stability
gap: Using platform-reported conversions as rewards ; No exploration constraints

== modeled-conversions-privacy | Modelled Conversions under Privacy Constraints | tabular,time-series | batch | staff-principal | a=0.5 k=2
obj: Estimate unobservable conversions from aggregate and consented signals to keep measurement accurate as identifiers disappear.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{AggregateConsistency}
con: Privacy thresholds ; Calibration against consented panel ; Transparency about modelled vs observed ; Regulatory
sn: Calibration | Calibrate against consented ground truth | Trust modelled totals blindly | Model drift goes unnoticed without anchors
sn: Granularity | Report at privacy-safe aggregation levels | User-level modelled outputs | User-level outputs risk re-identification
sig: Consented-user conversion rate | rate in observable population | Anchor | Sampling
sig: Consent-rate by segment | share consenting | Bias correction | Estimates
sig: Aggregate click-to-conversion lag | lag distribution | Timing | Windows
noise: Raw IDs | not allowed
noise: Page URLs with identifiers | privacy risk
base: Report observed conversions only and accept undercounting.
prod: Bias-corrected conversion model trained on consented traffic, applied to aggregates with differential-privacy noise and uncertainty intervals.
pipe: Consented events @ SDK ; Aggregate logs @ lake ; Conversion model @ GBDT ; Bias correction @ consent weighting ; DP aggregation @ noise addition ; Reporting API @ dashboards ; Panel calibration @ validation
edge: Consent mix shifts after banner redesign | a consent banner redesign changes who consents, biasing the model trained on consented traffic | Consent-aware reweighting and monitoring
edge: Small segments hit privacy thresholds | metrics unavailable | Hierarchical pooling and suppression rules
off: Error vs consented holdout ; Interval coverage
on: Reported vs true conversion gap ; Advertiser trust
gap: Consented users differ from non-consented ; Evaluating without privacy noise

== differential-privacy-measurement | Differentially Private Ad Measurement | tabular | batch | staff-principal | a=0.5 k=2
obj: Provide campaign reach and conversion reporting with formal differential-privacy guarantees and useful accuracy.
loss: \Pr[M(D)\in S]\le e^{\varepsilon}\Pr[M(D')\in S]+\delta
con: Epsilon budget accounting ; Utility for small campaigns ; Consistent repeated queries ; Auditable noise
sn: Budget | Privacy budget accounting across queries | One-off noise per report | Repeated queries leak through averaging
sn: Utility | Hierarchical noise with post-processing | Naive Laplace on each cell | Small cells become pure noise
sig: Sensitivity bound | per-user contribution cap | Noise scale | Clipping
sig: Epsilon allocation | budget by metric and level | Utility | Policy
sig: Post-processing consistency | non-negativity and hierarchy constraints | Quality | Consistency
noise: Raw per-user rows | not released
noise: Exact small counts | privacy risk
base: k-anonymity thresholds with suppression.
prod: Hierarchical DP mechanisms with contribution bounding, a privacy accountant and consistency post-processing.
pipe: Event data @ secure store ; Contribution bounding @ clipping ; DP mechanism @ noise addition ; Privacy accountant @ budget ledger ; Consistency post-processor @ optimisation ; Report API @ clean-room ; Privacy review @ human
edge: Analysts re-query with tiny variations | budget exhausted or leakage | Query caching and budget enforcement
edge: Heavy users dominate sensitivity | a few heavy users dominate sensitivity so noise must be set very high and utility collapses | Adaptive clipping and stratified bounds
off: Relative error of aggregates at fixed epsilon ; Privacy audit via attack simulation
on: Usable metrics coverage ; Privacy incidents
gap: Evaluating utility without privacy composition ; Ignoring heavy-user clipping bias

== clean-room-audience-matching | Data Clean-Room Audience Matching & Measurement | graph,tabular | batch | staff-principal | a=0.05 k=4
obj: Match advertiser and publisher first-party data inside a clean room to measure overlap, build audiences and attribute outcomes without sharing raw data.
loss: \mathcal{L}=\mathrm{BCE}(\text{match})+\lambda\,\mathrm{PrivacyLeakagePenalty}
con: No row-level data leaves the room ; Query privacy rules ; Match rate transparency ; Governance
sn: Matching | Hashed or PSI-based matching with fuzzy fallbacks | Plain-text joins | Plaintext sharing violates policy
sn: Output | Aggregate outputs with thresholds | Exportable user lists | Lists leak identities
sig: Match key quality | hashed email normalisation consistency | Match rate | Normalisation
sig: Overlap estimate | intersection size with noise | Planning | DP
sig: Conversion lift in joined population | measured lift | Value | Controls
noise: Raw emails | not shared
noise: Free-text addresses | messy
base: Third-party cookie matching.
prod: PSI or secure multiparty computation matching with aggregate, thresholded outputs and a model-training workflow inside the room.
pipe: Advertiser data @ secure upload ; Normaliser @ hashing rules ; PSI matcher @ secure computation ; Aggregate query engine @ privacy rules ; Model trainer @ in-room ; Analyst output @ aggregates ; Governance audit @ logs
edge: Match keys normalised differently | the two parties normalise emails differently and the match rate falls far below expectations | Shared normalisation spec and validators
edge: Differencing attacks via repeated queries | membership leak | Query limits and noise
off: Match rate and precision ; Lift estimate error
on: Time to insight ; Advertiser adoption
gap: Evaluating match rate without precision ; Ignoring leakage tests

== influencer-matching-and-fraud | Influencer Matching & Fake-Follower Detection | graph,recommender | batch | production-grade | a=0.02 k=10
obj: Match brands to authentic creators with audiences that fit, and detect inflated followings and engagement pods.
loss: \mathcal{L}=\mathrm{BCE}(\text{fake})+\lambda\,\mathrm{InfoNCE}(\text{brand},\text{creator})
con: Audience demographics privacy ; Content brand safety ; Fraud adaptation ; Disclosure rules
sn: Authenticity | Engagement quality and follower-graph structure | Follower counts | Follower counts are purchasable
sn: Fit | Audience-brand affinity not just topic match | Category match | Audience overlap decides performance
sig: Engagement authenticity score | comment diversity and timing | Fake engagement | NLP
sig: Follower growth anomalies | sudden spikes | Bought followers | Time series
sig: Audience affinity embedding | audience interests vs brand | Fit | Aggregates
noise: Follower count alone | gameable
noise: Profile photo | weak
base: Rank by follower count and engagement rate.
prod: Graph and behavioural fraud model plus audience-affinity matching with brand-safety content checks.
pipe: Creator data @ platform APIs ; Follower graph features @ Spark ; Fraud model @ GNN plus GBDT ; Brand-safety scan @ classifier ; Matching model @ two-tower ; Campaign manager @ human ; Campaign results @ labels
edge: Engagement pods mimic organic comments | coordinated pods post organic-looking comments so fake engagement passes the checks | Network-level pod detection
edge: Creator content changes direction | brand-safety risk | Continuous content monitoring
off: Fraud detection precision ; Match quality NDCG
on: Cost per engagement on authentic audience ; Campaign ROI
gap: Platform-provided signals manipulated ; Labels from small audits

== content-virality-prediction | Content Virality & Engagement Prediction | time-series,graph | sub-100ms | production-grade | a=5 k=3
obj: Predict early whether a post or video will go viral to allocate promotion budget and inform creators.
loss: \mathcal{L}=\mathrm{Huber}(\log N_T,\log\hat N_T)
con: Heavy-tailed outcomes ; Predictions from first minutes ; Fairness to creators ; Manipulation resistance
sn: Early signals | Early engagement trajectory and network spread | Content features alone | Content quality predicts weakly vs early dynamics
sn: Tail | Predict log counts and rank | Raw counts MSE | Heavy tails dominate squared error
sig: Early velocity | engagement in the first 10 minutes | Momentum | Window
sig: Cascade structure | depth and breadth of shares | Spread | Graph
sig: Creator baseline reach | typical engagement | Prior | History
noise: Post length | weak
noise: Hashtag count | spurious
base: Rank by engagement rate in the first hour.
prod: Cascade-aware temporal model on early trajectory with creator priors, calibrated tails and a budget allocator.
pipe: Engagement events @ stream ; Cascade builder @ graph ; Virality predictor @ temporal GNN ; Promotion allocator @ budget rules ; Creator analytics @ dashboard ; Manager review @ human ; Final outcomes @ labels
edge: Coordinated inauthentic boosting | model promotes manipulated content | Authenticity filters before promotion
edge: News event surge | all content seems viral | Global trend normalisation
off: Spearman correlation on final reach ; Top-k precision of viral posts
on: Promotion ROI ; Creator satisfaction
gap: Using future engagement leaked into features ; Evaluating on already-viral samples

== ad-copy-compliance-moderation | Ad Copy & Creative Compliance Moderation | nlp,computer-vision | sub-100ms | production-grade | a=0.2 k=10
obj: Detect policy-violating ads (misleading claims, prohibited products, restricted categories) at submission time with advertiser-facing explanations.
loss: \mathcal{L}=\sum_k w_k\,\mathrm{BCE}(y_k,p_k)
con: Region-specific rules ; Appeals within 24 hours ; Review latency under minutes ; Explainable rejections
sn: Policy | Per-policy classifiers with region thresholds | Single violation score | Policies differ by market and category
sn: Evasion | Robustness to obfuscated text and imagery | Keyword filters | Advertisers obfuscate to evade
sig: Policy category scores | multi-label scores | Routing | Calibration
sig: Claim detection | health or financial claim detector | Regulated claims | Taxonomy
sig: Advertiser trust tier | history of violations | Context | History
noise: Ad ID | none
noise: Bid | none
base: Keyword blocklists plus manual review.
prod: Multimodal policy classifiers with claim verification, advertiser risk tiers and human review for the uncertain band.
pipe: Ad submission @ platform ; Text and image models @ multimodal classifier ; Claim verifier @ rules and retrieval ; Policy engine @ region thresholds ; Reviewer queue @ human ; Appeals @ human ; Label feedback @ audit
edge: New regulation introduces a restricted category | classifiers have no examples | Rule-first rollout with rapid labelling
edge: Adversarial creative obfuscation | violations pass | Perceptual hashing and adversarial training
off: Per-policy precision and recall ; Time to decision
on: Policy violation exposure ; Wrongful rejection rate
gap: Labels from past inconsistent reviewers ; Static adversarial test set

== dynamic-product-ads-feed-recs | Dynamic Product Ads & Feed Recommendations | recommender | sub-100ms | production-grade | a=20 k=3
obj: Select and rank products in dynamic ads from the advertiser catalogue per user to maximise conversions.
loss: \mathcal{L}=-\sum_{(u,i)}\log\frac{e^{s(u,i)}}{\sum_{j}e^{s(u,j)}}
con: Catalogue freshness and stock ; Privacy ; 30 ms ; Advertiser brand rules
sn: Intent | Recent product views and cart events | Long-term profile only | Shopping intent is recent
sn: Availability | Real-time stock and price sync | Static feeds | Advertising an out-of-stock product wastes impressions
sig: Recent item views | last viewed items | Intent | Window
sig: Product popularity within category | trending score | Prior | Time
sig: Stock and price status | feed freshness flags | Validity | Real-time
noise: Product description length | none
noise: Image size | weak
base: Show last-viewed products.
prod: Session-based retrieval with ranker and feed-health filters, calibrated to ad auction needs.
pipe: Ad request @ DSP ; User events @ feature store ; Candidate retrieval @ ANN ; Ranker @ GBDT ; Feed validator @ stock and price ; Creative renderer @ template ; Impression logs @ stream
edge: Catalogue feed delays | wrong prices shown | Feed freshness SLAs and fallbacks
edge: Sensitive product categories | inappropriate retargeting | Category exclusions and consent rules
off: Recall@k of purchased items ; CTR and CVR calibration
on: ROAS ; Cost per purchase
gap: Training on retargeted users biased toward high intent ; Ignoring feed errors

== retargeting-window-optimization | Retargeting Window & Churn Optimisation | tabular,time-series | sub-100ms | foundational | a=10 k=1
obj: Decide whether, when and how long to retarget each visitor to maximise incremental conversions and avoid chasing converted users.
loss: \mathcal{L}=\mathrm{BCE}(\text{convert},p)\ \text{with hazard }h(t\mid x)
con: Suppress after conversion ; Frequency limits ; Consent ; Budget efficiency
sn: Hazard | Conversion hazard decays with time since visit | Fixed 30-day windows | Most conversions happen in the first days
sn: Incrementality | Incremental lift not last-touch | Credit for organic converters | Retargeting often claims credit for organic conversions
sig: Time since last visit | hours since visit | Hazard | Clock
sig: Depth of engagement | pages and cart adds | Intent | Window
sig: Prior conversion flag | converted already | Suppression | Real-time
noise: Visitor ID | none
noise: Page URL | high-cardinality
base: Retarget all visitors for 30 days.
prod: Survival-model-driven window per visitor with uplift filtering and real-time suppression lists.
pipe: Visit events @ pixel ; Visitor state @ Redis ; Hazard model @ survival GBDT ; Uplift filter @ model ; Suppression service @ conversion feed ; Bid service @ DSP ; Conversions @ postbacks
edge: Conversion postbacks delayed | users converted yesterday still targeted | Faster conversion signals and conservative decay
edge: Cookie loss splits one visitor into several | frequency counts wrong | Identity linking and caps at device level
off: Hazard calibration ; Incremental lift on holdout
on: Incremental ROAS ; Wasted impressions on converters
gap: Observational lift inflated by selection ; No holdout

== viewability-and-attention-prediction | Viewability & Attention Prediction | tabular,computer-vision | sub-100ms | production-grade | a=30 k=2
obj: Predict whether an ad impression will be viewable and attended to, to bid on quality inventory and verify delivery.
loss: \mathcal{L}=\mathrm{BCE}(\text{viewable},p)+\lambda\,\mathrm{Huber}(\text{attention time})
con: Pre-bid prediction ; MRC viewability standard ; Publisher fairness ; Privacy of sensors
sn: Standard | Align with MRC viewability definition | Custom definition | Mismatched definitions break billing
sn: Attention | Attention time beyond viewability | Viewable binary | Viewable does not mean seen
sig: Placement position and size | slot geometry | Viewability | Context
sig: Page scroll depth distribution | typical depth | Probability | Page-level
sig: Historical publisher viewability | rate by placement | Prior | Window
noise: Ad ID | none
noise: Creative size | weak
base: Block placements below a viewability threshold.
prod: Pre-bid viewability model on placement and page features, plus attention-time estimator calibrated on panel eye-tracking.
pipe: Bid request @ exchange ; Placement features @ cache ; Viewability model @ GBDT ; Attention estimator @ model ; Bid modifier @ bidder ; Measurement vendor @ verification ; Calibration @ panel
edge: Page layout changes after redesign | stale predictions | Layout-change detection and quick refresh
edge: Fraudulent viewability claims by publishers | inflated delivery | Third-party verification cross-checks
off: Calibration vs measured viewability ; Attention-time error
on: Viewable CPM ; Attention per dollar
gap: Using publisher-reported viewability as truth ; Panel not representative

== ctv-audience-measurement | Cross-Platform Audience Measurement (TV + Digital) | tabular,graph | batch | staff-principal | a=0.2 k=3
obj: Estimate deduplicated reach and frequency across linear TV, CTV and digital by fusing panel and census data.
loss: \mathcal{L}=\mathrm{KL}\!\left(P_{\text{panel}}\,\|\,P_{\text{model}}\right)+\lambda\,\mathrm{ConsistencyCensus}
con: Panel representativeness ; Census coverage gaps ; Methodology audits ; Transparent uncertainty
sn: Fusion | Calibrate census data to panel truth | Trust either source alone | Panels are small and census is incomplete
sn: Uncertainty | Report intervals | Single-number reach | Reach estimates carry wide uncertainty
sig: Panel reach curves | frequency distributions | Truth anchor | Sampling
sig: Census impression counts | server-side counts | Scale | Coverage
sig: Overlap model parameters | cross-platform duplication | Dedup | Estimation
noise: Device model | weak
noise: App name | none
base: Sum platform reach with an overlap factor.
prod: Bayesian data fusion of panel and census with household-person modelling and published uncertainty.
pipe: Panel data @ vendor ; Census logs @ platforms ; Fusion model @ Bayesian ; Household to person model @ ML ; Reach and frequency calculator @ simulation ; Reporting @ BI ; Methodology audit @ human
edge: Panel attrition changes composition | panel members drop out unevenly so the sample composition drifts and biases estimates | Reweighting and recruitment tracking
edge: New streaming platform missing census | a new platform has no census data and its viewing is undercounted in reach | Gap flags and imputations with intervals
off: Held-out panel reach error ; Calibration of intervals
on: Cross-platform reach accuracy vs benchmarks ; Advertiser adoption
gap: Panel evaluated on itself ; Ignoring non-response

== ooh-footfall-attribution | Out-of-Home Footfall Attribution | time-series,graph | batch | production-grade | a=0.05 k=3
obj: Attribute store visits to out-of-home ad exposure using mobility data and control groups with privacy safeguards.
loss: \hat\tau=\bar Y_{\text{exposed}}-\bar Y_{\text{matched control}}
con: Location privacy ; Panel bias ; Exposure estimation error ; Control matching
sn: Exposure | Probabilistic exposure from visibility and trajectories | Proximity radius only | Proximity includes unexposed people
sn: Control | Matched controls on pre-period mobility | Naive unexposed baseline | Exposed people differ systematically
sig: Visibility-weighted exposure | line-of-sight and dwell | Exposure | Geometry
sig: Pre-period visit propensity | baseline store visits | Matching | Window
sig: Daypart and weather | context | Confounders | Data
noise: Device ID | none
noise: Precise coordinates | privacy
base: Count visits within radius after exposure window.
prod: Causal matching with synthetic controls on mobility panels, exposure probabilities and uncertainty from bootstrap.
pipe: Mobility panel @ vendor ; Exposure model @ visibility geometry ; Matched control builder @ propensity ; Lift estimator @ causal inference ; Privacy aggregator @ thresholds ; Report @ dashboard ; Analyst review @ human
edge: Panel under-represents certain groups | under-represented groups in the mobility panel bias the measured lift | Weighting to census
edge: GPS noise in dense cities | exposure misclassified | Probabilistic assignment and error models
off: Placebo-test lift near zero ; CI coverage
on: Incremental visits per spend ; Agreement with sales lift
gap: No control group ; Exposure defined by radius

== brand-lift-and-sentiment-tracking | Brand Lift & Sentiment Tracking | nlp,tabular | batch | foundational | a=0.1 k=3
obj: Track brand awareness and sentiment from surveys and social/text data and attribute changes to campaigns.
loss: \mathcal{L}=\mathrm{CE}_{\text{sentiment}}+\lambda\,\mathrm{CE}_{\text{topic}}
con: Survey bias ; Social data representativeness ; Multi-language ; Weekly reporting
sn: Causality | Exposed vs control survey design | Pre/post social sentiment | Brand sentiment moves with news not just ads
sn: Sentiment | Aspect-level sentiment | Overall polarity | Overall hides which attributes changed
sig: Exposed minus control lift | survey lift | Effect | Design
sig: Aspect sentiment | attribute-level polarity | Insight | Model
sig: Volume vs baseline | mention spike z-score | Event | Window
noise: Follower count | weak
noise: Emoji usage | weak
base: Daily social sentiment score.
prod: Controlled survey lift measurement plus aspect-based sentiment from text, linked to campaign flights with causal adjustment.
pipe: Survey responses @ panel ; Social and web text @ ingestion ; Sentiment and aspect model @ transformer ; Lift estimator @ causal ; Event detector @ time series ; Brand team report @ BI ; Action tracking @ human
edge: Viral controversy swamps campaign signal | lift attributed wrongly | Event detection and separation of baseline
edge: Bot activity inflates mentions | false sentiment moves | Bot filtering
off: Sentiment macro-F1 ; Lift estimate CI width
on: Brand lift per spend ; Decision usage
gap: Social data not representative ; Pre/post designs without controls

== conversational-ads-assistant | Conversational Ads & Brand Assistant | llm-agents | seconds | production-grade | a=0.5 k=8 s=3 t=250
obj: Serve interactive brand assistants inside ad units that answer product questions truthfully and hand off to purchase or lead capture.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{brand KB})+\lambda\,\mathrm{ClaimViolation}
con: Only approved claims ; Disclosure as advertising ; Child safety ; Cost per session cap
sn: Claims | Answers constrained to an approved knowledge base | Open-ended generation | Unapproved claims create legal liability
sn: Handoff | Clear paths to purchase | Chat for chat's sake | Conversation without conversion is a cost
sig: KB grounding rate | answers supported by approved sources | Safety | Verification
sig: Handoff conversion rate | clicks to purchase | Value | Funnel
sig: Safety filter hits | blocked outputs | Risk | Classifier
noise: Chat length | not value
noise: Response time only | not quality
base: FAQ chatbots with decision trees.
prod: Retrieval-grounded LLM on an approved brand KB, strict claim checker, cost-capped sessions and lead capture tools.
pipe: Ad unit chat @ web SDK ; Safety and age gate @ filters ; Retriever @ brand KB ; Assistant LLM @ constrained ; Claim checker @ verifier ; Handoff tool @ CTA ; Transcript analytics @ eval
edge: User asks about medical or financial advice | assistant gives unapproved guidance | Topic classifier with refusal and referral
edge: Jailbreak attempts | brand-damaging replies | Layered guardrails and red-team tests
off: Grounding rate ; Policy violation rate
on: Conversion per session ; Cost per conversion vs display ads
gap: Evaluating on friendly prompts ; Counting engagement as success

== marketing-copilot-analyst-agent | Marketing Analytics Copilot Agent | llm-agents | seconds | staff-principal | a=0.1 k=30 s=6 t=500
obj: Let marketers ask questions in plain language and get correct, reproducible analyses and chart-backed recommendations from campaign data.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},\text{schema,results})+\lambda\,\mathrm{WrongQuery}
con: Read-only access ; Row-level security ; Reproducible SQL ; Numbers computed by tools not the LLM
sn: Computation | LLM writes SQL and code, tools compute results | LLM states numbers from memory | Models hallucinate numbers
sn: Semantics | Governed metric layer definitions | Raw table querying | Metric definitions differ between teams
sig: Metric-layer coverage | share of questions answerable via governed metrics | Reliability | Layer
sig: Query validity and result checks | row-count and sanity checks | Correctness | Checks
sig: Answer reproducibility | same question gives same answer | Trust | Seed
noise: Chart colour | none
noise: Answer verbosity | none
base: BI dashboards with filters.
prod: Agent over a semantic metrics layer with SQL tools, result sanity checks, citations to queries and human review for decisions.
pipe: User question @ chat ; Intent and schema linking @ LLM ; SQL tool @ read-only warehouse ; Result checker @ sanity rules ; Chart and narrative @ LLM ; Marketer @ human ; Query log @ audit
edge: Ambiguous metric names | analysis uses the wrong definition | Disambiguation via metric layer and clarifying questions
edge: Prompt injection via campaign names | agent runs unintended queries | Read-only sandbox and query allow-lists
off: SQL execution accuracy on golden questions ; Number faithfulness
on: Time to insight ; Analyst escalations
gap: Golden questions simpler than real ; Judging narrative not numbers

== bid-traffic-shaping-and-qps-throttling | Bid Traffic Shaping & QPS Throttling | reinforcement-learning,tabular | sub-10ms | production-grade | a=40 k=1
obj: Decide which bid requests to process or drop at ingestion to cut infrastructure cost while retaining most of the value.
loss: \max_{\pi}\;\sum_r v_r\,\mathbb{1}[\text{process}_r]-\lambda\,\text{cost}\ \text{s.t. QPS}\le Q
con: Decision under 0.5 ms ; Hundreds of millions of requests per second across exchanges ; Value estimates stale ; Exchange rate limits
sn: Value | Drop requests with the lowest expected value per CPU cost | Random sampling | Random sampling discards high-value traffic at the same rate
sn: Feedback | Learn value from won outcomes with exploration | Static allow-lists | Allow-lists go stale
sig: Segment win-rate and value | historical value per request type | Priority | Window
sig: Per-exchange cost | processing cost per request | Cost | Cost model
sig: Current load | cluster utilisation | Throttle | Real-time
noise: Request ID | none
noise: User-agent | none
base: Static QPS caps per exchange.
prod: Segment-level value model with contextual bandit exploration and a load-aware throttle implemented in the ingestion proxy.
pipe: Bid request ingress @ proxy ; Segment classifier @ hashed keys ; Value table @ in-memory ; Throttle policy @ load-aware ; Pass-through to bidder @ gRPC ; Outcome stream @ Kafka ; Policy updater @ batch
edge: Exchange traffic surges beyond capacity | bidder overloaded and latency spikes | Immediate load shedding with priority classes
edge: Throttling starves exploration | value table stale | Reserved exploration traffic share
off: Value retained vs requests processed ; Simulated cost savings
on: Infrastructure cost per won impression ; Win volume retained
gap: Evaluating with historical traffic while throttling changes the data ; Ignoring exploration needs
