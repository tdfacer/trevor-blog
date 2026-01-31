variable "aws_region" {
  description = "AWS region for S3 bucket"
  type        = string
  default     = "us-east-1"
}

variable "domain_name" {
  description = "Domain name for the blog"
  type        = string
  default     = "blog.trevorfacer.com"
}

variable "hosted_zone_name" {
  description = "Route53 hosted zone name (parent domain)"
  type        = string
  default     = "trevorfacer.com"
}
