---
title: "Parallel QA Testing with Agent Orchestration"
date: 2026-04-12
description: "How I used AI agent orchestration to build an admin SPA with parallel child tasks, hit real limits, and evolved the approach through three iterations."
tags: ["ai", "agents", "orchestration", "testing", "react", "playwright"]
draft: false
---

# Parallel QA Testing with Agent Orchestration

I've been building an orchestration system that manages AI coding agents — submitting tasks, spawning workers on ephemeral EC2 instances, and coordinating multi-step work through parent/child task hierarchies. This week I used it to build and QA test a React admin portal, and the experience surfaced some interesting lessons about how agent orchestration fails, recovers, and improves.

## The Task: Build an Admin Portal

The goal was straightforward: build a content management admin SPA using React 19, Mantine v8, and React Query, with full CRUD for seven content sections (workouts, videos, trainers, programs, challenges, series, taxonomy). Each section talks to a different iFIT backend API.

I submitted this as an `orchestrate` intent task — meaning the parent agent plans the work and spawns child tasks to do the actual coding. The plan was sequential: Child 1 builds foundation + workouts, Child 2 picks up and adds videos, Child 3 adds trainers and programs, and so on.

## What Actually Happened

### The Build Phase

The orchestrator spawned five children sequentially. Three completed successfully, producing PRs for foundation/workouts, videos, and a combined trainers/programs/challenges/series/taxonomy build. Total cost across all children: about $15.

But one child — the original Videos task — hit the $5 budget limit at turn 177. Here's what the user saw:

```
error_message: "Command failed with exit code -15"
result: null
```

Exit code -15 is SIGTERM. The Claude Agent SDK kills the process when budget is exceeded. The error message tells you nothing about *why*. And because the task failed before Phase 3 (git finalize), all 177 turns of work were lost — the ephemeral EC2 worker terminated and the workspace was destroyed.

The orchestrator recovered by spawning a replacement child that completed the videos section successfully, but the experience exposed three problems:

1. **Cryptic errors** — "exit code -15" means nothing to end users
2. **Lost work** — 177 turns of progress vanished because the failure path skips git push
3. **No recovery option** — the task is just dead, with no way to bump the budget and continue

This led directly to a [design for graceful limit handling](/blog/2026-04-12-parallel-qa-with-agent-orchestration#the-fix-graceful-limit-handling) — but more on that later.

### The Merge Problem

The sequential children were supposed to chain — each building on the previous one's branch. But a bug in how the orchestrator sets child task branches meant each child independently branched from `main` instead of chaining. The result: three PRs that all conflicted with each other.

I merged PR #1 (foundation + workouts) cleanly, then submitted `rebase` intent tasks for PRs #2 and #3. The rebase completed, the build passed... and then the force push was blocked:

```
Blocked: dangerous command pattern detected
```

The orchestrator's supervisor hook blocks `git push --force` to prevent destructive operations. Reasonable in general, but `--force-with-lease` (the safe variant that won't clobber unexpected remote changes) was caught by the same regex. And rebase *requires* a force push — that's the whole point.

The fix was two lines in the supervisor:

```python
# Before: blocked everything with --force
re.compile(r"git\s+push\s+.*--force"),

# After: allow --force-with-lease (safe), block bare --force
re.compile(r"git\s+push\s+.*--force(?!-with-lease)"),
```

Plus an intent-based exception: tasks with `rebase` or `fix_merge_conflicts` intent are allowed to force push, since it's inherent to the operation.

### QA Attempt 1: Context Window Exhaustion

With the code merged, I submitted an `investigate` task to QA test every section using Playwright. The agent methodically worked through workouts (pass), videos (pass), trainers (pass)... and then hit the context window limit at 262% while testing programs.

The culprit: Playwright screenshots. Each `browser_take_screenshot` call returns a large base64 PNG that consumes significant context. After four sections of screenshots, the agent's context was full.

Result: 792 characters of a report that was supposed to be comprehensive. Three sections untested.

### QA Attempt 2: Parallel Orchestration

The fix was architectural, not incremental. Instead of one agent testing everything sequentially (accumulating screenshots in a single context window), I submitted an `orchestrate` task that spawned four children **in parallel** — one per untested section.

Each child gets its own fresh context window. Screenshots don't compound across sections. And the work runs concurrently instead of sequentially.

