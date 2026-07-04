# AI Event Photo Finder

> "Google Photos for events." A photographer uploads thousands of event photos;
> a guest uploads a selfie and instantly gets every photo they're in.

## Status

**Phase 1 — AI core (done, pending install).** InsightFace face detection +
embeddings, local SQLite vector store, FastAPI service, CLI test scripts.

**Phase 2 — SaaS product layer (built).** Next.js multi-tenant app that wraps
the AI service: photographer auth, events, R2 photo uploads, per-event QR codes,
and the guest selfie→gallery flow.

- [x] Face detection + embeddings (InsightFace) — `ai-service/`
- [x] Local vector store + cosine selfie matching (SQLite, no infra)
- [x] FastAPI service + CLI test scripts
- [x] Next.js SaaS: auth, events, upload, QR, guest match, gallery — `web/`
- [x] Cloudflare R2 storage + Supabase Postgres (schema + RLS) integration
- [ ] `npm install` / run end-to-end (blocked: free space on C: — see below)
- [ ] Finish Python install (blocked: same disk issue)
- [ ] Verify matching on real photos
- [ ] Migrate the AI service's vector store to pgvector (optional; storage is
      already behind one interface)
- [ ] Billing (Stripe)

## ⚠️ Environment blocker: C: drive is full

Both installs failed with `No space left on device`. Your **C:** drive has
~25 MB free; **E:** has ~45 GB. npm and pip cache/temp to C: by default.

Fix (pick one):
- **Free a few GB on C:** (Disk Cleanup, clear `%TEMP%`, `%LOCALAPPDATA%\pip\Cache`), then re-run the installs; **or**
- **Redirect caches to E:** before installing:
  ```powershell
  setx PIP_CACHE_DIR "E:\caches\pip"
  setx NPM_CONFIG_CACHE "E:\caches\npm"
  $env:TMP = "E:\caches\tmp"; $env:TEMP = "E:\caches\tmp"
  ```
  (Open a new terminal so `setx` takes effect; create `E:\caches\tmp` first.)

## Why this shape

The original plan spanned ~6 services (Next.js, FastAPI, Supabase+pgvector, R2,
Redis, Stripe). That's the right *destination*, but the risky, product-defining
part is face matching. So we build that first, fully local — you can see it
working today with zero signups — then wrap product/SaaS layers around a proven
core. Storage lives behind one interface (`ai-service/app/store.py`), so moving
to pgvector/R2 later is a contained change, not a rewrite.

## Structure

```
ai-photo-studio/
  ai-service/        Python FastAPI + InsightFace (the AI core)
    app/             embeddings, vector store, API
    scripts/         index_folder.py, match_selfie.py (CLI tests)
  web/               Next.js SaaS layer (auth, events, upload, QR, gallery)
    src/app/         pages + API routes
    src/lib/         supabase, r2, ai-service integration
    supabase/schema.sql
  README.md          this file
```

## Get started

1. AI service: [`ai-service/README.md`](ai-service/README.md)
2. Web / SaaS: [`web/README.md`](web/README.md)

Run the AI service first (the web layer calls it for indexing and matching).
