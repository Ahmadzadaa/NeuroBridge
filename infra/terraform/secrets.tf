resource "aws_secretsmanager_secret" "app" {
  name                    = "${local.name_prefix}/app"
  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = { Name = "${local.name_prefix}-app-secret" }
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id

  secret_string = jsonencode({
    DATABASE_URL            = "postgresql://${aws_db_instance.main.username}:${random_password.db.result}@${aws_db_instance.main.address}:5432/${aws_db_instance.main.db_name}?schema=public&sslmode=require"
    AUTH_SECRET             = random_password.auth.result
    TOTP_ENCRYPTION_KEY     = random_password.totp.result
    NEXT_PUBLIC_APP_URL     = "https://${var.domain_name}"
    SENTRY_ENVIRONMENT      = var.environment
    AWS_REGION              = var.aws_region
    CLOUDWATCH_NAMESPACE    = "BizSim/${title(var.environment)}"
    S3_ASSETS_BUCKET        = aws_s3_bucket.assets.bucket
    S3_BACKUPS_BUCKET       = aws_s3_bucket.backups.bucket
    UPSTASH_REDIS_REST_URL  = "REPLACE_ME"
    UPSTASH_REDIS_REST_TOKEN = "REPLACE_ME"
    STRIPE_SECRET_KEY       = "REPLACE_ME"
    STRIPE_WEBHOOK_SECRET   = "REPLACE_ME"
  })

  lifecycle {
    ignore_changes = [
      secret_string,
    ]
  }
}

resource "random_password" "auth" {
  length  = 48
  special = true
}

resource "random_password" "totp" {
  length  = 48
  special = true
}

resource "aws_secretsmanager_secret" "db" {
  name                    = "${local.name_prefix}/database"
  recovery_window_in_days = var.environment == "production" ? 30 : 0
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id

  secret_string = jsonencode({
    username = aws_db_instance.main.username
    password = random_password.db.result
    host     = aws_db_instance.main.address
    port     = aws_db_instance.main.port
    dbname   = aws_db_instance.main.db_name
  })
}
