"use client";

import { useState } from "react";
import { Download, Copy, Check, Share2 } from "lucide-react";

/** Download the QR PNG, copy the guest link, or share it (native / WhatsApp). */
export function QRActions({
  guestUrl,
  qrDataUrl,
  eventName,
}: {
  guestUrl: string;
  qrDataUrl: string;
  eventName: string;
}) {
  const [copied, setCopied] = useState(false);

  function download() {
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `${eventName.replace(/\s+/g, "-").toLowerCase()}-qr.png`;
    a.click();
  }

  async function copy() {
    await navigator.clipboard.writeText(guestUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function share() {
    const text = `Find your photos from ${eventName}: ${guestUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: eventName, text, url: guestUrl });
        return;
      } catch {
        /* user cancelled — fall through */
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <div className="mt-3 grid w-full grid-cols-3 gap-2">
      <ActionBtn onClick={download} icon={<Download className="h-4 w-4" />} label="Download" />
      <ActionBtn onClick={copy} icon={copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />} label={copied ? "Copied" : "Copy link"} />
      <ActionBtn onClick={share} icon={<Share2 className="h-4 w-4" />} label="Share" />
    </div>
  );
}

function ActionBtn({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-lg border border-neutral-200 py-2 text-xs font-medium transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
    >
      {icon}
      {label}
    </button>
  );
}
