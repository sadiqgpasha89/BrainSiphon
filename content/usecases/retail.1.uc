# Retail & E-Commerce, part 1 (use cases 1-25)
== personalized-search-ranking | Personalised Product Search Ranking | recommender,nlp | sub-100ms | advanced | a=10 k=6
obj: Rank search results to maximise purchases per search session while preserving relevance and catalogue fairness to sellers.
loss: \mathcal{L}=\sum_{q}\sum_{(i,j):y_i>y_j}\log\left(1+e^{-(s_i-s_j)}\right)\left|\Delta\mathrm{NDCG}_{ij}\right|
con: p99 under 80 ms including retrieval ; 100M-item catalogue ; Position-bias-aware training ; Query-level explainability for merchandisers ; Serviceability by pincode or dark store applied before ranking ; Sellers keep a guaranteed exposure floor
sn: Position bias | Inverse-propensity-weighted clicks from randomised swaps | Raw click logs | Top positions get clicks regardless of relevance
sn: Objective | Purchase-weighted graded relevance (view, cart, buy) | Click-through rate alone | CTR rewards clickbait images and hurts conversion
sn: Utility | Multi-task utility: click, cart given click, purchase given cart weighted by margin, plus a seller-exposure term | Click probability alone | Cheap impulse items win clicks while high-consideration products lose, and exposure concentrates on already-popular sellers
sn: Serviceability | Roaring-bitmap availability masks inside the retrieval shard before any ranking | Scoring 1,000 candidates and then dropping the 700 not deliverable to the pincode | The ranker burns CPU or GPU on items that can never be shown and the shortlist comes back short
sig: Query-item semantic score | cosine of query and item embeddings from a dual encoder | Relevance backbone | Embeddings must be trained on pre-period logs
sig: Item price-rank within query | percentile of price among retrieved results | Price sensitivity cue | Compute over the retrieved set not the catalogue
sig: User-category affinity | decayed purchase and click share by category | Personalisation | Exclude events in the current session after the query
sig: Slot position (training only) | position-bias tower input that is dropped or fixed to slot 1 at inference (PAL) | Separates exposure from relevance | If position leaks into serving features the ranker reproduces the page layout
sig: Deliverable at pincode | bitmap membership for the shopper pincode or dark store | Hard eligibility | Inventory stream lag shows sold-out items, so version the bitmaps and log staleness
noise: Raw impressions count | rich-get-richer feedback loop
noise: Item title length | spurious correlation with conversions
base: BM25 with business-rule boosts.
prod: Two-stage: ANN plus BM25 hybrid retrieval, then a LambdaMART/transformer ranker with propensity correction, served with embedding and feature caches. Final score is w1 times P(click) plus w2 times P(cart given click) plus w3 times P(purchase given cart) times log(1+GMV) plus a seller exposure boost, with a position tower used in training only and Roaring-bitmap availability masks applied inside the retrieval shard.
pipe: Query service @ gateway ; Query understanding @ spell and intent model ; Hybrid retrieval @ ANN plus BM25 ; Feature fetch @ Redis and item store ; Ranker @ LambdaMART on CPU ; Business re-rank @ merchandising rules ; Click logger @ Kafka
edge: New seller floods catalogue with keyword-stuffed items | rankings polluted | Quality score features and seller-trust priors
edge: Embedding model update changes neighbour sets | sudden relevance shifts | Dual-write shadow indexes and ranking-diff alarms before swap
edge: Hyperlocal stock flips mid-session | items vanish after the click and the shopper abandons | Versioned bitmaps with sub-second updates, a staleness metric and a re-check at add to cart
off: NDCG@10 with propensity weighting ; Recall@200 of retrieval
on: Search conversion rate ; Revenue per search
gap: Training on clicks from the current ranker ; Evaluating only on head queries

== query-understanding-and-spell-correction | Query Understanding & Spell Correction | nlp | sub-10ms | advanced | a=10 k=1
obj: Normalise, correct and classify user queries into intents and attributes within a few milliseconds before retrieval.
loss: \mathcal{L}=\mathrm{CE}_{\text{intent}}+\lambda\,\mathrm{CE}_{\text{NER}}
con: Under 5 ms ; 20 languages and code-mixed text ; Safe against over-correction of brand names ; Updates daily
sn: Correction | Context-aware noisy-channel correction using catalogue vocabulary | Dictionary edit distance | Brand names like Xiaomi or Levi’s look like typos
sn: Intent | Attribute extraction (brand, size, colour) with ontology IDs | Free-text matching | Attributes enable precise filtering
sig: Catalogue token frequency | frequency of the token in titles and past successful queries | Prior for valid tokens | Update daily and exclude spam titles
sig: Reformulation graph | queries users rewrote to and then purchased | Learned corrections | Only completed sessions with purchases
sig: Intent distribution | softmax over category intents | Routing to the right index | Calibrate on production queries
noise: Query length alone | weak and language dependent
noise: Typed device keyboard layout | handled by spelling model
base: Symmetric-delete spell checker with a static dictionary.
prod: Distilled transformer tagger and intent classifier (INT8) plus a noisy-channel corrector with learned reformulation priors, cached by query hash.
pipe: Query intake @ edge service ; Normaliser @ unicode and tokenisation ; Spell corrector @ noisy-channel service ; Intent and NER model @ distilled BERT INT8 ; Attribute resolver @ ontology map ; Query cache @ in-memory LRU ; Reformulation logger @ Kafka
edge: Viral trending term not in vocabulary | corrected into nonsense | Trend detector adds terms within an hour
edge: Code-mixed queries (Hinglish) | wrong language pipeline | Language-agnostic subword model with script-aware fallback
off: Correction accuracy at 99% precision ; NER F1
on: Zero-result rate ; Search conversion
gap: Test queries are clean while production is noisy ; Reformulation labels include accidental clicks

== homepage-feed-recommendations | Homepage Feed Recommendations | recommender | sub-100ms | advanced | a=15 k=5
obj: Fill a personalised homepage feed that maximises long-term engagement and purchases for 10M users while managing diversity and freshness.
loss: \mathcal{L}=-\sum_{(u,i)}\log\frac{e^{s(u,i)/\tau}}{\sum_{j\in\mathcal N_u}e^{s(u,j)/\tau}}
con: 60 ms feed assembly ; Frequency capping per item ; Diversity constraints ; Explore/exploit slots
sn: Retrieval | Multi-source candidate generation (two-tower, co-visitation, trending) | Single collaborative filtering model | One model has blind spots for new items and cold users
sn: Objective | Multi-task heads for click, add-to-cart and purchase with calibrated blend | Optimising clicks only | Short-term clicks degrade long-run retention
sig: User embedding recency | exponentially decayed mean of recent item embeddings | Interest drift | Decay constants tuned on pre-period
sig: Item freshness and velocity | age and rolling interaction velocity | Newness | Exclude interactions after impression time
sig: Cross features user-category | affinity times category popularity | Personalisation | Compute from lagged aggregates
noise: Total lifetime clicks | popularity bias
noise: Device model | weak and unstable
base: Popularity within user segment plus recently viewed.
prod: Two-tower retrieval with ANN, multi-task DCN-v2 ranker, MMR diversity re-ranking and epsilon-greedy exploration slots.
pipe: Feed request @ API gateway ; User state fetch @ feature store ; Candidate generation @ two-tower plus ANN ; Multi-task ranker @ DCN-v2 on GPU ; Diversity and policy re-rank @ MMR ; Impression logger @ Kafka ; Feedback aggregation @ near-real-time
edge: New user with no history | feed is generic | Contextual bandit onboarding with category quiz priors
edge: Sale event surges trending items | all feeds look identical | Per-user diversity constraint and cohort-based trending
off: NDCG and calibration of purchase head ; Coverage of catalogue
on: Purchases per user session ; 7-day return rate
gap: Training on logged policy without propensities ; Offline hits vs online diversity effects

