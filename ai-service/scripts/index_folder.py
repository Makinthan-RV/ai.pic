"""
Index a folder of event photos into the local face store — no server needed.

Usage:
    python -m scripts.index_folder --event demo --folder "C:/path/to/photos"

Run from the ai-service/ directory.
"""

from __future__ import annotations

import argparse
import uuid
from pathlib import Path

from app.embeddings import extract_faces, load_image
from app.store import FaceStore

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--event", required=True, help="event id, e.g. 'demo'")
    ap.add_argument("--folder", required=True, help="folder of photos to index")
    ap.add_argument("--db", default="data/faces.db")
    args = ap.parse_args()

    folder = Path(args.folder)
    photos = [p for p in folder.rglob("*") if p.suffix.lower() in IMAGE_EXTS]
    if not photos:
        print(f"No images found under {folder}")
        return

    store = FaceStore(args.db)
    total_faces = 0
    for i, path in enumerate(photos, 1):
        try:
            img = load_image(path)
        except ValueError:
            print(f"  [skip] unreadable: {path.name}")
            continue

        image_id = uuid.uuid4().hex
        store.add_image(image_id, args.event, str(path))
        faces = extract_faces(img)
        for f in faces:
            store.add_face(args.event, image_id, f.embedding, f.bbox, f.det_score)
        total_faces += len(faces)
        print(f"  [{i}/{len(photos)}] {path.name}: {len(faces)} face(s)")

    print(f"\nDone. {len(photos)} photos, {total_faces} faces indexed for event '{args.event}'.")
    print(store.stats(args.event))


if __name__ == "__main__":
    main()
