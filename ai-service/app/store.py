"""
Local vector store backed by SQLite.

For the MVP this keeps everything on-disk with zero external services. It holds
face embeddings and does cosine-similarity search in numpy. This is fine for
thousands (even tens of thousands) of faces per event.

WHEN YOU OUTGROW THIS: swap this file for a pgvector-backed implementation with
the same method signatures (add_face, search, list_photos). Nothing else in the
app needs to change. That's the whole point of keeping storage behind this
interface.
"""

from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from pathlib import Path

import numpy as np

EMBED_DIM = 512


@dataclass
class Match:
    image_id: str
    image_path: str
    score: float  # cosine similarity, higher = more similar


class FaceStore:
    def __init__(self, db_path: str | Path):
        self.db_path = str(db_path)
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(self.db_path)
        self._conn.row_factory = sqlite3.Row
        self._init_schema()

    def _init_schema(self) -> None:
        self._conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS images (
                id         TEXT PRIMARY KEY,
                event_id   TEXT NOT NULL,
                path       TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS faces (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id   TEXT NOT NULL,
                image_id   TEXT NOT NULL REFERENCES images(id),
                embedding  BLOB NOT NULL,
                bbox       TEXT,
                det_score  REAL
            );
            CREATE INDEX IF NOT EXISTS idx_faces_event ON faces(event_id);
            CREATE INDEX IF NOT EXISTS idx_images_event ON images(event_id);
            """
        )
        self._conn.commit()

    # --- writes ---------------------------------------------------------

    def add_image(self, image_id: str, event_id: str, path: str) -> None:
        self._conn.execute(
            "INSERT OR REPLACE INTO images (id, event_id, path) VALUES (?, ?, ?)",
            (image_id, event_id, path),
        )
        self._conn.commit()

    def add_face(
        self,
        event_id: str,
        image_id: str,
        embedding: np.ndarray,
        bbox: tuple[int, int, int, int] | None = None,
        det_score: float | None = None,
    ) -> None:
        emb = np.asarray(embedding, dtype=np.float32).tobytes()
        self._conn.execute(
            "INSERT INTO faces (event_id, image_id, embedding, bbox, det_score) "
            "VALUES (?, ?, ?, ?, ?)",
            (event_id, image_id, emb, str(bbox) if bbox else None, det_score),
        )
        self._conn.commit()

    # --- reads ----------------------------------------------------------

    def _load_event_matrix(self, event_id: str):
        """Return (embeddings matrix (N,512), list of image_ids) for an event."""
        rows = self._conn.execute(
            "SELECT image_id, embedding FROM faces WHERE event_id = ?",
            (event_id,),
        ).fetchall()
        if not rows:
            return np.empty((0, EMBED_DIM), dtype=np.float32), []

        mat = np.stack(
            [np.frombuffer(r["embedding"], dtype=np.float32) for r in rows]
        )
        image_ids = [r["image_id"] for r in rows]
        return mat, image_ids

    def search(
        self, event_id: str, query: np.ndarray, threshold: float = 0.35, top_k: int = 200
    ) -> list[Match]:
        """Find photos in an event containing a face similar to `query`.

        Embeddings are L2-normalized, so cosine similarity is a plain dot product.
        Results are deduplicated per image (best-scoring face wins).
        """
        mat, image_ids = self._load_event_matrix(event_id)
        if mat.shape[0] == 0:
            return []

        q = np.asarray(query, dtype=np.float32)
        q = q / (np.linalg.norm(q) + 1e-8)
        scores = mat @ q  # (N,) cosine similarities

        best_per_image: dict[str, float] = {}
        for img_id, score in zip(image_ids, scores):
            s = float(score)
            if s < threshold:
                continue
            if img_id not in best_per_image or s > best_per_image[img_id]:
                best_per_image[img_id] = s

        path_by_id = {
            r["id"]: r["path"]
            for r in self._conn.execute(
                "SELECT id, path FROM images WHERE event_id = ?", (event_id,)
            ).fetchall()
        }

        matches = [
            Match(image_id=img_id, image_path=path_by_id.get(img_id, ""), score=score)
            for img_id, score in best_per_image.items()
        ]
        matches.sort(key=lambda m: m.score, reverse=True)
        return matches[:top_k]

    def list_photos(self, event_id: str) -> list[dict]:
        rows = self._conn.execute(
            "SELECT id, path, created_at FROM images WHERE event_id = ? ORDER BY created_at",
            (event_id,),
        ).fetchall()
        return [dict(r) for r in rows]

    def stats(self, event_id: str) -> dict:
        n_images = self._conn.execute(
            "SELECT COUNT(*) FROM images WHERE event_id = ?", (event_id,)
        ).fetchone()[0]
        n_faces = self._conn.execute(
            "SELECT COUNT(*) FROM faces WHERE event_id = ?", (event_id,)
        ).fetchone()[0]
        return {"event_id": event_id, "images": n_images, "faces": n_faces}

    def close(self) -> None:
        self._conn.close()
