---
title: "neovim api"
date: "2023-04-21"
tags: []
category: "neovim"
---

## Debugging NeoVim Configuration

### Check Health

Execute the `:checkhealth` command and look for any errors

### Clean

Open neovim with `nvim --clean <file>` to load a clean configuration, without any plugins or customizations. This can be a good starting point to determine whether or not the issue is with neovim itself, or with a config option. Bisect and check from here by commenting out plugins and/or configuration options.

### Plugins

#### Plugin Code

Sometimes the error messages are not very helpful and you need to `grep` through code to figure out where a problem lies. For a `packer` backed system on linux, plugin code lives at `~/.local/share/nvim`. Identify a keyword that is likelky to be unique from the error message, and execute: `rg <keyword> ~/.local/share/nvim` to see if you can determine which plugin is struggling.

#### Plugin Updates

One of the first things to try is simply updating your plugins. With a `packer` backed system there is likely an `augroup` with an `autocmd` that will update plugins on buffer write. Open your plugins file and save to trigger an update.

#### Loaded Package Modules

You can use the `package.loaded` table to see what is currently loaded, e.g. `vim.print(package.loaded["explain-it"])`
