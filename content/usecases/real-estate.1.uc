# Real Estate & PropTech, part 1 (use cases 1-25): valuation, listings, leasing and property management
== automated-valuation-model | Automated Valuation Model (AVM) | tabular,computer-vision | seconds | production-grade | a=0.05 k=40
obj: Estimate the market value of a home from its attributes, location, nearby sales and photos, with a confidence range, for lenders, portals and owners.
loss: \mathcal{L}=\mathrm{Huber}(\log\hat{y}-\log y)+\lambda\,\mathrm{Pinball}(\hat{q}_{0.1},y)
con: Median error under 6% with a published confidence score ; Valuation must not use protected attributes or their proxies ; Explainable comparable set for every value ; Re-valuation of a whole market overnight
sn: Target | Sale price at the contract date, adjusted to a common date | Listing price or assessed value | Listing prices are aspirations and assessed values lag the market by years
sn: Local | Micro-market effects such as school zone, street and view | City-level averages | A 10% price gap can exist across one street
sn: Condition | Condition and renovation state from photos and permits | Square footage and bedroom count only | Two identical houses differ by 20% in condition
sig: Comparable sale density | count and recency of sales within 0.5 km and 90 days | Thin markets give wide errors | Only sales that closed before the valuation date
sig: Price per square metre by micro-area | trailing median adjusted for size and type | Anchors the local level | Neighbourhood boundaries must be stable
sig: Condition score from photos | vision model grade of kitchen, bathroom and exterior | Captures the unrecorded | Listing photos are staged and flattering
sig: Renovation permits | permits for kitchen, extension or roof in the last 10 years | Evidence of upgrades | Permit data quality varies by municipality
noise: Listing description adjectives | marketing language with little extra signal
noise: Days since the listing photo upload | portal behaviour, not value
noise: Owner name | no causal link and a privacy risk
base: Hedonic regression on size, rooms, location and age per market, because appraisers recognise it and it gives instant explanations.
prod: Gradient boosting with spatial features and a photo-condition embedding, quantile heads for the range and a comparables retriever to justify each value.
pipe: Property record lookup @ parcel and listing database ; Geospatial features @ PostGIS and H3 cells ; Comparable retriever @ nearest sales index ; Photo condition model @ vision model on GPU ; Value model @ gradient boosting with quantiles ; Confidence calibrator @ isotonic per market ; Valuation log @ lakehouse
edge: Thin market | few sales within the radius | Widen the range and show the lower confidence score instead of a falsely precise value
edge: Unique property | castle, houseboat or large plot | Out-of-distribution flag and routing to a human appraiser
edge: Rapid market shift | prices move 8% in a quarter | Time-trend features from recent sales and shorter training windows
off: Median absolute percentage error by market ; Share of values within 10% of the sale price
on: Appraisal orders avoided ; Value disputes raised by lenders
gap: Training on sales after the valuation date leaks the trend ; Random split lets the same street sit in train and test

== rent-estimation | Rental Price Estimation | tabular | sub-100ms | foundational | a=0.1 k=10
obj: Estimate the market rent for a home or unit so owners, agents and tenants see a credible range.
loss: \mathcal{L}=\mathrm{Huber}(\log\hat{y}-\log y)+\lambda\,\mathrm{Pinball}(\hat{q}_{0.9},y)
con: Response under 80 ms ; Range shown with the estimate ; No protected attributes or proxies ; Daily refresh of market features
sn: Asking vs signed | Signed rents when known | Asking rents only | Asking rents are 3-8% above what is signed
sn: Furnishing | Furnished versus unfurnished segmentation | Pooled rents | Furnishing shifts rent by 10-20%
sn: Amenities | Parking, laundry, pets and utilities included | Bedroom count only | Included utilities change net rent
sig: Local median rent per room | trailing 60-day median in the micro-area | Market anchor | Mix of unit types
sig: Unit size and layout | area and bedrooms | Core attribute | Floor plan errors
sig: Building amenity count | amenities from listings | Premium driver | Text extraction errors
sig: Transit access | walking time to stations | Premium driver | Routing data
noise: Listing title style | marketing
noise: Photo count | portal behaviour
noise: Agent name | irrelevant
base: Median rent per square metre in the postcode, because it is easy to explain and already used.
prod: Gradient boosting with spatial and amenity features, quantile outputs and a segment model for furnished units.
pipe: Listing and lease feed @ ingestion pipeline ; Geospatial features @ H3 index ; Amenity extractor @ text model ; Rent model @ gradient boosting ; Range calibrator @ conformal intervals ; API response @ low-latency service ; Outcome store @ lakehouse
edge: New building | A new building has no rent history to learn from | Use priors from similar buildings and widen the interval
edge: Seasonal market | A student city peaks in August and prices are not typical in other months | Add seasonal features and compare with the same month in earlier years
edge: Duplicate listings | The same home appears several times and inflates the sample | Deduplicate listings across portals before training
off: MAPE ; Interval coverage
on: Listing price changes after estimate ; Time to lease
gap: Asking rents leak into labels ; Same landlord in train and test

== comparable-sales-selection | Comparable Sales Selection | tabular,recommender | sub-100ms | production-grade | a=0.05 k=20
obj: Select and rank the most similar recent sales for a subject property and adjust them, so valuations and appraisals are defensible.
loss: \mathcal{L}=\mathrm{Triplet}(a,p,n)+\lambda\,\mathrm{Huber}(\hat{y}-y)
con: Comparable set explainable to an appraiser ; Only closed sales before the valuation date ; Response under 100 ms ; Adjustments bounded by policy
sn: Similarity | Learned similarity on what drives price | Distance and size only | A near neighbour with a different school zone is a poor comparable
sn: Recency | Sales recency with time adjustment | Last 12 months equally | Fast markets age comparables quickly
sn: Adjustment | Explicit adjustments for differences | Raw prices | Raw comps ignore a pool or an extra bedroom
sig: Learned property embedding | vector from attributes and photos | Similarity | Training data bias
sig: Sale recency weight | days since sale | Time | Market speed
sig: Same school or tract flag | within the same boundary | Locality | Boundary changes
sig: Adjustment size | percentage adjustment for features | Quality | Estimated by a model
noise: Seller name | irrelevant
noise: Listing agent | irrelevant
noise: Photo order | arbitrary
base: The five nearest recent sales by distance and size, because appraisers do this by hand.
prod: Metric-learned embeddings with approximate nearest neighbour retrieval, then a learned adjustment model and a reranker.
pipe: Subject property features @ property service ; Candidate retrieval @ ANN index of closed sales ; Reranker @ gradient boosting ; Adjustment model @ regression ; Rule check @ policy engine ; Comparable report @ document service ; Feedback capture @ lakehouse
edge: Few comparables | Rural properties have few comparables within any sensible radius | Widen the search criteria in steps and flag the lower confidence to the appraiser
edge: Non-arm's-length sale | A family transfer or distressed deal is not a market price | Filter by deed type and price relation to market and exclude such sales
edge: Distressed sale | A distressed sale such as a foreclosure sells below market and drags the adjustment | Mark distressed sales and adjust or exclude them from the comparable pool
off: Agreement with appraiser-chosen comps ; Valuation error from selected comps
on: Appraiser time per report ; Revisions requested
gap: Appraiser comps are biased toward familiar sales ; Future sales leak

== listing-price-recommendation-and-time-to-sell | Listing Price Recommendation & Time-to-Sell | tabular,time-series | seconds | production-grade | a=0.05 k=30
obj: Recommend a listing price and predict the days to sell at different prices so sellers and agents can trade price against time.
loss: \mathcal{L}=-\sum_i\left[\delta_i\log h(t_i\mid x_i,p_i)-\int_0^{t_i}h(u\mid x_i,p_i)\,du\right]
con: Recommendations are advice not valuations ; Price-time curves shown with intervals ; Sellers decide ; No use of protected attributes
sn: Censoring | Unsold listings treated as censored | Dropping withdrawn listings | Dropping unsold listings makes homes look quicker to sell
sn: Price position | Listing price relative to the model value | Absolute price | Over-pricing by 5% matters in a fast market
sn: Season | Seasonality in demand | Averages | Spring and autumn differ
sig: Price to value ratio | listing price divided by AVM value | Core driver | AVM error
sig: Local inventory | active listings per month of sales | Market speed | Definition
sig: Early engagement | views and saves in the first 7 days | Demand signal | Used for updates, not the first price
sig: Seasonal index | month factor by market | Timing | Few years of data
noise: Agent photo count | portal behaviour
noise: Weekday listed | weak
noise: Listing text length | style
base: Median days on market by price band in the postcode, because agents quote it.
prod: Survival model on price position and market state, with a price optimiser maximising expected net proceeds subject to time preference.
pipe: Property and market data @ feature service ; Value baseline @ AVM ; Survival model @ boosted hazard ; Price-time optimiser @ solver ; Advisor view @ agent app ; Seller report @ PDF service ; Outcome feed @ lakehouse
edge: Bidding war | Sale prices above list in a bidding war make the list price misleading | Model the sale-to-list ratio and include market heat
edge: Price reductions | The list price changes during the listing | Use time-varying covariates and track the price history
edge: Off-market sales | Off-market sales have no listing but are in the registry and distort time on market | Exclude off-market sales from time-to-sell training and note them in the data description
off: Concordance ; Calibration of days to sell
on: Median days on market ; Sale-to-list ratio
gap: Withdrawn listings dropped ; Price chosen by agents affects outcomes

