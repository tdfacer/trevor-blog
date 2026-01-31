---
title: "Building and Maintaining docker-mcp for Arch Linux"
date: 2025-12-14
category: linux
tags: [arch, aur, docker, mcp, packaging]
description: "How I packaged Docker's MCP Gateway plugin for the AUR, and gotchas for non-Docker Desktop users."
---

I recently noticed a new Docker plugin that boasts the ability to simplify MCP server management. For someone like me who can't keep my hands off of shiny new tools, this could be a game-changer.

The first thing I did was skim through the readme on the [project's GitHub page](https://github.com/docker/mcp-gateway). I then checked to see if an Arch Linux AUR package existed for it, which would simplify installation. Unfortunately, there wasn't one available yet, so I decided to build one myself.

Luckily, Claude Code made this simple. I cloned the repo, created a PKGBUILD file, and had a build ready within an hour. I then went to test it out locally and realized there were some gotchas to be aware of if you are *not* using Docker Desktop.

## What is docker-mcp?

Docker MCP (Model Context Protocol) Gateway is a Docker CLI plugin that helps manage MCP servers. It allows you to:

- Run MCP servers as containers
- Manage secrets for MCP servers
- Configure which tools and prompts are available to your AI assistants

The plugin integrates with Docker's CLI, so you can run commands like `docker mcp list` or `docker mcp run`.

## Building the AUR Package

### Why the Package is Named docker-mcp

The upstream repository is called `mcp-gateway`, but I named the AUR package `docker-mcp` because:

- It matches what users type: `docker mcp`
- It matches the binary name: `docker-mcp`
- It follows the existing pattern: `docker-buildx`, `docker-compose`

### Key Build Differences from Upstream

The PKGBUILD differs from upstream's `make docker-mcp` in several ways:

| Aspect | Upstream | AUR Package | Reason |
|--------|----------|-------------|--------|
| CGO | Disabled (static) | Enabled | PIE/RELRO security |
| Stripping | Manual (`-s -w`) | makepkg auto | Debug package support |
| Linkage | Static binary | External linkage | Full RELRO protection |
| Hardening | Basic | PIE + RELRO | Arch security guidelines |

These changes follow Arch's [Go packaging guidelines](https://wiki.archlinux.org/title/Go_package_guidelines) and security best practices.

## Installation

Once published, you can install it with your favorite AUR helper:

```bash
yay -S docker-mcp
# or
paru -S docker-mcp
```

Or manually:

```bash
git clone https://aur.archlinux.org/docker-mcp.git
cd docker-mcp
makepkg -si
```

## Gotchas for Non-Docker Desktop Users

If you're running Docker Engine directly on Linux (not Docker Desktop), there are a few things you need to configure manually.

### Secrets Management

The `docker mcp` command expects secrets to be managed through Docker's secrets system. On Docker Desktop, this is handled automatically. On standalone Docker Engine, you need to set up secrets manually.

Docker MCP looks for secrets in `~/.docker/mcp/secrets.json`. Create this file if it doesn't exist:

```bash
mkdir -p ~/.docker/mcp
echo '{}' > ~/.docker/mcp/secrets.json
```

To add a secret (like an API key for an MCP server):

```bash
docker mcp secrets set OPENAI_API_KEY
# Enter your key when prompted
```

### Docker Socket Permissions

MCP servers run as containers, so they need access to the Docker socket. Make sure your user is in the `docker` group:

```bash
sudo usermod -aG docker $USER
# Log out and back in for changes to take effect
```

### Container Networking

Some MCP servers need to communicate with each other or with services on your host. If you run into networking issues:

```bash
# Check if the mcp network exists
docker network ls | grep mcp

# Create it if needed
docker network create mcp
```

## Testing the Installation

After installing, verify everything works:

```bash
# Check the plugin is recognized
docker mcp --help

# List available MCP servers from the catalog
docker mcp catalog

# Run a simple MCP server
docker mcp run fetch
```

## Updating the Package

When upstream releases a new version, I update the AUR package. The process is straightforward:

```bash
cd ~/aur-packages/docker-mcp

# Update version in PKGBUILD
vim PKGBUILD
# Change: pkgver=0.XX.0
# Reset: pkgrel=1

# Update checksums
updpkgsums

# Test the build
makepkg -sf
namcap PKGBUILD

# Regenerate .SRCINFO and push
makepkg --printsrcinfo > .SRCINFO
git add PKGBUILD .SRCINFO
git commit -m "Update to version 0.XX.0"
git push
```

## Resources

- [AUR Package](https://aur.archlinux.org/packages/docker-mcp)
- [Upstream Repository](https://github.com/docker/mcp-gateway)
- [Docker MCP Documentation](https://docs.docker.com/ai/mcp-catalog-and-toolkit/)
- [AUR Submission Guidelines](https://wiki.archlinux.org/title/AUR_submission_guidelines)

If you run into issues with the package, leave a comment on the AUR page or open an issue upstream.
