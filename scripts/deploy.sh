#!/bin/bash
set -e

# Configuration
BUCKET_NAME="${S3_BUCKET:-blog.trevorfacer.com}"
CLOUDFRONT_DIST="${CLOUDFRONT_DISTRIBUTION_ID:-}"

echo "Building site..."
npm run build

echo "Deploying to S3..."
aws s3 sync ./dist "s3://${BUCKET_NAME}" \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "*.html" \
  --exclude "*.xml" \
  --exclude "*.txt"

# HTML and other frequently changing files get shorter cache
aws s3 sync ./dist "s3://${BUCKET_NAME}" \
  --delete \
  --cache-control "public, max-age=3600" \
  --include "*.html" \
  --include "*.xml" \
  --include "*.txt"

# Invalidate CloudFront cache if distribution ID is set
if [ -n "$CLOUDFRONT_DIST" ]; then
  echo "Invalidating CloudFront cache..."
  aws cloudfront create-invalidation \
    --distribution-id "$CLOUDFRONT_DIST" \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text
fi

echo "Deployment complete!"
echo "Site: https://${BUCKET_NAME}"