== appraisal-review-and-valuation-anomaly-detection | Appraisal Review & Valuation Anomaly Detection | tabular,nlp | seconds | production-grade | a=0.05 k=60
obj: Flag appraisals that look inflated, inconsistent or non-compliant before a lender relies on them.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Huber}(\hat{v}-v)
con: Reviewer sees the evidence ; Appraiser independence rules ; Review capacity ; Fair treatment of appraisers
sn: Deviation | Gap between appraisal and independent AVM adjusted for confidence | Any gap | Thin markets have wide AVM error
sn: Comparables | Quality of selected comps | Count | Cherry-picked comps are the main issue
sn: Pattern | Appraiser-level patterns over many reports | Single reports | Inflation shows as a pattern
sig: Appraisal to AVM gap | log difference scaled by AVM interval | Core signal | AVM coverage
sig: Comparable selection quality | similarity of chosen vs available comps | Cherry-picking | Comp pool
sig: Appraiser history | past review outcomes | Pattern | Fairness
sig: Narrative inconsistency | text contradicting the data | Quality | Text extraction
noise: Report length | style
noise: Appraiser firm | weak
noise: Photo count | style
base: Review any appraisal more than 10% from the AVM, because lenders use such triggers.
prod: Gradient boosting on gap, comp quality and narrative checks with calibrated risk and a reviewer queue.
pipe: Appraisal report intake @ vendor portal ; Report parser @ document model ; AVM benchmark @ valuation service ; Comparable checker @ ranking model ; Risk model @ boosting ; Reviewer queue @ workflow ; Outcome log @ warehouse
edge: Unique property | A unique property sits outside the range where the independent valuation is reliable | Use wider tolerances for unique properties and say so in the review note
edge: Rising market | In a rising market the independent valuation lags and every appraisal looks too high | Benchmark against a time-adjusted valuation rather than the latest model run
edge: Rural area | Rural areas have few comparables so valuation gaps are noisy | Use adjusted thresholds by area type so rural appraisals are not over-flagged
off: Precision at review capacity ; Recall on confirmed issues
on: Valuation losses avoided ; Review turnaround
gap: Confirmed issues are those that defaulted ; Reviewer bias

== neighbourhood-quality-scoring | Neighbourhood Quality Scoring | tabular,computer-vision | batch | production-grade | a=0.02 k=100
obj: Score each neighbourhood on walkability, amenities, safety perception, noise and change so buyers and investors can compare areas.
loss: \mathcal{L}=\mathrm{MSE}(\hat{y},y)+\lambda\,\mathrm{GraphReg}(z)
con: No score may use race, ethnicity, religion or any proxy for them ; Method and inputs published so a resident can challenge a score ; Quarterly refresh without rank churn from noise alone ; Fair-housing and legal review before any score is shown to buyers
sn: Fairness | Scores built only from objective amenity, access and environment data that can be named and audited | Crime counts, school-rating averages or income and demographic proxies | Those inputs recreate historic redlining and a score that looks neutral becomes a legal and reputational risk
sn: Scale | Block-level scores from small grid cells with enough observations to be stable | City or postcode averages | Quality changes from one street to the next, and an average hides the exact variation a buyer is paying for
sn: Change | The trajectory of an area, such as net new businesses and permits over two years | A single static snapshot score | A buyer or investor cares where the area is heading, and gentrification is invisible in a snapshot
sig: Walk time to amenities | routing time on the pedestrian network to the nearest grocery, school, park and transit stop | A directly interpretable livability measure that matches how residents experience the area | Use the current map snapshot for training labels and do not mix in later openings
sig: Street imagery greenery | share of pixels classed as tree canopy in street-level images, averaged over each cell | Green cover tracks comfort, heat and perceived quality | Images are seasonal, so normalise by capture month and never compare winter to summer
sig: Business openings | net new registered businesses in the cell over 24 months, divided by existing businesses | Momentum and vibrancy that a snapshot cannot show | Registrations lag opening, so count by registration date and exclude the scored quarter
sig: Noise exposure | modelled decibel level from road, rail and flight-path data at the cell centroid | Noise is a stable driver of livability that residents rank highly | The model assumes typical traffic, so re-run it after a major route change
noise: Area name | A label that the model can memorise, which would reproduce the reputation of a name instead of the facts on the ground
noise: Listing agent | Who sells a home in the area has no bearing on the area itself and leaks market share, not quality
noise: Photo brightness | An artefact of camera and time of day in the source images, not of the neighbourhood
base: A weighted index of amenity counts, because portals publish similar scores.
prod: Learned scores from amenity access, imagery and trend features, calibrated to resident survey data, with a fair-housing audit.
pipe: Map and amenity data @ OpenStreetMap and local feeds ; Imagery features @ vision model ; Routing features @ routing engine ; Score model @ gradient boosting ; Fairness audit @ bias checks ; Score store @ lakehouse ; API @ low-latency service
edge: New development | A new development has no history so its area score cannot be computed | Use priors from comparable areas and mark the score as provisional
edge: Data gaps | Few amenities are mapped in an area so the score is falsely low | Add coverage flags and mark scores from sparse data as provisional
edge: Disputed boundaries | Different sources name and draw the same area differently | Use stable grid cells and map names to them
off: Rank correlation with survey ratings ; Stability across refreshes
on: Search engagement with area filters ; Complaints about scores
gap: Survey calibration data covers wealthy and responsive areas better than others ; Proxy features that correlate with protected classes pass offline tests and fail the fairness audit

== price-index-and-market-trend-forecasting | House Price Index & Market Trend Forecasting | time-series | batch | production-grade | a=1 k=2
obj: Produce repeat-sales and hedonic price indices by area and forecast price movement for the next quarters.
loss: \mathcal{L}=\sum_t\mathrm{Pinball}(\hat{q}_{0.9},y_t)+\lambda\,\mathrm{MSE}(\hat{y}_t,y_t)
con: Published on a fixed monthly date with the revision policy stated up front ; Every figure shown with a prediction interval, never a bare number ; Methodology reproducible from the same inputs by an outside analyst ; Thin markets pooled or flagged rather than published with false precision
sn: Quality | A quality-adjusted index that tracks price change for the same home over time | The median sale price of the month | The mix of homes that sell changes, so a median can fall in a month when every home's price rose
sn: Lag | Sales dates and recording dates modelled separately, with later revisions published | Listing asking prices alone | Listing prices lead the market but overstate what buyers finally pay, so using them alone biases the index upward
sn: Leading | Mortgage rates, active listings and affordability as drivers of turning points | Past prices as the only predictors | A model of past prices can only extrapolate, and misses the turn when rates change
sig: Repeat-sales pairs | log price change between two sales of the same property divided by the years between them | Holds the home constant, so the change is the market and not the mix | Few pairs exist in thin markets, so pool by region and report the count
sig: Mortgage rate | average new-loan rate lagged by one to three months | Affordability moves demand with a lag | Use the rate known at the forecast date, not the revised one
sig: Active listings | change in unsold inventory over the last quarter, scaled by monthly sales | Supply relative to demand moves prices | Definitions of active differ by portal, so standardise before comparing
sig: Search interest | portal search volume for an area, indexed to its own 12-month mean | A leading indicator of demand before sales are recorded | Search volume is noisy and affected by portal changes, so check for breaks in the series
noise: Social posts | Sentiment volumes swing with news cycles and carry little information about transaction prices
noise: Single-sale outliers | One unusual sale such as a family transfer or a distressed deal should not move an area index
noise: Agent commentary | Opinion that is not measured and cannot be reproduced
base: Median sale price by area with a naive trend, because press releases use it.
prod: A repeat-sales and hedonic index with a forecast model on rates, supply and search, with intervals and revision control.
pipe: Sales records @ land registry feeds ; Index builder @ repeat-sales regression ; Leading indicators @ market data ; Forecast model @ boosting plus VAR ; Interval engine @ quantile ; Publication @ API and BI ; Archive @ lakehouse
edge: Revisions | Late sales change earlier index values | Track revisions and publish with a revision note
edge: Thin markets | A market with few sales gives a volatile index | Pool with neighbouring markets and show wide intervals
edge: Policy changes | A tax or stamp-duty change shifts prices across the whole market at once | Add policy-event flags and use shorter windows around the change
off: Forecast error by horizon ; Index revision size
on: Users of the index ; Forecast hit rate
gap: A back-test run only through a rising market flatters any model that predicts continued growth ; Look-ahead on revised data, since sales recorded later change earlier index values

