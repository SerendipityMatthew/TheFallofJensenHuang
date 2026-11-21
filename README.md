# Jensen Coverage Watch

An evidence-first media coverage tracker built with Astro, React, Apache ECharts, Cloudflare Pages Functions, and D1. The public dataset is deliberately small: five publisher pages checked on 21 November 2026. The displayed counts come from those records, not an estimate of all coverage.

## Run locally

```bash
npm install
npm run dev
npm test
npm run build
```

Astro preview uses the curated file in `src/data/verified.json`. To test the live API and editor queue locally:

```bash
npx wrangler d1 execute jensen-coverage --local --file=migrations/0001_initial.sql
npx wrangler d1 execute jensen-coverage --local --file=migrations/0002_seed.sql
printf 'ADMIN_TOKEN=choose-a-local-test-value\n' > .dev.vars
npx wrangler pages dev dist
```

Open `/admin` on the Pages dev server and enter the local token. `.dev.vars` and `.wrangler/` are ignored by Git. Run `npm run db:seed` after changing the curated JSON; it regenerates the SQL seed. Keep sample experiments in the local D1 database, never in `verified.json` or the remote production D1 database.

## Research workflow

- Public records have checked original publisher URLs, exact headlines, dates, credited authors, and a source check date. Claim verification is separate from metadata verification.
- `/admin` accepts a lead URL and headline. Editors review the original source, complete the metadata and classification fields, then approve or reject. Pending and rejected leads are not public. The review action is logged in D1.
- The `/api/articles` endpoint drives the live explorer, timeline, and homepage metrics. New D1 records link to their original source until a curated build adds static article and journalist profile pages.
- `scripts/submit-leads.mjs` accepts newline-delimited `{ "source": "...", "headline": "..." }` records from a licensed RSS, news API, publisher metadata, or manual research export. It queues leads; it does not scrape publishers or auto-publish them. Example: `ADMIN_TOKEN=... node scripts/submit-leads.mjs https://your-site.pages.dev leads.ndjson rss`.
- Funding, corrections, and individual claims have schema support. No funding relationship, editorial influence finding, or correction is asserted in the current public file.

The production seed is curated, while the local D1 instance is the development sandbox. Do not add unverified or fictional sample records to the production seed.

## Deploy to Cloudflare Pages

1. Create a D1 database: `npx wrangler d1 create jensen-coverage`.
2. Replace `database_id` in `wrangler.toml` with the returned ID.
3. Apply `migrations/0001_initial.sql` and `migrations/0002_seed.sql` with `npx wrangler d1 execute jensen-coverage --remote --file=<migration>`.
4. Create a Cloudflare Pages project connected to this repository. Set the build command to `npm run build` and output directory to `dist`.
5. Bind the D1 database to the Pages project as `D1`. Add a secret `ADMIN_TOKEN` with a long, unique random value. Set bindings and the secret for the production environment (and preview only if needed).
6. Deploy. Verify `/api/articles` returns the curated records and `/api/submissions` returns 401 without the editor token.

Static article and journalist profile pages require a rebuild after new approvals. For a fully live profile system, move those routes to a D1-backed server renderer. This MVP keeps publisher metadata in one checked source file for reviewable builds.

## Important limits

The source file is a curated sample, not an exhaustive archive. News API and RSS inputs require lawful upstream access and are not fetched automatically. Funding and narrative analysis show only what the current evidence supports. The application does not claim a funding relationship proves influence or that similar stories prove coordination.
