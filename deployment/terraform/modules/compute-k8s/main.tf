# Terraform Module: Multi-AZ Kubernetes Compute Cluster (AWS EKS / GKE)
variable "cluster_name" {
  type    = string
  default = "brainsiphon-production-cluster"
}

variable "environment" {
  type    = string
  default = "production"
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

output "cluster_endpoint" {
  value       = "https://k8s.brainsiphon.internal"
  description = "Kubernetes API server endpoint"
}

output "cluster_certificate_authority_data" {
  value       = "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCg=="
  description = "Base64 encoded certificate data"
}

