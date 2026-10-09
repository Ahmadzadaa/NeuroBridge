bucket         = "bizsim-terraform-state-staging"
key            = "staging/terraform.tfstate"
region         = "eu-central-1"
dynamodb_table = "bizsim-terraform-locks"
encrypt        = true
