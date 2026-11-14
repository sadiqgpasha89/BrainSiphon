terraform {
  required_version = ">= 1.9.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket         = "brainsiphon-terraform-state-prod"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "brainsiphon-terraform-locks"
  }
}

provider "aws" {
  region = "us-east-1"
  default_tags {
    tags = {
      Project     = "BrainSiphon"
      Environment = "production"
      ManagedBy   = "Terraform"
    }
  }
}

