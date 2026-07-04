"""
Face detection + embedding extraction using InsightFace.

This is the heart of the product. Given an image, it finds every face and
returns a 512-dim embedding vector per face. Two photos of the same person
produce vectors that are "close" (high cosine similarity); different people
produce vectors that are far apart.

The model (buffalo_l) is downloaded automatically on first use (~300MB) and
cached under ~/.insightface. It runs on CPU by default via onnxruntime.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

import numpy as np


@dataclass
class DetectedFace:
    """One face found in an image."""

    embedding: np.ndarray  # shape (512,), L2-normalized float32
    bbox: tuple[int, int, int, int]  # x1, y1, x2, y2
    det_score: float  # detector confidence 0..1


import os

# Detection resolution. 640 is InsightFace's proven default: it detects small
# faces in large group photos well while still handling close-up selfies.
# NOTE: going higher (e.g. 1024) UPSCALES small input images so much that a
# close-up face becomes larger than the detector's range and is MISSED — it
# hurts selfies/thumbnails. Only raise this if your event photos are very high
# resolution AND faces are tiny; override with the DET_SIZE env var.
_DET_SIZE = int(os.getenv("DET_SIZE", "640"))

# Default detector confidence floor. Lowered from 0.5 -> 0.4 so harder faces
# (profiles, partially occluded, poorly lit) are still captured. Matching is
# still gated by embedding similarity, so a few weak detections cost little.
_MIN_DET_SCORE = float(os.getenv("MIN_DET_SCORE", "0.4"))


@lru_cache(maxsize=1)
def _get_model():
    """Load the InsightFace model once and reuse it (it's expensive to init)."""
    from insightface.app import FaceAnalysis

    app = FaceAnalysis(
        name="buffalo_l",
        allowed_modules=["detection", "recognition"],
        providers=["CPUExecutionProvider"],
    )
    app.prepare(ctx_id=-1, det_size=(_DET_SIZE, _DET_SIZE))
    return app


def extract_faces(image_bgr: np.ndarray, min_det_score: float = _MIN_DET_SCORE) -> list[DetectedFace]:
    """Detect faces in a BGR image (OpenCV format) and return their embeddings."""
    model = _get_model()
    faces = model.get(image_bgr)

    results: list[DetectedFace] = []
    for f in faces:
        if f.det_score < min_det_score:
            continue
        # normed_embedding is already L2-normalized, so cosine == dot product.
        emb = np.asarray(f.normed_embedding, dtype=np.float32)
        x1, y1, x2, y2 = (int(v) for v in f.bbox)
        results.append(
            DetectedFace(
                embedding=emb,
                bbox=(x1, y1, x2, y2),
                det_score=float(f.det_score),
            )
        )
    return results


def assess_frame(image_bgr: np.ndarray) -> dict:
    """Quality gate for the live Face Scan loop.

    Returns whether the frame has exactly one well-positioned, sharp, well-lit
    face ready for capture, plus a human hint when it isn't. Used by /detect.
    """
    import cv2

    h, w = image_bgr.shape[:2]
    faces = extract_faces(image_bgr, min_det_score=0.35)

    if len(faces) == 0:
        return {"count": 0, "ready": False, "reason": "No face detected"}
    if len(faces) > 1:
        return {"count": len(faces), "ready": False, "reason": "Multiple faces — only you in frame"}

    f = faces[0]
    x1, y1, x2, y2 = f.bbox
    fw, fh = max(1, x2 - x1), max(1, y2 - y1)
    area_ratio = (fw * fh) / float(w * h)
    cx, cy = (x1 + x2) / 2 / w, (y1 + y2) / 2 / h
    centered = abs(cx - 0.5) < 0.24 and abs(cy - 0.5) < 0.28

    crop = image_bgr[max(0, y1):max(0, y2), max(0, x1):max(0, x2)]
    if crop.size:
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        brightness = float(gray.mean())
    else:
        sharpness, brightness = 0.0, 0.0

    best = {
        "det_score": round(f.det_score, 3),
        "area_ratio": round(area_ratio, 4),
        "centered": centered,
        "sharpness": round(sharpness, 1),
        "brightness": round(brightness, 1),
    }

    # Ordered checks give the most useful single hint.
    if area_ratio < 0.045:
        return {"count": 1, "ready": False, "reason": "Move closer", "best": best}
    if area_ratio > 0.55:
        return {"count": 1, "ready": False, "reason": "Move back a little", "best": best}
    if not centered:
        return {"count": 1, "ready": False, "reason": "Center your face", "best": best}
    if brightness < 55:
        return {"count": 1, "ready": False, "reason": "Find better light", "best": best}
    if sharpness < 45:
        return {"count": 1, "ready": False, "reason": "Hold still", "best": best}

    return {"count": 1, "ready": True, "reason": "Ready", "best": best}


def load_image(path_or_bytes) -> np.ndarray:
    """Load an image from a file path or raw bytes into a BGR numpy array."""
    import cv2

    if isinstance(path_or_bytes, (bytes, bytearray)):
        arr = np.frombuffer(path_or_bytes, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    else:
        img = cv2.imread(str(path_or_bytes), cv2.IMREAD_COLOR)

    if img is None:
        raise ValueError("Could not decode image (unsupported format or corrupt file)")
    return img