== session-based-next-item-recommendation | Session-Based Next-Item Recommendation | recommender,time-series | sub-100ms | advanced | a=12 k=3
obj: Recommend the next item for anonymous or logged-in sessions in real time, using only in-session behaviour when history is absent.
loss: \mathcal{L}=-\sum_t\log\frac{e^{s(h_t,i_{t+1})}}{\sum_j e^{s(h_t,j)}}
con: Works for anonymous users ; State updated per click ; 50 ms ; Privacy-friendly (no cross-site tracking)
sn: Order | Sequence models capturing transitions and intent shifts | Bag-of-items co-occurrence that ignores click order | Order distinguishes browsing from buying intent
sn: Negatives | Sampled softmax with popularity-corrected negatives | Uniform random negatives for evaluation | Easy negatives inflate offline metrics
sn: Bots | Bot and crawler filtering before any counts are built | Using every click as a human signal | Crawlers walking the catalogue in id order create transitions as strong as real shopper behaviour
sn: Evaluation | Time-split leave-last-out with MRR and catalogue coverage | Random session splits and hit rate alone | A random split lets a sale's popularity shift appear on both sides and flatters the baseline
sig: Last-k item embeddings | transformer encoding of last 20 interactions | Captures what the shopper wants right now | Cap sequence length so latency stays inside the budget
sig: Dwell and scroll depth | seconds on item pages and scroll fraction | Shows how strongly the shopper cares about an item | Bots inflate or deflate dwell, so filter them first
sig: Session goal inference | classifier over browse vs compare vs purchase | Changes what to recommend: alternatives versus accessories | Label from the eventual purchase carefully to avoid leakage
sig: Session theme category | share of recent items in each category | A shopper keeps returning to one need, such as lamps | Compute from the prefix only, never including the item to be predicted
sig: Transition recency | how recently each item-to-item transition was observed, decayed over days | Catalogue and trends change within days | Decay by event time and keep the training cut-off before the test window
noise: Session ID | arbitrary
noise: Total session clicks | confounded with browsing style
noise: Raw click count per item | dominated by crawlers and promotions rather than genuine interest
base: Item-to-item co-visitation counts.
prod: Causal transformer (SASRec-style) with in-memory session state, ANN lookup and business re-rank; retrained daily.
pipe: Event stream @ Kafka ; Session state store @ Redis ; Sequence encoder @ SASRec on GPU ; ANN retrieval @ HNSW ; Re-ranker @ business rules ; Response cache @ short TTL ; Click feedback @ stream
edge: Bot traffic produces random sequences | random bot sequences pollute transition statistics and degrade recommendations | Bot filter and per-session anomaly flags
edge: Sale event changes item popularity within minutes | stale candidate sets | Near-real-time popularity features and index refresh
edge: Anonymous session with a single click | there is no prefix beyond one item | Fall back to category-level transitions plus popularity within the category
edge: Out-of-stock item at the top of the list | the best candidate cannot be bought and shoppers bounce | Filter by live stock at re-rank time and backfill from the next candidates
off: HitRate@20 and MRR on time-split ; Catalogue coverage
on: Click-through on recommendations ; Add-to-cart rate
gap: Random session splits leak popularity ; Test sessions from the same day as training

== similar-and-complementary-product-recs | Similar & Complementary Product Recommendations | recommender,graph | sub-100ms | advanced | a=8 k=3
obj: Show substitutes on out-of-stock or low-fit items and complements at cart, lifting basket size without cannibalising margin.
loss: \mathcal{L}=\mathrm{InfoNCE}(i,i^+)+\lambda\,\mathrm{GraphReg}
con: Compatibility correctness (phone case fits phone) ; 40 ms ; Brand/legal exclusions ; Explainable reason strings
sn: Relation | Separate similar (substitute) and complementary (co-purchase) relations | One similarity score for all | Substitutes are rarely bought together; mixing them hurts both
sn: Compatibility | Hard attribute-compatibility constraints | Purely behavioural signals | Behavioural data recommends incompatible accessories
sig: Co-purchase lift | PMI of co-purchase versus independence | Complement relation | Use matured orders only
sig: Visual-text embedding distance | multimodal embedding similarity | Substitute relation | Domain-specific fine-tuning
sig: Attribute compatibility flags | structured compatibility table | Correctness | Maintain via catalogue pipeline
noise: Popularity of the pair | favours blockbuster items
noise: Raw price difference | misleading across categories
base: Item-to-item collaborative filtering on co-views.
prod: Multi-relation item graph with a GNN producing substitute/complement embeddings, attribute compatibility filter and margin-aware re-ranker.
pipe: Product page request @ API ; Item graph store @ embedding lookup ; Relation retrieval @ ANN per relation ; Compatibility filter @ attribute rules ; Margin-aware ranker @ GBDT ; Cache @ CDN edge ; Interaction logs @ Kafka
edge: Accessory for discontinued model | recommends dead-end items | Lifecycle flags and inventory-aware filtering
edge: Cannibalisation of high-margin item | substitute-heavy recommendations steal sales from the highest-margin item and erode blended margin | Margin-aware objective and holdback test
off: Complement HitRate@10 ; Compatibility violation rate
on: Attach rate ; Average order value
gap: Co-view mistaken for complement ; Offline metric blind to compatibility errors

== visual-search-shop-the-look | Visual Search & Shop-the-Look | computer-vision,recommender | sub-100ms | advanced | a=1 k=400
obj: Let shoppers photograph or upload an image and retrieve visually matching sellable items, including per-garment matches in a scene.
loss: \mathcal{L}=\mathrm{Triplet}(f(a),f(p),f(n))+\lambda\,\mathcal{L}_{\text{det}}
con: 100 ms end-to-end including detection ; Index of 200M images ; Safe-content filtering ; Mobile bandwidth
sn: Domain gap | Train on user-photo to catalogue-photo pairs | Catalogue-only contrastive training | Studio photos look nothing like phone photos
sn: Granularity | Detect and crop each garment before embedding | Whole-image embedding | Background dominates whole-image embeddings
sig: Garment crop embedding | embedding of detected item crops | Per-item matching | Crop quality gates
sig: Attribute classifier agreement | colour, pattern and category predictions | Re-ranking filter | Taxonomy aligned with catalogue
sig: Availability and size in stock | live inventory signal | Business viability | Real-time inventory join
noise: Image EXIF | irrelevant and privacy-sensitive
noise: Background texture | distracts embeddings
base: Whole-image CNN embeddings with ANN retrieval.
prod: Detector plus metric-learning embeddings (ViT) with domain-adapted pairs, HNSW/IVF-PQ index sharded across nodes, attribute re-rank.
pipe: Image upload @ mobile SDK ; Detector and cropper @ YOLO on GPU ; Embedding model @ ViT on GPU ; ANN search @ sharded IVF-PQ ; Attribute re-ranker @ lightweight model ; Inventory filter @ stock service ; Interaction logs @ analytics
edge: Index refresh lags new arrivals | new products not findable | Streaming index updates with delta shards
edge: Adult or unsafe uploaded image | unsafe user uploads are embedded and surfaced, creating policy and brand risk | Pre-embedding safety classifier and blocking
off: Recall@10 on user-photo query set ; Attribute accuracy of top results
on: Visual search conversion ; Search sessions per user
gap: Query set built from catalogue crops ; Embedding drift after retrain unnoticed

