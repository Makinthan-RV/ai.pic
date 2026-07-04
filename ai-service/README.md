# AI Service — Face Indexing & Selfie Matching

The AI core of **AI Event Photo Finder**. It detects faces in event photos,
stores their embeddings, and matches a user's selfie against them to find every
photo that person appears in.

This MVP is **fully local** — no cloud accounts, no Docker, no Postgres. Faces
are stored in a local SQLite file and searched with numpy cosine similarity.

## Setup (Windows, Python 3.12)

```powershell
cd "ai-service"
py -3.12 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

> First run downloads the InsightFace `buffalo_l` model (~300MB) to
> `~/.insightface`. That happens once.

## Try it in 2 commands (no server needed)

```powershell
# 1. Index a folder of event photos
python -m scripts.index_folder --event demo --folder "C:\path\to\event\photos"

# 2. Find which of those photos a person is in
python -m scripts.match_selfie --event demo --selfie "C:\path\to\selfie.jpg"
```

If you get too many/few matches, tune `--threshold` (0.35 default; 0.45 = strict).

## Run as an API instead

```powershell
uvicorn app.main:app --reload
```

Then open http://127.0.0.1:8000/docs to upload photos and a selfie in the browser.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/events/{id}/index` | Upload event photos, index faces |
| POST | `/events/{id}/match` | Upload selfie, get matching photos |
| GET  | `/events/{id}/photos` | List event photos |
| GET  | `/events/{id}/stats` | Image/face counts |
| GET  | `/images/{image_id}` | Serve a stored image |

## Architecture notes

- `app/embeddings.py` — InsightFace wrapper (detection + 512-d embeddings).
- `app/store.py` — the storage interface. **Swap this file for a pgvector
  implementation** (same methods) when you move to Supabase. Nothing else changes.
- `app/main.py` — FastAPI endpoints.

## How matching works

InsightFace returns L2-normalized 512-d vectors, so cosine similarity is just a
dot product. Same person ≈ 0.4–0.7; different people ≈ 0.0–0.2. We keep the
best-scoring face per photo and return photos above the threshold, ranked.
