# Data residency requirements

| Data class | Examples | Where it may be stored | Where it may be processed | May leave the country/region? | Legal basis / contract clause | Approver |
|------------|----------|------------------------|---------------------------|-------------------------------|-------------------------------|----------|
| | | | | no / tokens only / yes with controls | | |

## Questions

- [ ] Which regions, countries or sovereign clouds are permitted for storage? ______
- [ ] Are backups, logs, traces and telemetry covered by the same rule? ______
- [ ] Do the model artifacts or embeddings count as personal data (can they be inverted)? ______
- [ ] Are third-party APIs (LLM providers, geocoders, enrichment) allowed, and under which agreement? ______
- [ ] Which cross-border transfers need a data-processing agreement or standard contractual clauses? ______
- [ ] Is customer-managed encryption (BYOK / HYOK) required, and where do the keys live? ______
- [ ] Retention periods and the deletion proof the auditors expect: ______

## Proof

`egress_denied[]` shows that no path exists to regions or services that are not permitted; `dns[]` shows that private endpoints
in the permitted region are the ones that resolve. Attach the storage-location report from the cloud provider.