== development-site-feasibility-scoring | Development Site Feasibility Scoring | tabular,nlp | seconds | staff-principal | a=0.02 k=200
obj: Screen land parcels for development potential by combining zoning, constraints, comparable projects and market demand.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{Huber}(\hat{r}-r)
con: Zoning data cited ; Screening, not a legal opinion ; Analyst reviews top sites ; Data licences
sn: Constraints | Binding constraints such as height limits, flood and heritage | Parcel size alone | A large site with a heritage overlay may be undevelopable
sn: Yield | Expected margin after cost and absorption | Land price | Cheap land can be unbuildable
sn: Process | Probability of obtaining permits | Assuming approval | Approval risk dominates timelines
sig: Allowable floor area | zoning-derived buildable area | Core | Rule parsing
sig: Constraint overlap | share of the parcel under constraints | Risk | Data
sig: Comparable project yield | margins of recent nearby projects | Market | Sparse
sig: Permit approval history | approval rate for similar applications | Process | Local
noise: Owner | irrelevant
noise: Parcel ID digits | arbitrary
noise: Listing text | marketing
base: Filter parcels by zone and size, then analysts review, because that is how teams work.
prod: Zoning parser with a feasibility model, a residual-land-value calculator and a ranked list with evidence.
pipe: Parcel and zoning data @ GIS ; Rule extractor @ NLP over codes ; Constraint overlay @ geospatial engine ; Feasibility model @ boosting ; Residual value @ financial model ; Analyst shortlist @ web tool ; Outcome log @ warehouse
edge: Zoning change pending | A zoning change is pending and the rules used for scoring may soon be out of date | Flag sites with a pending change and score under both the current and proposed rules
edge: Assemblage | A development needs several parcels bought together | Combine the parcels and re-score as one site
edge: Contaminated land | Contaminated land has an unknown clean-up cost that dominates the feasibility | Flag suspected contamination and require an environmental survey before the site ranks highly
off: PR-AUC on projects that proceeded ; Yield error
on: Sites progressed per analyst-week ; Win rate
gap: Only past proceeding sites labelled ; Outdated codes

== listing-photo-quality-and-room-classification | Listing Photo Quality & Room Classification | computer-vision | sub-100ms | foundational | a=1 k=800
obj: Classify the room type and quality of each listing photo so galleries are ordered well and poor images are flagged to the agent.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{Ordinal}(\hat{q},q)
con: Under 80 ms per image at the 99th percentile so upload is not slowed ; Room type and quality are descriptions of the photo, never judgements of people or their homes ; Faces and number plates blurred before any image is stored or shown ; Equal accuracy across house, flat, rural and luxury listings
sn: Room | Room type predicted from what the image contains | The file name or the order of upload | Agents upload in arbitrary order, so position carries no information about the room
sn: Quality | Technical quality measured by blur, exposure and tilt | Aesthetic opinions about taste | Aesthetic labels disagree between raters and teach the model fashion, not a defect an agent can fix
sn: Privacy | Detect and blur identifiable people and plates before storage | Leave privacy to a later review | A leaked face or plate is a legal and trust problem that cannot be undone once published
sig: Room class probability | softmax output of the vision model for each room type | Drives gallery ordering and flags missing rooms | Rare rooms such as utility or study are under-represented, so check per-class recall
sig: Blur score | variance of the Laplacian of the grey image | Sharp images have strong edges, and a low value means a blurred photo | Depends on image size, so compute at a fixed resolution
sig: Exposure histogram | share of pixels clipped in highlights and in shadows | Over or under-exposure is a fixable defect | High-dynamic-range photos look clipped but are fine, so condition on the scene type
sig: Duplicate similarity | perceptual hash distance to other photos in the same listing | Near-duplicate photos waste gallery slots | Crops and filters change the hash, so use an embedding distance as a second check
noise: File size | Depends on compression settings and the upload client and says nothing about the scene
noise: Camera brand | Irrelevant to the room or its quality once exposure and blur are measured
noise: Upload time | Reflects when the agent worked, not the room or the image
base: Agent-ordered gallery with blur thresholds, because portals do this.
prod: A multi-task vision model for room class and quality with ordering rules and privacy blur.
pipe: Image upload @ portal ; Preprocessor @ resize and hash ; Room and quality model @ vision model on GPU ; Privacy blur @ detector ; Gallery orderer @ rules ; Agent feedback @ app ; Label feedback @ lakehouse
edge: Floor plans in the gallery | A floor plan in the gallery is classed as a room photo | Add a floor-plan class and route it to the plan viewer
edge: Night shots | Night shots are dark but valid and are scored as poor quality | Condition the quality score on the scene type so legitimate night photos are not penalised
edge: Regional room names | a den, lounge or study is labelled as a bedroom | Map local room vocabulary to a fixed room taxonomy and monitor per-region accuracy
off: Room accuracy ; Quality rank correlation
on: Listing engagement ; Agent reshoot rate
gap: Training mostly on professional photos hides failures on the phone pictures that most agents upload ; Quality labels from a few raters are noisy and cap how well the model can do

== virtual-staging-and-photo-enhancement | Virtual Staging & Photo Enhancement | computer-vision | seconds | production-grade | a=0.1 k=3000
obj: Furnish empty rooms and enhance photos with generative models, clearly labelled, to help buyers imagine the space.
loss: \mathcal{L}=\mathcal{L}_{\text{recon}}+\lambda\,\mathcal{L}_{\text{perceptual}}+\mu\,\mathcal{L}_{\text{adv}}
con: Every staged image carries a visible label and the original is always one click away ; Walls, windows, fixtures and views are never altered ; Disclosure text shown to buyers wherever the image appears ; Written seller consent recorded before any edit
sn: Honesty | Furniture added only inside the existing geometry with structure preserved | Edits that move walls, enlarge windows or improve views | A misleading image is a misrepresentation and a legal risk, however attractive it looks
sn: Fidelity | Geometry-preserving edits driven by depth and edge maps | Free-form generation from a text prompt | Free generation invents a room that no longer matches reality, and buyers feel misled at the viewing
sn: Labelling | A visible staged label stamped on the image itself | Edits recorded only in metadata | Metadata is stripped by portals, so a hidden edit reaches buyers unlabelled
sig: Structure preservation | edge-map similarity between the original and staged image outside the furniture mask | A direct test that walls, windows and openings did not change | Mask the furniture region, otherwise added furniture lowers the score
sig: Lighting consistency | angle between the dominant shadow direction in the room and on the added furniture | Mismatched shadows make the image look fake | Estimate light from fixed features, because windows and lamps vary
sig: Style fit | style classifier score against the chosen target style such as modern or traditional | Consistent style helps buyers imagine the space | Taste differs by market, so validate with local raters
sig: Disclosure flag | presence of the visible label detected in the final image | Compliance can be checked automatically and not left to people | Test on images after portal resizing and cropping
noise: Prompt wording | Changes output from run to run without a link to image honesty or appeal
noise: Seed | Random variation between renders that should not drive a decision
noise: Render time | Reflects server load, not the quality of the image
base: Manual staging by a service, because it is the current practice.
prod: Controlled diffusion with depth and edge conditioning, an automated structure check and a staged label.
pipe: Photo upload @ portal ; Depth and edge extraction @ vision model ; Staging generator @ conditioned diffusion ; Structure checker @ similarity ; Label stamper @ image service ; Agent approval @ app ; Audit log @ store
edge: Wrong scale furniture | Furniture generated at the wrong scale makes the room look unreal or misleading | Derive scale from the depth map and reject images where furniture sizes are implausible
edge: Reflective surfaces | Mirrors and glass produce artefacts in the generated image | Mask reflective surfaces and leave them unedited
edge: Multiple styles | Different rooms in one listing get inconsistent furniture styles | Lock one style across all rooms in the listing
off: Structure similarity ; Human realism ratings
on: Listing views ; Buyer complaints about staging
gap: Evaluating only on easy, simple rooms hides failures in cluttered or oddly shaped ones ; Taste differs by market, so raters from one region approve images that buyers elsewhere dislike

