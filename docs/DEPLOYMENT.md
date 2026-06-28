# BizSim AWS Deployment Guide

## Architecture

```
Internet → CloudFront → ALB → ECS Fargate (web × N)
                              ↘ ECS Fargate (worker)
         Secrets Manager → ECS tasks
         RDS PostgreSQL (private subnets)
         S3 (assets + backups)
         Upstash Redis (external — rate limit, cache, queue)
         Sentry (external — error tracking)
```

| Component | Staging | Production |
|-----------|---------|------------|
| ECS web tasks | 1 × 0.5 vCPU / 1 GB | 2 × 1 vCPU / 2 GB |
| ECS worker | 1 × 0.25 vCPU / 512 MB | 1 × 0.25 vCPU / 512 MB |
| RDS | `db.t4g.small`, single-AZ | `db.t4g.medium`, Multi-AZ |
| Backups | 3-day retention | 30-day retention + S3 lifecycle |
| CloudFront | PriceClass_100 | PriceClass_All |

## Prerequisites

1. AWS account with IAM admin (initial bootstrap only)
2. ACM certificates:
   - **us-east-1** — CloudFront (`certificate_arn`)
   - **Deployment region** — ALB (`alb_certificate_arn`)
3. S3 bucket + DynamoDB table for Terraform state (one-time bootstrap)
4. GitHub OIDC provider + deploy role (created by Terraform when `github_oidc_provider_arn` is set)
5. Upstash Redis, Sentry, Stripe/Payriff credentials

## Bootstrap Terraform State

```bash
aws s3 mb s3://bizsim-terraform-state-staging --region eu-central-1
aws s3 mb s3://bizsim-terraform-state-production --region eu-central-1
aws dynamodb create-table \
  --table-name bizsim-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region eu-central-1
```

## Deploy Infrastructure

### Staging

```bash
cd infra/terraform
terraform init -backend-config=backend.staging.hcl
terraform plan -var-file=environments/staging.tfvars
terraform apply -var-file=environments/staging.tfvars
```

### Production

```bash
terraform init -backend-config=backend.production.hcl -reconfigure
terraform plan -var-file=environments/production.tfvars
terraform apply -var-file=environments/production.tfvars
```

Update `environments/*.tfvars` with real ACM ARNs, domain names, and GitHub repo before apply.

## Post-Apply Configuration

1. **Secrets Manager** — Update `bizsim-{env}/app` with real values for Upstash, Stripe, Sentry, and payment providers.
2. **DNS** — Point `domain_name` CNAME to CloudFront (`terraform output cloudfront_domain_name`).
3. **GitHub Secrets** — Set deploy role, ECR repos, ECS cluster/service names, subnets, security groups, CloudFront ID.
4. **RLS** — Migration task runs with `APPLY_RLS=true` on each deploy.

## Docker (Local)

```bash
docker build -t bizsim-web:local .
docker build -f Dockerfile.worker -t bizsim-worker:local .
docker compose up postgres -d
```

## CI/CD

| Workflow | Trigger |
|----------|---------|
| `ci.yml` | PR / push — test, coverage, Terraform validate, Docker build |
| `deploy-staging.yml` | Push to `develop` |
| `deploy-production.yml` | Tag `v*.*.*` or manual with confirmation |

See [PRODUCTION_AUDIT_REPORT.md](./PRODUCTION_AUDIT_REPORT.md) for full readiness assessment.
