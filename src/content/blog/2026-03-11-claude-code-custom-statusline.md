---
title: "Building a Custom Status Line for Claude Code"
date: 2026-03-11
description: "How I built a Nerd Font-powered status line for Claude Code that shows model, auth method, git branch, context window usage, Zellij session, and more."
tags: ["claude", "ai", "terminal", "zellij", "workflow", "bash", "git"]
draft: false
---
# Building a Custom Status Line for Claude Code

Claude Code has a hook for a custom status line — a small shell script that runs on each prompt render and prints a single line of text into the bottom bar of the interface. It's a great place to surface context that's otherwise buried: which model you're using, how full the context window is, which git branch you're on, and more.

Here's what mine looks like in practice:

```
 generic-claude │  main* │  claude-sonnet-4-6 │  api key │ 󰾲 ctx: 12% used / 88% left │  22:41
```

This post walks through how it works, section by section.

## How the Status Line Hook Works

Claude Code looks for a script at `~/.claude/statusline-command.sh`. When found, it runs the script before each prompt render, passing a JSON blob to stdin. Your script reads that JSON and prints whatever you want to stdout. The output appears in the Claude Code status bar.

The JSON payload includes useful data:

```json
{
  "model": { "display_name": "claude-sonnet-4-6" },
  "context_window": {
    "used_percentage": 12.3,
    "remaining_percentage": 87.7
  },
  "workspace": {
    "current_dir": "/home/trevor/code/playground/generic-claude"
  }
}
```

The script also runs in the same environment as your shell session, so all your environment variables are available — which turns out to be very useful for detecting things like which auth method Claude is using.

## Script Structure

The script follows a simple pattern: define a `show_*` function for each section, collect non-empty outputs into an array, then join them with a `│` separator.

```bash
#!/usr/bin/env bash

input=$(cat)  # read JSON from stdin

# ANSI color helpers
R="\033[0m"
CYAN="\033[36m"
GREEN="\033[32m"
# ...

SEP="${DIM}│${R}"

# Each section is a function that prints output or nothing
show_model() { ... }
show_context() { ... }
# ...

# Assemble
sections=()
s=$(show_model); [ -n "$s" ] && sections+=("$s")
# ...

# Join with separators
first=true
for section in "${sections[@]}"; do
    if [ "$first" = true ]; then
        printf "%b" "$section"
        first=false
    else
        printf " %b %b" "$SEP" "$section"
    fi
done
printf "\n"
```

This pattern makes it easy to add, remove, or reorder sections.

## The Sections

### Zellij Session

If you're running inside [Zellij](https://zellij.dev/), the `$ZELLIJ_SESSION_NAME` env var is set. This is handy when you have multiple Claude sessions running in different Zellij sessions — the status bar tells you which one you're looking at.

```bash
show_zellij() {
    if [ -n "$ZELLIJ" ]; then
        local session_name="${ZELLIJ_SESSION_NAME:-?}"
        printf "${BLUE} %s${R}" "$session_name"
    fi
}
```

### Project Name

Pulls the git repo name from the workspace directory provided in the JSON, falling back to the current directory. Quick visual confirmation you're in the right repo.

```bash
show_project() {
    if command -v git >/dev/null 2>&1; then
        local repo_root
        repo_root=$(git -C "$(echo "$input" | jq -r '.workspace.current_dir // empty')" \
            rev-parse --show-toplevel 2>/dev/null)
        [ -z "$repo_root" ] && repo_root=$(git rev-parse --show-toplevel 2>/dev/null)
        if [ -n "$repo_root" ]; then
            printf "${CYAN} %s${R}" "$(basename "$repo_root")"
        fi
    fi
}
```

### Git Branch with Status Flags

Shows the current branch name, with dim suffix flags:

- `*` — dirty working tree (unstaged or staged changes)
- `↑` — ahead of upstream
- `↓` — behind upstream
- `↕` — diverged

```bash
show_git_branch() {
    local branch
    branch=$(git branch --show-current 2>/dev/null)
    [ -z "$branch" ] && return

    local flags=""
    if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
        flags="${flags}*"
    fi

    local upstream
    upstream=$(git rev-parse --abbrev-ref @{upstream} 2>/dev/null)
    if [ -n "$upstream" ]; then
        local ahead behind
        ahead=$(git rev-list --count @{upstream}..HEAD 2>/dev/null || echo 0)
        behind=$(git rev-list --count HEAD..@{upstream} 2>/dev/null || echo 0)
        [ "$ahead" -gt 0 ] && [ "$behind" -gt 0 ] && flags="${flags}↕"
        [ "$ahead" -gt 0 ] && [ "$behind" -eq 0 ] && flags="${flags}↑"
        [ "$behind" -gt 0 ] && [ "$ahead" -eq 0 ] && flags="${flags}↓"
    fi

    printf "${GREEN} %s${DIM}%s${R}" "$branch" "$flags"
}
```

### Model Name

Reads from the JSON input — `model.display_name`. Simple but useful: it's easy to forget which model is active, especially if you switch between Sonnet and Opus mid-session.

```bash
show_model() {
    local model
    model=$(echo "$input" | jq -r '.model.display_name // empty' 2>/dev/null)
    [ -z "$model" ] && return
    printf "${PURPLE} %s${R}" "$model"
}
```

### Auth Method

