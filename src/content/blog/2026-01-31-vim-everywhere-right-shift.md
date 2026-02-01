---
title: "Vim Everywhere: Using Right Shift as a System-Wide Modal Key"
date: 2026-01-31
description: "How I turned the underutilized Right Shift key into a vim-style navigation layer that works in every application on Linux."
tags: [linux, vim, keyboard, xmodmap, xbindkeys, productivity]
draft: false
---

I use vim keybindings. The problem is, vim keybindings only work in vim. Every time I switch to a browser, Slack, or a PDF reader, my muscle memory betrays me and I'm mashing `j` and `k` into text fields.

The obvious solution is to bring vim navigation everywhere. The less obvious question: how do you create a modal system that doesn't conflict with normal typing?

My answer: **Right Shift**.

## The Insight: Right Shift Does Nothing

Think about when you actually use Right Shift. For most people, the answer is "never" or "accidentally." Left Shift handles capitalization just fine. Right Shift sits there, a prime piece of keyboard real estate, doing duplicate work.

What if Right Shift became a modifier that, when held, transforms the home row into vim navigation?

```
Right Shift + h = ←
Right Shift + j = ↓
Right Shift + k = ↑
Right Shift + l = →
```

This is genuinely modal. Tap `h` and you type "h". Hold Right Shift and tap `h`, you move left. No mode switching, no leader keys, no timing-based detection. Just hold and navigate.

## The Implementation: Two Layers

X11 offers two complementary tools for keyboard remapping:

1. **xmodmap**: Maps keys to other keys (h → Left Arrow)
2. **xbindkeys**: Maps keys to shell commands (w → `xdotool key ctrl+Right`)

xmodmap is limited to simple key substitutions. It can turn `h` into Left Arrow, but it cannot turn `w` into Ctrl+Right (word jump). For compound key combinations, xbindkeys fills the gap.

### Layer 1: xmodmap for Navigation

The core trick is using `Mode_switch`, an X11 modifier designed exactly for this purpose. Assigning Right Shift to Mode_switch allows any key to have four states:

1. Normal press: `h`
2. Left Shift: `H`
3. Right Shift (Mode_switch): Left Arrow
4. Both Shifts: Left Arrow

Here's the essential `~/.Xmodmap`:

```
! Right Shift becomes Mode_switch modifier
keycode 62 = Mode_switch

! Basic vim navigation (h/j/k/l = arrow keys)
keycode 43 = h H Left Left
keycode 44 = j J Down Down
keycode 45 = k K Up Up
keycode 46 = l L Right Right

! Line navigation (0/$ style)
keycode 19 = 0 parenright Home Home
keycode 13 = 4 dollar End End

! Page navigation (u/d = Page Up/Down)
keycode 30 = u U Prior Prior
keycode 40 = d D Next Next

! Delete character (x)
keycode 53 = x X Delete Delete
```

The syntax is `keycode N = normal shift mode_switch mode_switch+shift`. Each key can produce four different outputs depending on which modifiers are held.

### Layer 2: xbindkeys for Commands

xmodmap cannot produce Ctrl+Right (word jump). For operations that require modifier combinations, xbindkeys intercepts key events and runs xdotool to synthesize the actual keypresses.

`~/.xbindkeysrc`:

```bash
# Word navigation
"xdotool key --clearmodifiers ctrl+Right"
  Shift_R + w

"xdotool key --clearmodifiers ctrl+Left"
  Shift_R + b

# Document navigation (gg/G)
"xdotool key --clearmodifiers ctrl+Home"
  Shift_R + g

"xdotool key --clearmodifiers ctrl+End"
  Shift_L + Shift_R + g

# Copy/paste (yank/put)
"xdotool key --clearmodifiers ctrl+c"
  Shift_R + y

"xdotool key --clearmodifiers ctrl+v"
  Shift_R + p

# Undo/redo
"xdotool key --clearmodifiers ctrl+z"
  Shift_R + z

"xdotool key --clearmodifiers ctrl+y"
  Shift_R + r

# Search
"xdotool key --clearmodifiers ctrl+f"
  Shift_R + slash
```

