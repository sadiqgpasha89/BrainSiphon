# Branch footfall and staffing forecast: integration architecture

## 1. The architecture, corrected

This use case is a **branch operations and workforce-planning** problem. Its primary systems are the ones that count customers and schedule people. Core banking, the general ledger, KYC, market data, FIX/SWIFT and credit bureaus are **not** dependencies: do not request access to them, and remove them from the customer's access list if a generic checklist added them.

| Role | System | Interface | Owner | Needed |
|------|--------|-----------|-------|--------|
| Source | Branch **queue-management system** (tickets, wait times, service times, counter ids) | Scheduled export or REST | Branch operations IT | Core |
| Source | **Footfall counters / sensors** (door counters, camera counting, Wi-Fi) with device health | Vendor export or MQTT/REST | Facilities / branch operations | Core |
| Source | **Appointment system** (booked advisory appointments by hour and skill) | REST or export | Retail banking | Core where appointments exist |
| Source | **Teller transaction volumes** by branch and hour (counts only, no customer data) | Aggregated warehouse extract | Data office | Core |
| Source | **Branch calendar**: opening hours, local holidays, public events, temporary closures, refurbishment schedules | Facilities system or maintained file | Branch operations | Core |
| Source | **HR / roster** data: employees, contracts, skills, availability, absence | HR system API or extract | HR | Core |
| Source and target | **Workforce-management (WFM) / roster scheduling system** | REST (`wfm-roster` adapter) | Workforce planning | Core |
| Target | **Branch-manager approval workflow** | WFM approval or a small approvals service | Branch managers | Core |
| Target | Staffing recommendation and waiting-time reporting; actuals and overrides back to the warehouse | Warehouse tables, dashboard | Data office | Core |
| Optional | Public-event and local-holiday calendars; digital-channel traffic as a leading indicator | Files, APIs | Analytics | Optional |

## 2. Flow

```
queue system + sensors + appointments + tellers + calendar  --(nightly)-->  footfall data quality  -->  hourly forecast (P50, P90)
   -->  staffing requirement (Erlang C)  -->  roster recommendation (labour rules, skills, availability, cost)
   -->  WFM *proposal*  -->  branch manager approves / amends / rejects  -->  WFM publishes  -->  actuals and overrides -> accuracy report
```

Rosters are fixed three weeks ahead, so forecasts are produced 3 to 6 weeks out; the proposal for a given week is created at the roster-build cut-off, not at the last minute.

## 3. Data quality before the forecast (`footfall.py`)

- **Sensor failures**: missing value; zero visitors while the queue system issued tickets; a flat run of identical non-zero values; a count far below the tickets issued (a partly blocked sensor). Closed hours are never flagged.
- **Imputation**: first the healthy hours' visitors-per-ticket ratio times today's tickets; then the same hour last week; otherwise left missing. Imputed hours are **marked**, and the forecast widens its interval there (factor 1.5 and 2.0). Imputed hours are excluded from accuracy reporting.
- **Branch id, location id and time-zone reconciliation**: `BranchMaster` resolves the identifier each system uses (queue `BR-0012`, HR `12`, WFM `LOC_0012`, sensor `SENSOR-12A`, GL cost centre) to one canonical branch id; an alias claimed by two branches stops the load. `local_hour` converts UTC to the branch's clock and flags the **ambiguous hour** when clocks go back (the day has 25 hours) and the missing hour when they go forward.
- **Calendar**: opening hours by weekday, holidays, closures and **refits are excluded from history with a reason**, so a closed day never looks like zero demand.
- **Cold start**: a new or renovated branch borrows an hourly profile from peers of the same format and region with the nearest catchment, scaled by catchment size, and says so.

## 4. From forecast to staffing (`staffing.py`)

- `erlang_c`, `service_level`, `agents_needed`: the smallest number of agents that meets the service target (for example 80% of customers served within 10 minutes) for the forecast arrival rate and the average handling time per service type. Verified against an independent formulation.
- `hourly_requirement`: plan to P50, but to P90 in the peak third of the day where a long queue costs most; never below the safe minimum while open (two people).
- **Labour rules** (`Rules`, `validate_roster`): maximum daily hours, minimum shift length, mandatory break after six hours, minimum rest between shifts, weekly cap with an overtime allowance, maximum consecutive days, employee availability. **Rules are data owned by HR and legal** (`config/labour-rules.json` is a placeholder): put the jurisdiction's statute and the collective agreement into it.
- **Skills**: required skill coverage per hour (`required_skills_ok`), for example one cash-handling teller and one advisor at all times during appointment hours.
- `recommend`: a greedy cover of the hourly requirement with legal shift templates, then assignment of available employees. It reports **every hour it could not cover** and the expected cost of the shortfall: not enough people is stated, never hidden.
- **Cost versus waiting time**: the recommendation reports labour cost and the expected shortfall cost; the business sets the weight in the configuration, and the manager sees both.

## 5. Approval before anything changes (`approval.py`, `wfm.py`)

The recommendation reaches the WFM system as a **proposal** (`POST /shift-proposals`, idempotent by proposal id). It becomes a shift only after the **branch manager** approves it in the roster system, and the connector checks that status itself before it asks the WFM to publish (`apply_if_approved`).
`Proposal` gives the manager a diff (added, removed, changed shifts), the legality result and the expected effect; an illegal roster **cannot be approved**; a rejection needs a reason; an amendment is recorded as an override and must itself be legal. Only the manager of that branch (or a delegated regional manager) can approve.

## 6. Feedback (`reports.py`)

Per branch and hour: WAPE, bias, peak-hour error, P90 coverage and the imputed share, from clean actuals only; the worst three branches by WAPE. Override feedback: how often managers accept, amend or reject, and the top reasons: those reasons are the backlog for the forecast (known local events), the rules and the calendar.

## 7. Discovery questions for the customer

1. Which queue-management product, and does it record counter, service type and abandonment? How long is history kept?
2. How are footfall counters installed and who maintains them? What do they report when they fail?
3. Which WFM/roster product, what is its scheduling-period model, and what does its API expose for proposals and approvals?
4. What are the labour rules by country or state and the collective agreements? Who signs off the rule set?
5. What service-level target does the bank commit to, and for which service types?
6. How are branch ids, location ids and time zones defined in each system? Show the master list.
7. Who approves a schedule change at each branch, and what is the cut-off?
8. Which branches are being renovated or closed in the next two quarters?

## 8. Rollout

Shadow (forecast and proposals produced, nothing sent) for two roster cycles in three pilot branches -> proposals sent to managers, who decide -> measure waiting time and overtime against control branches -> widen by region. Rollback: stop creating proposals; existing approved rosters are unaffected.
