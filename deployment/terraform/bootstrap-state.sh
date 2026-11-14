#!/usr/bin/env bash
# Creates the remote-state bucket and lock table ONCE per environment (AWS). Idempotent. Needs AWS credentials with permission to create them.
# Usage: ENV=dev REGION=us-east-1 ./bootstrap-state.sh
set -euo pipefail
ENV="${ENV:?set ENV to dev|staging|preprod|production}"
REGION="${REGION:-us-east-1}"
ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
BUCKET="aiml-tfstate-${ENV}-${ACCOUNT}"
TABLE="aiml-tfstate-locks-${ENV}"

aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null || aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" \
  $([ "$REGION" = "us-east-1" ] || echo "--create-bucket-configuration LocationConstraint=$REGION")
aws s3api put-bucket-versioning --bucket "$BUCKET" --versioning-configuration Status=Enabled
aws s3api put-bucket-encryption --bucket "$BUCKET" --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"aws:kms"},"BucketKeyEnabled":true}]}'
aws s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
aws dynamodb describe-table --table-name "$TABLE" --region "$REGION" >/dev/null 2>&1 || aws dynamodb create-table \
  --table-name "$TABLE" --region "$REGION" --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH --billing-mode PAY_PER_REQUEST --sse-specification Enabled=true
echo "State bucket: $BUCKET   Lock table: $TABLE"
echo "Next: cp terraform/backend.example.hcl terraform/backend.${ENV}.hcl, edit the names above in, then terraform init -backend-config=backend.${ENV}.hcl"
echo "State recovery: bucket versioning is on. List versions with: aws s3api list-object-versions --bucket $BUCKET --prefix aiml-solution/${ENV}/"
