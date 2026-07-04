"""
FastAPI service — the AI core of AI Event Photo Finder.

Endpoints (the thin vertical slice):
  POST /events/{event_id}/index   -> upload event photos, extract + store faces
  POST /events/{event_id}/match   -> upload a selfie, get matching photos back
  GET  /events/{event_id}/photos  -> list all photos in an event
  GET  /events/{event_id}/stats   -> image/face counts
  GET  /health

Run:  uvicorn app.main:app --reload   (from the ai-service/ folder)
Docs: http://127.0.0.1:8000/docs
"""

from __future__ import annotations

import os
import uuid
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from .embeddings import assess_frame, extract_faces, load_image
from .store import FaceStore

DATA_DIR = Path(os.getenv("DATA_DIR", "data"))
DB_PATH = DATA_DIR / "faces.db"
IMAGES_DIR = DATA_DIR / "images"
MATCH_THRESHOLD = float(os.getenv("MATCH_THRESHOLD", "0.35"))

app = FastAPI(title="AI Event Photo Finder — AI Service", version="0.1.0")
store = FaceStore(DB_PATH)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/events/{event_id}/index")
async def index_photos(event_id: str, files: list[UploadFile] = File(...)):
    """Upload one or more event photos. Each is stored and its faces indexed."""
    event_dir = IMAGES_DIR / event_id
    event_dir.mkdir(parents=True, exist_ok=True)

    indexed = []
    for upload in files:
        raw = await upload.read()
        try:
            img = load_image(raw)
        except ValueError:
            indexed.append({"filename": upload.filename, "error": "unreadable image"})
            continue

        image_id = uuid.uuid4().hex
        ext = Path(upload.filename or "").suffix or ".jpg"
        dest = event_dir / f"{image_id}{ext}"
        dest.write_bytes(raw)

        store.add_image(image_id, event_id, str(dest))
        faces = extract_faces(img)
        for f in faces:
            store.add_face(event_id, image_id, f.embedding, f.bbox, f.det_score)

        indexed.append(
            {"filename": upload.filename, "image_id": image_id, "faces": len(faces)}
        )

    return {"event_id": event_id, "indexed": indexed, "stats": store.stats(event_id)}


@app.post("/detect")
async def detect(image: UploadFile = File(...)):
    """Lightweight quality gate for the live Face Scan loop.

    The browser posts a downscaled camera frame every ~0.7s. We report whether
    exactly one well-positioned, sharp, well-lit face is present so the client
    can auto-capture the full-resolution frame at the right moment.
    """
    raw = await image.read()
    try:
        img = load_image(raw)
    except ValueError:
        raise HTTPException(status_code=400, detail="Could not read frame")
    return assess_frame(img)


@app.post("/events/{event_id}/match")
async def match_selfie(event_id: str, selfie: UploadFile = File(...)):
    """Upload a selfie; returns event photos containing that person."""
    raw = await selfie.read()
    try:
        img = load_image(raw)
    except ValueError:
        raise HTTPException(status_code=400, detail="Could not read selfie image")

    faces = extract_faces(img)
    if not faces:
        raise HTTPException(status_code=422, detail="No face detected in the selfie")

    # Use the largest / most confident face in the selfie as the query.
    query = max(faces, key=lambda f: f.det_score).embedding
    matches = store.search(event_id, query, threshold=MATCH_THRESHOLD)

    return {
        "event_id": event_id,
        "match_count": len(matches),
        "matches": [
            {"image_id": m.image_id, "score": round(m.score, 4), "path": m.image_path}
            for m in matches
        ],
    }


@app.get("/events/{event_id}/photos")
def list_photos(event_id: str):
    return {"event_id": event_id, "photos": store.list_photos(event_id)}


@app.get("/events/{event_id}/stats")
def stats(event_id: str):
    return store.stats(event_id)


@app.get("/images/{image_id}")
def get_image(image_id: str):
    """Serve a stored image by id (walks the data dir; fine for local MVP)."""
    for path in IMAGES_DIR.rglob(f"{image_id}.*"):
        return FileResponse(path)
    raise HTTPException(status_code=404, detail="Image not found")
