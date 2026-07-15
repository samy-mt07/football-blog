# Fulltime — World Cup Blog

Zero-cost static blog: Astro + Tailwind v4, deploys straight to S3 + CloudFront like Focustasks did.

## Run locally

```bash
npm install
npm run dev       # http://localhost:4321
```

## Add a post (fast)

Drop a new markdown file in `src/content/posts/`, e.g. `src/content/posts/argentina-vs-france.md`:

```md
---
title: "Argentina Edge France in a Classic"
excerpt: "One-line summary for the homepage card."
metaDescription: "Optional SEO description for the <head> tag. Falls back to excerpt if omitted."
date: 2026-07-13
tag: "Match Report"
cover: "/images/posts/argentina-vs-france.jpg"
---

Your writeup here. Just markdown — headings, bold, links all work.
```

Save it, run `npm run build` (or just `npm run dev` while writing), and it appears on the homepage automatically, newest first. No CMS, no database.

`cover` is optional — point it at a file in `public/images/posts/`. When set, it shows as a homepage card thumbnail, a hero image on the post page, and the `og:image`/Twitter card image for social sharing.

### Add a post programmatically

`scripts/create-post.mjs` is the entry point automation (e.g. n8n) uses to publish a post — it downloads the cover image and writes the formatted markdown file in one call:

```bash
node scripts/create-post.mjs '{
  "title": "Argentina Edge France in a Classic",
  "excerpt": "One-line summary for the homepage card.",
  "metaDescription": "Optional SEO description.",
  "date": "2026-07-13",
  "tag": "Match Report",
  "coverImageUrl": "https://example.com/some-photo.jpg",
  "body": "## How it went\n\nYour markdown here."
}'
```

Also accepts a JSON file path as the argument, or JSON piped via stdin. Prints `{"ok": true, "slug": ...}` on success, or `{"ok": false, "error": ...}` (exit code 1) on failure — safe to parse from an n8n HTTP Request/Execute Command node.

## Scores

`src/lib/scores.ts` pulls results/fixtures from TheSportsDB's free API at **build time** — no server, no ongoing cost. It's currently pointed at the FIFA World Cup league ID and uses the shared public test key (`3`). For higher rate limits, grab a free key at thesportsdb.com and drop it into `SPORTS_DB_KEY`.

Because it fetches at build time, scores update whenever you rebuild/redeploy. For same-day "live-ish" updates during matches, rebuild every 15–30 min via a cron/GitHub Action (still $0 — GitHub Actions free tier covers this easily).

## Ads

`src/components/AdSlot.astro` is a placeholder. Once your AdSense account is approved:

1. Paste the `<script async src="...adsbygoogle.js?client=ca-pub-XXXX">` tag into `src/layouts/Layout.astro` `<head>`.
2. Replace the placeholder `<div>` in `AdSlot.astro` with your `<ins class="adsbygoogle">` unit.

Three slots are already wired in: a banner (site footer, every page), and two inline slots on the homepage/post pages.

## Deploy to AWS for $0 (same pipeline as Focustasks)

```bash
npm run build          # outputs static site to dist/
aws s3 sync dist/ s3://YOUR_BUCKET_NAME --delete
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

Reuse your existing S3 + CloudFront + ACM setup from `focustasks.app` — same bucket policy, same OAC, same cert process. CloudFront's free tier (first 12 months) covers 1 TB transfer + 10M requests/month, which comfortably absorbs a traffic spike around a big match.

If you want it on a subdomain instead of a new domain, just add another CloudFront alternate domain name + ACM cert SAN for e.g. `worldcup.focustasks.app`, pointed at a separate bucket.

## Design notes

Palette and type are a "stadium floodlight at night" system — deep turf-shadow background, amber floodlight accent, split-flap scoreboard styling for scores (`.flap` class in `global.css`). Fonts: Anton (headlines), Public Sans (body), IBM Plex Mono (scores) — loaded via Google Fonts in `Layout.astro`.