== dynamic-pricing-optimization | Dynamic Pricing Optimisation | reinforcement-learning,tabular | batch | staff-principal | a=0.2 k=3
obj: Set prices per SKU and channel to maximise margin dollars under inventory, competitor and brand-guardrail constraints.
loss: \max_p\;\sum_i (p_i-c_i)\,D_i(p_i,x_i)\quad\text{s.t. }p_i\in[p^{min}_i,p^{max}_i]
con: Price-change frequency limits ; Legal price-parity rules ; Customer trust ; Daily batch for 50M SKUs
sn: Causality | Causal elasticity from price experiments and instruments | Regressing sales on price | Sellers raise price when demand is high, creating a positive confounded slope
sn: Dynamics | Inventory and lifecycle-aware pricing | Per-day myopic optimisation | Myopic pricing ignores stock-out and clearance timing
sig: Own-price elasticity | log-log slope from randomised price cells | Demand response | Randomisation required for validity
sig: Competitor price index | own price divided by matched competitor median | Relative position | Matching must be accurate
sig: Days of cover | stock divided by forecast demand | Scarcity | Forecast as-of, not realised
noise: Page views alone | confounded with traffic campaigns
noise: Last week's price | autocorrelated with the policy itself
base: Rule-based markup over cost with competitor matching.
prod: Hierarchical Bayesian demand model with randomised test cells and a constrained optimiser (MILP) solving per category nightly, with live guardrails.
pipe: Sales and inventory feed @ lakehouse ; Demand model @ hierarchical Bayesian ; Elasticity store @ versioned table ; Price optimiser @ MILP solver ; Guardrail engine @ min/max rules ; Price publisher @ catalogue API ; Pricing review @ category managers
edge: Competitor scraper returns wrong match | system chases bad price | Match-confidence gating and outlier clipping
edge: Price war spiral | margins collapse | Floor prices and alerting on cumulative moves
off: Demand model WAPE ; Optimiser uplift on holdout stores
on: Gross margin dollars ; Price perception index
gap: Elasticities estimated from observational price changes ; Offline simulation uses the same demand model that picks prices

== markdown-clearance-optimization | Markdown & Clearance Optimisation | tabular,reinforcement-learning | batch | advanced | a=0.1 k=2
obj: Choose markdown depth and timing to sell through end-of-season stock at maximum recovery before a cut-off date.
loss: \max_{m_{1:T}}\;\mathbb{E}\!\left[\sum_t (p_0(1-m_t)-c)\,q_t(m_t)\right]\ \text{s.t. }\sum_t q_t\ge S
con: Terminal inventory target ; Markdown cadence rules ; Store-level execution ; Brand price floors
sn: Dynamics | Time-varying elasticity and seasonality | Constant elasticity | Elasticity increases near end-of-season
sn: Cannibalisation | Cross-item cannibalisation within a style family | Item-level independent models | Marking down one colour steals sales from others
sig: Sell-through rate to date | units sold over initial units | Progress vs target | As-of snapshot
sig: Weeks to season end | calendar remaining | Urgency | Season-specific calendars
sig: Elasticity by markdown depth | response curve per category | Optimisation input | Fitted on prior seasons only
noise: Item colour popularity last year | already in baseline demand
noise: Store manager ID | unrelated
base: Fixed markdown cadence (25-50-70).
prod: Dynamic-programming markdown optimiser over a Bayesian sell-through model with category-level elasticity and cannibalisation terms.
pipe: Inventory and sales snapshot @ lakehouse ; Sell-through model @ Bayesian regression ; Markdown optimiser @ dynamic programming ; Constraint checker @ brand floors ; Price update feed @ POS and web ; Merchandiser approval @ workflow ; Outcome tracker @ recovery rate
edge: Supply chain delay shifts arrivals | late stock marked down early | Arrival-date aware model and delay buffers
edge: Weather anomaly (warm winter) | season demand collapses | Weather covariate and re-forecast triggers
off: Revenue recovery vs baseline in backtest ; Sell-through forecast MAPE
on: Recovery rate ; Terminal stock units
gap: Backtests using realised future stock ; Ignoring cannibalisation in simulation

== promotion-uplift-and-coupon-targeting | Promotion Uplift & Coupon Targeting | tabular | batch | advanced | a=0.3 k=2
obj: Send coupons only to customers whose purchase probability rises because of the coupon, maximising incremental margin per promotion dollar.
loss: \mathcal{L}=\sum_i\left(Y_i-\mu_{W_i}(X_i)\right)^2\ \text{(T-learner)};\ \text{policy}=\mathbb{1}[\hat\tau(x)>c]
con: Promotion budget ; Fairness across loyalty tiers ; Coupon abuse prevention ; Weekly campaigns
sn: Uplift | Incremental purchase effect per customer | Purchase propensity | High-propensity customers buy without the coupon
sn: Validation | Randomised control group in every campaign | Pre/post comparison | Seasonality masks coupon effects
sig: Price sensitivity score | historical response to discount depth | Persuadable indicator | Randomised promos only
sig: Purchase recency gap | days since last order vs typical cycle | Lapse risk | Cycle estimate from prior data
sig: Category exposure | share of basket in coupon category | Relevance | Pre-campaign window
noise: Email open count | confounded with engagement
noise: Customer city | weakly informative
base: Send to top-propensity decile.
prod: Doubly-robust causal forest uplift with budget-constrained assignment, 10% randomised holdout, and incrementality reporting.
pipe: Customer features @ lakehouse ; Uplift model @ causal forest ; Budget optimiser @ knapsack ; Abuse screening @ rules and graph ; Campaign dispatch @ CRM ; Marketing review @ approval ; Incremental measurement @ holdout
edge: Coupon leak on forums | untargeted redemption | Single-use signed codes with redemption limits
edge: Holdout contamination via shared household | effect underestimated | Household-level randomisation
off: Qini coefficient and AUUC ; Policy value via doubly-robust estimator
on: Incremental margin per coupon dollar ; Redemption by control group
gap: Training on non-randomised past promotions ; Measuring redemption rather than incrementality

