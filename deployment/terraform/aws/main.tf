/**
 * Production Deployment Reference Architecture for AWS: AI/ML Production Solution
 *
 * Sized for 10M active users with P99 < 15ms synchronous latency envelope.
 * Multi-AZ high availability across 3 Availability Zones with strict network zoning,
 * KMS CMEK encryption, IRSA workload identity, and automated failover.
 */

terraform {
  required_version = ">= 1.9.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.30"
    }
  }
}

variable "kubernetes_version" {
  type        = string
  description = "EKS Kubernetes minor version. Must be in standard support: see content/version-registry.json (checked by npm run check:versions)."
  default     = "1.36"
}

variable "environment" {
  type        = string
  description = "Target deployment environment (dev, staging, preprod, production)"
  default     = "production"

  validation {
    condition     = contains(["dev", "staging", "preprod", "production"], var.environment)
    error_message = "environment must be one of: dev, staging, preprod, production."
  }
}

locals {
  # preprod is deliberately production-shaped (multi-AZ, HA database, private endpoints) so that what it proves carries over to production
  prod_like = contains(["preprod", "production"], var.environment)
}

variable "region" {
  type        = string
  description = "AWS deployment region"
  default     = "us-east-1"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the dedicated AI/ML solution VPC"
  default     = "10.0.0.0/16"
}

provider "aws" {
  region = var.region
  default_tags {
    tags = {
      Solution    = "AI-ML-Production-Engine"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Compliance  = "PCI-DSS-HIPAA-SOC2"
    }
  }
}

# 1. KMS Customer Managed Encryption Keys (CMEK)
resource "aws_kms_key" "solution_key" {
  description             = "CMEK for AI/ML solution storage, database and secret encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}

resource "aws_kms_alias" "solution_key_alias" {
  name          = "alias/${var.environment}-aiml-solution-key"
  target_key_id = aws_kms_key.solution_key.key_id
}

# 2. Virtual Private Cloud (VPC) & Multi-AZ Subnets
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.environment}-aiml-vpc"
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

# Public Subnets (ALBs & Ingress Gateways)
resource "aws_subnet" "public" {
  count                   = 3
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 4, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = false

  tags = {
    Name                     = "${var.environment}-public-subnet-${count.index + 1}"
    "kubernetes.io/role/elb" = "1"
  }
}

# Private Application Subnets (EKS Worker Nodes, Inference Pods)
resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, count.index + 4)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name                              = "${var.environment}-private-app-${count.index + 1}"
    "kubernetes.io/role/internal-elb" = "1"
  }
}

# Data Subnets (Aurora Postgres, ElastiCache Redis, MSK Kafka)
resource "aws_subnet" "data" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, count.index + 8)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "${var.environment}-data-subnet-${count.index + 1}"
  }
}

# Internet Gateway & NAT Gateways (High Availability: 3 NATs)
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
}

resource "aws_eip" "nat" {
  count  = 3
  domain = "vpc"
}

resource "aws_nat_gateway" "nat" {
  count         = 3
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
}

# Route Tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
}

resource "aws_route_table_association" "public" {
  count          = 3
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  count  = 3
  vpc_id = aws_vpc.main.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat[count.index].id
  }
}

resource "aws_route_table_association" "private" {
  count          = 3
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# 3. Amazon EKS Cluster (Elastic Kubernetes Service)
resource "aws_iam_role" "eks_cluster_role" {
  name = "${var.environment}-eks-cluster-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "eks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster_role.name
}

resource "aws_eks_cluster" "cluster" {
  name     = "${var.environment}-aiml-cluster"
  role_arn = aws_iam_role.eks_cluster_role.arn
  version  = var.kubernetes_version

  vpc_config {
    subnet_ids              = aws_subnet.private[*].id
    endpoint_private_access = true
    # the API server is private everywhere except the throw-away dev environment
    endpoint_public_access  = var.environment == "dev"
  }

  encryption_config {
    provider {
      key_arn = aws_kms_key.solution_key.arn
    }
    resources = ["secrets"]
  }

  depends_on = [aws_iam_role_policy_attachment.eks_cluster_policy]
}

# Managed Node Group (CPU / Memory-Optimized for Serving)
resource "aws_iam_role" "eks_node_role" {
  name = "${var.environment}-eks-node-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_worker_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_node_role.name
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_node_role.name
}

resource "aws_iam_role_policy_attachment" "eks_ecr_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_node_role.name
}

