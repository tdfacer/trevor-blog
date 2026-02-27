---
title: "Why I Switched fsm.nvim from tmux to Zellij"
date: 2026-02-27
description: "Zellij's automatic session saving made my Neovim focus manager dramatically simpler. Here's what changed and what I learned along the way."
tags: ["neovim", "zellij", "tmux", "terminal", "workflow", "fsm.nvim"]
draft: false
---
# Why I Switched fsm.nvim from tmux to Zellij

I've been building [fsm.nvim](https://github.com/tdfacer/fsm.nvim) — a focus set manager for Neovim that keeps work contexts isolated across i3 workspaces, terminal sessions, and browser windows. The core idea: start a named focus, get a dedicated workspace and terminal session, suspend it to park browser windows and save state, resume later exactly where you left off.

It was built on tmux. It worked, but there was always friction: if you rebooted, your tmux sessions were gone. The terminal state — pane layout, working directory, what you were running — was ephemeral. You'd resume a focus and get an empty shell, having to reconstruct context from your notes.

Zellij fixes this. And switching the plugin to use it was one of the better decisions I've made on this project.

## What Zellij Does Differently

Zellij is a terminal multiplexer like tmux, but it autosaves your session layout every second as a KDL file. When you close a session and later run `zellij attach session-name`, it resurrects exactly what you had: pane splits, working directories, even the commands that were running (with a safety prompt before re-executing them).

For a focus manager, this is huge. The whole job of `FocusSuspend` / `FocusResume` is to freeze and restore context. With tmux, FSM had to manually track the working directory (`tmux display-message -p -F '#{pane_current_path}'`) and recreate sessions from scratch on resume. With zellij, resurrection is just... the default behavior. The terminal state comes back for free.

## The Driver Swap

FSM uses a driver abstraction — each integration (i3, tmux, nvim, browser) is a separate module with a consistent interface. Swapping tmux for zellij meant writing a new `zellij.lua` driver and adding a `multiplexer` config key:

```lua
require("fsm").setup({
  multiplexer = "zellij",  -- or "tmux" if you prefer
  zellij = {
    session_prefix = "focus-",
  },
})
```

The core session operations mapped cleanly:

| tmux | zellij |
|------|--------|
| `tmux new-session -d -s NAME` | `zellij attach --create-background NAME` |
| `tmux has-session -t NAME` | `zellij list-sessions` + parse |
| `tmux kill-session -t NAME` | `zellij kill-session NAME` |
| `tmux new-session -A -s NAME` | `zellij attach --create NAME` |

The CWD tracking code — which queried the tmux pane's current path on suspend — just went away. Zellij's resurrection makes it unnecessary.

## Three Bugs I Didn't Expect

The implementation wasn't entirely smooth. Here's what bit me:

**Session names can't contain `/`.** Zellij gives you an explicit error: `Session name cannot contain '/'`. The tmux driver used `focus/` as its session prefix (which tmux handles fine), and I copied that into the zellij config without thinking. The result: alacritty would flicker open and immediately close, with no helpful error visible. Changed the prefix to `focus-` and it worked.

**`kill-sessions` is not a command.** The correct zellij subcommand is `kill-session` (singular). I had copied the pluralized form from my mental model of tmux (`kill-session` vs `kill-sessions` are both valid tmux). Zellij's error message says "did you mean kill-all-sessions?" which didn't help. Archives and deletes were silently failing.

**ANSI codes in `list-sessions` output.** Zellij emits color escape codes in `list-sessions` even when stdout is not a TTY. My session name parsing was grabbing `\x1b[32;1mfocus-ledgerz\x1b[m` instead of `focus-ledgerz`. Fixed with a small `strip_ansi()` helper before parsing.

None of these were hard to fix once I knew what was wrong. But all three produced the same symptom — "zellij didn't open" — making them annoying to diagnose.

## The Result

The workflow is noticeably smoother. I can suspend a focus mid-investigation, switch to something urgent, come back two days later, and my terminal is exactly where I left it. No reconstructing which directory I was in, no re-running commands to get back to a useful state.

The tmux driver still works. If you're happy with tmux, `multiplexer = "tmux"` keeps everything as it was. But if you're on zellij, the integration is first-class now.

---

fsm.nvim is on the `zellij` branch while I do more testing before merging. The plugin is still opinionated (i3, alacritty, Firefox), but the multiplexer layer is now pluggable — which is a better foundation than where it started.