This is one of the more useful additions. Claude Code can authenticate three different ways, and each has different cost/rate-limit implications. Rather than hunting through env vars to remember which one is active, the status bar tells you directly.

Detection is done via environment variables — the same ones you set before launching Claude:

```bash
show_auth() {
    if [ "${CLAUDE_CODE_USE_BEDROCK:-0}" = "1" ]; then
        printf "${YELLOW} bedrock${R}"
    elif [ -n "$ANTHROPIC_API_KEY" ]; then
        printf "${CYAN} api key${R}"
    else
        printf "${GREEN} subscription${R}"
    fi
}
```

The three states:
- **subscription** (green) — logged in via claude.ai monthly plan
- **api key** (cyan) — `ANTHROPIC_API_KEY` is set, billing through platform.anthropic.com
- **bedrock** (yellow) — `CLAUDE_CODE_USE_BEDROCK=1` is set, routed through AWS

Bedrock is checked first because you'll often have `ANTHROPIC_API_KEY` set in your environment even in Bedrock sessions.

### Context Window Usage

This is probably the most practically useful section. It reads `context_window.used_percentage` from the JSON and colors it based on how full things are getting:

- Green when under 50% used
- Yellow from 50–80%
- Red at 80%+

```bash
show_context() {
    local used remaining
    used=$(echo "$input" | jq -r '.context_window.used_percentage // empty' 2>/dev/null)
    remaining=$(echo "$input" | jq -r '.context_window.remaining_percentage // empty' 2>/dev/null)
    [ -z "$used" ] && return

    local color
    if awk "BEGIN {exit !($used >= 80)}"; then
        color="$RED"
    elif awk "BEGIN {exit !($used >= 50)}"; then
        color="$YELLOW"
    else
        color="$GREEN"
    fi

    local used_int remaining_int
    used_int=$(printf "%.0f" "$used")
    remaining_int=$(printf "%.0f" "$remaining")

    printf "${color}󰾲 ctx: %s%% used / %s%% left${R}" "$used_int" "$remaining_int"
}
```

Seeing the context filling up at 70% is a good prompt to think about whether to start a new session.

### AWS Profile

When `$AWS_PROFILE` is set, this section shows the active profile and region. It's redundant if you already have an AWS indicator elsewhere in your shell prompt, but nice to have in Claude's bar for Bedrock sessions.

```bash
show_aws() {
    [ -z "$AWS_PROFILE" ] && return
    local region="${AWS_REGION:-${AWS_DEFAULT_REGION}}"
    if [ -z "$region" ] && command -v aws >/dev/null 2>&1; then
        region=$(timeout 0.5s aws configure get region 2>/dev/null || true)
    fi
    if [ -n "$region" ]; then
        printf "${YELLOW}󰅟 %s (%s)${R}" "$AWS_PROFILE" "$region"
    else
        printf "${YELLOW}󰅟 %s${R}" "$AWS_PROFILE"
    fi
}
```

### System Resources

Reads CPU and memory usage directly from `/proc`. The CPU is sampled over a 0.1s window.

```bash
show_resources() {
    local cpu="" mem=""

    if [ -f /proc/stat ]; then
        local p_total p_idle c_total c_idle
        read -r p_total p_idle < <(awk '/^cpu / {print $2+$3+$4+$5+$6+$7+$8, $5}' /proc/stat)
        sleep 0.1
        read -r c_total c_idle < <(awk '/^cpu / {print $2+$3+$4+$5+$6+$7+$8, $5}' /proc/stat)
        local td=$((c_total - p_total)) id=$((c_idle - p_idle))
        [ "$td" -gt 0 ] && cpu=$(awk "BEGIN {printf \"%.0f\", 100*(1-$id/$td)}")
    fi

    if [ -f /proc/meminfo ]; then
        mem=$(awk '/^MemTotal:/{t=$2}/^MemAvailable:/{a=$2}END{if(t>0)printf "%.0f",100*(1-a/t)}' /proc/meminfo)
    fi

    local parts=()
    [ -n "$cpu" ] && parts+=("cpu:${cpu}%")
    [ -n "$mem" ] && parts+=("mem:${mem}%")
    [ ${#parts[@]} -eq 0 ] && return

    printf "${DIM}%s${R}" "${parts[*]}"
}
```

### Clock

Minimal timestamp. Renders dim to keep it from competing visually with more important sections.

```bash
show_time() {
    printf "${DIM}%s${R}" "$(date +%H:%M)"
}
```

## Setup

1. Create `~/.claude/statusline-command.sh` with the script content
2. Make it executable: `chmod +x ~/.claude/statusline-command.sh`
3. Install a [Nerd Font](https://www.nerdfonts.com/) — the script uses glyphs like ` `, ` `, `󰾲`, `󰅟` that only render correctly with one
4. Ensure `jq` is installed (used to parse the JSON input)

Claude Code will pick up the script automatically on next launch — no config changes needed.

## Full Script

The complete script is at [`~/.claude/statusline-command.sh`](https://github.com/tdfacer/dotfiles). Add, remove, or reorder sections by editing the `show_*` functions and the assembly block at the bottom.

The pattern generalizes well: any information you can get from environment variables, the JSON payload, or fast shell commands can be surfaced here. Think API endpoint URLs for different environments, active Docker contexts, k8s namespace — whatever's relevant to your workflow.
