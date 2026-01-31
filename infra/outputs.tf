output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.blog.id
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.blog.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.blog.domain_name
}

output "website_url" {
  description = "Website URL"
  value       = "https://${var.domain_name}"
}

output "deploy_command" {
  description = "Command to deploy the site"
  value       = "S3_BUCKET=${aws_s3_bucket.blog.id} CLOUDFRONT_DISTRIBUTION_ID=${aws_cloudfront_distribution.blog.id} npm run deploy"
}
