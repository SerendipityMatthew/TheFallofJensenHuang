# Jensen Coverage Watch

An evidence-first media archive built with Astro, React, ECharts, Cloudflare Pages Functions, and D1. The checked snapshot covers 1 October–21 November 2026. It contains 17 original publisher pages and five primary-source events. The collection coverage page displays publisher and month gaps; this is not an exhaustive census.

## Run locally

```bash
npm install
npm test
npm run build
npx wrangler d1 execute jensen-coverage --local --file=migrations/0001_initial.sql
npx wrangler d1 execute jensen-coverage --local --file=migrations/0002_seed.sql
npx wrangler d1 execute jensen-coverage --local --file=migrations/0003_research_archive.sql
npx wrangler d1 execute jensen-coverage --local --file=migrations/0004_archive_seed.sql
printf 'ADMIN_TOKEN=choose-a-local-test-value\n' > .dev.vars
npx wrangler pages dev dist
```

Apply each migration once and in order. `0003` is additive. `0004` uses conflict-safe inserts for the new archive batch. Existing five article records and verification history are preserved. `.dev.vars` and `.wrangler/` are ignored by Git. Run `node scripts/seed-archive.mjs` after changing the new curated JSON; it regenerates `0004`.

## Research workflow

Discovery → metadata extraction → canonical URL deduplication → original-source verification → claim review → editor approval → publication. Unreviewed leads never appear in public counts. RSS, licensed news API, public search, and manual leads can use the editor queue. `scripts/submit-leads.mjs` imports newline-delimited `{ "source": "...", "headline": "..." }` records. For publisher RSS/Atom feeds, run `ADMIN_TOKEN=... node scripts/discover-feeds.mjs https://your-site.pages.dev feeds.json`; `feeds.json` is an array of authorized HTTPS publisher feed URLs. The importer only queues dated leads whose titles mention Huang or NVIDIA. It does not automatically verify or publish them. Search API exports can use `submit-leads.mjs` with `news_api` as the source kind.

Editors use `/admin` to review leads and the workload counters. They must inspect the original URL, byline and date, then provide the classification and a reason. The original source and review action are saved in D1. `ingestion_jobs`, `verification_logs`, `article_updates`, `claims`, `claim_evidence`, `responses`, and `corrections` support further research history. No unavailable claim, response, translation, correction, or funding relationship is invented. Static article and report pages are built from curated JSON; an approved D1 article appears immediately in the explorer and timeline, and needs a curated rebuild for its detail page.

`/timeline` has separate event and publication tracks, playback, date range, daily/weekly/monthly density, filters, and a selected display time zone where an original timestamp exists. Source dates remain unchanged when only a date is known. Event detail pages cite primary statements and linked coverage. `/reports` contains two explicitly marked editorial drafts and four automatically assembled period drafts. Article report pages mark claim review pending. Every report has a source register, status, and review date or a pending label.

Unique originals group records by a verified syndication key; an update to the same canonical URL remains one article; a separately published follow-up is a new article. No syndication grouping or corrections have been confirmed in this snapshot. Dashboard numbers include only records with verified or corrected metadata. The coverage matrix records gaps; a zero is not evidence that a publisher had no coverage.

## Deploy to Cloudflare Pages

1. Create D1 with `npx wrangler d1 create jensen-coverage` and replace the placeholder `database_id` in `wrangler.toml`.
2. Apply `0001` through `0004` in order using `npx wrangler d1 execute jensen-coverage --remote --file=migrations/<filename>.sql`.
3. Connect this repository to Cloudflare Pages. Build with `npm run build`, output `dist`, bind D1 as `D1`, and set a long random `ADMIN_TOKEN` secret.
4. Verify `/api/articles`, `/api/events`, `/api/reports`, and `/api/metrics`. `/api/review-dashboard` and `/api/submissions` must return 401 without the editor token.

Production deployment needs a real D1 ID and editor secret. Publisher access restrictions and licensed API terms are respected; no paywall bypass or full article reproduction is part of this project.
