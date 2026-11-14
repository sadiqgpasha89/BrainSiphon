# Kafka / event-stream access

| Item | Value |
|------|-------|
| Platform (Apache Kafka, Confluent, MSK, Event Hubs Kafka API, Redpanda, other) | |
| Bootstrap servers | |
| Security protocol (PLAINTEXT / SSL / SASL_SSL) and SASL mechanism (PLAIN, SCRAM, OAUTHBEARER, GSSAPI) | |
| Schema registry URL, auth and compatibility mode | |
| Client principal and ACLs required | |
| **Advertised listeners** the brokers hand to clients (each needs DNS and a firewall rule) | |
| Topic naming rules and who creates topics | |
| Partitions, replication factor, retention per topic | |
| Quotas (bytes/s, requests/s) for our principal | |
| Consumer group naming and offset-reset policy | |

| Topic | Direction | Key | Value schema | Partitions | Retention | ACL needed |
|-------|-----------|-----|--------------|-----------:|-----------|------------|
| | produce / consume | | | | | DESCRIBE, READ / WRITE |

## Proof

`kafka[]` speaks the Kafka wire protocol directly: broker identity, topic metadata, leader election, and a reachability test of
**every advertised listener**. The commonest failure is a bootstrap address that works while the address the broker advertises does not.
