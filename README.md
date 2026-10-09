# Hasnain's portfolio: Next.js + FastAPI + Postgres on one Vercel project

```
hasnainzainulabdin.vercel.app
├── /            Next.js public site (server-rendered, cached, refreshed on every admin save)
├── /admin       Next.js admin panel (login, projects, certificates, experience, education)
├── /api/*       FastAPI as a Vercel Python function (api/index.py -> backend/main.py)
├── /revalidate  Next.js route the API calls to refresh the cache
└── /blob-upload Next.js route that hands the admin a token for direct uploads to Vercel Blob
python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt

Neon Postgres (content, admin user, rate limits)   Vercel Blob (certificate PDFs, screenshots)
```

The public page reads projects, certificates, experience and education from the API.
The JSON-LD (schema.org) block is generated from the same data, so a new project updates
the card and the structured data together. Copy that rarely changes (services, about text,
nav, manifesto) lives in `lib/content.ts`.

## Run it locally

```bash
cp .env.example .env                     # then edit JWT_SECRET
npm install

.venv/bin/alembic upgrade head           # creates dev.db (SQLite) with the schema
.venv/bin/python -m backend.seed         # loads data/seed.json (your current projects, certs, etc.)
.venv/bin/python -m backend.create_admin you@example.com   # asks for a 12+ char password

.venv/bin/uvicorn backend.main:app --reload --port 8000    # terminal 1  (npm run api)
npm run dev                                                # terminal 2 -> http://localhost:3000
```

Admin: http://localhost:3000/admin. API docs (dev only): http://localhost:8000/api/docs.
Tests: `.venv/bin/python -m pytest` (22 tests) and `npm run typecheck`.

Copy these from the old site into `public/` (same relative paths, so nothing else changes):
`assets/hasnain-portrait.png`, `resume.pdf`, `favicon.svg`, and the `Certificates/*.pdf` files.
If the old repo has a static `robots.txt` or `sitemap.xml`, don't copy them: `app/robots.ts` and
`app/sitemap.ts` replace them.

## Deploy (all free tiers)

1. **Database.** In the Vercel project: Storage -> Create -> Neon (Postgres). It adds `DATABASE_URL`
   (pooled) and `DATABASE_URL_UNPOOLED`. Enable it for Production and Preview.
2. **Blob.** Storage -> Create -> Blob. It adds `BLOB_READ_WRITE_TOKEN`.
3. **Environment variables** (Settings -> Environment Variables):

   | Name | Value |
   |---|---|
   | `JWT_SECRET` | `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
   | `REVALIDATE_SECRET` | any random string |
   | `SITE_URL` | `https://hasnainzainulabdin.vercel.app` |
   | `GROQ_API_KEY` | your Groq key (optional; without it Naini answers from a keyword fallback) |

4. **Create the tables and your login, once, from your machine.** Pull the Neon URL
   (`vercel env pull .env.production.local`, or copy it from the Neon page) and run:

   ```bash
   export DATABASE_URL_UNPOOLED='postgresql://...'      # Neon direct connection
   export DATABASE_URL="$DATABASE_URL_UNPOOLED"
   .venv/bin/alembic upgrade head
   .venv/bin/python -m backend.seed
   .venv/bin/python -m backend.create_admin you@example.com
   ```

5. **Ship it on a branch first.** Push to a branch, open the preview URL, check the page and
   `/admin`, then merge to `main`. Set the project's framework preset to Next.js.
   The first production build can't reach the API yet, so it renders from the bundled seed data;
   the page switches to database content within a minute of the first visit.

## How things behave

- **Saving in the admin** updates the database, then the API pings `/revalidate`, so the public page
  changes immediately. If that ping fails, the page still refreshes within 60 seconds. The dashboard
  has an "Update public site now" button.
- **Drafts:** unpublished rows are visible only in the admin. A project with no live link or GitHub link
  shows no button (instead of a dead `#` link).
- **Featured project:** exactly one; featuring a project un-features the previous one. Its card can
  show a pipeline diagram (steps, one per line) or an uploaded screenshot.
- **Hero stats:** "Live AI products" counts published projects that have a live link, and the
  certification count is the number of published certificates. "10+ projects delivered" is static text in
  `components/sections.tsx`.
- **Uploads** go from the browser straight to Vercel Blob (10 MB limit, images and PDFs only). Locally,
  paste a URL or a `/Certificates/...` path instead, unless you set `BLOB_READ_WRITE_TOKEN`.
- **Naini** calls `/api/chat`; the Groq key stays on the server. The prompt is built from the database,
  so new projects are known to the bot immediately. It is limited to 20 messages per 10 minutes per IP.
- **Security:** bcrypt passwords, JWT in an HttpOnly + Secure + SameSite=Strict cookie, 5 failed logins
  per 15 minutes per IP (counted in Postgres, since serverless instances share no memory), write requests
  rejected from foreign origins, only `http(s)` and site-relative URLs accepted, and no public sign-up.

## Things to check after the first deploy

- If the Python function reports a bundle size error, add folders to `excludeFiles` in `vercel.json`.
- If admin saves return "Origin not allowed", `SITE_URL` doesn't match the domain you're browsing;
  add extra domains to `ALLOWED_ORIGINS` (comma separated).
- Vercel Hobby is for non-commercial use. A personal portfolio is fine.