== listing-description-generation-with-fair-housing-checks | Listing Description Generation with Fair-Housing Checks | llm-agents,nlp | seconds | production-grade | a=0.1 k=15 s=3 t=400
obj: Draft accurate listing descriptions from structured facts and photos and block language that could breach fair-housing rules.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Every factual claim must come from the verified property record and nowhere else ; Phrases that could steer buyers by protected characteristics are blocked and logged ; A licensed agent approves each description before it is published ; Rule sets are applied per jurisdiction and versioned with the law
sn: Facts | A description assembled from verified fields in the record | Features the model thinks are likely for this kind of home | A false pool, view or school claim is a legal issue and a broken promise to a buyer
sn: Compliance | A classifier for steering and discriminatory phrasing, backed by phrase lists | General style or toxicity filters | Subtle steering, such as describing who would fit a neighbourhood, passes ordinary filters and breaches fair-housing rules
sn: Tone | Plain, accurate language with measured claims | Superlatives and hype | Hype triggers complaints and regulator attention, and it erodes trust in the listing
sig: Fact match rate | share of claims in the description that equal a field in the record | The direct measure of invented content | Match on meaning and not on string, because the same fact is worded many ways
sig: Prohibited phrase score | classifier probability that a sentence steers by a protected characteristic | Catches coded language that phrase lists miss | Needs labelled examples from complaints and must be reviewed by counsel
sig: Agent edit rate | share of generated words that the agent changed before publishing | A quality signal from the people who know the property | Edits reflect habit as well as quality, so read it by agent
sig: Coverage | share of the record's key features such as beds, parking and outdoor space that appear | Completeness of the description | Depends on what the agent considers key, so weight by market
noise: Length | A style choice that does not indicate accuracy or compliance
noise: Emoji count | Style preference of the portal and not a quality signal
noise: Neighbourhood adjectives | Words such as quiet, exclusive or family-friendly are subjective and the main route to steering
base: Agent-written text from a template, because it is how listings are made.
prod: Structured-to-text generation, a fact verifier and a fair-housing classifier before agent review.
pipe: Listing facts @ listing system ; Photo tags @ vision model ; Description drafter @ LLM ; Fact verifier @ rules ; Fair-housing checker @ classifier ; Agent review @ editor ; Publish @ portal
edge: Missing facts | The property record is sparse and the model fills the gaps with invented features | Ask the agent for missing facts and refuse to describe features that are not in the record
edge: Local terms | Fair-housing rules and terms differ by jurisdiction and a phrase is fine in one place and not another | Apply jurisdiction-specific rule sets and update them with the law
edge: Coded language | Coded language and euphemisms steer buyers without using banned words | Keep updated phrase lists, use a classifier for steering and add examples from complaints
off: Fact accuracy ; Prohibited phrase recall
on: Listing quality ; Complaints
gap: Training on past listings copies the biased language those listings contain ; Rules and enforcement change, so a checker that passed last year can fail now

== home-search-ranking | Home Search Ranking | recommender,tabular | sub-100ms | production-grade | a=15 k=6
obj: Rank homes for a buyer's search by the likelihood of engagement and fit, balancing relevance, freshness and seller fairness.
loss: \mathcal{L}=\mathrm{ListNet}(s,y)+\lambda\,\mathrm{BPR}(\hat{y},y)
con: Under 80 ms at the 99th percentile including retrieval and re-rank ; Every filter the buyer sets is respected exactly and never traded for relevance ; No steering by protected attributes or their proxies in features or exposure ; New listings appear in results within one minute
sn: Intent | Session intent built from filters, saves and shares | Clicks alone | Clicks reward photo quality and not fit, so a model of clicks learns to show pretty homes that do not match
sn: Fit | A hard match on price, bedrooms and location before any scoring | A soft score that trades fit against engagement | A home outside the buyer's budget wastes the result slot and annoys the buyer
sn: Fairness | Exposure rules that give comparable listings comparable visibility | Pure engagement maximisation | Engagement data carries the bias of past behaviour, and optimising it can embed steering
sig: Price fit | position of the price within the buyer's stated range, scaled from 0 to 1 | The main relevance factor for most buyers | The range changes during a search, so use the current one
sig: Saved and shared | saves and shares of this listing by buyers with similar filters in the last 7 days | A strong interest signal | Sparse for new listings, so smooth with a prior
sig: Listing freshness | hours since the listing went live, passed through a decay function | New homes sell quickly and buyers want them first | Decay too steeply and a good older home disappears
sig: Commute fit | travel time from the home to the buyer's saved workplace at rush hour | Commute is a hard constraint for many buyers | Routing data is expensive, so precompute for common destinations
noise: Photo count | Reflects portal and agent habits and not suitability for the buyer
noise: Listing agent | Has no bearing on what the buyer wants and invites bias in exposure
noise: Time on page alone | Confounded by distraction and device, and a long visit can mean confusion
base: Sort by newest with filters, because portals start this way.
prod: Two-stage retrieval and learning-to-rank on session context with exposure constraints and a freshness boost.
pipe: Query and filters @ search API ; Candidate retrieval @ geo and filter index ; Feature service @ Redis ; Ranker @ gradient boosting ranker ; Fairness re-rank @ constraint rules ; Results @ API ; Click log @ Kafka
edge: Cold start buyer | A new buyer has no history so ranking has little to personalise on | Fall back to popularity within the buyer's filters and refine after the first few actions
edge: Hot listing | A listing appears at the top for everyone and crowds out others | Add diversity constraints and cap exposure per listing
edge: Broad search | A broad search returns thousands of homes and the ranker cannot tell the intent | Cluster the session intent from early actions and diversify the first results
off: NDCG@10 ; Calibration of CTR
on: Saves and enquiries per session ; Time to first enquiry
gap: Position bias in click logs means top results look better than they are ; Offline replay cannot reproduce how buyers would respond to a different ranking

== property-recommendation-for-cold-start-buyers | Property Recommendation for Cold-Start Buyers | recommender | seconds | production-grade | a=2 k=10
obj: Recommend homes to new buyers from a few early actions or a short questionnaire and refine as signals arrive.
loss: \mathcal{L}=\mathrm{InfoNCE}(u,i)+\lambda\,\mathrm{BPR}(\hat{y},y)
con: Usable recommendations after three actions or a short questionnaire ; No inference of sensitive attributes from behaviour ; Every recommendation shows a plain reason ; The buyer can opt out and clear their profile at any time
sn: Cold start | Content features of the home and explicit stated preferences | Collaborative filtering from other buyers | A new buyer has no history, so similarity to other buyers is empty
sn: Exploration | A deliberate share of diverse options early on | Showing only the closest matches to the first clicks | Early exploitation locks in a taste inferred from curiosity and never lets the buyer find out what they want
sn: Stage | The buyer's journey stage, from browsing to touring | A single fixed profile | Needs change over weeks, and last month's preferences mislead this week
sig: Questionnaire answers | budget range, bedrooms and preferred area one-hot encoded | The only direct statement of preference a new buyer provides | Self-report is imprecise, so treat it as a prior and not a rule
sig: Early views | embedding of the first three viewed homes averaged with decaying weights | Reveals taste not captured by a questionnaire | Curiosity clicks are noisy, so weight saves above views
sig: Item embedding | vector from home attributes, images and text trained on engagement | Allows similarity without any user history | Needs retraining as the market changes
sig: Lookalike buyers | similarity of early action sequences to established buyers' early sequences | Borrows information from similar journeys | Sparse in the first sessions, so use it with a small weight
noise: Device | Mostly a proxy for income and not a preference for a property
noise: Referrer | Weakly related to what the buyer wants once their actions are known
noise: Time of day | Reflects the buyer's schedule, not their taste
base: Popular homes in the searched area, because it is safe.
prod: Two-tower model with content features, bandit exploration and reasons for each recommendation.
pipe: Session start @ app ; Preference capture @ questionnaire ; Item embeddings @ batch ; User tower @ online encoder ; ANN retrieval @ vector index ; Bandit re-ranker @ contextual bandit ; Feedback @ stream
edge: Misleading early clicks | Early clicks driven by curiosity mislead the profile | Decay the weight of early actions and weight saves and enquiries above views
edge: Shared accounts | A couple or family shares an account with different tastes | Split the session into several preference profiles and let the user switch
edge: Budget change | The buyer's budget changes and old preferences keep dominating | Update the profile when filters change and decay older signals faster after a budget change
off: Hit rate@20 ; Coverage
on: Enquiry rate for new users ; Return visits
gap: Historical logs are dominated by popular homes so offline scores favour popularity ; New users behave differently from established ones, so a test on old users overstates cold-start quality

