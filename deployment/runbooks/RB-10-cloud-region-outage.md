# Operational Runbook RB-10: Cloud Region Outage & Disaster Recovery Failover

**Runbook Code:** `RB-10-DISASTER-RECOVERY`  
**Severity:** `P1` (Total Cloud Region Outage)  
**Primary Alert:** `RegionAvailabilityZoneDown` OR `CloudProviderGlobalIncident`  
**Target MTTR:** RTO < 15 minutes to switch DNS and failover  
**Accountable Roles:** Principal SRE (Incident Commander), Solution Architect  

---

## 1. Trigger Conditions & Detection
* **Alert Signal:**
  - Health checks across primary AWS/GCP region fail continuously for > 3 minutes.
  - Cloud provider status page confirms multi-AZ outage in primary region (e.g. `us-east-1` or `europe-west1`).

---

## 2. Immediate Failover Execution (< 15 Minutes)

### Step 1: Promote Secondary Standby Database (RPO = 0s)
```bash
# Promote cross-region RDS PostgreSQL / Cloud SQL read replica to primary
aws rds promote-read-replica \
  --db-instance-identifier "brainsiphon-db-standby-us-west-2" \
  --region us-west-2
```

### Step 2: Scale Secondary Kubernetes Cluster
```bash
# Scale standby cluster deployments in secondary region
kubectl config use-context brainsiphon-us-west-2
kubectl scale deployment/inference-service --replicas=25 -n brainsiphon-prod
```

### Step 3: Shift Global DNS Traffic (Route 53 / Cloudflare)
```bash
# Shift global Route 53 weighted record to 100% secondary region
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456789 \
  --change-batch file://deployment/dns/failover-to-secondary.json
```

### Step 4: Verification
Verify endpoint health in secondary region:
```bash
curl -Iv https://api.brainsiphon.internal/v1/health/readiness
```
Confirm scoring latency and error rates hold within SLA targets.

