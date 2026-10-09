output "environment" {
  value = var.environment
}

output "vpc_id" {
  value = aws_vpc.main.id
}

output "alb_dns_name" {
  value = aws_lb.main.dns_name
}

output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.main.domain_name
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.main.id
}

output "ecr_web_repository_url" {
  value = aws_ecr_repository.web.repository_url
}

output "ecr_worker_repository_url" {
  value = aws_ecr_repository.worker.repository_url
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "ecs_web_service_name" {
  value = aws_ecs_service.web.name
}

output "ecs_worker_service_name" {
  value = aws_ecs_service.worker.name
}

output "ecs_migrate_task_definition_arn" {
  value = aws_ecs_task_definition.migrate.arn
}

output "rds_endpoint" {
  value     = aws_db_instance.main.address
  sensitive = true
}

output "app_secret_arn" {
  value = aws_secretsmanager_secret.app.arn
}

output "s3_assets_bucket" {
  value = aws_s3_bucket.assets.bucket
}

output "s3_backups_bucket" {
  value = aws_s3_bucket.backups.bucket
}

output "github_deploy_role_arn" {
  value = try(aws_iam_role.github_deploy[0].arn, "")
}
