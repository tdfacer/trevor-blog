#!/usr/bin/env npx tsx
/**
 * Migration script to convert Jekyll content to Astro format.
 *
 * Usage:
 *   npm run migrate -- --source /path/to/jekyll/site
 *
 * This script:
 * 1. Reads Jekyll _posts and _tech directories
 * 2. Converts frontmatter to Astro format
 * 3. Converts {% highlight %} blocks to fenced code blocks
 * 4. Fixes internal links
 * 5. Copies images to public/images
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, copyFileSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

const args = process.argv.slice(2);
const sourceIdx = args.indexOf('--source');
const sourcePath = sourceIdx !== -1 ? args[sourceIdx + 1] : null;

if (!sourcePath) {
  console.log('Usage: npm run migrate -- --source /path/to/jekyll/site');
  console.log('');
  console.log('Expected Jekyll structure:');
  console.log('  _posts/       -> src/content/blog/');
  console.log('  _tech/        -> src/content/tech/{category}/');
  console.log('  assets/images -> public/images/');
  process.exit(1);
}

const BLOG_DIR = join(process.cwd(), 'src/content/blog');
const TECH_DIR = join(process.cwd(), 'src/content/tech');
const IMAGES_DIR = join(process.cwd(), 'public/images');

// Ensure directories exist
[BLOG_DIR, TECH_DIR, IMAGES_DIR].forEach(dir => {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
});

// Category mapping based on file path or tags
function inferCategory(filePath: string, frontmatter: Record<string, unknown>): string {
  const lowerPath = filePath.toLowerCase();
  const rawTags = frontmatter.tags;
  const tags: string[] = Array.isArray(rawTags) ? rawTags : (typeof rawTags === 'string' ? [rawTags] : []);
  const lowerTags = tags.map(t => String(t).toLowerCase());

  if (lowerPath.includes('aws') || lowerTags.includes('aws')) return 'aws';
  if (lowerPath.includes('linux') || lowerTags.includes('linux') || lowerTags.includes('bash')) return 'linux';
  if (lowerPath.includes('neovim') || lowerPath.includes('vim') || lowerTags.includes('neovim') || lowerTags.includes('vim')) return 'neovim';
  if (lowerPath.includes('git') || lowerTags.includes('git')) return 'git';
  if (lowerPath.includes('docker') || lowerPath.includes('kubernetes') || lowerTags.includes('docker') || lowerTags.includes('devops')) return 'devops';
  if (lowerPath.includes('network') || lowerTags.includes('networking')) return 'networking';
  if (lowerPath.includes('ai') || lowerPath.includes('ml') || lowerTags.includes('ai') || lowerTags.includes('machine-learning')) return 'ai';
  if (lowerPath.includes('web') || lowerPath.includes('javascript') || lowerPath.includes('html')) return 'web';

  return 'misc';
}

// Parse Jekyll frontmatter
function parseFrontmatter(content: string): { frontmatter: Record<string, unknown>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };

  const frontmatterStr = match[1];
  const body = match[2];
  const frontmatter: Record<string, unknown> = {};

  frontmatterStr.split('\n').forEach(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) return;
    const key = line.slice(0, colonIdx).trim();
    let value: unknown = line.slice(colonIdx + 1).trim();

    // Handle arrays [item1, item2]
    if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
    }
    // Handle quoted strings
    else if (typeof value === 'string' && (value.startsWith('"') || value.startsWith("'"))) {
      value = value.slice(1, -1);
    }

    frontmatter[key] = value;
  });

  return { frontmatter, body };
}

// Convert Jekyll highlight blocks to fenced code blocks
function convertHighlights(content: string): string {
  // {% highlight lang %} ... {% endhighlight %}
  return content.replace(
    /\{%\s*highlight\s+(\w+)\s*%\}([\s\S]*?)\{%\s*endhighlight\s*%\}/g,
    (_, lang, code) => '```' + lang + '\n' + code.trim() + '\n```'
  );
}

// Fix internal links
function fixLinks(content: string): string {
  // Fix links to tdfacer.github.io
  content = content.replace(/https?:\/\/tdfacer\.github\.io\/tech\//g, '/tech/');
  content = content.replace(/https?:\/\/tdfacer\.github\.io\/blog\//g, '/blog/');
  content = content.replace(/https?:\/\/tdfacer\.github\.io\//g, '/');

  // Fix image paths - use absolute paths from public/images
  content = content.replace(/\{\{\s*site\.baseurl\s*\}\}\/assets\/images\//g, '/images/');
  content = content.replace(/\/assets\/images\//g, '/images/');
  // Fix relative image paths like ../images/
  content = content.replace(/\(\.\.\/images\//g, '(/images/');
  content = content.replace(/!\[([^\]]*)\]\(\.\.\/images\//g, '![$1](/images/');

  // Remove Jekyll-specific image classes like {:class="img-responsive"}
  content = content.replace(/\{:\s*class="[^"]*"\s*\}/g, '');

  return content;
}

// Generate slug from filename
function generateSlug(filename: string): string {
  // Remove date prefix (YYYY-MM-DD-) and extension
  return filename
    .replace(/^\d{4}-\d{2}-\d{2}-/, '')
    .replace(/\.md$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Process a single markdown file
function processFile(filePath: string, type: 'blog' | 'tech'): void {
  const content = readFileSync(filePath, 'utf-8');
  const { frontmatter, body } = parseFrontmatter(content);

  // Extract date from filename or frontmatter
  const filename = basename(filePath);
  const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
  const date = dateMatch ? dateMatch[1] : (frontmatter.date as string) || new Date().toISOString().slice(0, 10);

  // Convert content
  let processedBody = convertHighlights(body);
  processedBody = fixLinks(processedBody);

  // Parse tags - handle arrays, space-separated strings, or missing
  let tags: string[] = [];
  if (Array.isArray(frontmatter.tags)) {
    tags = frontmatter.tags.map(t => String(t));
  } else if (typeof frontmatter.tags === 'string') {
    tags = frontmatter.tags.split(/[\s,]+/).filter(Boolean);
  }

  // Clean up date - extract just YYYY-MM-DD
  let cleanDate = date;
  const dateOnly = String(date).match(/(\d{4}-\d{2}-\d{2})/);
  if (dateOnly) cleanDate = dateOnly[1];

  // Generate new frontmatter
  const newFrontmatter: Record<string, unknown> = {
    title: frontmatter.title || filename.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, ''),
    date: cleanDate,
    tags,
  };

  if (type === 'tech') {
    newFrontmatter.category = inferCategory(filePath, frontmatter);
  }

  if (frontmatter.description || frontmatter.excerpt) {
    newFrontmatter.description = frontmatter.description || frontmatter.excerpt;
  }

  // Build new content
  const newContent = [
    '---',
    ...Object.entries(newFrontmatter).map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}: [${value.map(v => `"${v}"`).join(', ')}]`;
      }
      return `${key}: "${value}"`;
    }),
    '---',
    '',
    processedBody.trim(),
    '',
  ].join('\n');

  // Determine output path
  const slug = generateSlug(filename);
  let outPath: string;

  if (type === 'blog') {
    outPath = join(BLOG_DIR, `${slug}.md`);
  } else {
    const category = newFrontmatter.category as string;
    const categoryDir = join(TECH_DIR, category);
    if (!existsSync(categoryDir)) mkdirSync(categoryDir, { recursive: true });
    outPath = join(categoryDir, `${slug}.md`);
  }

  writeFileSync(outPath, newContent);
  console.log(`✓ ${type}: ${filename} -> ${outPath.replace(process.cwd(), '.')}`);
}

// Copy images
function copyImages(sourceDir: string): void {
  if (!existsSync(sourceDir)) return;

  const files = readdirSync(sourceDir);
  files.forEach(file => {
    const srcPath = join(sourceDir, file);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      copyImages(srcPath);
    } else if (/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(file)) {
      const destPath = join(IMAGES_DIR, file);
      copyFileSync(srcPath, destPath);
      console.log(`✓ image: ${file}`);
    }
  });
}

// Main
console.log('Starting migration from:', sourcePath);
console.log('');

// Migrate blog posts
const postsDir = join(sourcePath, '_posts');
if (existsSync(postsDir)) {
  console.log('Migrating blog posts...');
  readdirSync(postsDir)
    .filter(f => f.endsWith('.md'))
    .forEach(f => processFile(join(postsDir, f), 'blog'));
  console.log('');
}

// Migrate tech articles
const techDir = join(sourcePath, '_tech');
if (existsSync(techDir)) {
  console.log('Migrating tech articles...');
  readdirSync(techDir)
    .filter(f => f.endsWith('.md'))
    .forEach(f => processFile(join(techDir, f), 'tech'));
  console.log('');
}

// Copy images
const assetsDir = join(sourcePath, 'assets', 'images');
if (existsSync(assetsDir)) {
  console.log('Copying images...');
  copyImages(assetsDir);
  console.log('');
}

const imagesDir = join(sourcePath, 'images');
if (existsSync(imagesDir)) {
  console.log('Copying images...');
  copyImages(imagesDir);
  console.log('');
}

console.log('Migration complete!');
console.log('');
console.log('Next steps:');
console.log('1. Review migrated content for any issues');
console.log('2. Run `npm run dev` to preview');
console.log('3. Fix any broken links or formatting');
