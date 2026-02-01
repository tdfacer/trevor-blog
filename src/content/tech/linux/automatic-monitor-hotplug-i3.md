---
title: "Seamless Monitor Hotplug on i3: udev Rules and Automatic Display Detection"
date: 2026-01-31
description: "How to set up automatic display detection when plugging in monitors on i3 using udev rules"
category: linux
tags: [i3, udev, xrandr, monitors, automation]
draft: false
---

One of the daily annoyances of laptop computing is plugging into a dock or external monitor and having to manually reconfigure displays. On macOS or Windows, it happens automatically. On Linux with a tiling window manager like i3, it requires explicit setup. Here's how I built automatic display detection that handles dock, undock, and multi-monitor configurations transparently.

## The Goal

When I plug my laptop into a USB-C dock or HDMI monitor, the system should:
1. Detect the new display(s)
2. Configure xrandr with appropriate resolutions and scaling
3. Not require any manual intervention or keyboard shortcuts

When I unplug, it should revert to laptop-only mode.

## The Architecture

The solution has three parts:

1. **udev rule**: Triggered by kernel events when displays connect/disconnect
2. **Auto-detect script**: Queries xrandr and applies the appropriate profile
3. **i3 integration**: Ensures polybar and workspaces behave correctly

## Part 1: The udev Rule

Create `/etc/udev/rules.d/95-monitor-hotplug.rules`:

```bash
# Trigger on any DRM (Direct Rendering Manager) change event
# This includes HDMI, DisplayPort, and other video output changes
ACTION=="change", SUBSYSTEM=="drm", RUN+="/usr/bin/systemd-cat -t monitor-hotplug /usr/bin/su trevor -c 'DISPLAY=:0 /home/trevor/.scripts/displays/auto-detect.sh'"
```

Key details:

- **`ACTION=="change"`**: Fires on display connect/disconnect, not just device addition
- **`SUBSYSTEM=="drm"`**: Targets the Direct Rendering Manager, which handles all display outputs
- **`systemd-cat -t monitor-hotplug`**: Logs script output to journalctl for debugging (`journalctl -t monitor-hotplug`)
- **`/usr/bin/su trevor -c '...'`**: udev runs as root, but X commands need to run as your user
- **`DISPLAY=:0`**: Required because udev doesn't have access to the X display environment variable

After creating the rule:
```bash
sudo udevadm control --reload-rules
```

## Part 2: The Auto-Detection Script

Create `~/.scripts/displays/auto-detect.sh`:

```bash
#!/bin/bash
# Auto-detect connected displays and apply appropriate profile

# Wait for display detection to settle (important for udev triggers)
sleep 1

# Detect what's connected
HDMI_CONNECTED=$(xrandr | grep "^HDMI-0 connected" | wc -l)
LAPTOP_CONNECTED=$(xrandr | grep "^eDP-1-1 connected" | wc -l)
DOCK_LEFT=$(xrandr | grep "^DP-2.1.5 connected" | wc -l)
DOCK_CENTER=$(xrandr | grep "^DP-2.2 connected" | wc -l)

echo "=== Display Auto-Detection ==="
echo "HDMI-0: $HDMI_CONNECTED"
echo "eDP-1-1: $LAPTOP_CONNECTED"
echo "DP-2.1.5: $DOCK_LEFT"
echo "DP-2.2: $DOCK_CENTER"

# Configure based on what's connected
if [ "$DOCK_LEFT" -eq 1 ] && [ "$DOCK_CENTER" -eq 1 ] && [ "$LAPTOP_CONNECTED" -eq 1 ]; then
    # Triple monitor dock setup
    echo "Configuring: Dock with 3 monitors"
    xrandr --output HDMI-0 --off \
           --output DP-0 --off \
           --output DP-1 --off \
           --output DP-2 --off \
           --output DP-3 --off \
           --output DP-2.1.5 --mode 1920x1080 --pos 0x0 --scale 2x2 \
           --output DP-2.2 --mode 1920x1080 --pos 3840x0 --scale 2x2 \
           --output eDP-1-1 --primary --mode 3840x2400 --pos 7680x0

elif [ "$HDMI_CONNECTED" -eq 1 ] && [ "$LAPTOP_CONNECTED" -eq 1 ]; then
    # HDMI + laptop
    echo "Configuring: Both monitors (2x scaling)"
    xrandr --output HDMI-0 --primary --mode 1920x1080 --scale 2x2 --pos 0x0 \
           --output eDP-1-1 --mode 3840x2400 --pos 3840x0 --scale 1x1

elif [ "$HDMI_CONNECTED" -eq 1 ]; then
    # External only (lid closed scenario)
    echo "Configuring: External monitor only"
    xrandr --output HDMI-0 --primary --mode 1920x1080 --scale 1x1 \
           --output eDP-1-1 --off

else
    # Laptop only (default)
    echo "Configuring: Laptop panel only"
    xrandr --output HDMI-0 --off \
           --output eDP-1-1 --primary --mode 3840x2400 --scale 1x1
fi

echo "=== Display configuration complete ==="
```

