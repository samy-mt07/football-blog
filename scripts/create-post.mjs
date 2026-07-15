#!/usr/bin/env node
/**
 * Creates a new blog post from structured JSON input — the single entry point
 * the n8n automation calls to publish an article.
 *
 * Usage:
 *   node scripts/create-post.mjs '{"title": "...", "excerpt": "...", ...}'
 *   node scripts/create-post.mjs path/to/post.json
 *   cat post.json | node scripts/create-post.mjs
 *
 * Input JSON shape:
 *   {
 *     "title": "Argentina Edge France in a Classic",       // required
 *     "excerpt": "One-line summary for the homepage card", // required
 *     "metaDescription": "SEO description for <head>",     // optional, falls back to excerpt
 *     "date": "2026-07-13",                                // optional, defaults to today
 *     "tag": "Match Report",                                // optional, defaults to "Match Report"
 *     "body": "## How it went\n\nMarkdown content...",      // required
 *     "coverImageUrl": "https://images.unsplash.com/...",  // optional
 *     "slug": "argentina-vs-france"                         // optional, derived from title if omitted
 *   }
 *
 * On success, prints a single line of JSON to stdout:
 *   {"ok": true, "slug": "...", "postPath": "...", "coverPath": "..." }
 * On failure, prints {"ok": false, "error": "..."} and exits with code 1.
 */

import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'src', 'content', 'posts');
const IMAGES_DIR = path.join(ROOT, 'public', 'images', 'posts');

const VALID_TAGS = ['Match Report', 'Preview', 'Opinion', 'News', 'Controversy'];

function fail(message) {
  console.log(JSON.stringify({ ok: false, error: message }));
  process.exit(1);
}

function slugify(input) {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function pathExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function readInput() {
  const arg = process.argv[2];

  if (arg) {
    // Argument is either inline JSON or a path to a JSON file.
    const trimmed = arg.trim();
    if (trimmed.startsWith('{')) {
      return trimmed;
    }
    const filePath = path.isAbsolute(trimmed) ? trimmed : path.resolve(process.cwd(), trimmed);
    const { readFile } = await import('node:fs/promises');
    return readFile(filePath, 'utf-8');
  }

  // No argument: read JSON from stdin.
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  if (chunks.length === 0) {
    fail('No input provided. Pass JSON as an argument, a file path, or via stdin.');
  }
  return Buffer.concat(chunks).toString('utf-8');
}

function escapeYamlString(str) {
  // Wrap in double quotes and escape embedded double quotes / backslashes.
  return `"${String(str).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

async function downloadImage(url, slug) {
  let response;
  try {
    response = await fetch(url);
  } catch (err) {
    throw new Error(`Failed to fetch cover image: ${err.message}`);
  }
  if (!response.ok) {
    throw new Error(`Cover image fetch failed with status ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const extFromType = contentType.includes('png')
    ? 'png'
    : contentType.includes('webp')
      ? 'webp'
      : contentType.includes('gif')
        ? 'gif'
        : 'jpg';

  await mkdir(IMAGES_DIR, { recursive: true });
  const filename = `${slug}.${extFromType}`;
  const destPath = path.join(IMAGES_DIR, filename);

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(destPath, buffer);

  // Public path Astro/the browser will use, e.g. /images/posts/argentina-vs-france.jpg
  return `/images/posts/${filename}`;
}

async function main() {
  const raw = await readInput();

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    fail(`Invalid JSON input: ${err.message}`);
  }

  const { title, excerpt, body, metaDescription, coverImageUrl } = data;
  const date = data.date || new Date().toISOString().slice(0, 10);
  const tag = VALID_TAGS.includes(data.tag) ? data.tag : 'Match Report';

  if (!title || typeof title !== 'string') fail('"title" is required and must be a string.');
  if (!excerpt || typeof excerpt !== 'string') fail('"excerpt" is required and must be a string.');
  if (!body || typeof body !== 'string') fail('"body" is required and must be a string (markdown).');

  const slug = data.slug ? slugify(data.slug) : slugify(title);
  if (!slug) fail('Could not derive a valid slug from the title. Provide "slug" explicitly.');

  const postPath = path.join(POSTS_DIR, `${slug}.md`);
  if (await pathExists(postPath)) {
    fail(`A post already exists at src/content/posts/${slug}.md. Provide a different "slug".`);
  }

  let coverPath;
  if (coverImageUrl) {
    try {
      coverPath = await downloadImage(coverImageUrl, slug);
    } catch (err) {
      fail(err.message);
    }
  }

  const frontmatterLines = [
    '---',
    `title: ${escapeYamlString(title)}`,
    `excerpt: ${escapeYamlString(excerpt)}`,
  ];
  if (metaDescription) {
    frontmatterLines.push(`metaDescription: ${escapeYamlString(metaDescription)}`);
  }
  frontmatterLines.push(`date: ${date}`, `tag: ${escapeYamlString(tag)}`);
  if (coverPath) {
    frontmatterLines.push(`cover: ${escapeYamlString(coverPath)}`);
  }
  frontmatterLines.push('---', '', body.trim(), '');

  await mkdir(POSTS_DIR, { recursive: true });
  await writeFile(postPath, frontmatterLines.join('\n'), 'utf-8');

  console.log(
    JSON.stringify({
      ok: true,
      slug,
      postPath: path.relative(ROOT, postPath),
      coverPath: coverPath ?? null,
    })
  );
}

main().catch((err) => fail(err.message || String(err)));
