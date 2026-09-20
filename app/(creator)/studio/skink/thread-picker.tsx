"use client";

import { useRouter } from "next/navigation";

/** Phones get a picker instead of the sidebar of conversations. */
export function ThreadPicker({ threads, active }: { threads: { id: string; title: string }[]; active: string | null }) {
  const router = useRouter();
  return (
    <select
      className="cs-select"
      aria-label="Your conversations"
      value={active ?? ""}
      onChange={(e) => router.push(e.target.value ? `/studio/skink?thread=${e.target.value}` : "/studio/skink")}
    >
      <option value="">Recent chats…</option>
      {threads.map((t) => (
        <option key={t.id} value={t.id}>
          {t.title}
        </option>
      ))}
    </select>
  );
}
