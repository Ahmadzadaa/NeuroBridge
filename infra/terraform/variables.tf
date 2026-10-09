variable "aws_region" {
  type        = string
  description = "AWS region"
  default     = "eu-central-1"
}

variable "environment" {
  type        = string
  description = "staging or production"
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be staging or production"
  }
}

variable "project_name" {
  type    = string
  default = "bizsim"
}

variable "domain_name" {
  type        = string
  description = "Primary domain (e.g. app.bizsim.com)"
}

variable "certificate_arn" {
  type        = string
  description = "ACM certificate ARN in us-east-1 for CloudFront"
}

variable "alb_certificate_arn" {
  type        = string
  description = "ACM certificate ARN in the deployment region for ALB"
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.medium"
}

variable "db_allocated_storage" {
  type    = number
  default = 50
}

variable "db_multi_az" {
  type    = bool
  default = false
}

variable "db_backup_retention_days" {
  type    = number
  default = 7
}

variable "web_cpu" {
  type    = number
  default = 512
}

variable "web_memory" {
  type    = number
  default = 1024
}

variable "web_desired_count" {
  type    = number
  default = 2
}

variable "worker_cpu" {
  type    = number
  default = 256
}

variable "worker_memory" {
  type    = number
  default = 512
}

variable "worker_desired_count" {
  type    = number
  default = 1
}

variable "app_image_tag" {
  type    = string
  default = "latest"
}

variable "github_oidc_provider_arn" {
  type        = string
  description = "IAM OIDC provider ARN for GitHub Actions"
  default     = ""
}

variable "github_repo" {
  type        = string
  description = "GitHub org/repo for OIDC trust"
  default     = ""
}
