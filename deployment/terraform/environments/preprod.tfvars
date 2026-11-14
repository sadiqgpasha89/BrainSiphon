# PRE-PRODUCTION: production-shaped (multi-AZ, HA database, same instance classes). Used for load tests, failover and restore drills,
# and the shadow run. Different account/subscription/project and CIDR from production.
environment = "preprod"
region      = "us-east-1"
vpc_cidr    = "10.30.0.0/16"
