"use client";

import SphereImageGrid, { type ImageData } from "@/components/ui/img-sphere";

const u = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&facepad=3&w=300&h=300&q=70`;
// Wikimedia public-domain portraits (recognizable faces). ?width keeps them small.
const w = (file: string) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${file}?width=300`;

// Everyday people (real portrait photos) — all unique, no repeats.
const COMMON: string[] = [
  "1500648767791-00dcc994a43e", "1494790108377-be9c29b29330", "1507003211169-0a1dd7228f2d",
  "1438761681033-6461ffad8d80", "1544005313-94ddf0286df2", "1547425260-76bcadfb4f2c",
  "1517841905240-472988babdf9", "1524504388940-b1c1722653e1", "1506794778202-cad84cf45f1d",
  "1534528741775-53994a69daeb", "1519085360753-af0119f7cbe7", "1472099645785-5658abf4ff4e",
  "1489424731084-a5d8b219a5bb", "1531123897727-8f129e1688ce", "1521119989659-a83eee488004",
  "1529626455594-4ff0802cfb7e", "1502685104226-ee32379fefbe", "1544723795-3fb6469f5b39",
  "1545996124-0501ebae84d0", "1546961329-78bef0414d7c", "1552058544-f2b08422138a",
  "1557862921-37829c790f19", "1558898479-33c0057a5d12", "1560250097-0b93528c311a",
  "1568602471122-7832951cc4c5", "1573497019940-1c28c88b4f3e", "1580489944761-15a19d654956",
  "1599566150163-29194dcaad36", "1607746882042-944635dfe10e", "1600486913747-55e5470d6f40",
  "1611432579699-484f7990b127", "1499996860823-5214fcc65f8f", "1541823709867-1b206113eafd",
  "1508214751196-bcfd4ca60f91",
];

// A few famous (public-domain) faces, per request.
const FAMOUS: { file: string; name: string }[] = [
  { file: "Albert_Einstein_Head.jpg", name: "Albert Einstein" },
  { file: "Abraham_Lincoln_O-77_matte_collodion_print.jpg", name: "Abraham Lincoln" },
  { file: "Marie_Curie_c._1920s.jpg", name: "Marie Curie" },
  { file: "Portrait_Gandhi.jpg", name: "Mahatma Gandhi" },
];

// Every slot is a distinct image — no repeats.
const IMAGES: ImageData[] = [
  ...COMMON.map((id, i) => ({ id: `c-${i}`, src: u(id), alt: "Event guest", title: "A guest" })),
  ...FAMOUS.map((f, i) => ({ id: `f-${i}`, src: w(f.file), alt: f.name, title: f.name })),
];

export function PeopleSphere() {
  return (
    <div className="flex w-full justify-center overflow-hidden">
      <SphereImageGrid
        images={IMAGES}
        containerSize={480}
        sphereRadius={175}
        baseImageScale={0.16}
        dragSensitivity={0.8}
        momentumDecay={0.96}
        maxRotationSpeed={6}
        autoRotate
        autoRotateSpeed={0.18}
      />
    </div>
  );
}
