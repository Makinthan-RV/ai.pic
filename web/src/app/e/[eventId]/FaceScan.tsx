"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";

type Phase = "init" | "requesting" | "scanning" | "captured" | "error";

const POLL_MS = 700;
const READY_STREAK_TO_CAPTURE = 2; // consecutive "ready" frames before auto-snap

/**
 * Live Face Scan. Streams the camera, sends a downscaled frame to
 * /api/selfie/detect every ~0.7s, shows guidance, and auto-captures the
 * full-resolution frame once a single well-framed face is detected. The
 * captured JPEG is handed to the parent via onCaptured() for matching.
 */
export function FaceScan({
  processing,
  onCaptured,
}: {
  processing: boolean;
  onCaptured: (frame: Blob) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inFlight = useRef(false);
  const readyStreak = useRef(0);
  const captured = useRef(false);

  const [phase, setPhase] = useState<Phase>("init");
  const [hint, setHint] = useState("Position your face in the circle");
  const [ready, setReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const stopCamera = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const beep = useCallback(() => {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      /* audio is a nice-to-have; ignore failures */
    }
  }, []);

  // Draw the current video frame to a canvas and return a JPEG blob.
  const grabFrame = useCallback((maxWidth: number): Promise<Blob | null> => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return Promise.resolve(null);
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return Promise.resolve(null);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85),
    );
  }, []);

  const doCapture = useCallback(async () => {
    if (captured.current) return;
    captured.current = true;
    if (pollRef.current) clearInterval(pollRef.current);
    const full = await grabFrame(1080); // high-res for the actual match
    stopCamera();
    setPhase("captured");
    beep();
    if (full) onCaptured(full);
  }, [grabFrame, stopCamera, beep, onCaptured]);

  const pollOnce = useCallback(async () => {
    if (inFlight.current || captured.current) return;
    inFlight.current = true;
    try {
      const frame = await grabFrame(480);
      if (!frame) return;
      const form = new FormData();
      form.append("image", frame, "frame.jpg");
      const res = await fetch("/api/selfie/detect", { method: "POST", body: form });
      const data = await res.json();
      setHint(data.reason ?? "Scanning…");
      setReady(!!data.ready);
      setFaceDetected((data.count ?? 0) > 0);
      if (data.ready) {
        readyStreak.current += 1;
        if (readyStreak.current >= READY_STREAK_TO_CAPTURE) await doCapture();
      } else {
        readyStreak.current = 0;
      }
    } catch {
      setHint("Scanning…");
    } finally {
      inFlight.current = false;
    }
  }, [grabFrame, doCapture]);

  const start = useCallback(async () => {
    setPhase("requesting");
    setErrorMsg("");
    captured.current = false;
    readyStreak.current = 0;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setPhase("scanning");
      pollRef.current = setInterval(pollOnce, POLL_MS);
    } catch (err: unknown) {
      const name = (err as { name?: string })?.name;
      setPhase("error");
      if (name === "NotAllowedError" || name === "SecurityError") {
        setErrorMsg("Camera permission was denied. Allow access, or upload a photo instead.");
      } else if (name === "NotFoundError") {
        setErrorMsg("No camera found on this device. Upload a photo instead.");
      } else {
        setErrorMsg("Couldn't start the camera. Upload a photo instead.");
      }
    }
  }, [pollOnce]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  if (phase === "init") {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <p className="text-center text-sm text-neutral-600 dark:text-neutral-300">
          We&apos;ll scan your face to find your photos. Nothing is stored — the
          image is only used to match.
        </p>
        <Button onClick={start}>Start camera scan</Button>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <p className="text-sm text-red-600">{errorMsg}</p>
        <Button variant="ghost" onClick={start}>
          Try camera again
        </Button>
      </div>
    );
  }

  const showProcessing = phase === "captured" || processing;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative aspect-square w-full max-w-xs overflow-hidden rounded-3xl bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full scale-x-[-1] object-cover"
        />
        <ScanOverlay ready={ready} active={phase === "scanning" && faceDetected} />
        {showProcessing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-[#CCFF00]" />
            <p className="text-sm font-semibold text-white">
              {phase === "captured" && !processing ? "Got it!" : "Finding your photos…"}
            </p>
          </div>
        )}
      </div>

      {phase === "scanning" && (
        <div className="text-center">
          <p
            className={`text-sm font-semibold ${
              ready ? "text-green-600" : "text-neutral-600 dark:text-neutral-300"
            }`}
          >
            {hint}
          </p>
          <button
            onClick={doCapture}
            className="mt-2 text-xs text-neutral-400 underline underline-offset-2"
          >
            or capture now
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Face-scan overlay. When no face is present (`active` false) it shows only a
 * faint neutral guide ring — the green mesh + sweep appear ONLY once a face is
 * detected, and turn solid green when the shot is ready.
 */
function ScanOverlay({ ready, active }: { ready: boolean; active: boolean }) {
  // A small constellation of nodes + edges over the face area.
  const nodes = [
    [50, 22], [38, 30], [62, 30], [30, 45], [70, 45], [50, 42],
    [40, 55], [60, 55], [50, 60], [35, 68], [65, 68], [50, 74],
  ];
  const edges = [
    [0, 1], [0, 2], [1, 3], [2, 4], [1, 5], [2, 5], [3, 6], [4, 7],
    [5, 8], [6, 8], [7, 8], [6, 9], [7, 10], [9, 11], [10, 11], [8, 11],
  ];
  const color = ready ? "#22c55e" : "#CCFF00";

  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Guide ring: neutral/dashed until a face appears, then colored */}
      <div
        className="absolute left-1/2 top-1/2 h-[72%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] transition-colors"
        style={
          active
            ? { border: `2px solid ${color}`, boxShadow: `0 0 24px ${color}66` }
            : { border: "2px dashed rgba(255,255,255,0.35)" }
        }
      />

      {/* Scan mesh + sweep — ONLY when a face is detected */}
      {active && (
        <>
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
            {edges.map(([a, b], i) => (
              <line
                key={i}
                x1={nodes[a][0]} y1={nodes[a][1]}
                x2={nodes[b][0]} y2={nodes[b][1]}
                stroke={color}
                strokeWidth="0.4"
                opacity={0.55}
              />
            ))}
            {nodes.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="1.1" fill={color}>
                <animate
                  attributeName="opacity"
                  values="0.3;1;0.3"
                  dur="1.6s"
                  begin={`${(i % 6) * 0.2}s`}
                  repeatCount="indefinite"
                />
              </circle>
            ))}
          </svg>
          {!ready && (
            <div
              className="absolute left-[8%] right-[8%] h-[2px] animate-[scanSweep_2.2s_ease-in-out_infinite]"
              style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
            />
          )}
          <style>{`@keyframes scanSweep{0%{top:16%}50%{top:82%}100%{top:16%}}`}</style>
        </>
      )}
    </div>
  );
}