== floor-plan-extraction-from-images | Floor-Plan Extraction from Images | computer-vision | seconds | production-grade | a=0.05 k=1500
obj: Convert floor-plan images into structured rooms, dimensions and layouts for search, valuation and 3D tours.
loss: \mathcal{L}=\mathcal{L}_{\text{seg}}+\lambda\,\mathcal{L}_{\text{CTC}}
con: Total area within 3 percent of the stated area on supported plans ; Every extracted room carries a label and a confidence ; Both metric and imperial dimensions read correctly ; Low-confidence plans go to a human correction tool and not to publication
sn: Geometry | Walls, doors and rooms extracted as closed vector polygons | Pixel masks alone | Search, valuation and 3D tours need vectors with dimensions, not a picture of walls
sn: Scale | Scale recovered from printed dimension text or a known reference | An assumed fixed scale | One wrong scale multiplies every area, and the error is invisible until it is compared with the stated area
sn: Variety | Training across many drawing styles, scanners and languages | A single template style | A model trained on clean architectural plans fails on agent-drawn and photographed plans
sig: Wall segmentation | intersection-over-union of the predicted wall mask against labelled plans | The base of the geometry | Clutter such as furniture symbols and hatching confuses the mask, so evaluate per drawing style
sig: Dimension OCR | recognised numbers and units next to walls, converted to metres | Gives the scale for the whole plan | A misread digit changes the scale by ten, so validate against the stated area
sig: Room label OCR | recognised room names mapped to a fixed room taxonomy | Adds meaning to the geometry | Names are in many languages and abbreviations, so normalise by locale
sig: Area consistency | sum of room areas divided by the stated total area | A cheap check that catches both OCR and geometry errors | Stated totals include or exclude walls and balconies, so allow for the convention
noise: Colour | A style choice of the drawing that does not change the layout
noise: Watermark | Overlaid text that the model should ignore and not read as a label
noise: Compass | Orientation marks carry no geometry or area information
base: Manual tracing by operators, because it is accurate and slow.
prod: Segmentation with OCR and a vectoriser, plus consistency checks and a human correction tool.
pipe: Image upload @ portal ; Preprocessor @ normaliser ; Wall and room model @ segmentation model ; OCR @ text recognition ; Vectoriser @ geometry ; Validator @ rules ; Correction tool @ web
edge: Hand-drawn plans | Hand-drawn plans are irregular and the wall detector fails | Detect low-confidence geometry and send the plan to the correction tool
edge: Multi-floor sheets | A sheet holds several floors and they are merged into one | Detect the floor titles, split the sheet and extract each floor separately
edge: Missing dimensions | A plan has no dimension text so the scale cannot be recovered | Ask the agent for one known dimension and mark areas as estimated until then
off: Room IoU ; Area error
on: Manual tracing hours saved ; 3D tour conversion
gap: Training on clean CAD exports hides failures on the hand-drawn and scanned plans that most listings contain ; Template leakage when the same architect's drawings appear in both training and test

== duplicate-listing-detection-across-portals | Duplicate Listing Detection Across Portals | graph,computer-vision | batch | production-grade | a=1 k=50
obj: Identify the same property listed by several agents and portals so search shows one entry and statistics count it once.
loss: \mathcal{L}=\mathrm{Contrastive}(z_i,z_j)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: A false merge is treated as worse than a missed duplicate ; Every merged listing keeps links to its source portals ; Runs daily across all feeds in a fixed window ; Each match comes with the evidence that supports it
sn: Identity | Property identity from normalised address, geocode and image evidence | Text similarity of descriptions | Agents rewrite descriptions for each portal, so the same home reads very differently
sn: Merge | A conservative merge that needs agreement of several independent signals | An aggressive merge on a single strong signal | A wrong merge hides a real listing from buyers, which costs the seller a sale
sn: Unit | Identity at the level of the individual unit | Building-level identity | Apartments in one building share an address and photos of the lobby but are different homes
sig: Address match | normalised and geocoded address equality with unit number retained | The strongest single identity signal | Formats differ between portals, so normalise before comparing
sig: Image hash similarity | smallest perceptual-hash distance between any pair of photos across two listings | The same photos are reused across portals | Re-edited and cropped images change the hash, so back it with an embedding match
sig: Price and size agreement | relative difference in asking price and in floor area against a tolerance | Supports an identity match | Prices change between portals within days, so use a tolerance not equality
sig: Agent relation | whether the two listings come from the same broker or agency | Same-agent duplicates are the most common case | Data on agency relationships is incomplete
noise: Listing ID | An arbitrary key assigned by each portal that cannot match across portals
noise: Description order | Sentence order varies with templates and has no bearing on identity
noise: Photo count | Differs between portals because of upload limits and not between homes
base: Exact match on normalised address and price, because it is simple.
prod: Blocking, pairwise matching with address, image and attribute features, and graph clustering with merge constraints.
pipe: Listing feeds @ portal ingestion ; Blocking @ geo and address keys ; Pair features @ similarity functions ; Match model @ gradient boosting ; Cluster builder @ graph components ; Merge review @ steward UI ; Canonical store @ database
edge: Two units same address | Several apartments share one address and are merged into one listing | Include the unit number and floor in the identity key and merge only on unit-level evidence
edge: Re-listed property | A property is withdrawn and re-listed some weeks later and is treated as new | Apply time rules for linking re-listings to the earlier record
edge: Agent errors | An agent types the wrong address and the listing is matched to a different property | Check the address against geocoding and image evidence before merging
off: Pair F1 ; Cluster purity
on: Duplicate rate in search ; Complaints
gap: Labelled pairs are easy cases chosen by reviewers, so the test overstates accuracy on hard pairs ; The same agents and addresses in train and test leak identity information

== buyer-lead-scoring-and-routing | Buyer Lead Scoring & Routing | tabular | sub-100ms | production-grade | a=0.5 k=8
obj: Score portal enquiries by likelihood to transact and route them to the agent best placed to convert them quickly.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Scoring and routing finish within 80 ms of the enquiry ; Leads are distributed fairly among agents and teams within stated rules ; No protected attributes or proxies in scoring or routing ; Buyers who opt out of contact are never routed
sn: Intent | Behavioural intent such as repeated viewings of similar homes and a saved search | Form fields the buyer chose to fill in | Forms are optional, and the people who fill them are not the ones most likely to buy
sn: Match | Agent fit by area expertise, price band and language | Round-robin assignment | A better-matched agent converts more leads, and round robin ignores that difference entirely
sn: Timing | Speed of first response measured in minutes | Lead quality alone | The first agent to respond wins many deals, so a good lead routed slowly is lost
sig: Viewing depth | number of distinct listings viewed and the share viewed more than once in 7 days | Repeat viewing of similar homes signals real intent | Bots inflate views, so filter them before computing
sig: Finance readiness | pre-approval flag and stated budget relative to the viewed prices | A pre-approved buyer is far more likely to transact | Self-reported readiness is unreliable, so prefer a verified flag
sig: Agent response time | median minutes from enquiry to first contact over the last 30 days | Predicts whether a lead gets a fast reply | Agents can game it by sending empty acknowledgements
sig: Area expertise | the agent's closed sales in the lead's search area over 24 months | Matches buyer need to agent experience | Sparse for new agents, so shrink towards the team average
noise: Name | Irrelevant to intent and a direct route to bias
noise: Email domain | Mostly a proxy for employer or income and not for intent to buy
noise: Device | A proxy for income and age that adds no information about readiness
base: Round-robin routing, because it is simple and fair.
prod: Gradient boosting on intent and readiness with an assignment optimiser balancing fit and fairness.
pipe: Enquiry intake @ portal ; Bot filter @ rules ; Lead scoring @ boosting ; Agent matching @ optimiser ; Notification @ push ; CRM sync @ CRM ; Outcome feed @ warehouse
edge: Bot enquiries | Bots send fake enquiries that waste agent time and distort the model | Filter by bot signals and exclude them from training labels
edge: Multiple enquiries | The same buyer sends several enquiries and is counted as many leads | Merge enquiries by person identifier and score the merged lead
edge: Agent unavailable | The best-fit agent is unavailable and the lead waits | Fall back to the next-best available agent and cap the waiting time
off: PR-AUC ; Calibration
on: Lead-to-viewing rate ; Time to first contact
gap: Outcomes are observed only for leads that were contacted, so the model cannot learn from the rest ; Agent quality confounds results, since a strong agent converts weak leads and flatters the score

