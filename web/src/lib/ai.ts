/**
 * Integration with the EXISTING Python FastAPI AI service.
 * We do not reimplement any face logic here — we just call its endpoints:
 *   POST /events/{eventId}/index   (multipart: files[])   -> per-image faces
 *   POST /events/{eventId}/match   (multipart: selfie)     -> matched image_ids
 *
 * See ai-service/app/main.py.
 */

const AI_URL = process.env.AI_SERVICE_URL!.replace(/\/$/, "");

export interface IndexedImage {
  filename: string;
  image_id?: string;
  faces?: number;
  error?: string;
}

/** Send one photo to the AI service to detect + store its face embeddings. */
export async function aiIndexImage(
  eventId: string,
  file: Blob,
  filename: string,
): Promise<IndexedImage> {
  const form = new FormData();
  form.append("files", file, filename);

  const res = await fetch(`${AI_URL}/events/${eventId}/index`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    throw new Error(`AI index failed (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return (data.indexed?.[0] ?? { filename, error: "no result" }) as IndexedImage;
}

export interface AiMatch {
  image_id: string;
  score: number;
}

/** Send a guest selfie to the AI service; get back matching image_ids. */
export async function aiMatchSelfie(
  eventId: string,
  selfie: Blob,
  filename = "selfie.jpg",
): Promise<AiMatch[]> {
  const form = new FormData();
  form.append("selfie", selfie, filename);

  const res = await fetch(`${AI_URL}/events/${eventId}/match`, {
    method: "POST",
    body: form,
  });
  if (res.status === 422) {
    throw new AiNoFaceError("No face detected in the selfie");
  }
  if (!res.ok) {
    throw new Error(`AI match failed (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return (data.matches ?? []) as AiMatch[];
}

export class AiNoFaceError extends Error {}

export interface DetectResult {
  count: number;
  ready: boolean;
  reason: string;
  best?: {
    det_score: number;
    area_ratio: number;
    centered: boolean;
    sharpness: number;
    brightness: number;
  };
}

/** Quality gate for the live Face Scan loop — proxies a frame to AI /detect. */
export async function aiDetect(frame: Blob): Promise<DetectResult> {
  const form = new FormData();
  form.append("image", frame, "frame.jpg");

  const res = await fetch(`${AI_URL}/detect`, { method: "POST", body: form });
  if (!res.ok) {
    throw new Error(`AI detect failed (${res.status})`);
  }
  return (await res.json()) as DetectResult;
}