== demand-forecasting-sku-store | SKU-Store Demand Forecasting | time-series | batch | advanced | a=1 k=1
obj: Forecast daily demand for millions of SKU-store pairs to drive replenishment with calibrated uncertainty and promo awareness.
loss: \mathcal{L}=\sum_{t}\sum_{q}\rho_q\!\left(y_t-\hat y_t^{(q)}\right)\quad\text{(quantile / pinball)}
con: 5M series nightly ; Intermittent demand ; Promotion and price covariates ; Explainable overrides
sn: Intermittency | Count-aware or quantile outputs for intermittent demand | Gaussian MSE | MSE on lumpy demand gives meaningless negative or tiny forecasts
sn: Hierarchy | Hierarchical reconciliation (SKU, category, store) | Independent forecasts | Independent forecasts do not add up to totals
sig: Promo calendar flag with depth | promotion type and discount depth known in advance | Demand spike | Only plans known at forecast origin
sig: Price index | price relative to base | Elasticity | Future prices must be planned values
sig: Lag-7 and lag-364 demand | same weekday and year-ago demand | Seasonality | Alignment by retail calendar
noise: SKU description text | adds nothing over category and attributes
noise: Day-of-month dummies | spurious for most items
base: Seasonal naive plus promo uplift factors.
prod: Global LightGBM / N-HiTS on all series with item embeddings, quantile heads, hierarchical reconciliation (MinT) and censored-demand correction for stock-outs.
pipe: Sales and inventory ingestion @ lakehouse ; Stock-out correction @ censoring model ; Feature builder @ Spark ; Global forecaster @ N-HiTS on GPU ; Hierarchical reconciler @ MinT ; Forecast publisher @ planning system ; Planner overrides @ demand planners
edge: Stock-out days recorded as zero demand | forecast biases low | Censoring-aware targets
edge: New store opening | the store has no sales history so the global model produces unstable forecasts | Peer-store clustering priors
off: WAPE and weighted pinball loss ; Bias at SKU-store level
on: In-stock rate ; Waste and markdown rate
gap: Random CV over time ; Future promo plans used before they were decided

== new-product-cold-start-forecasting | New Product Cold-Start Forecasting | time-series,tabular | batch | advanced | a=0.2 k=1
obj: Forecast demand for products with no sales history using attributes, images and analogues to set first buys and launch allocation.
loss: \mathcal{L}=\sum_t\rho_q\!\left(y_t-\hat y_t^{(q)}\right)+\lambda\,\mathrm{Analogue}\ \mathrm{Consistency}
con: Buy decisions months ahead ; Small initial samples ; Explainable analogue selection ; Merchandiser overrides
sn: Analogues | Nearest-neighbour analogue products with similarity weighting | Category averages | Category averages miss the specific style and price point
sn: Learning | Rapid Bayesian updating from first-week sales | Waiting for stable history | Early signal reduces buy error substantially
sig: Attribute-image embedding | joint embedding of attributes and images | Similarity to past winners | Embeddings trained on prior seasons only
sig: Launch price position | price percentile within category | Demand expectation | Planned launch price
sig: First-week velocity | sales in days 1-7 vs analogue velocity | Update signal | Adjust for stock availability
noise: Supplier name | confounded with quality tiers that attributes cover
noise: Internal SKU code | arbitrary
base: Category-average sell-through scaled by planned price tier.
prod: Analogue-based Bayesian hierarchical model with multimodal embeddings and online posterior updates from early sales.
pipe: Product attributes and images @ PIM ; Embedding model @ multimodal encoder ; Analogue retriever @ ANN ; Bayesian forecaster @ hierarchical model ; Buy-plan optimiser @ allocation solver ; Merchandiser review @ override workflow ; Actuals feed @ sales
edge: Viral social trend for a product | first buy far too small | Trend signal features and fast replenishment path
edge: Poor product photos | embeddings uninformative | Image quality score gates and attribute-only fallback
off: WAPE for cold-start cohorts ; Prediction interval coverage
on: First-buy accuracy ; End-of-season leftover units
gap: Analogues drawn from future seasons ; Evaluation mixes mature and new items

== inventory-replenishment-optimization | Inventory Replenishment Optimisation | reinforcement-learning,time-series | batch | staff-principal | a=1 k=2
obj: Decide order quantities and timing across a multi-echelon network to hit service levels at minimum inventory cost.
loss: \min_\pi\;\mathbb{E}\!\left[\sum_t h\,I_t^+ + b\,I_t^-+ K\,\mathbb{1}_{q_t>0}\right]
con: Supplier MOQ and lead times ; Shelf-life limits ; Warehouse capacity ; Service-level targets per class
sn: Uncertainty | Policy conditioned on forecast distribution and lead-time variability | Safety stock from a single sigma | Lead-time variability often dominates demand variability
sn: Policy | Parameterised (s, S) policies tuned by simulation | Pure end-to-end deep RL | RL without constraints violates MOQ and capacity
sig: Lead-time distribution | empirical supplier lead-time quantiles | Safety stock driver | Use delivered, not promised, dates
sig: Demand forecast quantiles | 50th to 95th percentile over lead time | Reorder points | Forecast as-of order date
sig: Holding and stock-out cost ratio | item-level critical ratio | Service target | Finance-approved costs
noise: Total yearly volume | already inside forecasts
noise: Supplier name | encoded by lead-time distribution
base: Reorder-point with safety stock from normal approximation.
prod: Simulation-optimised (s, S) policies with learned lead-time distributions and a multi-echelon allocation layer; RL used to tune parameters.
pipe: Inventory and PO data @ ERP extract ; Lead-time model @ distributional regression ; Demand quantiles @ forecasting service ; Policy optimiser @ simulation optimisation ; Order generator @ constraint solver ; Buyer approval @ planner workflow ; Service-level tracker @ KPI
edge: Supplier disruption | lead times double | Disruption flags widen distributions and trigger alternate sourcing
edge: Forecast bias after promotion | post-promo demand dip is under-modelled, causing systematic over-ordering | Promo-aware decomposition and bias monitors
off: Simulated cost at target service ; Service-level attainment
on: Fill rate ; Inventory turns
gap: Simulation uses forecast with look-ahead ; Costs not including expedite fees

== assortment-planning | Assortment Planning & Space Optimisation | tabular | batch | staff-principal | a=0.05 k=2
obj: Choose which SKUs each store cluster carries to maximise margin given space limits, substitution and local demand.
loss: \max_{x\in\{0,1\}^N}\;\sum_i m_i\,\mathbb{E}[D_i(x)]\ \text{s.t. }\sum_i s_i x_i\le S
con: Shelf space per store ; Vendor commitments ; Local preferences ; Quarterly planning cycle
sn: Substitution | Demand transfer when an item is removed | Sum of item sales | Removing a SKU moves 30-70% of its demand to substitutes
sn: Clusters | Behavioural store clusters | Store size tiers | Same-size stores can have totally different mixes
sig: Substitution matrix | estimated demand transfer between SKUs | True marginal value | Estimated from stock-out natural experiments
sig: Local demand index | category share vs chain average | Localisation | Normalise by store traffic
sig: Space elasticity | sales response to facings | Optimisation input | Controlled planogram tests
noise: Absolute sales rank | ignores substitutability
noise: Supplier promotions | temporary distortions
base: Rank by sales and fill space to the cut-off.
prod: Choice-model-based demand with substitution (MNL / ML-based) and an integer optimiser per store cluster.
pipe: Sales and space data @ lakehouse ; Choice-model trainer @ MNL with ML features ; Cluster builder @ behavioural clustering ; Assortment optimiser @ MILP ; Planogram generator @ space tool ; Category manager review @ sign-off ; Post-reset sales @ tracking
edge: Out-of-stock events distort demand | censored sales bias results | Stock-out correction in estimation
edge: Vendor funding changes late | plan violates commitments | Contract constraints as hard rows
off: Predicted vs realised sales change at reset ; Substitution accuracy
on: Margin per square foot ; Customer-switching loss
gap: Using sales as demand when items were unavailable ; Ignoring halo effects

