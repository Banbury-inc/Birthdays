output "site_bucket_name" {
  description = "S3 bucket containing built frontend assets."
  value       = aws_s3_bucket.site.bucket
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID for cache invalidations."
  value       = aws_cloudfront_distribution.site.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name."
  value       = aws_cloudfront_distribution.site.domain_name
}

output "site_url" {
  description = "HTTPS URL for the static site."
  value       = "https://${aws_cloudfront_distribution.site.domain_name}"
}

output "database_endpoint" {
  description = "RDS PostgreSQL endpoint."
  value       = aws_db_instance.database.endpoint
}

output "database_address" {
  description = "RDS PostgreSQL hostname."
  value       = aws_db_instance.database.address
}

output "database_port" {
  description = "RDS PostgreSQL port."
  value       = aws_db_instance.database.port
}

output "database_name" {
  description = "Initial PostgreSQL database name."
  value       = aws_db_instance.database.db_name
}

output "database_username" {
  description = "PostgreSQL master username."
  value       = aws_db_instance.database.username
}

output "database_master_user_secret_arn" {
  description = "Secrets Manager ARN containing the AWS-managed database master password."
  value       = aws_db_instance.database.master_user_secret[0].secret_arn
}

output "api_url" {
  description = "Base URL for the protected Birthdays API."
  value       = aws_apigatewayv2_api.api.api_endpoint
}
