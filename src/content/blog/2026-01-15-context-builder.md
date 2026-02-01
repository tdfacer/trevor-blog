---
title: "Easy context building for AI-assisted coding in Neovim"
date: 2026-01-18
description: "Extending explain-it.nvim with a React-like interface for multi-file context and conversations."
tags: [neovim, productivity, devops, tooling, ai, explain-it.nvim]
draft: false
---

# Context Builder: A React-like AI Interface for Neovim

The Context Builder is a new feature for explain-it.nvim that brings a fundamentally different approach to AI-assisted coding in Neovim. Instead of quick one-off queries, it provides an interactive workspace where you can build up rich context from multiple files and have ongoing conversations with AI.

## Why Context Builder?

Traditional AI integrations in editors follow a simple pattern: select some code, ask a question, get a response. This works for quick explanations, but falls short when you need to:

- Share context from multiple files across your codebase
- Have multi-turn conversations where the AI remembers previous exchanges
- Switch between AI providers without reconfiguring everything
- Maintain ongoing debugging or code review sessions

Context Builder addresses all of these by providing a dedicated buffer-based interface that persists your context and conversation history.

## Key Features

### Multi-File Context Management

Add files, code snippets, and entire directories to your context. Each item can have an optional comment explaining its relevance:

- **`f`** - Add files via Telescope (searches from configured start directory)
- **`F`** - Browse directories with telescope-file-browser, then select files
- **`d`** - Add all files from a directory (respects .gitignore)
- **`D`** - Browse to a directory, then add all files from it
- **`s`** - Add code snippets (visual selections with line numbers)

Files and snippets appear in a dedicated Context section, showing path, line counts, and any comments you've added.

### Multi-Turn Conversations

Unlike simple prompt/response workflows, Context Builder maintains a conversation thread. Each exchange is preserved, so you can:

- Ask follow-up questions that reference earlier responses
- Iterate on solutions without re-explaining the problem
- Build up understanding incrementally

The conversation appears in a scrollable thread within the same buffer.

### Multiple AI Provider Support

Context Builder abstracts the AI backend, letting you switch providers without changing your workflow:

- **OpenAI** - Direct API integration (default)
- **aichat** - CLI tool supporting multiple backends
- **llm** - Simon Willison's LLM CLI
- **ollama** - Local models via Ollama
- **anthropic-cli** - Direct Anthropic API access

Configure providers in your setup and switch between them with **`p`**.

### Interactive Buffer UI

The interface is built on `morph.nvim`, a React-like component library for Neovim buffers. This enables:

- Reactive updates when state changes
- Editable text regions within the buffer
- Syntax highlighting for different UI sections
- Keyboard-driven interactions throughout

## Architecture: Built on morph.nvim

Context Builder is built on top of [morph.nvim](https://github.com/willothy/morph.nvim), a declarative UI library by Will Hopkins that brings React-like patterns to Neovim buffers. morph.nvim is included as a dependency.

The library provides:
- **`h()`** - Hyperscript function for creating virtual DOM nodes
- **Tags** - Describe what should appear in the buffer
- **Components** - Functions that return tag trees
- **State** - Managed per-component, triggers re-renders on update
- **Extmarks** - Used under the hood for efficient buffer updates

morph.nvim handles the diffing and patching, so you describe what the UI should look like and it figures out the minimal buffer edits needed.

Context Builder uses these primitives to create its UI components:

```lua
-- Context Builder components compose morph primitives
local function StatusBar(ctx)
  return h("text", { hl = "Comment" },
    "Provider: " .. ctx.props.state.provider
  )
end

local function ContextBuilder(ctx)
  return {
    h(StatusBar, { state = ctx.state }),
    h(ContextEditor, { files = ctx.state.files }),
    h("text", { on_change = handle_input }, "Type instruction..."),
  }
end
```

This separation lets me focus on the AI interaction logic while morph.nvim handles the buffer rendering.

## Getting Started

### 1. Enable the Feature

```lua
require("explain-it").setup {
  context_builder = {
    enabled = true,
    default_provider = "openai",  -- or "aichat", "llm", "ollama"
  },
  start_directory = vim.fn.getcwd(),  -- default directory for file picker
}
```

### 2. Add a Keymap

```lua
vim.keymap.set("n", "<leader>cb", function()
  require("explain-it").open_context_builder()
end, { desc = "Open AI Context Builder" })
```

### 3. Use It

1. Open with your keymap
2. Press `f` to add files to context
3. Navigate to the instruction area and type your question
4. Press `<CR>` (Enter) to submit
5. View the response in the Conversation section
6. Continue the conversation or modify context as needed

## Keybindings Reference

Inside the Context Builder buffer:

| Key | Action |
|-----|--------|
| `f` | Add file via Telescope |
| `F` | Browse directories, then add file |
| `d` | Add all files from directory |
| `D` | Browse to directory, add all files |
| `s` | Add snippet (visual selection) |
| `p` | Switch AI provider |
| `c` | Edit comment on context item |
| `x` | Remove item from context |
| `<CR>` | Submit instruction |
| `q` | Close Context Builder |

## Example Workflow

Here's a typical debugging session:

1. **Open Context Builder**: `<leader>cb`

2. **Add relevant files**: Press `f`, select `src/api/client.ts` and `src/api/types.ts`

3. **Add the error snippet**: In another buffer, visually select the error message, yank it, then press `s` in Context Builder to add it

4. **Ask your question**:
   ```
   I'm getting a type error when calling fetchUser().
   The error says "Property 'id' does not exist on type 'User'".
   What's wrong and how do I fix it?
   ```

5. **Submit**: Press `<CR>`

6. **Follow up**: After reading the response:
   ```
   Thanks, that makes sense. Can you also show me how to add
   proper error handling for the case where the user doesn't exist?
   ```

The AI has full context from your files and remembers the previous exchange, so it can give you a coherent, informed answer.

## Configuration Options

```lua
context_builder = {
  enabled = true,
  default_provider = "openai",

  -- Provider-specific settings
  providers = {
    openai = {
      model = "gpt-4",
    },
    aichat = {
      model = "claude-3-opus",
    },
    ollama = {
      model = "codellama",
    },
  },

  -- Templates for common tasks
  templates = {
    code_review = "Review this code for bugs, performance issues, and style...",
    debugging = "Help me debug this issue...",
    explain = "Explain how this code works...",
  },
}
```

## Check it out!

See my repo [on GitHub](https://github.com/tdfacer/explain-it.nvim)

## What's Next

The Context Builder is actively being developed. Planned features include:

- Session save/restore for persistent conversations
- Template system for common workflows
- Better snippet management with inline editing
- Integration with LSP for automatic context gathering

---

The Context Builder represents a shift from AI as a quick lookup tool to AI as a collaborative partner in your coding workflow. By maintaining rich context and conversation history, it enables deeper, more productive interactions.

Try it out and let me know what you think!
