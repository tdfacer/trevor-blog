---
title: "AWS IAM"
date: "2022-06-04"
tags: ["tech", "aws", "iam"]
category: "aws"
---

## Terms

* `Principal` - The person or application making the request
* `Identity` - User, group, or role
* `Policy` - An object in AWS that, when associated with an identity or resource, defines their permissions 
* `Resource` - An object in AWS; an instance of a "thing" created in an AWS service
* `Role` - A tool for giving temporary access to AWS resources in your AWS account


## Resource vs. Identity Based Policies

[official docs](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_identity-vs-resource.html)

A policy is an object in AWS that, when associated with an identity or resource, defines their permissions.

### Identity

* Attached to an _IAM user, group or role_
* Specify what that identity can do
* Allow you to specify what actions can be done by a given user
  * Can have _resource-level permissions_, which say what a specified identity can do on a specific resource
* e.g. allow a user to perform EC2 `RunInstances` action

### Resource

* Attached to a _resource_
* Allow you to specify who can access a resource
* e.g. allow public access to an S3 bucket

### Cross-Account

* For an identity to perform actions on a resource in a separate account, the following conditions must be met:
  a. Identity has an _identity-based policy in `Account A`_ that grants permissions to make request to `Account B`
  b. Resource in `Account B` must have a `resource-based` policy allowing requestor from `Account A` to access the resource

#### Confused Deputy Problem

This is an interesting security issue where a third-party that doesn't have permission to perform an action can coerce a more-privileged entity to perform the action. An example is helpful to understand this (summarized from AWS docs). First, we'll identify the parties involved:

* Example Corp: A third-party business partner whom which you intend to grant scoped access to
* Your AWS Account: Your own AWS account
* Bad actor: Another third-party, working with Example Corp, whom which you _do not_ want to grant access

The problem works like this:

1. A role is created with a trust relationship set betwen your account and Example Corp's account
1. Example Corp can assume this role to access resources in your account
1. The Bad Actor guesses your IAM role ARN, which is not a secret
1. The Bad Actor uses Example Corp to assume your role, thus gaining access to your account

The solution works like this:

The key change here is the _external ID_. 

1. Example Corp generates external IDs which must be unique for each of its customers
1. These IDs are not secret, and are looked up by logic that maps these unique IDs to the customer that are assuming roles
1. These external IDs are not secret. Since Example Corp is the authority and always associates the third parties with the stored external IDs, it is not possible for a third party to force Example Corp to use a separate party's external ID
1. The external ID for each account is shared with the admins of the corresponding account
1. The admins of the accounts use these external IDs in an `ExternalId` condition check on their trust policies on their cross-account IAM roles
1. Assuming Example Corp implemented their external ID mapping logic correctly, when a request to assume a role comes in from Example Corp, we can assume that the principal is associated with the account Example Corp is attempting to access
