bucket         = "bizsim-terraform-state-production"
key            = "production/terraform.tfstate"
region         = "eu-central-1"
dynamodb_table = "bizsim-terraform-locks"
encrypt        = true