== customer-churn-and-repurchase-prediction | Customer Repurchase & Churn Prediction | tabular,time-series | batch | foundational | a=1 k=2
obj: Predict who will order again in the next 30/60/90 days to time retention actions and acquisition value estimates.
loss: \mathcal{L}=-\sum_i\left[\delta_i\log h(t_i)-H(t_i)\right]\quad\text{(discrete-time survival)}
con: Non-contractual setting ; Purchase cycles differ by category ; Weekly scoring ; Consent
sn: Definition | Churn as exceeding the expected repurchase interval | Fixed 90-day inactivity | Replenishment cycles vary from days to years
sn: Targeting | Uplift on retention actions | Churn probability | Customers about to churn may be unsavable
sig: Recency over expected interval | days since last order divided by personal median interval | Lapse measure | Median from prior orders
sig: Category mix breadth | number of categories purchased | Engagement depth | Cumulative to date
sig: Return and complaint ratio | returns plus complaints over orders | Dissatisfaction | Use settled events
noise: Customer ID cohort | arbitrary
noise: Marketing consent flag | channel artefact
base: BG/NBD probabilistic repurchase model.
prod: Discrete-time survival GBDT with category-cycle features and an uplift layer for action selection.
pipe: Order history @ lakehouse ; Interval features @ Spark ; Survival model @ GBDT hazard ; Uplift selector @ T-learner ; CRM dispatch @ campaign tool ; Holdout analysis @ experiment ; Outcome labels @ repeat orders
edge: Seasonal buyers (gifting) | wrongly labelled churned | Seasonality-aware expected interval
edge: Consent withdrawal | features and targeting must stop | Consent flags enforced at feature and dispatch layers
off: Time-dependent AUC ; Calibration by cohort
on: Retained customers per marketing dollar ; Repeat purchase rate
gap: Random split mixing customer periods ; Using future orders to define the active window

== customer-segmentation-embeddings | Behavioural Customer Segmentation with Embeddings | tabular,recommender | batch | foundational | a=1 k=3
obj: Learn actionable behavioural segments from purchase and browse sequences that marketing, merchandising and CRM can all use.
loss: \mathcal{L}=\mathrm{InfoNCE}(z_u,z_u^+)+\lambda\,\mathrm{KMeans}(z)
con: Stable segments month to month ; Interpretable profiles ; Privacy-safe aggregates ; Cheap to operate
sn: Actionability | Segments validated by differential response to actions | Segments by silhouette score | Pretty clusters may not predict any behaviour difference
sn: Stability | Soft assignments with persistence constraints | Re-clustering from scratch monthly | Labels reshuffle and break campaigns
sig: Sequence embedding of purchases | transformer over order sequences | Behavioural similarity | Fixed observation window
sig: Price-tier mix | share of basket by price tier | Value orientation | Normalise by category
sig: Channel and device mix | online, store, app proportions | Engagement mode | Consent-aware
noise: Raw demographic fields | sparse and risky for fairness
noise: Account creation month | cohort artefact
base: RFM quantile segmentation.
prod: Self-supervised sequence encoder plus constrained clustering with stability regularisation and automated segment profiling.
pipe: Event history @ lakehouse ; Sequence encoder @ transformer ; Constrained clustering @ KMeans with stability ; Segment profiler @ summary stats ; Segment API @ CDP ; Marketing activation @ campaign tool ; Response tracking @ analytics
edge: Segment drift after new product launch | segment assignments shift after launch so campaigns and reports silently break | Alignment of new clusters to old via optimal transport
edge: Small segments get noisy | unstable estimates | Minimum size and merge rules
off: Differential response (lift) between segments ; Stability (adjusted Rand) month to month
on: Campaign lift by segment ; Use of segments by teams
gap: Evaluating clusters only on internal metrics ; No test of actionable difference

== conversational-shopping-assistant | Conversational Shopping Assistant | llm-agents,recommender | seconds | advanced | a=1 k=14 s=4 t=350
obj: Let shoppers describe needs in natural language and get grounded, buyable product recommendations with comparisons and follow-ups.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x,\text{catalogue})+\lambda\,\mathrm{OutOfCatalogue}
con: Never recommend unavailable or non-existent products ; p95 under 5 s first answer ; Brand safety ; Cost per session cap
sn: Grounding | Retrieval from live catalogue with structured attributes | Model knowledge of products | Models invent products and specifications
sn: Tools | Search, compare and cart tools with typed schemas | Free-text answers only | Text cannot add to cart or check stock
sig: Catalogue grounding rate | fraction of mentioned products found in catalogue | Hallucination detector | Exact ID verification
sig: Attribute constraint satisfaction | do recommended items meet stated constraints | Relevance | Parse constraints deterministically
sig: Session conversion and assist rate | purchase after assistant use | Business value | Holdout design
noise: Chat length | not quality
noise: Response friendliness score | bias to verbosity
base: Intent classifier plus filtered search with canned replies.
prod: Tool-using LLM with query planning, hybrid search, attribute-aware comparison and a verifier; semantic cache for frequent intents.
pipe: Chat gateway @ websocket ; Query planner @ LLM small model ; Catalogue search tool @ hybrid retrieval ; Comparison and stock tools @ typed APIs ; Response generator @ LLM ; Grounding verifier @ ID check ; Transcript logger @ eval pipeline
edge: Prompt injection via product reviews | model repeats attacker text | Review content isolated and sanitised as data
edge: Price changes mid-conversation | quoted price is stale | Tool-fetched prices at answer time with TTL
off: Grounding precision ; Constraint satisfaction rate on golden queries
on: Assisted conversion rate ; Cost per assisted session
gap: Golden queries written by developers ; Judging with an LLM that shares the model's biases

== product-catalog-attribute-extraction-llm | Catalogue Attribute Extraction with LLMs | nlp,llm-agents | batch | advanced | a=0.02 k=20
obj: Fill and normalise product attributes (size, material, compatibility) from titles, descriptions and images to power search, filters and recommendations.
loss: \mathcal{L}=\mathrm{CE}_{\text{token}}+\lambda\,\mathrm{SchemaViolation}
con: Strict JSON schema output ; 200M products ; Human audit sampling ; Cost per item under a fraction of a cent
sn: Schema | Constrained decoding to taxonomy values | Free-form extraction | Free text creates unlimited attribute spellings
sn: Cost | Distilled small model for the long tail with LLM for hard items | One large LLM for everything | LLM cost across 200M items is prohibitive
sig: Extraction confidence calibration | agreement across self-consistency samples | Routing to review | Calibrate per attribute
sig: Image-text agreement | VLM attribute vs text attribute | Detects errors | Image quality gating
sig: Attribute coverage lift | search filter coverage after enrichment | Business value | Compare vs control categories
noise: Marketing adjectives | not attributes
noise: Seller keywords | spam
base: Regex and dictionary extraction.
prod: Teacher LLM labels distil to a small seq2seq/VLM model with schema-constrained decoding; low-confidence items go to LLM and human audit.
pipe: Catalogue change feed @ CDC ; Pre-filter and normaliser @ text cleaning ; Student extractor @ distilled model ; Escalation LLM @ large model on hard items ; Schema validator @ taxonomy check ; Audit sampling @ human review ; Catalogue writer @ idempotent update
edge: Seller changes title after approval | stale attributes | Change-triggered re-extraction
edge: New category not in taxonomy | forced into wrong values | Out-of-taxonomy reject and taxonomy proposal queue
off: Attribute-level F1 ; Schema violation rate
on: Filter coverage ; Search conversion in enriched categories
gap: Gold set from easy categories ; Evaluating only exact string matches

