# Use existing wildcard certificate (*.trevorfacer.com)
data "aws_acm_certificate" "wildcard" {
  provider = aws.us_east_1
  domain   = "*.trevorfacer.com"
  statuses = ["ISSUED"]
}

# Route53 zone data
data "aws_route53_zone" "main" {
  name         = var.hosted_zone_name
  private_zone = false
}
