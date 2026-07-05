# Deploying AI Event Photo Finder

The app has **two services** + one managed backend:

| Piece | What | Where it deploys |
|-------|------|------------------|
| `web/` | Next.js app (UI + API routes) | **Vercel** (easy, free) |
| `ai-service/` | Python + InsightFace (face detect/match) | **Render / Railway / Fly / a VPS** (needs ~2 GB RAM + a disk) |
| Supabase | Auth + Postgres + Storage | already cloud — nothing to deploy |

The AI service is the only tricky part: it's a heavy ML process, so it can **not** run on
Vercel's serverless. It needs a normal container host with a persistent disk.

---

## Part 1 — AI service (do this first, so you have its URL)

Deploy the container in `ai-service/Dockerfile` to a host that gives a public HTTPS URL.
Render is the simplest:

1. Push this repo to GitHub (done).
2. [render.com](https://render.com) → **New → Web Service** → connect the repo.
3. **Root Directory:** `ai-service`  •  **Runtime:** Docker.
4. **Instance type:** at least **2 GB RAM** (InsightFace needs it).
5. Add a **Persistent Disk** mounted at `/app/data` (keeps the face embeddings).
6. Deploy. Note the URL, e.g. `https://ai-photo-svc.onrender.com`.
   - First request is slow (~30 s) while the face model downloads.

> Scale note: face embeddings live in a local SQLite file on this host. That's fine for
> one instance. To scale horizontally later, migrate the vector store to Supabase
> **pgvector** (only `ai-service/app/store.py` changes).

## Part 2 — Web app on Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → import the `ai.pic` repo.
2. **Root Directory:** `web`.
3. **Environment Variables** (Project Settings → Environment Variables):

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | your Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key (secret) |
   | `STORAGE_BUCKET` | `event-photos` |
   | `AI_SERVICE_URL` | the Render URL from Part 1 |
   | `NEXT_PUBLIC_APP_URL` | your Vercel URL (set after first deploy) |

4. Deploy. Vercel gives you `https://ai-pic.vercel.app`.
5. Set `NEXT_PUBLIC_APP_URL` to that URL and redeploy (so QR codes point to the live site).

## Part 3 — Supabase (already live)

Nothing to deploy. Just confirm:
- `web/supabase/schema.sql` has been run.
- The `event-photos` Storage bucket exists (public) — `web/scripts/setup-storage.mjs`.
- In Auth settings, add your Vercel domain to the allowed redirect/site URLs.

---

## Result

`https://ai-pic.vercel.app` is your live product. Guests scan the QR → hit the Vercel
app → which calls your Render AI service → which returns matches from Supabase. No more
laptop, no more tunnels.