== product-matching-and-deduplication | Product Matching & Deduplication | nlp,computer-vision | batch | advanced | a=0.02 k=15
obj: Identify identical products across sellers and sources to merge listings, power price comparison and avoid catalogue bloat.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{TransitiveClosurePenalty}
con: Billions of candidate pairs ; Precision above 99% for merges ; GTIN not always present ; Explainable merges
sn: Blocking | Learned blocking keys and ANN candidate generation | All-pairs comparison | N-squared cannot scale to 200M items
sn: Identity | Hard identifiers (GTIN, MPN) trump fuzzy similarity | Text similarity alone | Variants (colour, size) look identical in text
sig: GTIN or MPN agreement | exact or normalised identifier match | Strongest evidence | Validate check digits
sig: Attribute conflict flags | mismatch in size, colour, pack count | Variant separation | Parsed attributes only
sig: Image embedding similarity | multimodal similarity | Visual identity | Normalise backgrounds
noise: Seller name | irrelevant to product identity
noise: Listing date | arbitrary
base: Exact match on GTIN with title fuzzy match fallback.
prod: Siamese multimodal encoder with ANN blocking, GBDT pair classifier with attribute conflict features and clustering with transitivity checks.
pipe: Listing ingestion @ catalogue feed ; Blocking @ ANN and key buckets ; Pair scorer @ GBDT on embeddings ; Attribute conflict checker @ parsers ; Cluster builder @ correlation clustering ; Merge review @ catalogue ops ; Merge audit @ lineage store
edge: Bundle vs single item | false merge of different pack sizes | Pack-quantity extraction as hard constraint
edge: Counterfeit listings copy genuine product data | merge corrupts trusted listing | Seller trust gating on merges
off: Pairwise precision at 99% target ; Cluster purity
on: Duplicate rate in catalogue ; Wrong-merge incident count
gap: Positive pairs mined from GTIN only ; Test pairs from easy categories

== catalog-image-quality-and-compliance | Catalogue Image Quality & Compliance | computer-vision | batch | foundational | a=0.05 k=800
obj: Automatically check marketplace images for resolution, background, watermarks, text overlays and prohibited content at upload.
loss: \mathcal{L}=\sum_k\mathrm{BCE}(y_k,p_k)\quad\text{(multi-label policy heads)}
con: Throughput of millions of images per day ; Policy changes monthly ; Seller-facing explanations ; Appeals workflow
sn: Policy | Multi-label policy heads with per-region thresholds | Single pass/fail classifier | Policies differ by category and country
sn: Explanation | Region-level evidence (heatmaps, boxes) | Opaque rejection | Sellers appeal rejections without reasons
sig: Background uniformity | segmentation-based white-background ratio | Policy for main image | Mask quality
sig: Watermark and overlay detector | text overlay area ratio | Prohibited overlay | OCR plus detection
sig: Product occupancy ratio | product mask area over image area | Image usefulness | Segmentation consistency
noise: JPEG quality alone | weakly related to policy
noise: Image file name | seller-specific
base: Rule checks on resolution and file size.
prod: Multi-head vision model (ViT) with segmentation-based checks, policy-config thresholds and seller-facing explanations.
pipe: Upload event @ object store trigger ; Preprocessing @ resize and normalise ; Multi-head model @ ViT on GPU ; Policy engine @ per-region rules ; Seller notification @ explanation service ; Appeal queue @ human reviewers ; Label feedback @ reviewer decisions
edge: Policy update changes thresholds overnight | mass re-rejection | Policy versioning with dry-run impact analysis
edge: Adversarial image perturbations | sellers add imperceptible noise or crops that evade the detector | Randomised pre-processing and ensemble checks
off: Per-policy precision and recall ; Explanation fidelity
on: Image rejection appeal overturn rate ; Seller time to listing
gap: Training on moderator labels with inconsistent policy interpretation ; Test images from one region

== fake-review-detection | Fake Review & Review-Manipulation Detection | nlp,graph | batch | advanced | a=0.3 k=4
obj: Detect fake, incentivised and coordinated reviews that distort ratings, protecting buyers and honest sellers.
loss: \mathcal{L}=\mathrm{BCE}(y,p)+\lambda\,\mathrm{GraphReg}
con: Fast takedown within 24 hours ; Fair treatment of genuine reviewers ; Legal evidence trail ; Adversarial adaptation
sn: Coordination | Reviewer-product bipartite structure, time bursts and shared signals | Review text sentiment | Fake reviews are fluent and positive by design
sn: Labels | Mix of platform takedowns and manual audits with noise modelling | Treating takedowns as ground truth | Takedowns reflect what was caught before
sig: Review burst score | z-score of review volume for the product vs baseline | Campaign marker | Product-specific baseline
sig: Reviewer co-review overlap | Jaccard overlap of reviewed products between reviewers | Ring signal | Exclude popular products
sig: Verified-purchase gap | share of reviews without matched orders | Authenticity | Order match timestamp
noise: Review length | varies with genuine style
noise: Star rating alone | whole rating distribution matters not a single star
base: Rule-based filters on burst and duplicate text.
prod: Heterogeneous graph model plus text-style classifier and temporal burst detector, with ring-level reviewing and adversarial retraining.
pipe: Review stream @ Kafka ; Text features @ transformer embeddings ; Graph builder @ reviewer-product graph ; Fraud scorer @ GNN plus GBDT ; Takedown policy @ thresholds ; Trust and safety review @ human queue ; Appeals and labels @ feedback
edge: Genuine product launch with real review surge | burst false positives | Verified-purchase conditioning
edge: LLM-generated reviews become fluent | text classifier fails | Behavioural features dominate with text as auxiliary
off: Precision at moderator capacity ; Ring recall
on: Fake review prevalence from audits ; Seller appeal overturn rate
gap: Known fake rings are easiest to detect ; Time leakage when graph built with later takedowns

