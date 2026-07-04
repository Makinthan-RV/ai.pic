"use client";

import * as React from "react";
import { motion } from "motion/react";
import { ScanFace, Check } from "lucide-react";

// Wikimedia photos of the same person, so the demo reads as "her photos".
const wm = (file: string, w = 400) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${w}`;

const AVATAR = wm("Natalie_Portman_in_2005_(cropped).jpg", 200);

// Pool of her photos; cards cycle through these to fill 12 "matches".
const POOL = [
  "Natalie_Portman_Cannes_2008.jpg",
  "Natalie_Portman_AA_2011.jpg",
  "Natalie_Portman_(48470988352).jpg",
  "Natalie_Portman_at_Columbia_University.jpg",
  "Natalie_Portman_-_Golden_Globes_2012_(cropped_2).jpg",
  "NataliePortman.jpg",
  "Planetarium_03_(29798340905)_(cropped).jpg",
];
const TOTAL = 12;
const INITIAL = 4;
const CARDS = Array.from({ length: TOTAL }, (_, i) => wm(POOL[i % POOL.length]));

/**
 * Auto-playing demo of the guest flow: a face is scanned, the selfie is
 * "captured", then matched photos reveal. "+N more" expands to all 12.
 */
export function LiveMatchDemo() {
  const [loop, setLoop] = React.useState(0);
  const [captured, setCaptured] = React.useState(false);
  const [revealed, setRevealed] = React.useState(0);
  const [showAll, setShowAll] = React.useState(false);
  const interacted = React.useRef(false);

  React.useEffect(() => {
    if (interacted.current) return;
    setCaptured(false);
    setRevealed(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setCaptured(true), 2200));
    for (let i = 0; i < INITIAL; i++) {
      timers.push(setTimeout(() => setRevealed(i + 1), 2900 + i * 650));
    }
    timers.push(
      setTimeout(() => {
        if (!interacted.current) setLoop((l) => l + 1);
      }, 2900 + INITIAL * 650 + 3600),
    );
    return () => timers.forEach(clearTimeout);
  }, [loop]);

  const found = showAll ? TOTAL : revealed * 3; // 4 revealed -> "12 photos found"
  const visibleCount = showAll ? TOTAL : INITIAL;

  function expand() {
    interacted.current = true;
    setCaptured(true);
    setRevealed(INITIAL);
    setShowAll(true);
  }

  return (
    <div className="w-full max-w-xl rounded-3xl border border-neutral-200 bg-white p-5 shadow-2xl md:p-7">
      {/* Avatar / scanner */}
      <div className="relative mx-auto -mt-12 mb-2 w-fit">
        <div className="relative h-24 w-24">
          <div
            className={`absolute inset-0 rounded-full transition-colors duration-500 ${
              captured ? "ring-4 ring-emerald-400" : "ring-2 ring-emerald-300/60"
            }`}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={AVATAR} alt="Guest selfie" className="h-24 w-24 rounded-full object-cover" />
          {!captured && <ScanBrackets />}
        </div>
      </div>

      <div className="mb-5 flex justify-center">
        <motion.div
          key={captured ? "cap" : "scan"}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold ${
            captured ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"
          }`}
        >
          {captured ? (
            <><ScanFace className="h-3.5 w-3.5 text-emerald-400" /> SELFIE CAPTURED</>
          ) : (
            <><span className="h-2 w-2 animate-ping rounded-full bg-emerald-400" /> SCANNING…</>
          )}
        </motion.div>
      </div>

      {/* Header */}
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Matched photos</p>
          <p className="text-lg font-bold text-neutral-900">
            {found > 0 ? `${found} photos found` : "Searching your gallery…"}
          </p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-600">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Live
        </span>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-4 gap-3">
        {CARDS.slice(0, visibleCount).map((src, i) => {
          const isRevealed = i < INITIAL ? i < revealed : true;
          return (
            <div key={i} className="relative aspect-[3/4] overflow-hidden rounded-xl bg-neutral-100">
              {isRevealed ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35 }}
                  className="h-full w-full"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    <Check className="h-3 w-3" /> MATCH
                  </span>
                </motion.div>
              ) : (
                <div className="flex h-full w-full animate-pulse items-center justify-center">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                    Matching…
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* +N more toggle */}
      {revealed === INITIAL && !showAll && (
        <div className="mt-4 flex justify-end">
          <button onClick={expand} className="text-sm font-medium text-brand hover:underline">
            +{TOTAL - INITIAL} more
          </button>
        </div>
      )}
    </div>
  );
}

function ScanBrackets() {
  return (
    <div className="pointer-events-none absolute -inset-1">
      {[
        "left-0 top-0 border-l-2 border-t-2 rounded-tl-lg",
        "right-0 top-0 border-r-2 border-t-2 rounded-tr-lg",
        "left-0 bottom-0 border-l-2 border-b-2 rounded-bl-lg",
        "right-0 bottom-0 border-r-2 border-b-2 rounded-br-lg",
      ].map((c, i) => (
        <span key={i} className={`absolute h-4 w-4 border-emerald-400 ${c}`} />
      ))}
      <motion.span
        className="absolute left-0 right-0 h-[2px] bg-emerald-400/80"
        animate={{ top: ["10%", "85%", "10%"] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
