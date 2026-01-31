---
title: "Linux App Autostart"
date: "2023-05-20"
tags: ["tech", "linux", "autostart"]
category: "linux"
---

## Autostart Applications

There are many ways to automatically start applications on linux system startup. Here are some of my favorites for my environments:

### i3

In your `i3` config, you can use either of the following options to run an arbitrary script/command on system startup:

* `exec <script|command>` - This will run the script/command on initial system startup
* `exec_always <script|command>` - This will run the script/command whenver i3 is restarted

Also see [Arch Wiki](https://wiki.archlinux.org/title/I3#Autostart)

## XDG Autostart

XDG provides desktop entry specification that is supported on most linux systems. One can create an `autostart` directory in `$XDG_CONFIG_HOME` and/or `$XDG_CONFIG_DIRS` with destop entries that will be automatically started on system startup. The user-specific `$XDG_CONFIG_HOME` takes precedence. 

Example entry for `flameshot`:

``` $XDG_CONFIG_HOME/autostart/flameshot.desktop
[Desktop Entry]
Name=flameshot
Icon=flameshot
Exec=flameshot
Terminal=false
Type=Application
X-GNOME-Autostart-enabled=true
```

### systemd

Systemd services are powerful. One can write up a systemd service unit file to automate startup functionality, along with many other things. Here is an example of a systemd unit file:

```
[Unit]
Description=Sync Pictures to S3

[Service]
Type=simple
ExecStart=/home/trevor/.scripts/sync_pictures 
StandardOutput=null
StandardError=null
```

* Note the `ExecStart` that points to an arbitrary shell script
* Throw this unit file in `/usr/lib/systemd/system/<filename>.service`, e.g. `/usr/lib/systemd/system/sync-s3.service`
* Issue the `daemon-reload` so that the system recognizes your new entry.
* Enable your service with `sudo systemctl start sync-s3`
* Enable your service with `sudo systemctl enable sync-s3`

### startx

* Throw arbitrary shell scripts/commands in your `~/.xinitrc` (user) or `/etc/X11/xinit/xinitrc` (system)
* Start your system with `startx`
