---
title: "AWS ECR"
date: "2022-05-21"
tags: ["tech", "aws", "ecr", "docker"]
category: "aws"
---

[Official Docs](https://docs.aws.amazon.com/AmazonECR/latest/userguide/what-is-ecr.html)

## What is ECR?

An AWS managed container image registry

## Terminology

* `Registry` - Highest logical abstraction in AWS ECR, holds one or more repositories
* `Repository` - Holds Docker images

## Images

### Storage

* Stored in S3 buckets that are managed by ECR

### Tags

* A tag is a label applied to a Docker image in a repository. Tags are how various images in a repository are distinguished from each other.
* See official Docker docs [here](https://docs.docker.com/glossary/#tag)

### Immutability

* One can configure a repository to enable tag immutability to prevent images from being overwritten
* When enabled, an error will occur if you attempt to push an image with the same tag as an existing image
* Immutability can be updated. See the following command:
```
aws ecr put-image-tag-mutability --repository-name name --image-tag-mutability IMMUTABLE --region us-east-1
```

### Encryption

* Images are encrypted by default
* One can optionally provide additional configuration, for example, if encrypting using customer-managed keys was desired

### Building and Pusing Images

* The Amazon ECR repository must exist before you push the image 
* If the `tag` is ommited, the default `latest` tag is used

```
$ docker build -t example/<your_iamge> .
$ docker tag example/<your_iamge> $ACCOUNT_NUMBER.dkr.ecr.$REGION.amazonaws.com/<your_repo>:latest
$ aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_NUMBER.dkr.ecr.$REGION.amazonaws.com
$ docker push $ACCOUNT_NUMBER.dkr.ecr.$REGION.amazonaws.com/<your_repo>:latest
```

### Image Scanning

Amazon ECR image scanning helps in identifying software vulnerabilities in your container images

* `Basic Scanning` - Uses Common Vulnerabilities and Exposures to scan your image
* `Enhanced Scanning` - Uses Amazon Inspector to scan your images

## Pull Through Cache Rules

Supports caching repositories in remote public registries in your private ECR registry
