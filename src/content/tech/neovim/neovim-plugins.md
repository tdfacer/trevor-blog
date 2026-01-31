---
title: "neovim tech"
date: "2022-05-21"
tags: []
category: "neovim"
---

## plugin manager

Add I switched from vim to neovim, I also switched from plug to packer as my plugin manager. The benefits that I've observed so far are:

* Lazy loading (noticeable performance improvement)
* Easy configuration of Lua plugins via their `setup` methods

---

## plugins

This is a list of plugins that have been interesting and/or helpful when using NeoVim.

### LuaSnip

[LuaSnip](https://GitHub.com/L3MON4D3/LuaSnip)

### Plenary

[Plenary](https://GitHub.com/nvim-lua/plenary.

### Telescope

[Telescope](https://github.com/nvim-telescope/telescope.nvim)

* Quickfix workflow
  * Use any command to populate a telescope buffer, e.g. `:Telescope git_files`
  * Optinally do additional filtering via typing in the search bar
  * Press `<C-q>` (control + `q`) to populate the quickfix list
