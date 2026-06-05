output "state_bucket_name" {
  description = "S3 bucket name for Terraform remote state."
  value       = aws_s3_bucket.terraform_state.bucket
}

output "aws_region" {
  description = "AWS region containing the remote state resources."
  value       = var.aws_region
}

output "backend_config" {
  description = "Backend settings to copy into infra/app/backend.hcl."
  value = {
    bucket       = aws_s3_bucket.terraform_state.bucket
    key          = "${var.project_name}/app/terraform.tfstate"
    region       = var.aws_region
    encrypt      = true
    use_lockfile = true
  }
}
