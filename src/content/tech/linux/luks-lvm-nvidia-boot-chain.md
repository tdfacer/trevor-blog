---
title: "Full Disk Encryption with NVIDIA Early KMS: Getting LUKS, LVM, and Hybrid Graphics to Play Nice"
date: 2026-01-31
description: "Configuring Arch Linux with LUKS encryption, LVM, and NVIDIA hybrid graphics that all initialize correctly in the initramfs"
category: linux
tags: [luks, lvm, nvidia, encryption, arch-linux, mkinitcpio]
draft: false
---

Setting up full disk encryption on Linux is well-documented. Doing it while also needing early NVIDIA driver loading for proper display output is less so. Here's how I configured an Arch Linux system with LUKS encryption, LVM volume management, and NVIDIA hybrid graphics that all initialize correctly before the root filesystem mounts.

## The Challenge

A typical encrypted Linux boot works like this:

1. Bootloader loads kernel and initramfs
2. Initramfs prompts for LUKS passphrase
3. Encrypted volume unlocks, LVM activates
4. Root filesystem mounts, system boots

Adding NVIDIA complicates this because:
- The proprietary driver needs to load for display output
- On hybrid graphics (Intel + NVIDIA), the load order matters
- Display corruption occurs if NVIDIA isn't properly initialized before X starts
- Suspend/resume requires the driver to preserve video memory allocations

## The Boot Configuration

### Partition Layout

```
/dev/nvme0n1p1  512MB  EFI System Partition (FAT32, unencrypted)
/dev/nvme0n1p2  rest   LUKS2 encrypted container
  └─ /dev/mapper/cryptlvm  (decrypted LVM physical volume)
       └─ vg0              (volume group)
            ├─ vg0-swap    (swap logical volume)
            └─ vg0-root    (root logical volume, ext4)
```

