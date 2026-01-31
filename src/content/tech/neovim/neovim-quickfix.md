---
title: "neovim quickfix"
date: "2023-03-13"
tags: []
category: "neovim"
---

## NeoVim Quickfix

The `quickfix` list is to `modifiable off`, so it's not usually possible to edit the quickfix buffer. Items can be modified, however, by using `getqflist` and `setqflist`. The following snippet can be placed in `~/.config/nvim/after/ftplugin/qf.vim` in order to add `dd` functionality to remove line items from the `quickfix` list.

```
nnoremap <buffer> <silent> dd
  \ <Cmd>call setqflist(filter(getqflist(), {idx -> idx != line('.') - 1}), 'r') <Bar> cc<CR>
```
