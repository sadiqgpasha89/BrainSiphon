/**
 * Production Deployment Reference Architecture for Google Cloud Platform (GCP): AI/ML Solution
 *
 * Private GKE Cluster with Datapath V2, Cloud SQL for PostgreSQL 16 (pgvector),
 * Cloud Memorystore Redis HA, Cloud Storage (CMEK), and Cloud KMS.
 */

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.30"
    }
  }
}

variable "environment" {
  type        = string
  description = "Target deployment environment (dev, staging, preprod, production)"
  default     = "production"
}

variable "project_id" {
  type        = string
  description = "Google Cloud Project ID"
  default     = "brainsiphon-production"
}

variable "region" {
  type        = string
  description = "GCP deployment region"
  default     = "us-central1"
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# 1. Cloud KMS Keyring and CryptoKey
resource "google_kms_key_ring" "keyring" {
  name     = "${var.environment}-aiml-keyring"
  location = var.region
}

resource "google_kms_crypto_key" "solution_key" {
  name            = "${var.environment}-aiml-crypto-key"
  key_ring        = google_kms_key_ring.keyring.id
  rotation_period = "7776000s" # 90 days

  lifecycle {
    prevent_destroy = true
  }
}

# 2. VPC Network & Private Subnet
resource "google_compute_network" "vpc" {
  name                    = "${var.environment}-aiml-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  name                     = "${var.environment}-aiml-subnet"
  ip_cidr_range            = "10.2.0.0/20"
  region                   = var.region
  network                  = google_compute_network.vpc.id
  private_ip_google_access = true

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.3.0.0/16"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.4.0.0/20"
  }
}

# 3. Private Google Kubernetes Engine (GKE) Cluster
resource "google_container_cluster" "primary" {
  name     = "${var.environment}-aiml-gke-cluster"
  location = var.region

  network    = google_compute_network.vpc.id
  subnetwork = google_compute_subnetwork.subnet.id

  remove_default_node_pool = true
  initial_node_count       = 1

  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  database_encryption {
    state    = "ENCRYPTED"
    key_name = google_kms_crypto_key.solution_key.id
  }
}

resource "google_container_node_pool" "serving_pool" {
  name       = "serving-pool"
  location   = var.region
  cluster    = google_container_cluster.primary.name
  node_count = var.environment == "production" ? 2 : 1 # Per zone (x3 zones)

  autoscaling {
    min_node_count = var.environment == "production" ? 1 : 1
    max_node_count = var.environment == "production" ? 6 : 2
  }

  node_config {
    machine_type = var.environment == "production" ? "c2-standard-16" : "e2-standard-4"
    oauth_scopes = ["https://www.googleapis.com/auth/cloud-platform"]

    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }
  }
}

# 4. Cloud SQL for PostgreSQL 16 (pgvector with Regional High Availability)
resource "google_sql_database_instance" "postgres" {
  name             = "${var.environment}-aiml-postgres"
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    tier              = var.environment == "production" ? "db-custom-8-32768" : "db-f1-micro"
    availability_type = var.environment == "production" ? "REGIONAL" : "ZONAL"

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
    }

    database_flags {
      name  = "cloudsql.enable_pgvector"
      value = "on"
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
    }
  }
}

# 5. Cloud Memorystore for Redis (High Availability)
resource "google_redis_instance" "cache" {
  name           = "${var.environment}-aiml-redis-cache"
  tier           = var.environment == "production" ? "STANDARD_HA" : "BASIC"
  memory_size_gb = var.environment == "production" ? 16 : 2
  region         = var.region

  authorized_network = google_compute_network.vpc.id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"
  redis_version      = "REDIS_7_2"
}

output "gke_cluster_name" {
  value = google_container_cluster.primary.name
}

output "database_connection_name" {
  value = google_sql_database_instance.postgres.connection_name
}

output "redis_host" {
  value = google_redis_instance.cache.host
}