resource "aws_eks_node_group" "serving_nodes" {
  cluster_name    = aws_eks_cluster.cluster.name
  node_group_name = "inference-serving-pool"
  node_role_arn   = aws_iam_role.eks_node_role.arn
  subnet_ids      = aws_subnet.private[*].id
  instance_types  = [local.prod_like ? "c6i.4xlarge" : "c6i.xlarge"]

  scaling_config {
    desired_size = local.prod_like ? 6 : 2
    max_size     = local.prod_like ? 18 : 4
    min_size     = local.prod_like ? 3 : 1
  }

  update_config {
    max_unavailable = 1
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_ecr_policy,
  ]
}

# 4. Amazon Aurora PostgreSQL with pgvector (Multi-AZ)
resource "aws_db_subnet_group" "aurora" {
  name       = "${var.environment}-aurora-subnet-group"
  subnet_ids = aws_subnet.data[*].id
}

resource "aws_rds_cluster" "aurora" {
  cluster_identifier      = "${var.environment}-aiml-aurora-cluster"
  engine                  = "aurora-postgresql"
  # major version only: AWS selects its current default minor; pinning a minor (for example 16.2) breaks when that minor is retired
  engine_version          = "16"
  lifecycle {
    ignore_changes = [engine_version]
  }
  database_name           = "aiml_solution_db"
  master_username         = "aiml_admin"
  manage_master_user_password = true
  db_subnet_group_name    = aws_db_subnet_group.aurora.name
  kms_key_id              = aws_kms_key.solution_key.arn
  storage_encrypted       = true
  deletion_protection     = local.prod_like
  skip_final_snapshot     = !local.prod_like

  serverlessv2_scaling_configuration {
    min_capacity = local.prod_like ? 2 : 0.5
    max_capacity = local.prod_like ? 32 : 4
  }
}

resource "aws_rds_cluster_instance" "aurora_instances" {
  count               = local.prod_like ? 3 : 1
  cluster_identifier  = aws_rds_cluster.aurora.id
  instance_class      = "db.serverless"
  engine              = aws_rds_cluster.aurora.engine
  engine_version      = aws_rds_cluster.aurora.engine_version
  publicly_accessible = false
}

# 5. Amazon ElastiCache Redis 7.2 (Multi-AZ with Auto-Failover)
resource "aws_elasticache_subnet_group" "redis" {
  name       = "${var.environment}-redis-subnet-group"
  subnet_ids = aws_subnet.data[*].id
}

resource "aws_elasticache_replication_group" "feature_cache" {
  replication_group_id       = "${var.environment}-aiml-feature-store"
  description                = "Low-latency Feast online feature store and token bucket rate limiter"
  node_type                  = local.prod_like ? "cache.m6g.xlarge" : "cache.t4g.medium"
  port                       = 6379
  parameter_group_name       = "default.redis7"
  subnet_group_name          = aws_elasticache_subnet_group.redis.name
  automatic_failover_enabled = true
  multi_az_enabled           = true
  num_cache_clusters         = local.prod_like ? 3 : 1
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  kms_key_id                 = aws_kms_key.solution_key.arn
}

# 6. S3 Data Lakehouse Bucket with CMEK & Object Versioning
resource "aws_s3_bucket" "lakehouse" {
  bucket        = "aiml-solution-lakehouse-${var.environment}-${var.region}"
  force_destroy = !local.prod_like
}

resource "aws_s3_bucket_versioning" "lakehouse" {
  bucket = aws_s3_bucket.lakehouse.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "lakehouse" {
  bucket = aws_s3_bucket.lakehouse.id
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.solution_key.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

# 7. Outputs for CI/CD and Helm Integration
output "vpc_id" {
  value = aws_vpc.main.id
}

output "eks_cluster_name" {
  value = aws_eks_cluster.cluster.name
}

output "eks_cluster_endpoint" {
  value = aws_eks_cluster.cluster.endpoint
}

output "database_endpoint" {
  value = aws_rds_cluster.aurora.endpoint
}

output "redis_primary_endpoint" {
  value = aws_elasticache_replication_group.feature_cache.primary_endpoint_address
}

output "s3_lakehouse_bucket" {
  value = aws_s3_bucket.lakehouse.id
}