== tenant-screening-and-affordability-assessment | Tenant Screening & Affordability Assessment | tabular,nlp | seconds | production-grade | a=0.05 k=40
obj: Assess whether a rental applicant can afford a unit and is likely to pay and care for it, using verified income and history, in a fair and explainable way.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{EqualisedOdds}(\hat{p})
con: Complies with fair-housing and credit-reporting law in each jurisdiction ; Every decline or adverse action comes with specific, accurate reasons ; No protected attributes or close proxies in features ; Applicants can see their data, dispute it and have a human re-review
sn: Affordability | Verified income compared with rent and other commitments | A credit score on its own | A thin file belongs to many reliable tenants, and a score alone rejects them
sn: Fairness | Error rates monitored for each protected group | Overall accuracy | A model that is accurate on average can still reject one group at a much higher rate, which breaches fair-housing law
sn: Evidence | Documents verified against an independent source | Self-reported income and employment | Forged payslips are common, and an unverified figure is the weakest evidence
sig: Rent-to-income ratio | monthly rent divided by verified monthly gross income | The core affordability measure that landlords and regulators accept | Only count income verified from a payroll or bank source
sig: Rental payment history | months of on-time rent payments from reporting agencies or landlord references | Direct evidence of the behaviour being predicted | Reporting is patchy, so absence is not evidence of a problem
sig: Income stability | months in the current role and income variance over 12 months | Stable income predicts steady payment | Gig and seasonal work look unstable without being risky, so model them separately
sig: Document authenticity | forensic score for edits, template reuse and metadata mismatches | Catches forged payslips and statements | False alarms reject honest applicants, so route flagged files to a person
noise: Name | A protected characteristic in many places and no predictor of payment
noise: Postcode of origin | A proxy for race and income that breaches fair-housing rules
noise: Social media | Unreliable, unverifiable and intrusive, and it invites discrimination
base: Income at least three times the rent plus a credit threshold, because landlords use it.
prod: Calibrated model with verified-income features, fairness constraints, reasons and a human review for borderline cases.
pipe: Application intake @ portal ; Document verifier @ OCR and checks ; Feature builder @ rules ; Risk model @ monotone boosting ; Fairness monitor @ audit ; Landlord decision @ workflow ; Dispute handling @ case tool
edge: No credit history | An applicant with no credit history, such as a recent arrival, is scored as high risk | Accept alternative evidence such as rent history and employer letters and route to human review
edge: Housing subsidy | A housing voucher or subsidy changes how income and rent are counted | Apply programme-specific affordability rules instead of the standard ratio
edge: Document forgery | A forged or edited payslip passes a text-only check | Run forensic checks on the document and verify income with the payroll provider
off: AUC ; Group error rates
on: Delinquency rate ; Approval equity
gap: Outcomes are seen only for applicants who were accepted, so the model never learns about the rejected ones ; Proxy features that look neutral reproduce group differences in the data

== rent-delinquency-prediction | Rent Delinquency Prediction | tabular,time-series | batch | production-grade | a=1 k=3
obj: Predict which tenants will miss rent in the next month so property managers can reach out early with payment plans.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Outreach is supportive and offers help, never a threat ; No eviction or legal decision is taken from a score ; Each score shows the factors behind it ; Refreshed weekly so managers act before the due date
sn: Early | Signals that appear before the due date, such as payment-page visits and a drift in timing | The late-payment flag itself | By the time rent is late the manager has lost the chance to offer a plan
sn: Cause | Signs of distress such as a job change, a rent increase and an open dispute | Past lateness alone | A first-time problem has no history, and lateness alone misses new trouble
sn: Action | Payment plans and referrals that help the tenant | Scores used to punish | Tenants who feel watched stop engaging, and the programme loses the trust it needs to work
sig: Payment timing drift | change in days between the due date and payment over the last 4 months | A growing lag is the earliest sign of stress | Autopay hides it, so analyse autopay tenants through a different signal
sig: Portal activity | visits to the payment page without a payment in the 10 days before the due date | Shows intent and difficulty | Noisy, and depends on how often tenants log in
sig: Rent burden change | percentage rent increase minus any change in verified income | A sharp rise in burden predicts missed rent | Income data are often missing, so mark unknown explicitly
sig: Maintenance disputes | count of open maintenance complaints older than 14 days | Tenants withhold rent over unresolved repairs | Logging is inconsistent, so use only closed-loop ticket data
noise: Unit number | An arbitrary label that can proxy for building quality or floor
noise: Name | Irrelevant to payment behaviour and a route to bias
noise: Lease start day | Weakly tied to payment dates and not to difficulty paying
base: Late fees history flag, because managers already use it.
prod: Gradient boosting on timing, burden and engagement with calibrated risk and a care workflow.
pipe: Ledger and portal data @ property system ; Feature builder @ Spark ; Delinquency model @ boosting ; Care list @ rules ; Outreach tool @ comms ; Outcome feed @ warehouse ; Monitor @ dashboard
edge: Payday timing | Tenants are paid on different cycles and look late against a common due date | Use each tenant's pay cycle when computing timing features
edge: Rent assistance pending | A payment is delayed while a rent assistance application is processed | Flag pending assistance and move the case to a support path
edge: Dispute | A tenant withholds rent over an unresolved repair and looks like a payment risk | Detect open disputes and move the case to a dispute path instead of a delinquency path
off: PR-AUC ; Calibration
on: Rent collected on time ; Payment plans accepted
gap: Outreach changes outcomes, so a tenant helped by a plan looks like a false alarm ; Autopay hides risk until a card fails, which distorts the timing signal

== lease-renewal-and-churn-prediction | Lease Renewal & Tenant Churn Prediction | tabular | batch | production-grade | a=0.2 k=5
obj: Predict which tenants will renew so managers can set renewal offers that keep good tenants without leaving rent on the table.
loss: \mathcal{L}=\mathrm{BCE}(\hat{p},y)+\lambda\,\mathrm{ECE}(\hat{p})
con: Renewal offers follow every local rent-control and notice rule ; Offers are consistent and fair between comparable tenants ; The decision is made 120 days before expiry to leave room to react ; Each recommendation shows the factors behind it
sn: Price | The renewal rent compared with the current market rent for the unit | The absolute rent amount | Tenants judge an offer against what else is available, not against their old rent
sn: Experience | How the tenant was served, measured by repair times and complaints | The lease terms | Unresolved complaints predict leaving far better than the contract does
sn: Cost | The full cost of turnover including cleaning, marketing and lost rent | Vacancy days alone | Turnover costs more than the empty days, so a small discount can be cheaper than a vacancy
sig: Renewal rent gap | proposed renewal rent minus the market rent for a similar unit | A tenant paying above market is likely to move | Market rent estimates are noisy, so use a range
sig: Maintenance resolution time | median days to close a request in the last 12 months | A slow service experience drives churn | Logging gaps understate delays, so use ticket close dates
sig: Tenure | months in the unit, bucketed into cohorts | Longer tenants are more likely to stay | Strongly tied to age and life stage, so check for unfairness
sig: Life events | moves in the job address, a change in household size or an inquiry about a purchase | Triggers for leaving that predict churn | Data are partial and consent-based, so use only data the tenant has agreed to share
noise: Unit floor | A weak and unstable relation to renewal once price and service are known
noise: Name | Irrelevant and a route to bias
noise: Lease signing weekday | Reflects the manager's schedule and says nothing about intent
base: Historic renewal rate by building, because managers use it.
prod: Gradient boosting with price-gap and service features, plus an offer optimiser trading rent against churn.
pipe: Lease and service data @ property system ; Market rent feed @ rent model ; Renewal model @ boosting ; Offer optimiser @ solver ; Manager console @ app ; Offer log @ CRM ; Outcome feed @ warehouse
edge: Rent control | Rent-control rules cap the increase and the offer would exceed the legal limit | Apply the cap as a hard constraint in the offer optimiser
edge: Building works | Building works disrupt tenants and raise churn for a period | Add a works flag and offer concessions to affected tenants
edge: Roommate change | A roommate change alters the lease and the renewal history | Track the lease holders and treat a roommate change as its own event
off: PR-AUC ; Calibration
on: Renewal rate ; Net effective rent
gap: Past offers were not random, so renewals reflect the offer chosen and not the tenant ; Seasonality in leases confuses year-to-year comparison

