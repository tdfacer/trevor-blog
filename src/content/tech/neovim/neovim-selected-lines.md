---
title: "neovim api"
date: "2022-07-28"
tags: []
category: "neovim"
---

## Documentation

```
|g_CTRL-G| g CTRL-G   show information about current cursor position
```

## Note

Visually select some lines, then execute `g<C-g>` and vim will display information abount the text that has been selected.

For example, see the following:

```
Visually
select
these
five
lines
```

Then press `g<C-g>`, to get the output of:

```
Selected 5 of 24 Lines; 5 of 58 Words; 33 of 396 Bytes
```
