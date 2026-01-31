#!/usr/bin/env npx tsx
/**
 * Create a new blog post with the correct frontmatter.
 *
 * Usage:
 *   npm run new:post "My Post Title"
 */

import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const title = process.argv[2];

if (!title) {
  console.error('Usage: npm run new:post "My Post Title"');
  process.exit(1);
}

const date = new Date().toISOString().slice(0, 10);
const slug = title
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const filename = `${date}-${slug}.md`;
const filepath = join(process.cwd(), 'src/content/blog', filename);

if (existsSync(filepath)) {
  console.error(`File already exists: ${filepath}`);
  process.exit(1);
}

const content = `---
title: "${title}"
date: ${date}
description: ""
tags: []
draft: true
---

Write your post here...
`;

writeFileSync(filepath, content);
console.log(`Created: src/content/blog/${filename}`);
console.log(`Edit: nvim ${filepath}`);
