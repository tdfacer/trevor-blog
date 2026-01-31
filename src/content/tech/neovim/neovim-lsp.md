---
title: "neovim lua"
date: "2023-02-05"
tags: []
category: "neovim"
---

## `LSP`

#### Useful commands

* `:LspInfo` - Print out some metadata about LSP in current buffer (attached clients, available clients, etc.)
* `:LspLog` - LSP log file; useful to see logs about running LSP servers (e.g. startup errors)

## `mason` - LSP Server Install and Config Manager

There are multiple options for managing LSP servers when using Neovim's native LSP. Some that I'm aware of (and have used) are the following:

1. External management of LSP servers, e.g., installing LSP servers with `pacman` (Linux) or `brew` (macos)
2. A plugin called [nvim-lsp-installer](https://github.com/williamboman/nvim-lsp-installer)
3. A plugin called [mason](https://github.com/williamboman/mason.nvim)

There are pros and cons to each, but most recently I've landed on using `mason`. This option is great, because it solves some problems I've had with the others. Some of the most interesting features include:

* Automatically install of language servers based on file type - For example, if you do not have a `python` language server installed, and you open a `.py` file, it can automatically install something like `jedi` or `pyls`
* Puts LSP server binaries in a single directory - This one is great. With `nvim-lsp-installer`, I had to manually find the language server binary and add it to my `PATH` after each server install. Now, any language server is automatically added to a single directory located under the `neovim` `stdpath`, so my shell's rc file has a single added line for _all_ LSP servers.
* Config simplification

---

#### Status Window

* Simply execute `:Mason`

#### Help

* Simply execute `:h mason-help-guide` or `:h mason`
