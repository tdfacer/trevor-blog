---
name: blog-post
description: "Create blog posts and tech articles formatted for Trevor's Astro blog. Use when creating new blog content, writing technical articles, or drafting posts. Supports two content types: time-focused blog posts and category-based tech reference articles."
---

# Blog Post Creation

Create properly formatted markdown content for this Astro-based blog at blog.trevorfacer.com.

## Content Types

### Blog Posts (`src/content/blog/`)

Time-focused posts (tutorials, announcements, project updates).

**File naming**: `YYYY-MM-DD-slug-name.md`

**Frontmatter**:
```yaml
---
title: "Post Title"
date: YYYY-MM-DD
description: "One sentence summary."
tags: [tag1, tag2]
draft: false
---
```

### Tech Articles (`src/content/tech/[category]/`)

Reference-focused articles organized by category.

**Categories**: `ai`, `aws`, `devops`, `git`, `linux`, `misc`, `neovim`, `networking`, `web`

**File naming**: `article-slug.md` in appropriate category folder

**Frontmatter**:
```yaml
---
title: "Article Title"
date: YYYY-MM-DD
category: linux
description: "What this covers."
tags: [tag1, tag2]
draft: false
---
```

## Workflow

1. **Determine content type**: Blog post (timely) vs tech article (reference)
2. **For tech articles**: Select category from the allowed list
3. **Write frontmatter**: All required fields, set `draft: true` if incomplete
4. **Write content**: Follow formatting conventions below
5. **Create file**: Use proper naming convention and location

Alternatively, use the helper scripts:
- `npm run new:post "Title"` - Creates blog post with template
- `npm run new:tech "Title" -- --category linux` - Creates tech article

## Formatting Conventions

- **Headings**: H2 (`##`) for major sections, H3 (`###`) for subsections
- **Code blocks**: Always specify language (` ```typescript `, ` ```bash `, etc.)
- **Links**: `[text](url)` format
- **Emphasis**: `**bold**` for important terms, `*italic*` sparingly
- **Lists**: `-` for unordered, `1.` for ordered
- **Inline code**: Backticks for commands, functions, file paths

## Example: Blog Post

```markdown
---
title: "Building a CLI Tool with Go"
date: 2026-01-31
description: "A practical guide to creating command-line tools in Go."
tags: [go, cli, tutorial]
draft: false
---

Brief intro paragraph setting context.

## Getting Started

First section content with [relevant link](https://example.com).

### Prerequisites

- Go 1.21+
- Basic terminal knowledge

## Implementation

Walk through the implementation.

```go
package main

func main() {
    // code here
}
```

## Conclusion

Wrap-up thoughts and next steps.
```

## Example: Tech Article

```markdown
---
title: "Docker Compose Reference"
date: 2026-01-31
category: devops
description: "Quick reference for Docker Compose commands and configuration."
tags: [docker, containers, reference]
draft: false
---

## Overview

Brief description of the topic.

## Common Commands

```bash
docker compose up -d
docker compose down
docker compose logs -f
```

## Configuration

Key configuration options:

| Option | Description |
|--------|-------------|
| `build` | Build context |
| `ports` | Port mappings |

## Resources

- [Official Docs](https://docs.docker.com/compose/)
```
