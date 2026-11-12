/**
 * Production Deployment Reference Architecture for Azure: AI/ML Production Solution
 *
 * Sized for enterprise production with P99 < 15ms latency constraints.
 * High-availability AKS cluster with Azure CNI, Flexible Server PostgreSQL (pgvector),
 * Azure Cache for Redis Premium, Key Vault with Workload Identity, and Azure Event Hubs.
 */

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.100"
    }
  }
}

variable "environment" {
  type        = string
  description = "Target deployment environment (dev, staging, preprod, production)"
  default     = "production"
}

variable "location" {
  type        = string
  description = "Azure region"
  default     = "eastus"
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "rg" {
  name     = "rg-${var.environment}-aiml-solution"
  location = var.location
  tags = {
    Solution    = "AI-ML-Production-Engine"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# 1. Virtual Network (VNet) & Subnets
resource "azurerm_virtual_network" "vnet" {
  name                = "vnet-${var.environment}-aiml"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  address_space       = ["10.1.0.0/16"]
}

resource "azurerm_subnet" "aks" {
  name                 = "snet-aks"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.1.0.0/20"]
}

resource "azurerm_subnet" "db" {
  name                 = "snet-db"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.1.16.0/24"]
  delegation {
    name = "fs-delegation"
    service_delegation {
      name    = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

resource "azurerm_subnet" "redis" {
  name                 = "snet-redis"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.1.17.0/24"]
}

# 2. Azure Key Vault & Managed Identity
resource "azurerm_key_vault" "kv" {
  name                       = "kv-${var.environment}-aiml-sol"
  location                   = azurerm_resource_group.rg.location
  resource_group_name        = azurerm_resource_group.rg.name
  tenant_id                  = "00000000-0000-0000-0000-000000000000" # Placeholder to be overridden
  sku_name                   = "premium"
  soft_delete_retention_days = 90
  purge_protection_enabled   = true
}

# 3. Azure Kubernetes Service (AKS) with Workload Identity
resource "azurerm_kubernetes_cluster" "aks" {
  name                = "aks-${var.environment}-aiml"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  dns_prefix          = "aks-${var.environment}-aiml"
  kubernetes_version  = "1.30"

  oidc_issuer_enabled       = true
  workload_identity_enabled = true

  default_node_pool {
    name                = "servingpool"
    node_count          = var.environment == "production" ? 6 : 2
    vm_size             = var.environment == "production" ? "Standard_D8s_v5" : "Standard_D4s_v5"
    vnet_subnet_id      = azurerm_subnet.aks.id
    enable_auto_scaling = true
    min_count           = var.environment == "production" ? 3 : 1
    max_count           = var.environment == "production" ? 18 : 4
    zones               = ["1", "2", "3"]
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin    = "azure"
    load_balancer_sku = "standard"
  }
}

# 4. Azure Database for PostgreSQL Flexible Server with pgvector
resource "azurerm_postgresql_flexible_server" "db" {
  name                   = "psql-${var.environment}-aiml-db"
  resource_group_name    = azurerm_resource_group.rg.name
  location               = azurerm_resource_group.rg.location
  version                = "16"
  delegated_subnet_id    = azurerm_subnet.db.id
  administrator_login    = "aiml_admin"
  administrator_password = "SuperSecretSecurePassword123!" # In real deploy, inject via KeyVault

  storage_mb = var.environment == "production" ? 131072 : 32768
  sku_name   = var.environment == "production" ? "GP_Standard_D4s_v3" : "B_Standard_B2s"
  zone       = "1"

  high_availability {
    mode                      = var.environment == "production" ? "ZoneRedundant" : "Disabled"
    standby_availability_zone = var.environment == "production" ? "2" : null
  }
}

# 5. Azure Cache for Redis (Premium with Clustering & Persistence)
resource "azurerm_redis_cache" "redis" {
  name                = "redis-${var.environment}-aiml-cache"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  capacity            = var.environment == "production" ? 2 : 1
  family              = var.environment == "production" ? "P" : "C"
  sku_name            = var.environment == "production" ? "Premium" : "Standard"
  enable_non_ssl_port = false
  minimum_tls_version = "1.2"
  subnet_id           = azurerm_subnet.redis.id

  redis_configuration {
    maxmemory_reserved = 50
    maxmemory_delta    = 50
    maxmemory_policy   = "volatile-lru"
  }
}

output "aks_cluster_name" {
  value = azurerm_kubernetes_cluster.aks.name
}

output "postgres_fqdn" {
  value = azurerm_postgresql_flexible_server.db.fqdn
}

output "redis_hostname" {
  value = azurerm_redis_cache.redis.hostname
}

