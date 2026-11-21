# Jensen Huang Media Coverage Archive

A public, source-linked record of media coverage of Jensen Huang. Static Astro site, with a Cloudflare Pages Function for admin submissions backed by D1.

## What it is — and is not

- A record of articles with links to their original sources.
- A side-by-side view of positive, neutral, mixed and critical coverage.
- **Not** a verdict on the truth of any article's claims — sentiment labels describe framing, not facts.
- **Not** a dossier — journalist pages show public bylines only; no private information, no inferred motivation, no auto-coordination claims.

See `/methodology` for the full set of rules.

## Develop

```bash
npm install
npm run dev     # Astro dev server
npm test        # dedup + publish-gate tests
npm run db:seed # regenerate migrations/0002_seed.sql from src/data/verified.json
```

The public site reads `src/data/verified.json` at build time. In production, admins submit new articles via the Pages Function (`functions/api/[[path]].ts`) which writes to D1; curated entries are mirrored back into `verified.json` for the next static build.

## Data model

See [`migrations/0001_initial.sql`](migrations/0001_initial.sql). Tables: `publications`, `journalists`, `articles`, `article_authors`, `sources`, `claims`, `funding_organizations`, `funding_relationships`, `corrections`, `verification_records`, `submissions`, `audit_log`.

Metadata verification (`metadata_status`) is independent of claim verification (`claim_status`). Only `published_in_tracker = 1` rows appear on the public site.

## Deploy (Cloudflare Pages + D1)

1. Create the D1 database:

   ```bash
   npx wrangler d1 create jensen-coverage
   ```

2. Paste the returned `database_id` into `wrangler.toml`.

3. Apply schema + seed to the remote DB:

   ```bash
   npx wrangler d1 execute jensen-coverage --remote --file=migrations/0001_initial.sql
   npx wrangler d1 execute jensen-coverage --remote --file=migrations/0002_seed.sql
   ```

4. In the Pages project settings, add an environment variable `ADMIN_TOKEN` (a long random string) and bind the D1 database as `D1`.

5. Connect the repo to Cloudflare Pages. Build command: `npm run build`. Output directory: `dist`.

## Submit an article (admin)

```bash
curl -X POST https://<your-domain>/api/submissions \
  -H "authorization: Bearer $ADMIN_TOKEN" \
  -H "content-type: application/json" \
  -d '{"source":"https://...","headline":"...","sourceKind":"manual"}'
```

Review (approve / reject) via `/api/submissions/:id/review` with the same header. Only metadata-verified submissions with headline + publication + date + authors + check date are published. Rejected and pending submissions stay in the database for audit.

## Correct an error

Open an issue naming the article id and the field in error, with a link supporting the correction. We log every change with the original and revised value.