== maintenance-request-triage-and-dispatch | Maintenance Request Triage & Dispatch | nlp,tabular | seconds | production-grade | a=0.3 k=20
obj: Classify tenant maintenance requests by urgency and trade and dispatch the right technician with the right parts.
loss: \mathcal{L}=\mathrm{CE}(\hat{y},y)+\lambda\,\mathrm{OrdinalCE}(\hat{u},u)
con: Emergencies receive a technician or a response within 1 hour ; Safety and habitability cases always escalate to a person ; Tenants get status updates at each step ; Every decision and dispatch is logged for audit
sn: Urgency | Safety and habitability triggers such as gas, flooding and loss of heat | The tone of the message | Calm messages can describe a flood, and angry ones a dripping tap
sn: Trade | The correct trade and the parts likely needed | A free-text category chosen by the tenant | A wrong trade wastes a visit, and a missing part wastes another
sn: Photo | Images that clarify what is wrong and how bad it is | Text description alone | Photos often change both urgency and trade, such as a stain that is mould not damp
sig: Safety phrases | presence of terms such as gas smell, flooding, no heating or sparks in the text | Triggers urgent escalation | Terms vary by language and dialect, so test on local phrasing
sig: Image classifier | probability that the photo shows a leak, mould, broken glass or electrical damage | Adds evidence the text omits | Photo quality varies, so require a confidence margin
sig: Asset history | number and type of repairs on the unit and the equipment in the last 24 months | Repeated faults point to root causes | Records are incomplete for older buildings
sig: Weather | temperature and rain forecast at the building on the day | Cold snaps and storms cause bursts of related requests | Forecasts are uncertain, so use it as context and not as a rule
noise: Tenant name | Irrelevant to urgency or trade
noise: Request length | A style that depends on the tenant and not on the severity
noise: Time sent | Weakly related to urgency, and urgent problems occur at all hours
base: Staff triage by phone, because it is the current process.
prod: Multimodal classifier for urgency and trade with parts prediction and a dispatch optimiser.
pipe: Request intake @ app and phone ; Text and image classifier @ multimodal model ; Urgency rules @ rules ; Parts predictor @ boosting ; Dispatcher @ optimiser ; Tenant update @ comms ; Outcome log @ warehouse
edge: Emergency after hours | An emergency arrives after hours when nobody reads the queue | Route urgent categories to the on-call technician and page them automatically
edge: Vague request | A request has too little detail to choose a trade or urgency | Ask the tenant a short follow-up question and request a photo before dispatch
edge: Repeat issue | The same problem is reported again after a repair | Link the request to the earlier ticket and escalate the root cause
off: Urgency recall ; Trade accuracy
on: First-visit fix rate ; Emergency response time
gap: Labels come from staff habits and may reflect past dispatch practice and not need ; Missing photos for some requests make the evaluation optimistic about the multimodal model

== predictive-maintenance-for-building-equipment | Predictive Maintenance for Building Equipment | time-series | batch | production-grade | a=24 k=1
obj: Predict failures of building equipment such as chillers, boilers and lifts from sensor data so repairs happen before breakdowns.
loss: \mathcal{L}=\mathrm{FL}(\hat{p},y)+\lambda\,\mathrm{Huber}(\hat{t}-t)
con: Alerts raised with at least 7 days of lead time ; Safety-critical equipment such as lifts and fire pumps takes priority ; Each alert shows the sensors and trend behind it ; Work scheduled inside agreed maintenance windows
sn: Lead | Early warning with enough lead time to schedule a repair | Detection at or after failure | A late alert cannot prevent the breakdown and only confirms it
sn: Context | Operating mode, load and outside temperature | Fixed raw thresholds | Normal behaviour at full load or in summer looks like a fault to a fixed limit
sn: Cost | The cost of false alarms and unnecessary callouts | Recall alone | Every callout costs money and technician time, so a model with many false alarms is ignored
sig: Vibration trend | slope of RMS vibration over the last 14 days | Bearings and rotors show wear as rising vibration | Sensors loosen and drift, so calibrate per sensor
sig: Efficiency drift | rise in kilowatts per ton of cooling or per unit of heat at similar load | Degradation shows up as a loss of efficiency | Weather changes the baseline, so normalise by load and temperature
sig: Runtime hours | hours since the last service | A simple, reliable age measure | Logging gaps and meter replacements reset the counter
sig: Fault codes | count of controller alarm codes by type in the last 7 days | Controllers see problems before technicians do | Alarms are noisy, so count only the codes linked to failures
noise: Equipment name | A label that differs by site and does not predict failure
noise: Installer | Weakly related to wear once the model and age are known
noise: Building colour | No physical link to equipment condition
base: Calendar-based maintenance and alarm thresholds, because it is typical.
prod: Remaining-useful-life and anomaly models per equipment class with context features and a work-order integration.
pipe: Sensor stream @ BMS gateway ; Feature builder @ Flink ; Health model @ time-series model ; Alert ranker @ rules ; Work orders @ CMMS ; Technician app @ mobile ; Outcome log @ lakehouse
edge: Sensor drift | Sensor readings drift over time and normal behaviour looks like a fault | Calibrate against reference readings and monitor per-sensor baselines
edge: Mode change | Equipment changes from summer to winter mode and readings shift | Add mode features and per-mode baselines
edge: Few failures | Equipment fails rarely so there are few labelled failures | Transfer from similar equipment classes and combine with anomaly scores
off: Lead-time recall ; False alarm rate
on: Unplanned downtime ; Maintenance cost
gap: Maintenance resets the history, so a repaired machine looks as though it had no problem ; Few failures in the data make any evaluation unstable

== dynamic-rent-pricing-for-multifamily | Dynamic Rent Pricing for Multifamily | reinforcement-learning,time-series | batch | staff-principal | a=0.3 k=10
obj: Set daily asking rents by unit type to maximise revenue subject to occupancy and fairness rules.
loss: \max_\pi\;\mathbb{E}\!\left[\sum_t\gamma^t\left(\text{rent}_t\,\text{occ}_t-\lambda\,\text{vacancy}_t\right)\right]
con: Rent-control and regulatory limits are hard constraints ; No exchange or use of non-public competitor data ; Daily price changes capped within a stated range ; Managers can see why each rent was recommended
sn: Demand | Lease-up pace and enquiry volume by unit type | The asking rent alone | Price is only one lever, and a quiet week may be from marketing and not from price
sn: Competition | Rents published on public listings | Competitor data shared privately between operators | Shared private data raises antitrust issues, and the model can be accused of collusion
sn: Horizon | Lease expiries spread evenly across the year | Optimising today's rent only | If many leases expire in one month, the building faces a vacancy spike that today's price hides
sig: Inquiry velocity | enquiries per day for the unit type over 7 days divided by the 28-day mean | Shows rising or falling demand before leases signed | Noise from marketing campaigns, so adjust for ad spend
sig: Occupancy vs target | current occupancy minus the target occupancy for the date | Tells the policy how hard to push price | Occupancy definitions differ between systems, so use one definition
sig: Competitor asking rents | median public asking rent of comparable units within 1 km | Sets the position in the market | Asking prices differ from signed rents, so apply a historical discount
sig: Expiry schedule | number of leases expiring per month over the next 12 months | Shapes future vacancy risk | Early terminations alter the schedule, so refresh it daily
noise: Unit nickname | A label with no bearing on demand
noise: Photo count | Depends on the leasing team's habits and not on the unit
noise: Agent | The leasing agent does not change what the market will pay
base: Manager-set rents reviewed weekly, because it is common.
prod: Demand forecasting plus a constrained pricing policy with exploration inside guardrails.
pipe: Leasing data @ property system ; Competitor listings @ public scrape ; Demand model @ boosting ; Pricing policy @ constrained optimiser ; Guardrails @ rules ; Manager approval @ app ; Outcome log @ warehouse
edge: Rent control | Rent-control law caps rent and the price policy suggests more | Enforce the cap as a hard rule in the pricing policy
edge: New building | A new building is in lease-up with no demand history | Use a lease-up policy with its own targets and priors from similar buildings
edge: Shock event | A shock such as a plant closure cuts demand suddenly | Fall back to a conservative policy and alert the manager when demand drops sharply
off: Revenue lift in simulation ; Demand forecast error
on: Revenue per available unit ; Occupancy
gap: A simulated demand curve is optimistic about how tenants react to price ; Past prices were not set at random, so the effect of price cannot be read from history

