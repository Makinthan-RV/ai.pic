"use client";

import * as React from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * A real, functional date picker (unlike the hardcoded demo). Controlled via an
 * ISO `value` ("YYYY-MM-DD") and `onChange`. Styled to match the app.
 */
export function DatePicker({
  value,
  onChange,
  label,
  placeholder = "Pick a date",
  className,
}: {
  value?: string | null;
  onChange?: (iso: string | null) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}) {
  const selected = value ? parseISO(value) : null;
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState(() => selected ?? new Date());
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function pick(day: number) {
    const iso = toISO(new Date(year, month, day));
    onChange?.(iso);
    setOpen(false);
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      {label && <label className="mb-1 block text-sm font-medium">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center justify-between rounded-lg border border-neutral-300 bg-white px-3 text-left text-sm outline-none transition-colors hover:border-neutral-400 focus:border-brand dark:border-neutral-700 dark:bg-neutral-900"
      >
        <span className={selected ? "" : "text-neutral-400"}>
          {selected ? formatHuman(selected) : placeholder}
        </span>
        <CalendarIcon className="h-4 w-4 text-neutral-400" />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+0.4rem)] z-50 w-72 rounded-xl border border-neutral-200 bg-white p-3 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">{MONTHS[month]} {year}</span>
            <div className="flex gap-1">
              <NavBtn onClick={() => setView(new Date(year, month - 1, 1))} aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </NavBtn>
              <NavBtn onClick={() => setView(new Date(year, month + 1, 1))} aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </NavBtn>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {WEEK_DAYS.map((d) => (
              <div key={d} className="py-1 text-center text-xs font-medium text-neutral-400">{d}</div>
            ))}
            {cells.map((day, i) => {
              if (day === null) return <div key={i} />;
              const isSel =
                selected &&
                selected.getFullYear() === year &&
                selected.getMonth() === month &&
                selected.getDate() === day;
              const isToday = sameDay(new Date(), new Date(year, month, day));
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pick(day)}
                  className={cn(
                    "flex h-9 items-center justify-center rounded-full text-sm transition-colors",
                    isSel
                      ? "bg-brand font-semibold text-white"
                      : "hover:bg-neutral-100 dark:hover:bg-neutral-800",
                    !isSel && isToday && "font-semibold text-brand",
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex justify-between border-t border-neutral-100 pt-2 dark:border-neutral-800">
            <button type="button" className="text-xs text-neutral-400 hover:text-neutral-600"
              onClick={() => { onChange?.(null); setOpen(false); }}>
              Clear
            </button>
            <button type="button" className="text-xs font-medium text-brand"
              onClick={() => { const t = new Date(); setView(t); pick(t.getDate()); }}>
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NavBtn({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800"
      {...props}
    >
      {children}
    </button>
  );
}

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseISO(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function formatHuman(d: Date) {
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;
}
