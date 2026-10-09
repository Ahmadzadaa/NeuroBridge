environment              = "production"
domain_name              = "app.bizsim.com"
certificate_arn          = "arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/PROD_CF_CERT_ID"
alb_certificate_arn      = "arn:aws:acm:eu-central-1:ACCOUNT_ID:certificate/PROD_ALB_CERT_ID"
aws_region               = "eu-central-1"

db_instance_class        = "db.t4g.medium"
db_allocated_storage     = 100
db_multi_az              = true
db_backup_retention_days = 30

web_cpu                  = 1024
web_memory               = 2048
web_desired_count        = 2
worker_desired_count     = 1

github_oidc_provider_arn = "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
github_repo              = "ORG/bizsimesas"
