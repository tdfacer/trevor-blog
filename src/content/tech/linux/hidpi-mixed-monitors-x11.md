---
title: "HiDPI on X11 with Mixed Resolution Monitors: The xrandr Scaling Trick"
date: 2026-01-31
description: "How to configure per-monitor scaling on X11 using xrandr for mixed 4K and 1080p displays"
category: linux
tags: [x11, hidpi, xrandr, i3, scaling]
draft: false
---

Running a 4K laptop display alongside a 1080p external monitor on Linux presents a challenge that Wayland handles gracefully but X11 historically does not: per-monitor DPI scaling. Here's how I solved it using xrandr scaling and careful environment configuration.

## The Setup

- **Laptop panel**: 3840x2400 at 14 inches (approximately 192 DPI)
- **External monitors**: 1920x1080 (standard 96 DPI)
- **Window manager**: i3 (X11-based)

Without intervention, X11 applies a single DPI value system-wide. Set it to 192 for the laptop, and the external monitor shows comically tiny UI elements. Set it to 96 for the external, and the laptop becomes unusable with microscopic text.

## The Solution: xrandr Scaling

The key insight is that xrandr can scale monitor output independently of the application DPI. By scaling the 1080p monitor 2x, it occupies the same virtual pixel space as a 4K display, and applications render consistently across both.

```bash
xrandr --output HDMI-0 --primary --mode 1920x1080 --scale 2x2 --pos 0x0 \
       --output eDP-1-1 --mode 3840x2400 --pos 3840x0 --scale 1x1
```

What's happening:
- The 1080p monitor is rendered at 1920x1080 but scaled 2x, creating a 3840x2160 virtual resolution
- The laptop panel stays at native 3840x2400
- Both monitors now operate in roughly the same DPI space
- Applications configured for 192 DPI look correct on both displays

The position `--pos 3840x0` places the laptop screen to the right of the scaled external monitor.

## System-Wide DPI Configuration

With scaling handled at the xrandr level, set your DPI once and forget it.

### ~/.Xresources

```
Xft.dpi: 192
Xft.antialias: 1
Xft.hinting: 1
Xft.hintstyle: hintslight
Xft.rgba: rgb
```

This controls font rendering for Xft-aware applications, which includes most modern GTK and Qt apps.

### ~/.xinitrc

```bash
# GTK apps
# export GDK_SCALE=2  # Uncomment only if apps are too small

# Qt apps
export QT_AUTO_SCREEN_SCALE_FACTOR=1
export QT_FONT_DPI=192

# Java apps (IntelliJ, etc.)
export _JAVA_OPTIONS='-Dsun.java2d.uiScale=2'
```

Note: I've found `GDK_SCALE` unnecessary when using xrandr scaling. The 192 DPI from Xft.dpi is sufficient for GTK apps. However, Java applications need explicit configuration.

### rofi, dmenu, and Other Launchers

Some applications need DPI passed directly:

```bash
set $rofi "rofi -dpi 192 -show run"
```

This ensures rofi renders at the correct scale regardless of which monitor it appears on.

## Dock and Multi-Monitor Profiles

For a USB-C dock with multiple DisplayPort monitors, the configuration becomes more complex:

```bash
# Triple monitor: 2 external + laptop
xrandr --output DP-2.1.5 --mode 1920x1080 --pos 0x0 --scale 2x2 \
       --output DP-2.2 --mode 1920x1080 --pos 3840x0 --scale 2x2 \
       --output eDP-1-1 --primary --mode 3840x2400 --pos 7680x0
```

Here, both external 1080p monitors are scaled 2x and positioned side by side, with the laptop screen on the right.

## The Trade-offs

### Pros
- Consistent UI scaling across all monitors
- Works with any X11 window manager
- No need for Wayland or special compositor support
- Applications don't need per-monitor awareness

### Cons
- **GPU overhead**: Scaling a 1080p monitor to 4K requires rendering 4x the pixels. This increases GPU usage, though modern Intel integrated graphics handle it fine.
- **Slight blur**: Upscaling 1080p to 4K (virtual) introduces minor softness. For text-heavy work, it's barely noticeable. For pixel-art or precise graphics work, it may matter.
- **Mouse positioning**: The virtual desktop is larger than physical pixels on scaled monitors, which can feel slightly different when moving the cursor.

## Automatic Detection

Combining this with a display auto-detection script:

```bash
#!/bin/bash
HDMI_CONNECTED=$(xrandr | grep "^HDMI-0 connected" | wc -l)
LAPTOP_CONNECTED=$(xrandr | grep "^eDP-1-1 connected" | wc -l)

if [ "$HDMI_CONNECTED" -eq 1 ] && [ "$LAPTOP_CONNECTED" -eq 1 ]; then
    # Both: scale external monitor
    xrandr --output HDMI-0 --primary --mode 1920x1080 --scale 2x2 --pos 0x0 \
           --output eDP-1-1 --mode 3840x2400 --pos 3840x0 --scale 1x1
elif [ "$HDMI_CONNECTED" -eq 1 ]; then
    # External only: no scaling needed (native 1080p, lower DPI is acceptable)
    xrandr --output HDMI-0 --primary --mode 1920x1080 --scale 1x1 \
           --output eDP-1-1 --off
else
    # Laptop only
    xrandr --output HDMI-0 --off \
           --output eDP-1-1 --primary --mode 3840x2400 --scale 1x1
fi
```

## Why Not Wayland?

Wayland handles per-monitor DPI natively. Sway, for example, can set different scale factors per output. If you're starting fresh, this is the cleaner solution.

However, X11 remains necessary when:
- Your compositor or window manager is X11-only (i3, awesome, etc.)
- You rely on X11-specific features or applications
- Your NVIDIA GPU has incomplete Wayland support

The xrandr scaling approach bridges the gap, providing usable mixed-DPI support on X11 at the cost of some GPU overhead.

## Conclusion

X11's global DPI model seems broken for modern mixed-DPI setups, but xrandr's per-output scaling provides a practical workaround. The key is conceptualizing it correctly: you're not changing application DPI per monitor, you're making all monitors occupy equivalent virtual pixel space.

Set your DPI high (192 for a 4K laptop), scale lower-resolution monitors to match, and applications render consistently everywhere.
