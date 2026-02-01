---
title: "Taming NVIDIA Hybrid Graphics on Arch Linux: A Practical Guide to PRIME Offloading"
date: 2026-01-31
description: "A complete guide to configuring NVIDIA PRIME Render Offload on Arch Linux with Intel+NVIDIA hybrid graphics"
category: linux
tags: [nvidia, arch-linux, graphics, prime, x11]
draft: false
---

If you're running a laptop with both Intel integrated graphics and an NVIDIA GPU, you've entered one of Linux's most notorious configuration rabbit holes. After weeks of debugging display corruption, input lag, and suspend/resume failures, I've finally landed on a stable setup. Here's how it works.

## The Problem

Modern laptops with "hybrid graphics" (Intel + NVIDIA) are designed to use the power-efficient Intel GPU for basic tasks and switch to NVIDIA for demanding workloads. Windows and macOS handle this transparently. On Linux, it requires explicit configuration.

The symptoms of a broken setup are varied and confusing:
- Screen tearing during video playback
- Display corruption after waking from suspend
- Input lag in terminals and editors
- Complete black screens on boot

## The Architecture: PRIME Offloading

My solution uses **PRIME Render Offload**, where the Intel GPU (via the modesetting driver) acts as the primary display controller, and NVIDIA handles GPU-accelerated workloads on demand.

The key insight: you're not switching between GPUs. The Intel GPU *always* drives the display. NVIDIA renders frames and hands them to Intel for display output.

### Boot Parameters

In `/boot/loader/entries/arch.conf` (or your bootloader's equivalent):

```
options cryptdevice=UUID=...:cryptlvm root=/dev/mapper/vg0-root \
    nvidia-drm.modeset=1 \
    nvidia.NVreg_PreserveVideoMemoryAllocations=1 \
    nvidia.NVreg_DynamicPowerManagement=2
```

What these do:

- **`nvidia-drm.modeset=1`**: Enables Direct Rendering Manager kernel mode setting for NVIDIA. Required for Wayland and helps with tearfree displays on X11.

- **`NVreg_PreserveVideoMemoryAllocations=1`**: The suspend/resume fix. Without this, NVIDIA discards video memory on suspend, causing display corruption on wake. With it, the driver saves and restores VRAM contents.

- **`NVreg_DynamicPowerManagement=2`**: Controls GPU power states. Value `2` enables fine-grained power management. I've also experimented with `0` (disabled) when experiencing input lag.

### Early Module Loading via Initramfs

Getting the module load order right is critical. In `/etc/mkinitcpio.conf`:

```bash
MODULES=(i915 nvidia nvidia_modeset nvidia_uvm nvidia_drm)
```

Note: **i915 comes first**. This ensures the Intel GPU initializes before NVIDIA, establishing the correct primary/secondary relationship. Without this, you might get a working display but with subtle issues like incorrect resolution or missing outputs.

The HOOKS line must include `kms` for kernel mode setting:

```bash
HOOKS=(base udev autodetect modconf kms keyboard keymap consolefont block encrypt lvm2 resume filesystems fsck)
```

After editing, rebuild: `sudo mkinitcpio -P`

### Module Options

Create `/etc/modprobe.d/nvidia-power-management.conf`:

```bash
options nvidia NVreg_PreserveVideoMemoryAllocations=1
options nvidia-drm modeset=1
options nvidia NVreg_DynamicPowerManagement=0x00
```

This provides redundancy with boot parameters and ensures consistent behavior if the kernel is booted with different options.

### X11 Initialization

In `~/.xinitrc`, before starting the window manager:

```bash
xrandr --setprovideroutputsource modesetting NVIDIA-0 2>/dev/null || true
xrandr --auto
```

This connects NVIDIA as an output source to the modesetting driver. The `2>/dev/null || true` prevents errors if NVIDIA isn't available (useful for debugging or if you ever boot without the discrete GPU).

## The Compositor: picom with NVIDIA Quirks

Compositors on NVIDIA require specific settings to avoid tearing and rendering bugs. My `/home/trevor/.config/picom/picom.conf`:

```ini
backend = "glx";
vsync = true;
use-damage = false;          # NVIDIA often behaves better with this off
xrender-sync-fence = true;   # Specifically helps NVIDIA GLX
glx-no-stencil = true;       # Recommended for NVIDIA
glx-no-rebind-pixmap = true; # Recommended for NVIDIA

unredir-if-possible = false; # Breaks vsync when enabled
```

Key points:
- **`use-damage = false`**: NVIDIA's damage tracking is unreliable. Disabling it forces full-frame redraws, slightly increasing GPU usage but fixing rendering glitches.
- **`glx-no-stencil`** and **`glx-no-rebind-pixmap`**: NVIDIA-specific optimizations that reduce overhead.

## Debugging Tips

### Check Provider Setup

```bash
xrandr --listproviders
```

You should see two providers: `modesetting` and `NVIDIA-0`. If NVIDIA isn't listed, the module didn't load correctly.

### Monitor Logs

```bash
# Picom logs
cat ~/.picom_logs.log

# Journal for NVIDIA
journalctl -b | grep -i nvidia

# Check loaded modules
lsmod | grep nvidia
```

### Common Issues

**"Another composite manager is already running"**: picom is trying to start twice. Check your i3 config for duplicate `exec` lines.

**"Duplicate vblank event"**: A known NVIDIA quirk. Usually harmless but can indicate vsync issues.

**Display corruption after suspend**: Verify `NVreg_PreserveVideoMemoryAllocations=1` is set in both boot params and modprobe.d.

## Why Not Use nvidia-prime or optimus-manager?

These tools work well for some users, but they typically implement *GPU switching* rather than *offloading*. This means:
- Logout/login required to change GPUs
- All or nothing: either everything runs on NVIDIA (power hungry) or Intel (no GPU acceleration)
- More moving parts to break

PRIME offload runs both GPUs simultaneously, with per-application control via environment variables:

```bash
__NV_PRIME_RENDER_OFFLOAD=1 __GLX_VENDOR_LIBRARY_NAME=nvidia glxgears
```

## Conclusion

NVIDIA hybrid graphics on Linux is solvable, but demands understanding the full stack: kernel modules, initramfs, X11 initialization, and compositor configuration. The configuration I've outlined handles the common failure modes: boot failures, display corruption, suspend/resume issues, and screen tearing.

The key is treating it as a unified system where each layer must be correctly configured, rather than a single setting to toggle.
