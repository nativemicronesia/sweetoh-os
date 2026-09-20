import Link from "next/link";
import { Plus } from "lucide-react";
import { requireCreator } from "@/lib/domains/identity/service";
import { getCreditBalance } from "@/lib/domains/creator/credits";
import { listMemories } from "@/lib/domains/skink/memory";
import { listMessages, listThreads } from "@/lib/domains/skink/threads";
import type { SkinkEvent } from "@/lib/domains/skink/agent";
import { SkinkChat, type ChatTurn } from "../components/skink-chat";
import { ThreadPicker } from "./thread-picker";

export const metadata = { title: "Ask Skink" };

export default async function SkinkPage({ searchParams }: { searchParams: Promise<{ thread?: string; q?: string }> }) {
  const session = await requireCreator();
  const query = await searchParams;
  const [threads, { plan }, memories] = await Promise.all([
    listThreads(session.appUser.id),
    getCreditBalance(session.appUser.id),
    listMemories(session.appUser.id),
  ]);
  const active = threads.find((t) => t.id === query.thread) ?? null;
  const turns: ChatTurn[] = active
    ? (await listMessages(session.appUser.id, active.id)).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        events: ((m.metadata as { events?: SkinkEvent[] } | null)?.events ?? []) as SkinkEvent[],
      }))
    : [];
  const first = session.appUser.name?.split(" ")[0] ?? "there";

  return (
    <>
      <div className="cs-skink-mobilebar">
        <Link href="/studio/skink" className="cs-btn cs-btn-ghost cs-btn-sm"><Plus size={15} /> New chat</Link>
        {threads.length > 0 && <ThreadPicker threads={threads.map((t) => ({ id: t.id, title: t.title }))} active={active?.id ?? null} />}
        <Link href="/studio/memory" className="cs-link" style={{ whiteSpace: "nowrap" }}>Skink knows {memories.length}</Link>
      </div>
      <div className="cs-skink-page">
      <div className="cs-card cs-threads-wrap">
        <div style={{ padding: 12, borderBottom: "1px solid var(--cs-line)" }}>
          <Link href="/studio/skink" className="cs-btn cs-btn-ghost" style={{ width: "100%" }}>
            <Plus size={16} /> New chat
          </Link>
        </div>
        <nav className="cs-threads" aria-label="Conversations">
          {threads.length === 0 && <p className="cs-muted" style={{ fontSize: 13, padding: 8 }}>Your conversations with Skink appear here.</p>}
          {threads.map((t) => (
            <Link key={t.id} href={`/studio/skink?thread=${t.id}`} aria-current={t.id === active?.id ? "page" : undefined}>
              {t.title}
            </Link>
          ))}
        </nav>
        <div style={{ padding: 12, borderTop: "1px solid var(--cs-line)", fontSize: 13 }}>
          <Link href="/studio/memory" className="cs-link">Skink remembers {memories.length} {memories.length === 1 ? "thing" : "things"} →</Link>
        </div>
      </div>
      <div className="cs-card" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <SkinkChat
          key={active?.id ?? "new"}
          syncUrl
          threadId={active?.id ?? null}
          initialTurns={turns}
          levels={plan.levels}
          greeting={
            active
              ? `Picking this back up, ${first}. What's next?`
              : `What's on your mind, ${first}? I can teach you POD step by step, research a niche, plan a product line, price your products, or help you design.`
          }
          suggestions={[
            "Teach me print-on-demand from zero",
            "Research a niche for Micronesian pride apparel",
            "How should I price a hoodie?",
            "Plan my first 5 products",
          ]}
        />
      </div>
      </div>
    </>
  );
}