== short-term-rental-pricing-and-occupancy | Short-Term Rental Pricing & Occupancy Forecasting | time-series,tabular | batch | production-grade | a=1 k=4
obj: Recommend nightly prices and forecast occupancy for short-term rentals around events and seasons.
loss: \mathcal{L}=\sum_t\mathrm{Pinball}(\hat{q}_{0.5},y_t)+\lambda\,\mathrm{Huber}(\hat{p}-p)
con: Local limits on rental nights are loaded and obeyed ; Host-set minimum prices are never undercut ; Prices refresh daily for the next 365 nights ; Each price change is explained to the host
sn: Calendar | Local events, holidays and school terms known in advance | Day of the week alone | A single concert can double demand for one weekend, and a weekday model never sees it
sn: Booking window | The days remaining before the stay and the pickup so far | A static price for the whole calendar | Late gaps need discounts and early demand allows a premium
sn: Fit | Comparable listings matched by size, location and quality | A city-wide average | A studio and a villa share a city, but not a price
sig: Event calendar | number and size of events within 5 km in the stay window | Events are the biggest driver of short-term demand | Event data are patchy, so combine providers
sig: Booking pace | bookings so far divided by the normal bookings for this lead time | Shows whether the stay date is filling faster than usual | Noisy for new listings, so use a prior
sig: Comparable prices | median nightly price of comparable listings for the same date | Sets the competitive position | Selection bias, since only unsold nights show prices
sig: Review score | average rating over the last 12 months with a minimum count | Quality affects how much a guest will pay | Ratings are inflated, so use relative rank
noise: Host name | No effect on demand
noise: Photo count | Weakly related once quality is measured
noise: Listing title | A style choice that does not change demand
base: Fixed seasonal prices by month, because hosts do this.
prod: Quantile occupancy model with a price optimiser per night and host guardrails.
pipe: Calendar and bookings @ channel manager ; Event feed @ data providers ; Occupancy model @ boosting ; Price optimiser @ solver ; Host controls @ app ; Price push @ channel API ; Outcome log @ warehouse
edge: Local ban | A local ban or cap on short-term nights removes available supply | Load regulation as configuration and cap nights in the occupancy forecast
edge: Event cancelled | A major event is cancelled and the high prices no longer fit demand | Reprice from the event feed as soon as the cancellation is published
edge: New listing | A new listing has no reviews or booking history | Use priors from similar listings and update quickly as bookings arrive
off: Occupancy error ; Revenue vs baseline
on: RevPAR ; Occupancy
gap: Past prices are partly caused by the hosts' own expectations, so demand and price are tangled ; Event noise from one-off festivals produces peaks the model cannot repeat

== tenant-query-assistant | Property Manager Assistant for Tenant Queries | llm-agents,nlp | seconds | production-grade | a=1 k=30 s=4 t=500
obj: Answer tenants' questions about leases, rules, payments and repairs from the manager's documents and systems and escalate what needs a person.
loss: \mathcal{L}=-\sum_t\log p_\theta(y_t\mid y_{<t},x)+\lambda\,\mathrm{BCE}(\hat{p},y)
con: Every answer cites the lease clause or policy it comes from ; No legal advice is given ; Account and payment data are shown only to the verified tenant ; Disputes and complaints are escalated to a person
sn: Source | The tenant's own lease and the building's house rules | The model's general knowledge of tenancy | General rules differ by place and lease, and a wrong rule causes disputes
sn: Identity | Context verified for this tenant and this unit | Open access to any account on request | A leak of another tenant's data is a privacy breach
sn: Scope | Giving information and creating tickets | Making decisions such as waiving fees | Managers decide, and an assistant that promises a waiver creates obligations
sig: Citation validity | share of answers whose cited clause actually supports the statement | The core measure of trustworthy answers | A citation can exist and still not support the claim, so check entailment
sig: Escalation precision | share of escalations that a manager agrees needed a person | Shows whether the assistant escalates the right cases | Over-refusal hurts resolution, so track both
sig: Resolution rate | share of conversations solved without a person and not reopened in 7 days | The value delivered | A resolved flag without a reopening check overstates success
sig: Satisfaction | post-conversation rating | A simple user signal | Rating bias, since unhappy tenants are less likely to rate
noise: Message length | Style of the tenant and not the difficulty of the query
noise: Emoji | A style marker with no link to the right answer
noise: Time sent | Weakly related to the topic or urgency
base: FAQ page and an inbox, because it is the current process.
prod: Retrieval over leases and policies, typed tools for balance and tickets, verifier and escalation.
pipe: Message intake @ app and chat ; Identity resolver @ auth ; Retriever @ hybrid search ; Typed tools @ ledger and tickets ; Answer composer @ LLM ; Verifier @ entailment ; Escalation @ case tool
edge: Legal threat | A tenant writes about a legal dispute and the assistant tries to answer | Detect legal threats and escalate to a manager with no automated reply
edge: Wrong unit | The question concerns a different unit from the one the tenant is verified for | Verify the tenant's unit before reading account data and ask when it is unclear
edge: Injection | A message or document contains an instruction aimed at the assistant | Treat all text as data and limit tools to a typed allow-list
off: Citation validity ; Escalation F1
on: Deflection rate ; Response time
gap: A test set of easy, common questions hides failures on unusual ones ; Lease variants between buildings mean a test on one lease overstates accuracy on others

== move-out-damage-assessment-from-photos | Move-Out Damage Assessment from Photos | computer-vision | seconds | production-grade | a=0.05 k=4000
obj: Compare move-in and move-out photos to identify damage beyond normal wear and estimate repair cost for deposit decisions.
loss: \mathcal{L}=\mathcal{L}_{\text{det}}+\lambda\,\mathrm{Ordinal}(\hat{s},s)
con: A tenant can dispute any deduction with the same evidence the manager sees ; Normal wear is separated from damage using a documented rule ; Move-in and move-out photos are matched by room and view ; A person signs off every deduction before it is applied
sn: Wear | Normal wear separated from damage by age and type | Any change between photos | Deposits cannot cover fair wear and tear, and a model that flags all change overcharges tenants
sn: Alignment | Comparing the same view taken from the same place | Photos from different angles | Misaligned photos show differences that are not real
sn: Cost | A repair cost estimate for the identified damage | A damage flag with no cost | Deductions depend on cost, and a flag alone does not support a figure
sig: Change detection | pixel-level difference between aligned move-in and move-out photos after exposure normalisation | Finds what has changed | Lighting changes look like damage, so normalise first
sig: Damage class | classifier probability for stain, hole, scratch, crack or burn | Gives a type that links to a repair | Rare classes have few examples, so check per class
sig: Age of fixture | years since the fixture, flooring or paint was installed or last renewed | Older items wear more, so the allowance is larger | Records are incomplete, so use building age as a fallback
sig: Repair cost table | local labour and material rates per repair type | Turns a finding into a figure | Rates vary by contractor and season, so use a range
noise: Furniture | Removed or moved between photos and should not be read as damage
noise: Lighting | Varies by time of day and window and should be normalised
noise: Camera | Different phones change colour and sharpness and not the condition
base: Manager walk-through with a checklist, because it is the norm.
prod: Alignment, change detection and damage grading with wear rules, cost estimates and a reviewer.
pipe: Photo capture @ inspection app ; Aligner @ geometry ; Damage detector @ vision model ; Wear rules @ rules ; Cost estimator @ table and boosting ; Reviewer @ web ; Report @ PDF
edge: Different lighting | Different lighting between move-in and move-out photos looks like damage | Normalise exposure and compare structure instead of raw colour
edge: Missing photos | Some rooms are missing from the move-out photos | Request the missing photos and mark those rooms as not assessed
edge: Dispute | The tenant disputes the deduction | Provide the matched photos with the change highlighted and route to a person
off: Detection F1 ; Cost error
on: Disputes ; Deposit return time
gap: Posed photos taken by a careful inspector are cleaner than tenants' own pictures ; Rare damage types give too few test cases to estimate recall
