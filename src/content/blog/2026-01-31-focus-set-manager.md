---
title: "How I Stopped Context Switching From Ruining My Focus"
date: 2026-01-31
description: "Building fsm.nvim, a Focus Set Manager for Neovim that treats each work context as a first-class citizen"
tags: [neovim, productivity, devops, tooling]
draft: false
---

If you work in DevOps, SRE, or really any role where interrupts are a way of life, you know the pain: you're deep into debugging a memory leak, your terminal has six panes open, you've got three browser tabs with relevant documentation, and then Slack pings. Production is down. Different service. Drop everything.

Forty minutes later, the fire is out. You switch back to... what was I doing? Which terminal was it? Where were those browser tabs?

This drove me crazy for years. So I built something to fix it.

## The Problem: State Leakage

The real issue isn't context switching itself. Sometimes you *have* to switch. The problem is **state leakage** — when context from one task bleeds into another:

- Terminals from your morning's debugging session cluttering your incident response
- Browser tabs from three different projects all mixed together
- Your Neovim buffers turning into an archaeological dig of unrelated files
- Losing your place when you try to return to suspended work

I tried discipline. I tried "just close things when you're done." But in the heat of an incident, nobody has time for cleanup. And by the time things calm down, the state is gone.

## The Solution: Focus Sets

I built **fsm.nvim** — a Focus Set Manager for Neovim that treats each work context as a first-class citizen. A "focus" is a named container that captures:

- An **i3 workspace** (isolated screen real estate)
- A **tmux session** (terminal state, working directory)
- **Neovim state** (buffers, session, cwd)
- **Browser windows** (parked and restored automatically)
- **Notes and todos** (per-focus markdown files)

When I start a new focus, I get a clean slate. When I suspend it, everything freezes in place. When I resume, it's exactly where I left off.

## What It Looks Like in Practice

Monday morning. I'm working on a Terraform refactor:

```
:FocusStart terraform-vpc-cleanup
```

I get workspace 10, a fresh tmux session, and my notes file opens. I work for two hours, spread across a dozen files, with three documentation tabs open.

Then: alert. RDS connection issues in production.

```
:FocusSwitch
```

Telescope picker shows my suspended focuses. I hit enter on a new one:

```
:FocusStart incident-rds-connections
```

Workspace 11. Clean terminal. Clean Neovim. I can think clearly because there's no visual noise from the Terraform work. My browser tabs from before are parked on a hidden workspace — out of sight, out of mind.

I investigate, find the issue (connection pool exhaustion), push a config change, verify the fix. Total time: 45 minutes.

```
:FocusSwitch terraform-vpc-cleanup
```

I'm back. Same files. Same terminal panes. Same working directory. Even my browser tabs are restored. It's like I never left.

## The Philosophy: Make Switching Cheap

The insight behind fsm.nvim is simple: **if switching is expensive, you'll avoid it, and your work will suffer.**

When switching costs nothing, you can:

- **Actually focus** — no distractions from other contexts
- **Take breaks** — suspend, go to lunch, resume exactly where you were
- **Handle interrupts** — without destroying your current progress
- **Experiment** — spin up a focus just to try something, archive it if it doesn't pan out

I've stopped trying to remember where I was. The system remembers for me.

## The Commands I Use Every Day

```vim
:FocusStart <name>      " Start a new focus
:FocusSwitch            " Suspend current, pick another
:FocusSuspend           " Save everything, park windows
:FocusResume <name>     " Pick up where I left off
:FocusNotes             " Open this focus's notes
:FocusQuickNote <msg>   " Add a timestamped note
:FocusArchive           " Done with this focus (read-only)
```

The `:FocusQuickNote` command is surprisingly useful. In the middle of debugging, I'll jot down breadcrumbs:

```
:FocusQuickNote checked db slow query log, nothing obvious
:FocusQuickNote suspecting connection pool, see config at /etc/app/pool.conf
```

These end up in a notes.md file with timestamps. When I come back to a suspended focus after a week, I can see exactly where I was and what I was thinking.

## Graceful Degradation

Not everyone runs i3. Not everyone uses tmux. fsm.nvim handles this gracefully — if a component isn't available, it just skips that integration. You can use it purely for Neovim session management if that's all you need.

But if you do run the full stack (i3 + tmux + Neovim + Firefox), it's magical. Your entire desktop becomes focus-aware.

## What I Learned Building This

1. **Persistence is harder than it looks.** Getting state reliably saved and restored across multiple applications required a lot of iteration.

2. **Crashes happen.** The `:FocusRepair` command exists because sometimes things go wrong — system restarts, Neovim crashes, i3 segfaults. The repair system can detect orphaned focuses and fix them.

3. **Browser tab management is a nightmare.** Browsers really don't want to be automated. I settled on parking entire windows rather than trying to manage individual tabs.

4. **Small quality-of-life features matter.** The statusline component that shows `● terraform-vpc-cleanup` in my lualine is a tiny thing, but it answers the question "what am I working on?" at a glance.

## Try It

If this resonates with you, fsm.nvim is [on GitHub](https://github.com/tdfacer/fsm.nvim). It requires:

- Neovim 0.9+
- Optional: i3 window manager
- Optional: tmux
- Optional: Firefox (for browser integration)

Fair warning: this is a tool built for my workflow. It's opinionated. But if you're drowning in context switches and losing state between them, maybe it'll help you too.

---

*One focus at a time. That's all it takes.*
