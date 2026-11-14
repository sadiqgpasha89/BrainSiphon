# Remote state with locking and encryption. Copy to backend.<env>.hcl and run:
#   terraform init -backend-config=backend.<env>.hcl
# The bucket, table and key must exist before `init`; create them once with deployment/terraform/bootstrap-state.sh.
# One state per environment and per cloud. Never share state between environments.
bucket         = "CHANGE-ME-tfstate-<env>"      # versioning enabled, SSE-KMS, public access blocked
key            = "aiml-solution/<env>/terraform.tfstate"
region         = "us-east-1"
encrypt        = true
kms_key_id     = "alias/CHANGE-ME-tfstate"
dynamodb_table = "CHANGE-ME-tfstate-locks"      # lock table; on Azure use an azurerm backend, on GCP a gcs backend (both lock natively)
