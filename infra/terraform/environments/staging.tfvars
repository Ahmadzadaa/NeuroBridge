environment              = "staging"
domain_name              = "staging.bizsim.com"
certificate_arn          = "arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/STAGING_CF_CERT_ID"
alb_certificate_arn      = "arn:aws:acm:eu-central-1:ACCOUNT_ID:certificate/STAGING_ALB_CERT_ID"
aws_region               = "eu-central-1"

db_instance_class        = "db.t4g.small"
db_allocated_storage     = 20
db_multi_az              = false
db_backup_retention_days = 3

web_cpu                  = 512
web_memory               = 1024
web_desired_count        = 1
worker_desired_count     = 1

github_oidc_provider_arn = "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
github_repo              = "ORG/bizsimesas"
