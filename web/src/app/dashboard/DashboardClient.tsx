"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { Button, Card, Input } from "@/components/ui";
import { DatePicker } from "@/components/ui/date-picker";

export function CreateEventForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/event/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, event_date: eventDate || null }),
    });
    setLoading(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Failed" }));
      return setError(error);
    }
    setName("");
    setEventDate("");
    router.refresh();
  }

  return (
    <Card>
      <h2 className="mb-3 font-semibold">Create event</h2>
      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <Input placeholder="Event name (e.g. Sarah & Tom's Wedding)" value={name}
          required onChange={(e) => setName(e.target.value)} />
        <DatePicker value={eventDate || null} onChange={(iso) => setEventDate(iso ?? "")}
          placeholder="Event date" className="sm:w-44" />
        <Button type="submit" disabled={loading} className="sm:w-40">
          {loading ? "Creating…" : "Create"}
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </Card>
  );
}

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await getSupabaseBrowser().auth.signOut();
    router.push("/login");
    router.refresh();
  }
  return (
    <Button variant="ghost" onClick={logout}>
      Log out
    </Button>
  );
}
