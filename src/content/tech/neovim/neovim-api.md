---
title: "neovim api"
date: "2022-06-03"
tags: []
category: "neovim"
---

## Documentation

[official](https://neovim.io/doc/general/)
[nvim-lua-guide](https://github.com/nanotee/nvim-lua-guide)

## NeoVim API

The folks maintaining `neovim` are doing some awesome work exposing many of the core vim APIs in lua. This makes configuring and extending neovim fluid and easy. At this time, progress is being made, but many core APIs are not yet supported. To work around this, neovim exposes an `nvim_eval` method. This allows you evaluate a VimL expression, and returns the result (which can be saved to a lua variable). See the following example, where the visual mode highlight setting is read:

```lua
local hl = vim.api.nvim_eval("v:hlsearch")
vim.pretty_print(hl)
-- 0
```

With this functionality, we could then build a keymap to toggle `hlsearch`. This can be done in lua using the `vim.keymap.set` method. See this complete example for a function that toggles `hlsearch` and a keymap that calls it:

```lua
local toggle_hl = function()
  local hl = vim.api.nvim_eval("v:hlsearch")
  if hl == 0 then
    vim.cmd("set hlsearch")
  else
    vim.cmd("nohlsearch")
  end
end
vim.keymap.set("n", "<leader>so", toggle_hl, { noremap = true, silent = true })
```
