---
title: "Linux xprop"
date: "2023-05-10"
tags: ["tech", "linux", "xprop"]
category: "linux"
---

## What is xprop?

`xprop` is a shell utility on Linux systems that is used for "displaying window and font properties in an X server." I often use it when trying to determine the name of given window when running X. For example, today I wanted to find out the name of a file manager that was opened when opening a file with a given application. I was able to use `xprop` to print out the file manager's name.

## Commands

* `xprop | grep -i class` - This allows the user of a GUI desktop environment to use the mouse to click on any open window. After doing so, the properties for application that was clicked on will be printed out. The `| grep -i class` simply filters the output down to the `class` name only, which is equivalent to the application name.
