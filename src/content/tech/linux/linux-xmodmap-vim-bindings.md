---
title: "Linux Xmodmap Vim Bindings"
date: "2022-05-21"
tags: ["tech", "linux", "xmodmap"]
category: "linux"
---

## Xmodmap

> xmodmap - utility for modifying keymaps and pointer button mappings in X

As you can see by the other tech listed here, I am interested in anything `vim`-related. As such, it is desirable to use `vim`-like keybindings wherever possible. Some _very basic_ functionality can be accomplished by making some simple tweaks to `xmodmap`.

---

## Desired End State

I want to create a bash script, `keyboard_tweaks.sh`, that will apply the following changes. This script can be executed via your window manager's startup script.

_Note:_ The tradeoff here is that one can no longer use `Shift_R` as a standard shift modifier for the keys that we are tweaking. In my experience, it is very easy to get used to using _only_ `Shift_L` for this, and the gained functionality from these tweaks is well worth it.

* Remap `Caps_Lock` and `Escape` keys
* Remap `Shift_R<hjkl0$>` to `Left`, `Down`, `Up`, `Right`, `Home`, `End` respectively
* Increase depressed key auto-repeat rate

---

## Remap `Caps_Lock` and `Escape` keys

1. Clear existing `Caps_Lock` to ensure we do not get stuck in caps lock mode
```bash
xmodmap -e 'clear Lock'
```
2. Set caps lock key to escape
```bash
xmodmap -e 'keycode 66 = Escape NoSymbol Escape'
```
3. Set escape key key to caps lock 
```bash
xmodmap -e 'keycode 9 = Caps_Lock NoSymbol Caps_Lock'
```

---

## Remap `Shift_R<hjkl0$>` to `Left`, `Down`, `Up`, `Right`, `Home`, `End` respectively

This is the cool part. By making these changes, you can mimic `vim`'s `h`, `j`, `k`, `l`, `0`, `$` functionality anywhere on your Linux system.

This is done by creating an `~/.Xmodmap` file and rebinding the keys' behavior when the `Shift_R` modifier is used.

1. Generate an `Xmodmap` file with your current bindings
```bash
xmodmap -pke > /tmp/Xmodmap
```
1. Back this file up in-case something goes wrong :)
```bash
cp /tmp/Xmodmap{,.bak}
```
1. Edit the `h` key
a. Open your new `/tmp/Xmodmap` file in your favorite text editor, and modify keycodes as follows:
  * `h` key
```bash
keycode  43 = h H Left Left Left Left
```
  * `j` key
```bash
keycode  44 = j J Down Down Down Down
```
  * `k` key
```bash
keycode  45 = k K Up Up Up Up
```
  * `l` key
```bash
keycode  46 = l L Right Right Right Right
```
  * `0` key
```bash
keycode  19 = 0 parenright Home Home Home Home
```
  * `4` key
```bash
keycode  13 = 4 dollar End End End End
```
b. When you are satisfied, copy your new `Xmodmap` file into your `${HOME}` directory
```bash
cp /tmp/Xmodmap "${HOME}"/.Xmodmap
```
c. Apply your new keybindings
```bash
xmodmap /home/trevor/.Xmodmap
```

---

## Increase depressed key auto-repeat rate

This is probably not the best practice, but will allow you to move your cursor more quickly inside and outside of `vim`.

The command works like this:

```bash
xset r rate <delay in millis before repeating> <times to repeat per second>
```

So, one could use a command like this to delay `200` millis before repeating a keypress, then press that key 20x / second:
```bash
xset r rate 200 20
```

---

## Putting it all together

Create a script (making sure it is in your `$PATH`), that looks like this:

```bash
#!/usr/bin/env bash

xmodmap "${HOME}/.Xmodmap"

# Ensure you don't get stuck in caps lock
xmodmap -e 'clear Lock'

# Set caps lock to escape
xmodmap -e 'keycode 66 = Escape NoSymbol Escape'

# Set escape to caps lock
xmodmap -e 'keycode 9 = Caps_Lock NoSymbol Caps_Lock'

# Set button auto-repeat rate 
xset r rate 200 20
```

Invoke your script from wherever you see fit, likely via your window manager's startup script (note in my case my script is called `keyboard_tweaks.sh` and I'm using `i3wm`)
```bash
exec_always --no-startup-id ~/.scripts/keyboard_tweaks.sh
```
