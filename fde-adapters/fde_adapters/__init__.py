"""BrainSiphon FDE adapter framework.

A standard way to connect a solution to a customer's systems: every adapter has the same lifecycle (configure, health-check,
read, write), the same error taxonomy, the same retry, timeout and idempotency behaviour, a declarative field mapping, a contract
check, and a mock that speaks the same interface so work can start before the customer grants access.

Standard library only for the core. Optional drivers (psycopg, pyodbc, oracledb, confluent-kafka, pika) are used when installed.
"""
__version__ = "1.0.0"