```
Orchestrate task: $1.27 (parent coordination)
├── Child 1: Programs     $1.35, 44 turns
├── Child 2: Challenges   $0.54, 18 turns
├── Child 3: Series       $0.73, 32 turns
└── Child 4: Taxonomy     $0.75, 31 turns
                          ─────
Total:                    $4.64
```

All four children completed successfully. The parent compiled a unified report.

## The Results

| Section | List | Data | Create | Edit | Issues |
|---------|------|------|--------|------|--------|
| Workouts | PASS | PASS (81,939) | PASS | PASS | — |
| Videos | PASS | PASS | PASS | PASS | Edit button is `<button>` not `<a>` |
| Trainers | PASS | PASS (436) | PASS | PASS | Images blocked by ORB |
| Programs | **FAIL** | **FAIL** | PASS | **FAIL** | `svc.ifit-test.com` DNS NXDOMAIN |
| Challenges | PASS | PASS | PASS | PASS | — |
| Series | PASS | PASS | PASS | PASS | — |
| Taxonomy | **FAIL** | **FAIL** | — | — | Same DNS issue |

The real finding: Programs and Taxonomy fail because they call `svc.ifit-test.com` directly (via `VITE_BASE_SERVICE_URL`), while every other section routes through `gateway.ifit-test.com` (via `VITE_BASE_URL`). The `svc` domain doesn't resolve. This is a configuration issue — either fix DNS or route those API calls through the gateway like the other sections.

## The Fix: Graceful Limit Handling

The budget-limit experience led to a three-part design:

**Part A: Classify the error.** When `total_cost_usd >= 95% of max_budget_usd` and the error is a SIGTERM, replace "exit code -15" with "Budget limit reached ($5.02 of $5.00)". Simple heuristic, immediate UX improvement.

**Part B: Salvage-push on failure.** Before returning from a failed executor, commit and push whatever's in the workspace. Even if the task fails, partial work survives on the branch. This is the most impactful change — 177 turns of work shouldn't vanish because the budget ran out.

```python
async def _salvage_push(task, workspace_path):
    """Best-effort commit + push after executor failure."""
    # git add -A && git commit -m "wip: salvage progress"
    # git push --force-with-lease origin HEAD:branch
```

**Part C: Escalate with continue option.** Instead of marking budget-exceeded tasks as `failed`, route them to `review` status with a `pending_question` offering to continue:

```
## Budget Limit Reached

**Spent:** $5.02 of $5.00 budget
**Work branch pushed:** agent/your-branch

### Options
- **budget:10** — continue with $10 budget (recommended)
- **reject** — close as failed
```

The user responds `budget:10`, and the system spawns a continuation task on the same branch with a fresh budget. No work lost, no manual re-submission.

## Lessons

**Context windows are the real constraint, not budget.** The QA task ran out of context at $1.89 of an $8 budget. Playwright screenshots are expensive in tokens. The solution isn't bigger context — it's decomposition. One agent per section, each with a fresh window.

**Orchestration patterns matter.** Sequential children share a branch and accumulate state. Parallel children are isolated and concurrent. The right pattern depends on whether the work has dependencies. For testing, parallel is strictly better.

**Safety hooks need escape hatches.** Blocking force push is good default behavior. But rebase tasks *need* force push — it's not a workaround, it's the operation. Intent-based exceptions let you keep the guardrail while allowing legitimate uses.

**Failure paths deserve as much design as success paths.** The happy path (task completes, pushes branch, opens PR) was well-engineered. The failure path (task hits limit, returns before git push, worker dies) was an afterthought. The salvage-push pattern addresses this — treat failure as a checkpoint, not a dead end.

## Cost Breakdown

| Phase | Tasks | Cost | What happened |
|-------|-------|------|---------------|
| Build (orchestrate) | 5 children | $14.71 | Built 7 sections, 1 budget failure + retry |
| Rebase | 2 tasks | ~$2.00 | Resolved merge conflicts |
| QA v1 (single agent) | 1 task | $1.89 | Context exhaustion at 4/7 sections |
| QA v2 (orchestrate) | 4 children | $4.64 | All sections tested |
| **Total** | | **~$23** | Full admin portal built and QA tested |

Seven CRUD sections, built from scratch, tested against live APIs, with merge conflict resolution — for about the cost of lunch. The interesting part isn't the cost, it's how the system adapted when things went wrong.
