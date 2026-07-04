"""
Match a selfie against an indexed event — prints the photos that person is in.

Usage:
    python -m scripts.match_selfie --event demo --selfie "C:/path/to/selfie.jpg"

Run from the ai-service/ directory (after index_folder.py).
"""

from __future__ import annotations

import argparse

from app.embeddings import extract_faces, load_image
from app.store import FaceStore


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--event", required=True)
    ap.add_argument("--selfie", required=True)
    ap.add_argument("--db", default="data/faces.db")
    ap.add_argument("--threshold", type=float, default=0.35,
                    help="cosine cutoff; raise for stricter matches (0.4-0.5 = strict)")
    args = ap.parse_args()

    img = load_image(args.selfie)
    faces = extract_faces(img)
    if not faces:
        print("No face detected in the selfie.")
        return

    query = max(faces, key=lambda f: f.det_score).embedding
    store = FaceStore(args.db)
    matches = store.search(args.event, query, threshold=args.threshold)

    if not matches:
        print(f"No matches (threshold={args.threshold}). Try lowering --threshold.")
        return

    print(f"Found {len(matches)} matching photo(s) for event '{args.event}':\n")
    for m in matches:
        print(f"  {m.score:.3f}  {m.image_path}")


if __name__ == "__main__":
    main()