== return-fraud-and-abuse-detection | Return Fraud & Policy Abuse Detection | tabular,graph | sub-100ms | advanced | a=0.5 k=2
obj: Decide at return initiation whether to auto-approve, require inspection or deny, catching wardrobing, empty-box and serial abusers.
loss: \mathcal{L}=\mathrm{BCE}(y,p)\cdot w(\text{item value})
con: Genuine customers must not be punished ; Instant refund promise for trusted users ; Decision in 80 ms ; Policy fairness
sn: Behaviour | Customer return-rate relative to category norm | Absolute return rate | Apparel naturally has high return rates
sn: Loss | Cost-sensitive thresholding by item value | Equal weights | A $2 item and a $2000 item need different thresholds
sig: Category-adjusted return rate | customer rate over category peer rate | Abuse measure | Peer baseline per period
sig: Return-reason inconsistency | stated reason vs inspection outcome history | Credibility | Use inspected outcomes only
sig: Linked-account abuse | returns across linked accounts and addresses | Evasion | Link snapshot as-of
noise: Return window day | policy artefact
noise: Customer tenure | weak
base: Rules on return count thresholds.
prod: GBDT with graph features and customer trust tiers, cost-sensitive thresholds and inspection routing optimised for capacity.
pipe: Return request @ app API ; Customer trust features @ feature store ; Return-risk model @ LightGBM ; Cost-sensitive policy @ thresholds by value ; Inspection router @ capacity planner ; Warehouse inspection @ QA team ; Outcome labels @ inspection results
edge: Policy change extends return windows | baseline return rates shift | Policy-version covariate and re-baselining
edge: Holiday return spike | inspection capacity overwhelmed | Dynamic thresholds tied to capacity
off: PR-AUC and expected loss prevented ; Inspection yield
on: Return abuse losses ; Customer complaint rate
gap: Labels only from inspected returns ; Feature leakage via post-return refund status

== checkout-payment-risk-ecommerce | E-Commerce Checkout Risk (Card-Not-Present) | tabular,graph | sub-100ms | advanced | a=2 k=4
obj: Approve genuine orders instantly and block fraudulent card-not-present orders before fulfilment, optimising profit not just fraud rate.
loss: \mathcal{L}=\sum_i c_{\text{FN}}\,y_i(1-p_i)+c_{\text{FP}}(1-y_i)p_i\quad\text{with calibrated }p
con: Decision under 70 ms ; Chargeback ratio under scheme limits ; 3DS step-up budget ; Explainable manual review
sn: Economics | Profit-based thresholds using margin and chargeback cost | Fixed fraud-probability cutoff | A cutoff ignores order value and margin
sn: Identity | Linkage across email, device, address and card | Order-level features only | Fraudsters reuse infrastructure
sig: Shipping-billing distance | geodesic distance and mismatch flags | Drop-shipping fraud pattern | Address normalisation as-of
sig: Email-device-card entity degree | distinct values per entity within 7 days | Resource sharing | Time window before order
sig: Order velocity per identity cluster | orders per cluster in last hour | Burst attack | Cluster membership as-of
noise: Product count in cart | weak
noise: Browser language | spoofed
base: Rules plus vendor risk score.
prod: GBDT with entity-graph features, cost-sensitive thresholds per merchant, 3DS routing policy, and manual review queue prioritised by expected loss.
pipe: Order submission @ checkout API ; Entity resolution @ identity graph ; Feature lookup @ online store ; Risk scorer @ LightGBM ; Action policy @ approve, 3DS, review ; Manual review @ fraud team ; Chargeback labels @ delayed feed
edge: Chargeback labels arrive 60 days late | recent patterns unlabelled | Early-signal proxy labels and survival correction
edge: Black Friday volume | review queue overflows | Dynamic thresholding and auto-decline of top-risk
off: PR-AUC and profit curve ; Calibration by merchant
on: Fraud losses as percent of GMV ; Approval rate
gap: Training on approved orders only ; Review decisions treated as ground truth

== seller-fraud-marketplace-onboarding | Marketplace Seller Fraud Detection | tabular,graph,nlp | seconds | advanced | a=0.01 k=40
obj: Detect fraudulent or high-risk sellers at registration and early lifecycle to stop scams, counterfeits and non-delivery.
loss: \mathcal{L}=\mathrm{FL}(p,y)+\lambda\,\mathrm{GraphReg}
con: Onboarding SLA hours not days ; Legal KYB requirements ; Appeals ; Sellers in 100 countries
sn: Lifecycle | Early behaviour (first 30 days) after approval | Static onboarding data only | Fraud sellers behave differently after approval
sn: Network | Shared identity and payout links to banned sellers | Single-seller review | Banned sellers return with new identities
sig: Payout-account sharing | sellers sharing bank accounts or wallets | Re-registration | Hashed identifiers
sig: Listing-category velocity | new listings per day and category switching | Scam setup pattern | Time-window before alert
sig: Early order defect rate | non-delivery, mismatch complaints in first 20 orders | Direct harm | Use matured outcomes
noise: Business name text length | arbitrary
noise: Registration hour | bot artefact only
base: KYB checks with manual review rules.
prod: Two-stage: onboarding risk GBDT with graph features, then post-approval monitoring with sequence models and automatic limits.
pipe: Seller registration @ onboarding API ; KYB and sanctions checks @ vendor APIs ; Entity graph @ identity links ; Risk model @ GBDT ; Limit policy @ listing and payout caps ; T&S review @ analyst queue ; Early outcomes @ complaints and chargebacks
edge: Legitimate agency managing many sellers | flagged as linked network | Business relationship registry
edge: Fast-growing genuine sellers | limits throttle growth | Appeal fast path and trust escalation
off: PR-AUC and early detection lead time ; Precision at review capacity
on: Buyer harm per GMV ; Genuine seller approval time
gap: Outcomes only observed for approved sellers ; Network features built using post-ban links

== counterfeit-product-detection | Counterfeit Product Detection | computer-vision,nlp | batch | staff-principal | a=0.05 k=300
obj: Find counterfeit listings using images, text, price and seller signals, supporting brand-owner takedowns with strong evidence.
loss: \mathcal{L}=\mathrm{BCE}+\lambda\,\mathrm{Contrastive}(\text{genuine},\text{fake})
con: Brand-owner evidence packs ; Fast takedown of new fakes ; Low false takedowns of genuine resellers ; Per-brand models
sn: Brand | Per-brand verified catalogues and authentication attributes | Generic fake classifier | Generic models don't know a brand's logo detail
sn: Price | Price far below authorised-channel floor | Price alone | Genuine discounts and grey-market parallel imports exist
sig: Logo and tag fidelity | fine-grained logo similarity to brand references | Visual authenticity | Reference set curated by brand
sig: Price-to-MSRP ratio | price divided by MSRP floor | Economic signal | MSRP as-of
sig: Seller risk and authorised flag | authorisation status and history | Contextual | Brand-provided lists
noise: Listing language | uninformative
noise: Image resolution | seller-device
base: Keyword and price-threshold rules per brand.
prod: Per-brand fine-grained vision models and multimodal classifier with seller risk features, evidence pack generator and brand feedback loop.
pipe: Listing ingestion @ catalogue stream ; Brand matcher @ text and logo model ; Fine-grained authenticity model @ ViT per brand ; Seller risk features @ graph store ; Takedown scorer @ GBDT ; Brand liaison review @ human ; Brand feedback @ confirmations
edge: New fake variant evades model | recall collapses | Fast active-learning loop using brand confirmations
edge: Parallel-import genuine goods | genuine grey-market goods are flagged as fakes and wrongly taken down | Authorised-source evidence and appeal path
off: Precision and recall per brand ; Evidence pack acceptance by brands
on: Counterfeit listing prevalence ; Brand complaints
gap: Fakes in training from easy known sellers ; Brand references differ from real packaging

