# Web — AI Event Photo Finder (SaaS layer)

Next.js (App Router) + TailwindCSS product layer on top of the existing Python
AI service. Photographers sign up, create events, upload photos (indexed by the
AI service, stored in Cloudflare R2), and share a QR code. Guests scan the QR,
upload a selfie, and get their photos.

**This layer does not implement any face logic** — it calls the existing
FastAPI service (`ai-service/`) over HTTP for indexing and matching.

## Architecture

```
Guest phone ──scan QR──▶ /e/[eventId]  ──selfie──▶ /api/selfie/match
                                                      │
Photographer ▶ /dashboard ▶ /events/[id] ─upload─▶ /api/event/upload
                                                      │
                                   ┌──────────────────┼──────────────────┐
                                   ▼                  ▼                  ▼
                          Python AI service     Cloudflare R2       Supabase
                          (faces + vectors)     (image files)    (users/events/
                          /index  /match                          images/matches)
```

Key idea: the AI service assigns each photo's `image_id`; we store that same id
in Supabase alongside the R2 url, so `/match` results map straight back to
downloadable photos.

## Prerequisites (accounts)

1. **Supabase** project — run [`supabase/schema.sql`](supabase/schema.sql) in the
   SQL editor. In Auth settings, enable Email/password. (Disable "Confirm email"
   for the fastest local testing.)
2. **Cloudflare R2** bucket with public access (r2.dev URL or custom domain) and
   an S3 API token.
3. The **Python AI service** running (see `../ai-service/README.md`).

## Setup

```powershell
cd web
copy .env.example .env.local   # then fill in the values
npm install
npm run dev
```

Open http://localhost:3000.

> ⚠️ Requires a few GB free on **C:** for `node_modules` and build cache
> (npm caches to C: by default). If C: is full, either free space or point the
> cache to E: — see the repo root README.

## Env vars

See [`.env.example`](.env.example). Server-only secrets (`SUPABASE_SERVICE_ROLE_KEY`,
`R2_SECRET_ACCESS_KEY`) are never exposed to the browser.

## Routes

| Route | Who | Purpose |
|-------|-----|---------|
| `/` | public | Landing |
| `/signup`, `/login` | public | Photographer auth (Supabase) |
| `/dashboard` | photographer | List + create events |
| `/events/[id]` | photographer | Upload photos, QR code, gallery |
| `/e/[id]` | guest (QR) | Upload selfie, see matched photos |

### API

| Method | Route | Auth |
|--------|-------|------|
| POST | `/api/event/create` | photographer |
| GET | `/api/event/list` | photographer |
| POST | `/api/event/upload` | photographer |
| GET | `/api/event/[id]/gallery` | photographer |
| POST | `/api/selfie/match` | public (guest) |

## Multi-tenancy

Every `events`/`images` row carries `user_id`. Supabase **Row Level Security**
(in the schema) makes photographer data owner-only. The guest flow uses the
service-role key on the server, scoped strictly by `event_id`.
