# Alarm Correlation & Root-Cause Grouping: how well the starter fits

> Generated from the blueprint `telecom/alarm-correlation-root-cause-grouping` (content last verified 2026-11-07). Numbers marked *modelled* are starting points from a capacity and cost model, not measurements. Fill the blanks, strike what does not apply, and keep the decisions you change.

**Engine:** `graph` (Entity resolution and link clustering) · **Fit:** adaptable · **Problem type:** `graph-analytics`

The `graph` engine implements a neighbouring problem. This use case is `graph-analytics`: the engine supplies reusable parts (data generation with the traps, the evaluation discipline, the tests), and the changes below turn it into this system's starter.

## Traps the synthetic data plants

- Linking everything that shares any value
- Ignoring how rare a shared value is
- Evaluating on clusters the model has seen
- Forgetting that clustering is transitive

## What the starter does not do

- It runs on synthetic data. A model that does well here has shown the mechanics work, not that it will do well on yours.
- It is not production code: no serving layer, no auth, no secrets handling.
- Milestones M5 and M6 (serving and rollout) are never supplied by a starter; use the deployment folder and your platform.

## Changes to make before you rely on it

- Replace pair labels (same real-world group) with the use case's own target on nodes, edges or clusters, and its evaluation (for example cluster purity against analyst groupings)
- Replace shared-attribute blocking with the graph the use case really has (transactions, accounts, hosts, services) and its construction rules
- Keep the transitivity test, the hub and cluster-size checks and the split that separates groups
- Score "Alarm reduction ratio at a fixed grouping purity" and "Root cause in top three" instead of the kit metrics
- Replace the synthetic data (Records, shared attributes, hubs, groups and clusters) with data of the shape this use case has; rename every column and keep the generator's trap tests
- Replace the kit's models with the blueprint's: A graph model over the topology with temporal attention on alarm sequences, producing incident grou…

## Dimension by dimension

| Dimension | This use case needs | The engine provides | Status | Change |
|---|---|---|---|---|
| problem | Graph analytics and clustering: Group the alarms raised by one underlying fault across a multi-vendor network and rank the likely root element, so the NOC works one incident instead of thousands of ala… | Entity resolution and record linkage | adapt | The kit implements entity resolution and record linkage; this use case is graph analytics and clustering. Only the reusable parts carry over (see the modifications) |
| label | Structure in a graph: clusters, communities, paths or node risk | A pair of records is positive when both belong to the same hidden true cluster; clusters are connected components over the pairs the model links | adapt | Define the label this use case really has before writing any code; the kit label does not describe it |
| validation | Split that keeps connected structure together, judged against analyst or expert groupings | Group-separated split with blocking and transitivity tests and a check on the largest cluster | adapt | Use the validation method named here, not the kit split, which is built for the kit label |
| metrics | Alarm reduction ratio at a fixed grouping purity; Root cause in top three; Misgrouping rate on confirmed incidents | Pair precision and recall, with the size of the largest cluster | adapt | Score "Alarm reduction ratio at a fixed grouping purity" and "Root cause in top three" instead of the kit metrics |
| data | A graph of entities and relationships | Records with shared attributes (names, devices, addresses) that link them into groups | adapt | Replace the synthetic data (Records, shared attributes, hubs, groups and clusters) with data of the shape this use case has; rename every column and keep the generator's trap tests |
| model | Baseline: Rule-based correlation on parent and child dependencies and a fixed time window, because it is the incumbent…. Production: A graph model over the topology with temporal attention on alarm sequences, producing incident groups and a r… | Rarity-weighted pair features with a pair classifier, clustered by connected components | adapt | Replace the kit's models with the blueprint's: A graph model over the topology with temporal attention on alarm sequences, producing incident grou… |
| serving | Interactive response in seconds (p99 2500 ms) | Offline scripts only: no incremental linking service or merge workflow | outside-kit | Milestone M5 is yours: nothing in the kit serves traffic |
| integrations | Alarm normalisation (stream processor); Topology graph build (graph store); Candidate grouping (temporal graph model); Engineer feedback (review console) | None. Runs locally on synthetic records | outside-kit | Connect these on your own platform in M5 and M6; the kit connects to nothing |
