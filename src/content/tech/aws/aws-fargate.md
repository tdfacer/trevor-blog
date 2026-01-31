---
title: "AWS Fargate"
date: "2022-05-21"
tags: ["tech", "aws", "fargate"]
category: "aws"
---

## What is Fargate?

[Official Docs](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html)

### Key Ideas

* Allows one to run containers in AWS without managing servers/instances
  * No provisioning/scaling/configuring clusters (aside from ECS Fargate config)
* Runs Amazon Linux 2

## Roles

Two types of roles are used by ECS:

### Task Role

This is the role that the task itself uses. So, for example, if your container needed access to S3 and SQS, a task role would be created with polices attached that grant the desired access

Example:

* Set trusted idnetity/principal to be ECS Tasks:

```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "",
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

* Provide access to necessary resources:

```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowDevSQS",
            "Effect": "Allow",
            "Action": [
                "sqs:GetQueueUrl",
                "sqs:ReceiveMessage",
                "sqs:SendMessage",
                "sqs:ChangeMessageVisibility"
            ],
            "Resource": [
                "arn:aws:sqs:eu-west-1:000000000000:dev-pending-queue",
                "arn:aws:sqs:eu-west-1:000000000000:dev-confirmed-queue"
            ]
        }
    ]
}
```

### Task Execution Role

This is what the ecs agent itself uses. This is where you would attach policies to do things like:

* Pull images from ECR
* Get secrets from SSM Parameter Store

This is the role that the task itself uses. So, for example, if your container needed access to S3 and SQS, a task role would be created with polices attached that grant the desired access

Also see [this](https://blog.ruanbekker.com/blog/2021/07/31/difference-with-ecs-task-and-execution-iam-roles-on-aws/) blog post.

Example:

* Set trusted identity/principal to be ECS:

```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "",
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

* Provide the following policy:

```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ecr:GetAuthorizationToken",
                "ecr:BatchCheckLayerAvailability",
                "ecr:GetDownloadUrlForLayer",
                "ecr:BatchGetImage",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "*"
        },
        {
            "Sid": "SSMGetParameters",
            "Effect": "Allow",
            "Action": [
                "ssm:GetParameter"
            ],
            "Resource": "arn:aws:ssm:eu-west-1:*:parameter/my-service/dev/*"
        },
        {
            "Sid": "KMSDecryptParametersWithKey",
            "Effect": "Allow",
            "Action": [
                "kms:GetPublicKey",
                "kms:Decrypt",
                "kms:GenerateDataKey",
                "kms:DescribeKey"
            ],
            "Resource": "*"
        }
    ]
}
```

## Task Definitions

* Fargate supports a subset of the task definition paramaters available through ECS
* Some paramaters are supported, but have limitations, for example:
  * `volumes` - "Fargate tasks only support bind mount host volumes"

## Network Mode

* Must be set to `awsvpc`, which provides each task with its own ENI

## CPU

* Supports both `ARM` and `X86_64`

| CPU Value    | Memory Value    | Supported OS    |
|---------------- | --------------- | --------------- |
| 256 (.25 vCPU)    | 512 MB, 1 GB, 2 GB | Linux    |
| 512 (.5 vCPU)     | 2 GB, 3 GB, 4 GB | Linux    |
| 1024 (1 vCPU)    | 2 GB, 3 GB, 4 GB, 5 GB, 6 GB, 7 GB, 8 GB | Linux   |
| 2048 (2 vCPU)    | Between 4 GB and 16 GB in 1 GB increments | Linux   |
| 4096 (4 vCPU)   | Between 8 GB and 30 GB in 1 GB increments | Linux   |
