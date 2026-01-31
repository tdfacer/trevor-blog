---
title: "kindle tech"
date: "2023-02-21"
tags: []
category: "misc"
---

## Transfer Media to Kindle

### Email

Kindle provides a way to transfer content to your device via email. Kindle provides an email address specific to your account which can receive emails with documents attached which Amazon will then convert to the correct format and make available to your device. Note that only approved sender email addresses can send these emails.

One can log into their Amazon account -> "Account Settings" -> "Digital Services and Device Support" -> "Kindle Devices" -> "Devices & Content" -> "Preferences" -> "Personal Document Settings" to find your Kindle email address and modify relevant configuration, e.g., "approved" sender email addresses. More than one sender email can be added.

Once you have allowed your email address, simply send a new email to your Kindle email address from your approved email address with a PDF document attachment. No subject or body is necessary on the email.

After sending an email with your content, allow a few minutes for Amazon to process the message. You will then see the content available for download in your Library.

## USB

Your Kindle can be mounted like any other filesystem. To mount:

```
# Identify current devices
lsblk

# Plug in your Kindle via USB

# Identify the Kindle device by comparing the current lsblk output with previous output
lsblk

# Mount with: sudo mount <your_device> <target_directory>
sudo mount /dev/sdf /mnt/usb
```
