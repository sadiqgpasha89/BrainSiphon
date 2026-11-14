# VPC / VNet / VPC-network discovery

| Item | AWS | Azure | GCP | On-prem / Kubernetes |
|------|-----|-------|-----|----------------------|
| Account / subscription / project id | | | | cluster name |
| Region(s) | | | | datacentre |
| Network id and CIDR | VPC | VNet | VPC network | pod and service CIDR |
| Subnets for the workload (private) | | | | node subnets |
| Subnets for data stores | | | | |
| Route tables / next hops to on-prem | TGW / VPN / Direct Connect | VPN / ExpressRoute | Cloud Router / Interconnect | |
| NAT / egress path | NAT gateway | NAT gateway / firewall | Cloud NAT | proxy |
| Private endpoints needed | VPC endpoints / PrivateLink | Private Endpoint | Private Service Connect | |
| Security boundary | Security groups, NACLs | NSGs, Azure Firewall | Firewall rules, VPC-SC | NetworkPolicies, firewall |
| DNS | Route 53 Resolver | Private DNS zones | Cloud DNS | CoreDNS + corporate forwarders |
| Peering / sharing with other networks | | | | |

## Discovery commands (read-only)

```bash
# AWS
aws ec2 describe-vpcs --query 'Vpcs[].{id:VpcId,cidr:CidrBlock,name:Tags[?Key==`Name`]|[0].Value}'
aws ec2 describe-subnets --filters Name=vpc-id,Values=<vpc> --query 'Subnets[].{id:SubnetId,az:AvailabilityZone,cidr:CidrBlock,public:MapPublicIpOnLaunch}'
aws ec2 describe-vpc-endpoints --filters Name=vpc-id,Values=<vpc> --query 'VpcEndpoints[].ServiceName'
# Azure
az network vnet list -o table
az network vnet subnet list --vnet-name <vnet> -g <rg> -o table
az network private-endpoint list -o table
# GCP
gcloud compute networks list
gcloud compute networks subnets list --network <vpc>
gcloud compute firewall-rules list --filter="network:<vpc>" --format="table(name,direction,priority,sourceRanges.list(),allowed[].map().firewall_rule().list())"
# Kubernetes
kubectl get nodes -o wide; kubectl get networkpolicy -A; kubectl cluster-info
```

Record the output in the customer workspace as evidence. Feeds `cloud_access` and `tcp` checks.
