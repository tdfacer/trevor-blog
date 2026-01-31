---
title: "Linux yay package manager"
date: "2023-05-18"
tags: ["tech", "linux", "yay"]
category: "linux"
---

## What is yay?

> Yet Another Yogurt - An AUR Helper Written in Go

A package manager to supplement `pacman` on Arch-based systems. Supports management of packages from the [AUR](https://aur.archlinux.org/).

## Useful commands

* `yay -Syu` - Perform system upgrade.
* `yay -Sc` - Clean cached AUR package and any untracked Files in the cache. Cleaning untracked files will wipe any downloaded sources or built packages but will keep already downloaded vcs sources.