The `--clearmodifiers` flag is critical. Without it, xdotool sends the synthetic keypress *with Right Shift still held*, producing wrong results.

## The Complete Binding Reference

### Navigation

| Binding | Action | Vim Equivalent |
|---------|--------|----------------|
| RShift + h/j/k/l | Arrow keys | hjkl |
| RShift + 0 | Beginning of line | 0 |
| RShift + 4 | End of line | $ |
| RShift + u | Page up | Ctrl+u |
| RShift + d | Page down | Ctrl+d |
| RShift + w | Next word | w |
| RShift + b | Previous word | b |
| RShift + g | Top of document | gg |
| LShift + RShift + g | Bottom of document | G |

### Editing

| Binding | Action | Vim Equivalent |
|---------|--------|----------------|
| RShift + x | Delete character | x |
| RShift + y | Copy | y (yank) |
| RShift + p | Paste | p (put) |
| RShift + z | Undo | u |
| RShift + r | Redo | Ctrl+r |

### Search

| Binding | Action | Vim Equivalent |
|---------|--------|----------------|
| RShift + / | Find | / |
| RShift + n | Next result | n |

## Setup Instructions

### 1. Install Dependencies

```bash
# Arch Linux
sudo pacman -S xdotool xbindkeys xorg-xmodmap

# Debian/Ubuntu
sudo apt install xdotool xbindkeys x11-xserver-utils
```

### 2. Create Configuration Files

Place the xmodmap config at `~/.Xmodmap` and the xbindkeys config at `~/.xbindkeysrc`.

### 3. Load on Startup

Add to your `~/.xinitrc` or window manager startup:

```bash
xmodmap ~/.Xmodmap
xbindkeys
```

For i3, add to `~/.config/i3/config`:

```bash
exec_always --no-startup-id xmodmap ~/.Xmodmap
exec --no-startup-id xbindkeys
```

### 4. Finding Keycodes

Your keyboard might use different keycodes. Find them with `xev`:

```bash
xev | grep keycode
# Press keys and note the numbers
```

## Bonus: Caps Lock as Escape

While we're remapping, there's no reason to tolerate Caps Lock. In `/etc/X11/xorg.conf.d/90-keyboard.conf`:

```
Section "InputClass"
    Identifier "keyboard-layout"
    MatchIsKeyboard "yes"
    Option "XkbOptions" "caps:escape"
    Option "AutoRepeat" "200 20"
EndSection
```

This swaps Caps Lock to Escape system-wide, even before login. Combined with Right Shift as Mode_switch, you have the vim essentials available everywhere: Escape to exit, hjkl to navigate.

## Why This Works

Most "vim everywhere" solutions fail because they require mode switching or conflict with normal typing. This approach succeeds because:

1. **No modes**: You're always in "insert mode." Navigation is accessed by holding a modifier, not switching states.

2. **No conflicts**: Right Shift + letter never occurs in normal typing. There's no ambiguity.

3. **Muscle memory transfers**: The spatial layout matches vim exactly. hjkl are arrow keys, 0/$ are line boundaries, etc.

4. **System-wide**: Works in browsers, terminals, editors, Slack, PDF readers, everywhere X11 runs.

5. **Minimal latency**: xmodmap operates at the X server level with effectively zero overhead. xbindkeys adds a few milliseconds for synthesized keys.

## Limitations

- **X11 only**: This doesn't work on Wayland (yet). You'd need a Wayland-native solution.
- **No visual mode**: There's no equivalent to vim's visual selection. You'd need to hold regular Shift while using Right Shift navigation for selection.
- **Some app conflicts**: Apps that use Right Shift specifically (rare) will break.

## Conclusion

Right Shift was wasted real estate. Now it's the key to vim-style navigation in every application. The system took about an hour to configure initially, and I've been using it for months without looking back.

If you spend significant time outside of vim but wish you had its navigation, this might be worth the setup cost. The investment is one-time; the productivity gain is permanent.
