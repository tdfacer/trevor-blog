#!/usr/bin/env npx tsx
/**
 * Create a new tech article with the correct frontmatter.
 *
 * Usage:
 *   npm run new:tech "Article Title" -- --category linux
 */

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const categoryIdx = args.indexOf('--category');
const category = categoryIdx !== -1 ? args[categoryIdx + 1] : null;
const title = args.find(arg => !arg.startsWith('--') && arg !== category);

const validCategories = ['ai', 'linux', 'aws', 'neovim', 'git', 'devops', 'networking', 'web', 'misc'];

if (!title || !category) {
  console.error('Usage: npm run new:tech "Article Title" -- --category linux');
  console.error('');
  console.error('Valid categories:', validCategories.join(', '));
  process.exit(1);
}

if (!validCategories.includes(category)) {
  console.error(`Invalid category: ${category}`);
  console.error('Valid categories:', validCategories.join(', '));
  process.exit(1);
}

const date = new Date().toISOString().slice(0, 10);
const slug = title
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const categoryDir = join(process.cwd(), 'src/content/tech', category);
if (!existsSync(categoryDir)) {
  mkdirSync(categoryDir, { recursive: true });
}

const filename = `${slug}.md`;
const filepath = join(categoryDir, filename);

if (existsSync(filepath)) {
  console.error(`File already exists: ${filepath}`);
  process.exit(1);
}

const content = `---
title: "${title}"
date: ${date}
category: ${category}
tags: []
draft: true
---

Write your article here...
`;

writeFileSync(filepath, content);
console.log(`Created: src/content/tech/${category}/${filename}`);
console.log(`Edit: nvim ${filepath}`);