The EFI partition must remain unencrypted (UEFI firmware can't read encrypted volumes). Everything else lives inside the LUKS container.

### Boot Entry (systemd-boot)

`/boot/loader/entries/arch.conf`:

```
title   Arch Linux
linux   /vmlinuz-linux
initrd  /intel-ucode.img
initrd  /initramfs-linux.img
options cryptdevice=UUID=5887daea-bb51-4693-9051-1ad82f6c2341:cryptlvm root=/dev/mapper/vg0-root resume=/dev/mapper/vg0-swap rw nvidia-drm.modeset=1 nvidia.NVreg_PreserveVideoMemoryAllocations=1
```

Breaking down the options:

- **`cryptdevice=UUID=...:cryptlvm`**: Points to the LUKS partition by UUID. `cryptlvm` is the mapper name that will appear as `/dev/mapper/cryptlvm`.

- **`root=/dev/mapper/vg0-root`**: The root logical volume inside the decrypted LVM.

- **`resume=/dev/mapper/vg0-swap`**: Enables hibernation resume from the encrypted swap.

- **`nvidia-drm.modeset=1`**: Enables kernel mode setting for NVIDIA. Required for Wayland and reduces tearing on X11.

- **`NVreg_PreserveVideoMemoryAllocations=1`**: Critical for suspend/resume. Without it, NVIDIA discards VRAM on suspend, causing display corruption on wake.

To find your LUKS partition UUID:
```bash
blkid -s UUID -o value /dev/nvme0n1p2
```

### The Initramfs Configuration

This is where the magic happens. The initramfs (initial RAM filesystem) is a minimal system that runs before the real root mounts. It must contain everything needed to unlock encryption, activate LVM, and (for early display) load GPU drivers.

`/etc/mkinitcpio.conf`:

```bash
MODULES=(i915 nvidia nvidia_modeset nvidia_uvm nvidia_drm)

HOOKS=(base udev autodetect modconf kms keyboard keymap consolefont block encrypt lvm2 resume filesystems fsck)
```

#### Module Loading Order Matters

```bash
MODULES=(i915 nvidia nvidia_modeset nvidia_uvm nvidia_drm)
```

**i915 must come first.** On hybrid graphics laptops, the Intel GPU is the primary display controller. Loading it before NVIDIA ensures:
- The LUKS passphrase prompt displays on the correct output
- The modesetting driver initializes before NVIDIA in X11
- PRIME offloading works correctly post-boot

If you load NVIDIA first, you may get output on an external port (if connected) but nothing on the laptop panel during boot.

#### Hook Ordering

```bash
HOOKS=(base udev autodetect modconf kms keyboard keymap consolefont block encrypt lvm2 resume filesystems fsck)
```

The order here is critical:

1. **`base udev autodetect modconf`**: Core initialization
2. **`kms`**: Kernel Mode Setting, loads GPU modules early
3. **`keyboard keymap consolefont`**: Keyboard input for passphrase entry (must come before `encrypt`)
4. **`block`**: Block device handling
5. **`encrypt`**: LUKS decryption
6. **`lvm2`**: LVM activation (must come after `encrypt` since LVM is inside the encrypted container)
7. **`resume`**: Hibernation resume (must come after `lvm2` since swap is an LV)
8. **`filesystems fsck`**: Final filesystem mounting

Mistakes here result in either:
- No passphrase prompt (keyboard hooks after encrypt)
- "Volume group not found" (lvm2 before encrypt)
- No display output (kms missing or modules misconfigured)

### Rebuilding the Initramfs

After editing `mkinitcpio.conf`:

```bash
sudo mkinitcpio -P
```

The `-P` flag rebuilds all presets (typically `linux` and `linux-fallback`). Watch for errors in the output. Successful builds show each hook being added:

```
==> Building image from preset: /etc/mkinitcpio.d/linux.preset: 'default'
...
==> Running hook: [encrypt]
==> Running hook: [lvm2]
...
==> Image generation successful
```

## Module Options for Power Management

Beyond boot parameters, create persistent module options in `/etc/modprobe.d/nvidia-power-management.conf`:

```bash
options nvidia NVreg_PreserveVideoMemoryAllocations=1
options nvidia-drm modeset=1
options nvidia NVreg_DynamicPowerManagement=0x00
```

This provides redundancy with kernel parameters and ensures consistent behavior if you ever boot with different kernel options.

## Verifying the Configuration

### Check Module Load Order

After booting:

```bash
lsmod | grep -E 'nvidia|i915'
```

Both should be loaded. Check dmesg for load order:

```bash
dmesg | grep -E 'nvidia|i915' | head -20
```

### Verify Encryption

```bash
lsblk -f
```

Should show:
```
nvme0n1
├─nvme0n1p1        vfat   EFI        /boot
└─nvme0n1p2        crypto_LUKS
  └─cryptlvm       LVM2_member
    ├─vg0-swap     swap             [SWAP]
    └─vg0-root     ext4             /
```

### Test Suspend/Resume

```bash
systemctl suspend
```

After waking, check for display corruption. If present, verify `NVreg_PreserveVideoMemoryAllocations` is active:

```bash
cat /proc/driver/nvidia/params | grep PreserveVideoMemory
```

Should show `PreserveVideoMemoryAllocations: 1`.

## Troubleshooting

### Boot Drops to Recovery Shell

Usually means the encrypt or lvm2 hooks failed. Common causes:
- UUID typo in boot entry
- Missing `encrypt` or `lvm2` hooks
- Hooks in wrong order

From the recovery shell:
```bash
cryptsetup open /dev/nvme0n1p2 cryptlvm
vgchange -ay
mount /dev/vg0/root /new_root
```

Then investigate logs in `/new_root/var/log/`.

### No Display During Boot

- Verify MODULES order (i915 before nvidia)
- Ensure `kms` hook is present
- Try removing `nvidia` modules temporarily to verify i915 works alone

### "Volume group not found"

`lvm2` hook is running before `encrypt`. Fix the HOOKS order.

### Keyboard Not Working at Passphrase Prompt

`keyboard` hook must come before `encrypt`. Also verify `keymap` is present if you use a non-US keyboard layout.

## Why This Complexity?

The intersection of full disk encryption and early GPU initialization represents two systems that both want to run before the other. Encryption needs to run before mounting root, but GPU drivers traditionally load from the root filesystem.

The solution is embedding both into the initramfs:
- LUKS/LVM support for unlocking the disk
- GPU modules for displaying the passphrase prompt

Once correctly configured, this setup provides:
- Full encryption of all data at rest
- Proper display output from the earliest boot stage
- Working suspend/resume with NVIDIA
- Hibernation to encrypted swap

It's a complex stack, but each piece serves a purpose in maintaining both security and usability.
