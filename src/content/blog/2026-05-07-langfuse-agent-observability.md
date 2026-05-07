---
title: "Hooking Up Langfuse to My AI Agent Harness"
date: 2026-05-07
description: "How I added free LLM observability to my autonomous coding agent harness — per-turn token counts, tool call traces, and cache hit visibility with about 20 lines of code."
tags: ["ai", "agents", "observability", "langfuse", "claude", "python"]
draft: false
---

# Hooking Up Langfuse to My AI Agent Harness

Running autonomous coding agents is a lot like running distributed systems: things go wrong in ways that are hard to reason about after the fact. An agent burns through its budget in 10 turns instead of 100. Cache hit rates are mysteriously low. A tool keeps getting called in a loop before the circuit breaker fires. You want answers, but all you have is a log file and a vague sense of unease.

I added [Langfuse](https://langfuse.com/) to my agent harness today, and it's the single most useful debugging addition since I started the project. Here's what I did and what I can see now that I couldn't before.

## What Langfuse Is

Langfuse is an open-source LLM observability platform. You instrument your code with traces, it collects them, and you get a dashboard showing exactly what your LLM application did: which models were called, what the inputs and outputs were, how many tokens each turn consumed, what it cost, and how long it took.

The killer feature for my use case: it's **free for hobbyists** on the cloud tier (generous limits, no credit card required), and you can self-host it if you want full control. For a personal agent harness that runs a few tasks a day, the free tier covers everything.

## The Integration

My harness runs agents through the [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk). The SDK emits OpenTelemetry traces, and Langfuse can consume OTEL traces directly. The bridge is LangSmith's Claude Agent SDK integration, which wires the SDK's tracer to the OTEL exporter that Langfuse reads.

The whole setup lives in `_setup_langfuse()` in `app.py`:

```python
def _setup_langfuse(config: OrchestratorConfig) -> None:
    if not config.langfuse_enabled:
        return
    if not os.environ.get("LANGFUSE_PUBLIC_KEY") or not os.environ.get("LANGFUSE_SECRET_KEY"):
        logger.info("Langfuse env vars not set — tracing disabled")
        return

    if config.langfuse_base_url and not os.environ.get("LANGFUSE_BASE_URL"):
        os.environ["LANGFUSE_BASE_URL"] = config.langfuse_base_url

    # Route LangSmith Claude Agent SDK instrumentation through OTel to Langfuse
    os.environ.setdefault("LANGSMITH_OTEL_ENABLED", "true")
    os.environ.setdefault("LANGSMITH_OTEL_ONLY", "true")
    os.environ.setdefault("LANGSMITH_TRACING", "true")

    try:
        from langfuse import get_client
        langfuse_client = get_client()
        if not langfuse_client.auth_check():
            logger.warning("Langfuse auth check failed — tracing disabled")
            return

        from langsmith.integrations.claude_agent_sdk import configure_claude_agent_sdk
        configure_claude_agent_sdk()
        logger.info("Langfuse tracing enabled (base_url=%s)", os.environ.get("LANGFUSE_BASE_URL"))
    except Exception as exc:
        logger.warning("Langfuse initialization failed — tracing disabled: %s", exc)
```

A few things worth noting:

- **Graceful degradation**: if the env vars aren't set or the auth check fails, the harness starts normally. Observability is optional — a missing Langfuse config is never a blocker.
- **OTEL-only mode**: `LANGSMITH_OTEL_ONLY=true` ensures traces go to Langfuse via OTEL and not to LangSmith's cloud. Vendor-neutral.
- **Auth check at startup**: catches bad credentials immediately rather than silently dropping traces at runtime.

### Tying Traces to Tasks

Each task in the harness has a UUID. When the runner starts executing a task, it opens a Langfuse session with that ID:

```python
_session_ctx = _langfuse_propagate_attributes(session_id=task.id)
_session_ctx.__enter__()
```

This means every trace generated during a task's execution — every model call, every tool use — is grouped under the task's session ID in Langfuse. You can search by task ID and see the complete execution timeline.

### Capturing Token Breakdowns

The Claude Agent SDK emits a `ResultMessage` at the end of each executor run with aggregate token counts. The runner captures these:

```python
elif isinstance(msg, ResultMessage):
    task.total_cost_usd += msg.total_cost_usd or 0.0
    task.total_turns = msg.num_turns

    if hasattr(msg, 'usage') and msg.usage and isinstance(msg.usage, dict):
        task.input_tokens += msg.usage.get('input_tokens', 0) or 0
        task.output_tokens += msg.usage.get('output_tokens', 0) or 0
        task.cache_creation_tokens += msg.usage.get('cache_creation_input_tokens', 0) or 0
        task.cache_read_tokens += msg.usage.get('cache_read_input_tokens', 0) or 0
```

These go into the database for CloudWatch metrics, but the per-turn breakdown — which model call consumed how many tokens, what was cached vs. fresh — is only visible in Langfuse.

### Config

Three environment variables drive the integration:

```bash
LANGFUSE_PUBLIC_KEY=pk-lf-...     # from your Langfuse project settings
LANGFUSE_SECRET_KEY=sk-lf-...     # fetched from AWS Secrets Manager on workers
LANGFUSE_BASE_URL=https://us.cloud.langfuse.com  # omit for EU region
```

In production the secret key is fetched from AWS Secrets Manager at worker boot time alongside the other secrets. Locally, you set it in your `.env`. The `langfuse_enabled` flag in `orchestrator.yaml` lets you turn tracing off without removing the credentials.

## What You Can See

### Per-Turn Token Counts

The most immediately useful view. Each turn shows input tokens, output tokens, cache creation tokens, and cache read tokens. This makes cache hit rate visible at a glance — if an agent is burning input tokens on every turn instead of reading from cache, something is wrong with the prompt structure.

For a 50-turn task, I can see exactly when the context window started filling up, which turns were cache hits vs. misses, and whether the output token count per turn was stable or spiking (spikes often correlate with the agent writing long justifications instead of taking action).

### Tool Call Traces

Every tool call the agent makes — `Bash`, `Read`, `Edit`, `Write`, `Grep`, the MCP tools — shows up as a span in the trace. You can see:

- The sequence of tool calls across a task
- Which tools dominate (a well-functioning agent should mostly be writing code, not endlessly reading)
- How long each tool call took
- Whether the agent is cycling through the same tool calls repeatedly (a loop pattern before the circuit breaker fires)

This is qualitatively different from looking at aggregate tool call counts. The trace shows the *story* of what the agent was doing, not just a histogram.

### Cost per Trace

Each session shows total cost, broken down by model call. For a harness that runs on both Anthropic API (personal tasks) and AWS Bedrock (work tasks), this makes it easy to see which task types are expensive and whether the cost scales with complexity or is being wasted somewhere.

### Context Window Trends

Watching the input token count grow across turns within a session shows you the context window filling up. The harness already emits a warning event when context is 80%+ full, but Langfuse makes the curve visible — you can see whether it's growing linearly, accelerating (the agent is accumulating state), or plateauing (caching is working).

## Setup

1. Create a free account at [langfuse.com](https://langfuse.com/) and create a project
2. Copy your public key and secret key from project settings
3. Install the dependencies:

```bash
pip install langfuse langsmith
```

4. Set the environment variables (locally in `.env`, in production via secrets):

```bash
LANGFUSE_PUBLIC_KEY=pk-lf-your-key-here
LANGFUSE_SECRET_KEY=sk-lf-your-secret-here
LANGFUSE_BASE_URL=https://us.cloud.langfuse.com  # US region; omit for EU
```

5. Call `_setup_langfuse(config)` at application startup before any agent runs.

That's it. Langfuse starts receiving traces immediately.

## Why It's Worth It for a Hobby Project

The free tier is genuinely free — not a trial, not "free up to X requests per day with a hard cutoff." For a personal agent harness running a handful of tasks a day, the limits don't matter.

More importantly: the questions you can't answer without tracing tend to be the expensive ones. An agent that loops for 80 turns before failing burns real money. Seeing the loop pattern in Langfuse before the circuit breaker would have caught it — or understanding why the circuit breaker fired — is worth far more than the 20 minutes to wire it up.

The OTEL integration means you're not locked in either. The same traces can be routed to other backends (Honeycomb, Grafana Tempo, etc.) by swapping the exporter. For now, Langfuse's UI is good enough that there's no reason to look elsewhere.
