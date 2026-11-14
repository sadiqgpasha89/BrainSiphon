# Automated valuation: implementation by market

MLS integrations, property identifiers, licensing and comparable-sale rules differ substantially by country and market. The FDE implements a **market pack**: a configuration of identifiers, licence terms and comparable rules, and the data access that goes with it. Three starter packs are in `market_packs/` (`us-reso`, `uk-land-registry`, `in-state-registry`); copy the closest one per market.

## 1. System map (corrected)

| Role | System | Interface | Core? |
|------|--------|-----------|-------|
| Source | **MLS / listing and sales data** (licensed) | RESO Web API (`reso-webapi` adapter); in other markets a registry or portal feed | Core |
| Source | **Property registry, cadastre, assessor** (parcel, owner of record, land use, tax assessment, zoning) | File or API per jurisdiction | Core |
| Source | **Deed and transaction records** (sale price, date, parties) | Registry feed | Core |
| Source | Geospatial, zoning, flood and photo data | Files, APIs | Core for the model |
| Target | **Appraisal review and challenge workflow** | REST | Core |
| Target | **Underwriting and collateral-management** system (lenders) | REST or batch | Core for financial institutions |
| Target | Listing portals and agent tools | REST, with attribution | Where licensed |
| Target | Portfolio and analyst reporting | Warehouse, with licence-aware access | Core |
| Optional | **Building-management and IoT condition data** | BACnet/Modbus gateways via an IoT platform | Optional condition feature only: it is **not** a core valuation input |
| Optional | CRM and property-management systems | REST | Optional |
| Not a default destination | Maintenance work-order system | | Only for a separate building-maintenance use case, never as the AVM's downstream |

## 2. Getting MLS data (US pattern; adapt per market)

1. Apply to the MLS (or its aggregator) as a data licensee for **automated valuation**. State the use, the volumes and the audience of the output.
2. Sign the licence. Record: permitted uses (`valuation`, `model_training`), the **fields** each use may store, display rules and attribution text, whether outputs may be redistributed, retention period, audit rights.
3. Obtain RESO Web API credentials and the replication limits (page size, rate limit, whether `ModificationTimestamp` replication is allowed and how far back).
4. Confirm whether **closed sales** may train a model, for how long they may be stored, and what happens at licence end (purge).
5. Name the MLS compliance contact; agree the audit and takedown process.
6. Configure `licence.Licence` from the pack: the code then refuses any use, field or audience the licence does not cover and records every access (`audit`). `purge_due` lists records past the retention period.

## 3. RESO Web API mapping (`reso.py`)

The adapter replicates `Property` with `$filter=ModificationTimestamp gt <since> and (StandardStatus eq 'Closed')`, `$select` limited to the licensed fields, `$orderby` and `@odata.nextLink` paging. The RESO Data Dictionary mapping (`FIELD_MAP`) turns `ListingKey`, `ClosePrice`, `CloseDate`, `LivingArea`, `BedroomsTotal`, `BathroomsTotalInteger`, `YearBuilt`, `PropertyType/SubType`, `UnparsedAddress`, `Latitude/Longitude`, `ParcelNumber`, `ModificationTimestamp` into the canonical record, converts square metres to square feet, and flags closed listings without a price or date. Every MLS adds local fields and its own enumerations: map them in the pack; keep unmapped values visible.

## 4. Identity of a property

- **Address normalisation** (`address.normalise`): case, punctuation, suffix and directional standardisation, the unit separated wherever it appears, ZIP/postcode extracted.
- **Parcel identification** (`address.parcel_id`): the format is a market (and often county) setting; invalid parcel ids are reported.
- **Duplicate listings** (`address.resolve_duplicates`): the same property relisted, or fed from two sources, is one property with several listings; two closed sales of the same property within 30 days at nearly the same price are probable duplicates of one transaction.
- **Property-unit relationships** (`unit_relationships`): a building and its units; a unit's other units are natural comparables.
- **Cross-source id map**: property, transaction, listing, ownership and comparable-sale identifiers each have their own id; keep one canonical `property_id` with a mapping table to each source and a review queue for unresolved matches.

## 5. Comparable selection, adjustment and presentation (`comps.py`)

- **Eligibility**: same property type and subtype, within the market's distance and recency limits (`comparables` block of the pack).
- **Ranking**: `similarity` is a weighted score a reviewer can read (distance 30%, recency 25%, size 25%, bedrooms 10%, age 10%).
- **Adjustment**: size at the local price per square foot, bedrooms, age. Guardrails: **gross adjustments over 25% or net over 15% make a comparable unusable** (flagged, not silently used); at least three usable comparables are required or the value is withheld.
- **Presentation**: the human reviewer sees each comparable, its similarity, distance, sale date, each adjustment, and the adjusted price.
- **Confidence and escalation** (`confidence`): the range across comparables, the number of usable comparables and the gap to the ML value give a score and a route: **automated** (high), **analyst review** (medium), **human appraiser** (low or no value). Low confidence is never shown as a falsely precise value.

## 6. Residential versus commercial

Residential AVM models single-family and condominium homes. **Commercial valuation** (office, retail, multifamily, industrial) needs income, rent, occupancy and a capitalisation rate: `commercial.py` checks the required data per type, refuses to value when it is missing, and shows the direct-capitalisation arithmetic (NOI over cap rate, with a vacancy floor). Treat it as a separate pipeline with its own model, data, validation and reviewers.

## 7. Appraisal review, challenge, underwriting and collateral

`workflow.Valuation` routes by confidence, requires a licensed appraiser for low-confidence and challenged valuations, requires a reason when a reviewer moves the value by more than 5%, and records every step. A **challenge** (lender, borrower or broker) needs a reason and evidence. `underwriting_payload` sends only a **final** valuation, with the value, range, confidence, model version, reviewer and attribution: **never the licensed listing data**.

## 8. Who sees what

`access.py`: broker (value, range, comparable summary), appraiser (everything including comparables and adjustments), portfolio manager (value and portfolio view), analyst (comparables and model explanation), underwriter (value, confidence, summary, challenge), borrower (value range only). Licensed comparables never go to roles that may not receive them; external publication requires redistribution rights and carries the attribution.

## 9. Validation by geography and property type

Report error by market, price band, property type and thin-market flag (median absolute percentage error, share within 10% of the sale price); a market with few sales has its range widened and its confidence lowered, and a market the model has not been validated in is **not served automatically**.
Check the protected-attribute and proxy rules for the jurisdiction (the blueprint's constraint): no use of protected attributes or their proxies, with the neighbourhood-level analysis the regulator expects.