Make it executable:
```bash
chmod +x ~/.scripts/displays/auto-detect.sh
```

### Finding Your Output Names

The output names (`HDMI-0`, `eDP-1-1`, `DP-2.1.5`) are hardware-specific. Find yours with:

```bash
xrandr --query | grep " connected"
```

On NVIDIA with PRIME, laptop panels typically show as `eDP-1-1` (the modesetting name) rather than `LVDS-1` or similar.

### The sleep 1 is Important

Display detection via udev can fire before xrandr recognizes the new display. The one-second sleep allows the kernel to finish initializing the connection.

## Part 3: i3 Integration

In `~/.config/i3/config`:

```bash
# Run on i3 startup (not reload)
exec --no-startup-id ~/.scripts/displays/auto-detect.sh

# Keyboard shortcuts for manual override
bindsym $mod+Control+d exec --no-startup-id ~/.scripts/displays/auto-detect.sh
bindsym $mod+Control+1 exec --no-startup-id ~/.scripts/displays/laptop-only.sh
bindsym $mod+Control+2 exec --no-startup-id ~/.scripts/displays/external-only.sh
bindsym $mod+Control+3 exec --no-startup-id ~/.scripts/displays/both-monitors.sh
```

Use `exec` (not `exec_always`) for the startup call to avoid infinite loops when i3 reloads.

### Polybar Handling

If you use polybar, it needs to restart when monitors change. Add to your polybar launch script:

```bash
#!/bin/bash
# Kill existing instances
killall -q polybar

# Wait for processes to terminate
while pgrep -u $UID -x polybar >/dev/null; do sleep 1; done

# Launch on each monitor
for m in $(xrandr --query | grep " connected" | cut -d" " -f1); do
    MONITOR=$m polybar --reload mainbar &
done
```

Then in i3 config:
```bash
exec_always --no-startup-id ~/.config/i3/polybar.sh
```

The `exec_always` ensures polybar restarts on i3 reload, which you can trigger manually after display changes if needed.

## Debugging

### Check udev is Triggering

```bash
# Watch udev events in real-time
sudo udevadm monitor --property

# Plug/unplug a monitor and look for "change" events on drm subsystem
```

### Check Script Output

```bash
# View logged output from the script
journalctl -t monitor-hotplug -f

# Or run manually
DISPLAY=:0 ~/.scripts/displays/auto-detect.sh
```

### Common Issues

**Script doesn't run**: Verify the rule syntax and that udev reloaded. Check permissions on the script.

**xrandr fails with "Can't open display"**: The `DISPLAY=:0` environment variable is missing or X isn't running on `:0`. Check with `echo $DISPLAY` in your terminal.

**Displays flicker/loop**: Ensure you're not using `exec_always` for the auto-detect script in i3. udev already handles hotplug; i3 shouldn't also run it on every reload.

**Wrong outputs turn off**: Some docks present as multiple DP outputs even when only one monitor is connected. Adjust the grep patterns to match your hardware.

## Why Not arandr or autorandr?

These tools are excellent for manual profile management, and autorandr specifically handles hotplug via udev. The custom script approach offers:

- Complete control over scaling logic
- Integration with specific dock configurations
- Simpler debugging (it's just xrandr commands)
- No additional dependencies

For complex multi-dock scenarios or if you frequently switch between many different monitor configurations, autorandr's profile system may be worth investigating.

## Conclusion

Automatic display hotplug on i3 requires bridging the gap between kernel events (udev) and user-space display configuration (xrandr). The key is a properly constructed udev rule that runs your script as the right user with the right environment variables.

Once configured, plugging into a dock becomes as seamless as it is on other operating systems, with displays appearing and configuring themselves automatically.
