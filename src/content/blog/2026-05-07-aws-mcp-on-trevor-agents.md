---
title: "Giving AI Agents Live AWS Access: Hooking Up the AWS MCP Server"
date: 2026-05-07
description: "How I connected the newly-GA AWS MCP Server to my agent harness — zero-secret setup, real test results, and what live AWS access unlocks for autonomous agents."
tags: ["aws", "ai", "mcp", "agents"]
draft: false
---

# Giving AI Agents Live AWS Access: Hooking Up the AWS MCP Server

The AWS MCP Server went GA in May 2026, and I added it to my agent harness the same week. The promise is straightforward: give every agent task a live window into your AWS account — not a static snapshot, not training data from 18 months ago, but real-time access to regions, services, documentation, and running resources.

This post covers the concrete setup (spoiler: four commands), the actual test results from the first verification run, and then what I think this actually unlocks when you let it run unsupervised.

## The Setup

The `aws-mcp` plugin connects agents to the AWS managed MCP endpoint via a local proxy called `mcp-proxy-for-aws`. In my harness, plugins are JSON descriptors that tell it how to launch an MCP server alongside each agent task.

The entire setup was four steps:

### 1. Write `plugin.json`

```json
{
  "command": "uvx",
  "args": [
    "mcp-proxy-for-aws@latest",
    "https://aws-mcp.us-east-1.api.aws/mcp",
    "--metadata",
    "AWS_REGION=us-east-1"
  ]
}
```

### 2. Push, sync, and enable

```bash
./scripts/tasks.sh plugin push aws-mcp
./scripts/tasks.sh plugin sync
./scripts/tasks.sh plugin enable aws-mcp
```

That's it. No secrets to manage. The proxy picks up EC2 instance profile credentials automatically — no SSM parameters to populate, no environment variables to inject, no IAM key rotation to schedule. If the worker instance has the right role attached, it just works.

## Test Results

I ran a verification task against the live system to confirm the three core tools were functional.

### `aws___list_regions`

Returned all 37 current AWS regions, including several that aren't in most training data:

- `ap-east-2` — Asia Pacific (Taipei)
- `mx-central-1` — Mexico (Central)
- `eusc-de-east-1` — AWS European Sovereign Cloud (Germany)

Useful for any task that needs to enumerate infrastructure across regions without hardcoding a list that will inevitably go stale.

### `aws___search_documentation`

Queried "S3 bucket creation". Returned ranked live documentation results confirming it is fetching from AWS's current docs, not a cached snapshot — the AWS CLI version referenced in the results was 2.34.44.

This matters because the documentation tool isn't just a search engine over training data. It's fetching the actual current AWS docs at query time. For recently-launched services or APIs that changed after a model's training cutoff, this is the difference between generating code that works and generating code that used to work.

### `aws___get_regional_availability`

Queried availability of S3, Lambda, and EC2 in `us-east-1`. All three confirmed available. One important usability note: the tool requires exact canonical product name strings. "Amazon Elastic Compute Cloud (EC2)" works. "Amazon ECS" does not — that's a different product entirely, and the tool won't fuzzy-match it. Worth knowing before an agent spends a turn trying to look up "EC2" and getting nothing.

## What It Unlocks Concretely

Now that every agent task can query AWS directly:

**Infrastructure investigation**: Ask an agent to describe your running ECS services, find tasks stuck in `PENDING`, or identify security groups where `0.0.0.0/0` appears in inbound rules. The kind of ad-hoc audit that normally means writing a one-off script or clicking through the console.

**CloudWatch analysis**: Pull metric data programmatically, find Lambda functions with elevated error rates over the last 24 hours, correlate a deployment timestamp with a latency spike. An agent can write the query, execute it, and interpret the result in a single task.

**Cost visibility**: Query Cost Explorer directly. An agent can find the most expensive resources in the last 30 days, flag unused Elastic IPs, identify RDS instances with minimal connections, and produce a ranked list of places to cut spend — without you opening a browser.

**Live documentation**: Look up current API syntax for just-launched services. No training cutoff lag, no hallucinated parameter names from a deprecated API version. When AWS ships something new, agents can look it up immediately.

**Sandboxed Python with AWS access**: The `aws___run_script` tool lets agents write and execute Python scripts with full `boto3` access in a managed sandbox. Useful for one-off analysis that's too complex to express as a single API call — multi-step queries that join data across services, transformations, or anything that benefits from imperative code rather than declarative tool calls.

## Creative Possibilities

The above is table stakes. Here's what I'm actually excited about.

### Self-diagnosing workers

A task running slower than expected could query its own EC2 instance metrics mid-run: CPU credits, network throughput, memory pressure. If it's being throttled, it can say so explicitly in its output rather than silently timing out and leaving you wondering whether the agent was stuck or the instance was. The agent becomes observable from the inside.

### Architecture-aware code generation

An agent writing a new Lambda function can first ask: what other Lambda functions exist in this account? What layers do they share? What IAM roles are in use? What naming conventions appear consistently? Then it generates code that fits the existing pattern — correct import paths, matching layer versions, IAM policies that look like everything else — instead of inventing conventions from scratch.

This is the difference between code review that says "this doesn't match how we do things here" and code that didn't need the review.

### Continuous cost sentinels

Imagine a nightly agent task: query Cost Explorer, compare against the 30-day baseline, identify anything that grew more than 20% week-over-week, look up what those resources are, generate a plain-language explanation of why the cost is up, and open a GitHub issue with the analysis and a recommended action. No dashboard to check. No alert to configure. Just a weekly issue in your repo with the actual work already done.

### Security posture agents

Enumerate all security groups across all regions. Cross-reference with known patterns for overly permissive rules. Look up which EC2 instances and load balancers are attached to each group. Produce a findings report with severity scores. This is the kind of audit that normally requires a dedicated tool or a consultant — or just doesn't happen because nobody has time to do it manually. An agent with AWS access can do it on demand.

### Incident investigation co-pilot

When an alert fires, instead of opening CloudWatch and manually correlating timestamps, an agent could automatically pull the relevant logs, describe the affected resources, look up recent deployments in the same region, and write a structured incident summary before a human even opens their laptop. By the time you're on the incident call, the timeline is already there.

The agent isn't replacing the investigation — it's doing the 20 minutes of mechanical correlation that precedes the actual debugging.

### Living architecture documentation

Run an agent weekly that reads your actual AWS resources — VPCs, subnets, ECS services, RDS instances, CloudFront distributions — and generates or updates an architecture diagram in your repo. Always accurate because it's reading live state. Never "I think this is right but we changed something in January and didn't update the diagram."

Stale architecture docs are a solved problem if the documentation agent can read the account directly.

## The Part That Still Surprises Me

Zero secrets. No IAM access keys, no environment variables, no rotation schedule. The EC2 instance running the agent has a role, the proxy picks it up, and the agent has AWS access. The security story is "your instance role is your agent's credential" — which is exactly how EC2 workloads are supposed to work, just extended into the agent's toolset.

The four-command setup is fast enough that there's no real barrier to doing this on any project running on EC2. If you're building something similar, the `aws-mcp` plugin is worth enabling even if you don't have a specific use case yet. The documentation search tool alone is worth it for anything touching AWS APIs.

The real question now is which of the creative scenarios above to actually build. The incident investigation co-pilot is probably first.
