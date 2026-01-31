---
title: "gpu tech"
date: "2023-06-29"
tags: []
category: "misc"
---

GPU on Linux

## Install

1. `sudo pacman -S nvida nvidia-settings`
1. `nvidia-smi` - note that you should get valid output, but no GPU detection
1. Reboot
1. `nvidia-smi` - now you should see your GPU. Try doing something that uses the GPU, such as running `privateGPT` or simply starting `alacritty`, then run this again. You should get output such as the following:


```
Thu Jun 29 17:23:12 2023
+---------------------------------------------------------------------------------------+
| NVIDIA-SMI 535.54.03              Driver Version: 535.54.03    CUDA Version: 12.2     |
|-----------------------------------------+----------------------+----------------------+
| GPU  Name                 Persistence-M | Bus-Id        Disp.A | Volatile Uncorr. ECC |
| Fan  Temp   Perf          Pwr:Usage/Cap |         Memory-Usage | GPU-Util  Compute M. |
|                                         |                      |               MIG M. |
|=========================================+======================+======================|
|   0  NVIDIA GeForce GTX 1060 6GB    Off | 00000000:01:00.0  On |                  N/A |
|  9%   54C    P8               8W / 120W |    721MiB /  6144MiB |      0%      Default |
|                                         |                      |                  N/A |
+-----------------------------------------+----------------------+----------------------+

+---------------------------------------------------------------------------------------+
| Processes:                                                                            |
|  GPU   GI   CI        PID   Type   Process name                            GPU Memory |
|        ID   ID                                                             Usage      |
|=======================================================================================|
|    0   N/A  N/A      1151      G   /usr/lib/Xorg                               317MiB |
|    0   N/A  N/A      3193      G   ...9610433,15657988618996412043,262144      175MiB |
|    0   N/A  N/A      3814      G   alacritty                                     8MiB |
|    0   N/A  N/A      5263      G   alacritty                                     8MiB |
|    0   N/A  N/A      6811      G   alacritty                                     8MiB |
|    0   N/A  N/A     29137      G   alacritty                                     8MiB |
|    0   N/A  N/A     30324      C   python3                                     188MiB |
+---------------------------------------------------------------------------------------+
```