== delivery-promise-estimation | Delivery Promise (ETA) Estimation | time-series,tabular | sub-100ms | advanced | a=8 k=2
obj: Show accurate delivery dates at browse and checkout, balancing conversion (earlier promises) with on-time reliability.
loss: \mathcal{L}=\sum_i\left[\alpha\,(y_i-\hat q_i)^+ +(1-\alpha)(\hat q_i-y_i)^+\right],\ \alpha=0.9
con: 40 ms per promise ; Late delivery penalty ; Carrier capacity constraints ; Pin-code granularity
sn: Quantile | Promise at a high quantile of the delivery-time distribution | Mean delivery time | Mean promises are late half the time
sn: Components | Model processing, middle-mile and last-mile separately | Single end-to-end regressor | Component models adapt faster to carrier-specific changes
sig: Pin-code carrier lead-time quantile | 90th percentile of last-mile time by carrier and pin | Reliability anchor | Recent window as-of
sig: Warehouse processing backlog | orders waiting vs processing capacity | Queue time | Snapshot at order time
sig: Weather and event disruption flags | alerts on route | Delay risk | Alerts known before the order
noise: Order value | no effect on transit time
noise: Customer age | irrelevant
base: Static lead-time table by pin code.
prod: Quantile gradient boosting for each leg plus convolution of distributions, updated every 15 minutes with live capacity signals and cached per pin code.
pipe: Promise request @ catalogue and checkout API ; Capacity and backlog feed @ stream ; Leg quantile models @ LightGBM ; Distribution combiner @ convolution ; Promise cache @ per pin-code ; Business rules @ cut-offs ; Delivery outcome logs @ Kafka
edge: Festive-season carrier delays | promises miss widely | Dynamic buffer from live on-time rate
edge: Pin code with few deliveries | uncertain estimates | Hierarchical shrinkage to region
off: On-time rate at promised quantile ; Pinball loss
on: Late delivery rate ; Conversion lift from faster promises
gap: Evaluating on delivered orders only (survivorship) ; Mean error reported instead of tail error

== size-and-fit-recommendation | Size & Fit Recommendation | recommender,tabular | sub-100ms | advanced | a=2 k=2
obj: Recommend the right size per item and shopper to cut size-related returns without discouraging purchase.
loss: \mathcal{L}=\mathrm{CE}(\text{fit class},p)+\lambda\,\mathrm{OrdinalPenalty}
con: Brand-specific sizing ; Privacy of body measurements ; Under 50 ms ; New-brand cold start
sn: Fit | Ordinal classes (small, fit, large) with brand-item offsets | Purchased size as truth | People keep ill-fitting items so purchased size is not the right size
sn: Returns | Return reason codes as supervision | Returned equals wrong size | Many returns are not fit-related
sig: Brand-size offset | learned bias of a brand versus a reference scale | Cross-brand mapping | Estimated on matured returns
sig: Shopper anchor items | sizes the user kept in similar brands | Personal calibration | Only kept items
sig: Garment measurements vs user profile | difference between spec and user measures | Direct fit | Self-reported noise correction
noise: Item colour | not related to fit
noise: Shopper age | proxy risk
base: Brand size chart lookup by user height and weight.
prod: Bayesian latent-fit model (user and item latent sizes) with ordinal outputs and returns-calibrated recommendations.
pipe: Product page request @ API ; User fit profile @ feature store ; Item latent size lookup @ vector store ; Fit model @ Bayesian ordinal ; Recommendation formatter @ UI text ; Cache @ CDN ; Return reason feed @ analytics
edge: Brand changes pattern mid-season | latent size drifts | Per-item drift monitor and quick re-estimate
edge: Gift purchases for someone else | wrong profile used | Detect gift context and ask for recipient size
off: Fit-class accuracy ; Ordinal macro-F1
on: Size-related return rate ; Conversion on items with recommendation
gap: Using kept items as correct without checking wear ; Return reasons mis-selected by users

== review-summarization-and-q-and-a | Review Summarisation & Product Q&A | llm-agents,nlp | seconds | advanced | a=1 k=10 s=2 t=250
obj: Summarise thousands of reviews into balanced pros/cons and answer product questions with citations from reviews and specs.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{AspectCoverage}
con: Balanced, not cherry-picked ; Cite review IDs ; Cost per product page cached ; Spam-resistant
sn: Aspect | Aspect-based clustering with sentiment per aspect | Single overall summary | Overall summaries hide that battery is bad while screen is great
sn: Trust | Weight by verified purchase and spam score | All reviews equal | Fake reviews skew summaries
sig: Aspect coverage | share of frequent aspects represented | Completeness | Aspects extracted offline
sig: Review quality weight | helpfulness and verified-purchase weight | Trust | Votes as-of
sig: Support rate | share of summary claims supported by cited reviews | Faithfulness | Entailment check
noise: Extreme 1-star rants | outliers
noise: Emoji counts | no content
base: Extractive top-helpful review snippets.
prod: Offline aspect extraction, per-aspect map-reduce summarisation with citations, cached per product, and a live Q&A retriever for questions.
pipe: Review ingestion @ stream ; Spam filter @ classifier ; Aspect extractor @ distilled model ; Summariser @ LLM map-reduce ; Faithfulness check @ NLI ; Product page cache @ CDN ; Q&A retriever @ hybrid search
edge: New product with 3 reviews | summary overconfident | Minimum-evidence rule and uncertainty wording
edge: Review bombing campaign | summary flips overnight | Rate-limit summary changes and spam weighting
off: Faithfulness and aspect recall ; Human preference vs baseline
on: Time on page to decision ; Conversion lift
gap: Summaries judged for fluency not support ; Evaluating on well-reviewed products only

== customer-service-ticket-routing-and-response | Customer Service Ticket Routing & Draft Replies | nlp,llm-agents | seconds | advanced | a=0.3 k=6 s=3 t=250
obj: Route tickets to the right queue, detect urgency and draft policy-correct replies so agents resolve contacts faster.
loss: \mathcal{L}=\mathrm{CE}_{\text{route}}+\lambda\left(-\sum_t\log p_\theta(y_t\mid y_{<t},x)\right)
con: Policy-accurate refunds ; PII masked ; Agent final approval ; p95 under 4 s
sn: Routing | Multi-label intent with order-state context | Text-only classification | Intent depends on the order's state (shipped, delivered)
sn: Replies | Policy-grounded drafts with order data | Generic empathetic text | Customers want a resolution not sympathy
sig: Order-state context | status, delivery, refund eligibility | Determines resolution | Fetch live
sig: Urgency indicators | repeat contacts, SLA age, sentiment | Priority | Contact graph
sig: Policy match | retrieved policy clause for the intent | Correctness | Version control of policies
noise: Ticket subject length | no signal
noise: Customer greeting style | cosmetic
base: Keyword routing and macro responses.
prod: Fine-tuned intent router with order-context features and an LLM drafting layer grounded on policy retrieval and order APIs with agent approval.
pipe: Ticket intake @ helpdesk webhook ; Context enrichment @ order APIs ; Intent and urgency model @ fine-tuned encoder ; Policy retriever @ hybrid search ; Reply drafter @ LLM ; Agent review @ human approval ; Resolution feedback @ edits and CSAT
edge: Refund policy changes mid-week | drafts cite old rules | Policy versioning and retrieval by effective date
edge: Abusive customer messages | model mirrors tone | Tone guard and escalation rules
off: Routing accuracy ; Draft acceptance without edit
on: Handle time ; First-contact resolution
gap: Measuring CSAT from biased respondents ; Drafts judged without policy check
